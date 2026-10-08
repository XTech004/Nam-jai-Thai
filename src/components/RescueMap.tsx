import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SOSRequest } from '../types/sos';
import { getUrgencyInfo, getWaterLevelInfo, getGoogleMapsUrl } from '../utils/formatters';
import { maskPhone } from '../utils/privacy';
import {
  MapPin,
  Map as MapIcon,
  Maximize2,
  Layers,
  CloudRain,
  Waves,
  Sparkles,
  Satellite,
} from 'lucide-react';

interface RescueMapProps {
  requests: SOSRequest[];
  onSelectCase: (req: SOSRequest) => void;
  isAdmin?: boolean;
}

const URGENCY_FILTERS = [
  { id: 'ALL', label: 'ทั้งหมด', dot: 'bg-slate-400' },
  { id: 'CRITICAL', label: 'วิกฤต', dot: 'bg-rose-500' },
  { id: 'URGENT', label: 'เร่งด่วน', dot: 'bg-amber-500' },
  { id: 'NORMAL', label: 'ทั่วไป', dot: 'bg-emerald-500' }
] as const;

const THAI_URGENCY: Record<SOSRequest['urgency'], string> = {
  CRITICAL: 'วิกฤต',
  URGENT: 'เร่งด่วน',
  NORMAL: 'ทั่วไป'
};

const RADAR_CELLS = [
  { center: [20.38, 99.88] as [number, number], radius: 28000, label: 'พายุฝนตกหนักรุนแรง', mm: 52, color: '#9333ea' },
  { center: [19.9, 99.85] as [number, number], radius: 32000, label: 'ฝนตกหนักต่อเนื่อง', mm: 42, color: '#dc2626' },
  { center: [18.82, 99.02] as [number, number], radius: 26000, label: 'ฝนตกปานกลาง-หนัก', mm: 28, color: '#f59e0b' },
  { center: [19.18, 99.9] as [number, number], radius: 24000, label: 'ฝนตกต่อเนื่อง', mm: 22, color: '#3b82f6' },
  { center: [17.15, 99.8] as [number, number], radius: 30000, label: 'ฝนตกปานกลาง', mm: 19, color: '#06b6d4' }
];

export const RescueMap: React.FC<RescueMapProps> = ({ requests, onSelectCase, isAdmin = false }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const gistdaLayerRef = useRef<L.TileLayer | null>(null);
  const radarLayerRef = useRef<L.LayerGroup | null>(null);

  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [showGistda, setShowGistda] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [gistdaLayerError, setGistdaLayerError] = useState('');

  const filteredRequests = requests.filter(r => {
    if (urgencyFilter !== 'ALL' && r.urgency !== urgencyFilter) return false;
    return true;
  });

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [19.2, 99.8],
      zoom: 8,
      zoomControl: true
    });

    baseTileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap | GISTDA | ThaiFlood SOS',
      maxZoom: 19,
      zIndex: 1
    }).addTo(map);

    radarLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const timer = setTimeout(() => map.invalidateSize(), 250);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Base tiles: roads vs satellite imagery
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    baseTileLayerRef.current =
      mapType === 'satellite'
        ? L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            { attribution: '&copy; Esri & GISTDA | ThaiFlood SOS', maxZoom: 18, zIndex: 1 }
          )
        : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap | GISTDA | ThaiFlood SOS',
            maxZoom: 19,
            zIndex: 1
          });

    baseTileLayerRef.current.addTo(map);
  }, [mapType]);

  // GISTDA flood extent tiles (satellite-derived, previous 1-day period).
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (gistdaLayerRef.current) {
      map.removeLayer(gistdaLayerRef.current);
      gistdaLayerRef.current = null;
    }
    setGistdaLayerError('');
    if (!showGistda) return;

    const layer = L.tileLayer('/api/gistda-flood-tile?z={z}&x={x}&y={y}', {
      attribution: '&copy; GISTDA — ข้อมูลพื้นที่น้ำท่วมย้อนหลัง 1 วัน',
      opacity: 0.72,
      maxZoom: 18,
      tms: true,
      zIndex: 2
    });
    layer.on('tileerror', () => setGistdaLayerError('โหลดชั้นข้อมูล GISTDA ไม่สำเร็จ โปรดตรวจ API key หรือการเชื่อมต่อ'));
    layer.on('tileload', () => setGistdaLayerError(''));
    layer.addTo(map);
    gistdaLayerRef.current = layer;

    return () => {
      map.removeLayer(layer);
      if (gistdaLayerRef.current === layer) gistdaLayerRef.current = null;
    };
  }, [showGistda]);

  // Clearly marked sample layer; it is not a live precipitation product.
  useEffect(() => {
    const layer = radarLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showRadar) return;

    RADAR_CELLS.forEach(cell => {
      const circle = L.circle(cell.center, {
        radius: cell.radius,
        color: cell.color,
        fillColor: cell.color,
        fillOpacity: 0.18,
        weight: 1.5
      });

      circle.bindTooltip(
        `<div style="font-size:11px;line-height:1.5;">
           <b>พื้นที่ฝนตัวอย่าง (ไม่ใช่เรดาร์สด)</b><br/>
           ${cell.label}<br/>
           ความเข้มฝน: <b>${cell.mm} มม./ชม.</b>
         </div>`,
        { sticky: true }
      );

      layer.addLayer(circle);
    });
  }, [showRadar]);

  // SOS markers
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();
    if (!showMarkers) return;

    const bounds: [number, number][] = [];
    const escape = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    filteredRequests.forEach(req => {
      const { lat, lng } = req.coordinates;
      if (!lat || !lng) return;
      bounds.push([lat, lng]);

      const urgency = getUrgencyInfo(req.urgency);
      const water = getWaterLevelInfo(req.waterLevel);
      const isCritical = req.urgency === 'CRITICAL';
      const isDone = req.status === 'COMPLETED';
      const pinColor = isDone ? '#64748b' : urgency.markerColor;
      const totalPeople =
        req.people.adults + req.people.elderly + req.people.bedridden + req.people.children;
      const shownPhone = isAdmin ? req.primaryPhone : maskPhone(req.primaryPhone);

      const hasGoogleMaps = Boolean(req.googleMapsUrl);
      const navUrl = req.googleMapsUrl || getGoogleMapsUrl(lat, lng);

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'custom-flood-pin',
          html: `
            <div style="position:relative;display:grid;place-items:center;width:36px;height:36px;">
              ${
                isCritical
                  ? '<span style="position:absolute;width:36px;height:36px;border-radius:9999px;background:rgba(225,29,72,0.35);animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>'
                  : ''
              }
              <div style="
                position:relative;width:24px;height:24px;border-radius:9999px;
                background:${pinColor};border:2.5px solid ${hasGoogleMaps ? '#38bdf8' : '#ffffff'};
                box-shadow:0 6px 14px -4px rgba(15,23,42,0.55);
                display:flex;align-items:center;justify-content:center;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z"></path>
                </svg>
              </div>
              ${
                hasGoogleMaps
                  ? '<span style="position:absolute;bottom:1px;right:1px;width:9px;height:9px;background:#0284c7;border:1.5px solid #ffffff;border-radius:9999px;" title="เชื่อมโยงพิกัดจาก Google Maps"></span>'
                  : ''
              }
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -20]
        })
      });

      marker.bindPopup(`
        <div style="min-width:230px;max-width:260px;padding:12px 14px;font-size:12px;line-height:1.5;color:#334155;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${pinColor};"></span>
            <span style="font-weight:700;color:${pinColor};">${THAI_URGENCY[req.urgency]}</span>
            <span style="margin-left:auto;background:#f1f5f9;color:#64748b;padding:2px 6px;border-radius:6px;font-size:10px;font-weight:600;">${escape(req.id)}</span>
          </div>

          ${
            hasGoogleMaps
              ? `<div style="display:flex;align-items:center;gap:4px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:8px;padding:3px 7px;margin-bottom:6px;font-size:10px;font-weight:700;">
                   <span>📍 พิกัดตรงจาก Google Maps (แม่นยำสูง)</span>
                 </div>`
              : ''
          }

          <div style="font-weight:800;font-size:15px;color:#0f172a;margin-bottom:4px;">${escape(req.fullName)}</div>

          <div style="color:#475569;margin-bottom:6px;">${escape(req.address || '')} ต.${escape(req.subDistrict || '-')} อ.${escape(req.district)} จ.${escape(req.province)}</div>

          ${
            req.landmark
              ? `<div style="background:#fffbeb;border:1px solid #fde68a;color:#78350f;border-radius:10px;padding:5px 8px;margin-bottom:8px;font-size:11px;">จุดสังเกต: ${escape(req.landmark)}</div>`
              : ''
          }

          <div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#64748b;">
            <span>ระดับน้ำ <b style="color:#0f172a;">${escape(water.label)}</b></span>
            <span>ติดค้าง <b style="color:#0f172a;">${totalPeople} คน</b></span>
          </div>

          <div style="display:flex;gap:6px;margin-top:10px;">
            <a href="tel:${escape(req.primaryPhone)}" style="flex:1;text-align:center;background:#059669;color:#fff;padding:7px;border-radius:999px;text-decoration:none;font-weight:700;font-size:11px;">โทร ${escape(shownPhone)}</a>
            <a href="${escape(navUrl)}" target="_blank" rel="noreferrer" style="flex:1;text-align:center;background:#0f172a;color:#fff;padding:7px;border-radius:999px;text-decoration:none;font-weight:700;font-size:11px;">นำทาง</a>
          </div>
        </div>
      `);

      marker.on('click', () => onSelectCase(req));
      markersGroup.addLayer(marker);
    });

    if (bounds.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [56, 56], maxZoom: 14 });
    }
  }, [filteredRequests, showMarkers, isAdmin, onSelectCase]);

  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const bounds = filteredRequests
      .filter(r => r.coordinates.lat && r.coordinates.lng)
      .map(r => [r.coordinates.lat, r.coordinates.lng] as [number, number]);
    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [56, 56], maxZoom: 14 });
    }
  };

  const layerToggles = [
    { key: 'gistda', label: 'GISTDA', icon: Waves, on: showGistda, toggle: () => setShowGistda(v => !v), onClass: 'border-violet-200 bg-violet-50 text-violet-700' },
    { key: 'radar', label: 'เรดาร์ฝน AI (ตัวอย่าง)', icon: CloudRain, on: showRadar, toggle: () => setShowRadar(v => !v), onClass: 'border-sky-200 bg-sky-50 text-sky-700' },
    { key: 'markers', label: `หมุด SOS (${filteredRequests.length})`, icon: MapPin, on: showMarkers, toggle: () => setShowMarkers(v => !v), onClass: 'border-rose-200 bg-rose-50 text-rose-700' }
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">

      <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="page-title flex items-center gap-2.5">
            <MapIcon className="size-5 text-slate-400" />
            แผนที่พิกัดผู้ประสบอุทกภัย
          </h2>
          <p className="page-subtitle flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>แตะที่หมุดเพื่อดูรายละเอียด โทรติดต่อ หรือเปิดระบบนำทาง</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600">
              <Sparkles className="size-3" />
              GISTDA 1 วันย้อนหลัง · WeatherNext เป็นข้อมูลตัวอย่าง
            </span>
          </p>
        </div>

        {/* Layer switches */}
        <div className="flex flex-wrap items-center gap-1.5">
          {layerToggles.map(({ key, label, icon: Icon, on, toggle, onClass }) => (
            <button
              key={key}
              onClick={toggle}
              aria-pressed={on}
              className={`chip ${on ? onClass : 'chip-idle'} ${
                on ? 'border' : ''
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}

          <button
            onClick={() => setMapType(t => (t === 'streets' ? 'satellite' : 'streets'))}
            className="chip border border-slate-200 bg-white text-slate-600 shadow-xs hover:border-slate-300 hover:text-slate-900"
          >
            {mapType === 'streets' ? <Satellite className="size-3.5" /> : <Layers className="size-3.5" />}
            {mapType === 'streets' ? 'ภาพดาวเทียม' : 'แผนที่ถนน'}
          </button>
        </div>
      </header>

      {/* Map */}
      <div className="surface relative overflow-hidden p-1.5">
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: 'clamp(420px, 68vh, 720px)' }}
          className="rounded-2xl"
        />

        {gistdaLayerError && showGistda && (
          <div role="status" className="absolute right-4 top-4 z-20 max-w-xs rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] font-semibold text-amber-900 shadow-sm backdrop-blur">
            {gistdaLayerError}
          </div>
        )}

        {/* Floating urgency filter */}
        <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white/92 p-1 shadow-[var(--shadow-soft)] backdrop-blur-md">
          {URGENCY_FILTERS.map(f => {
            const isActive = urgencyFilter === f.id;
            const value = f.id === 'ALL' ? requests.length : requests.filter(r => r.urgency === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setUrgencyFilter(f.id)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className={`size-2 rounded-full ${f.dot} ${isActive ? 'ring-2 ring-white/30' : ''}`} />
                {f.label}
                <span className="tabular-nums opacity-60">{value}</span>
              </button>
            );
          })}
          <button
            onClick={handleFitAll}
            disabled={filteredRequests.length === 0}
            title="ซูมพอดีทุกหมุด"
            className="ml-0.5 grid size-6 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>

        {showMarkers && filteredRequests.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
            <div className="rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 text-center shadow-[var(--shadow-lift)] backdrop-blur">
              <p className="text-[13px] font-semibold text-slate-700">ยังไม่มีเคสในตัวกรองนี้</p>
              <p className="mt-0.5 text-[11px] text-slate-500">ลองเลือก "ทั้งหมด" เพื่อดูพิกัดทุกเคส</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden w-56 rounded-2xl border border-slate-200 bg-white/92 p-3 shadow-[var(--shadow-soft)] backdrop-blur-md sm:block">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">คำอธิบายสัญลักษณ์</p>

          <div className="mb-2">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-violet-700">
              <Waves className="size-3" />
              พื้นที่น้ำท่วมจาก GISTDA (ย้อนหลัง 1 วัน)
            </p>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
              <li className="col-span-2 text-[10px] leading-relaxed text-slate-500">
                แผนที่แสดงขอบเขตที่ตรวจพบจากข้อมูลดาวเทียม ไม่ใช่ระดับน้ำ ณ วินาทีปัจจุบัน
              </li>
            </ul>
          </div>

          <div className="mb-2 border-t border-slate-100 pt-2">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-sky-700">
              <CloudRain className="size-3" />
              WeatherNext (ข้อมูลตัวอย่าง)
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span>เบาบาง</span>
              <span className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-purple-600" />
              <span>พายุหนัก</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2">
            <p className="mb-1 text-[10px] font-bold text-slate-700">หมุดเคส SOS</p>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
              {[
                { swatch: 'bg-rose-500', label: 'วิกฤต' },
                { swatch: 'bg-amber-500', label: 'เร่งด่วน' },
                { swatch: 'bg-emerald-500', label: 'ทั่วไป' },
                { swatch: 'bg-slate-400', label: 'สำเร็จแล้ว' }
              ].map(item => (
                <li key={item.label} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                  <span className={`size-2.5 shrink-0 rounded-full ring-2 ring-white ${item.swatch}`} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};
