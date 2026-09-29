import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SOSRequest } from '../types/sos';
import { getUrgencyInfo, getWaterLevelInfo, getGoogleMapsUrl } from '../utils/formatters';
import { maskPhone } from '../utils/privacy';
import { getGistdaFloodZones, type GistdaFloodZone } from '../services/weatherAiService';
import {
  MapPin,
  Map as MapIcon,
  Maximize2,
  Layers,
  CloudRain,
  Waves,
  Sparkles,
  Satellite,
  LocateFixed
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
  const gistdaLayerRef = useRef<L.LayerGroup | null>(null);
  const radarLayerRef = useRef<L.LayerGroup | null>(null);

  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [showGistda, setShowGistda] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [activeZone, setActiveZone] = useState<GistdaFloodZone | null>(null);

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

    gistdaLayerRef.current = L.layerGroup().addTo(map);
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

  // GISTDA satellite flood extent polygons
  useEffect(() => {
    const layer = gistdaLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showGistda) return;

    getGistdaFloodZones().forEach(zone => {
      const polygon = L.polygon(zone.polygon, {
        color: zone.strokeColor,
        fillColor: zone.fillColor,
        fillOpacity: 0.38,
        weight: 2,
        dashArray: zone.hazardLevel === 'CRITICAL' ? '5, 5' : undefined
      });

      const escape = (value: string) =>
        value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      polygon.bindPopup(`
        <div style="min-width:230px;max-width:250px;padding:12px 14px;font-size:12px;line-height:1.5;color:#334155;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;background:#f3e8ff;color:#6b21a8;padding:2px 7px;border-radius:999px;">GISTDA Satellite</span>
            <span style="margin-left:auto;font-size:10px;font-weight:700;color:${zone.strokeColor};">
              ${zone.hazardLevel === 'CRITICAL' ? 'วิกฤตสูงสุด' : 'เฝ้าระวัง'}
            </span>
          </div>
          <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:6px;">${escape(zone.name)}</div>
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:6px 9px;margin-bottom:6px;">
            <span style="font-size:10px;color:#6b21a8;">ระดับน้ำท่วมประเมิน</span>
            <div style="font-size:13px;font-weight:800;color:${zone.strokeColor};">${escape(zone.depthEstimate)}</div>
          </div>
          <p style="margin:0 0 6px;color:#475569;">${escape(zone.description)}</p>
          <div style="border-top:1px solid #f1f5f9;padding-top:5px;font-size:10px;color:#94a3b8;">
            ${escape(zone.satelliteSensor)} · ${escape(zone.detectionDate)}
          </div>
        </div>
      `);

      polygon.on('click', () => setActiveZone(zone));
      layer.addLayer(polygon);
    });
  }, [showGistda]);

  // WeatherNext 3 precipitation radar cells
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
           <b>เรดาร์ฝน AI (WeatherNext 3)</b><br/>
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
                background:${pinColor};border:2.5px solid #ffffff;
                box-shadow:0 6px 14px -4px rgba(15,23,42,0.55);
                display:flex;align-items:center;justify-content:center;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z"></path>
                </svg>
              </div>
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
            <a href="${getGoogleMapsUrl(lat, lng)}" target="_blank" rel="noreferrer" style="flex:1;text-align:center;background:#0f172a;color:#fff;padding:7px;border-radius:999px;text-decoration:none;font-weight:700;font-size:11px;">นำทาง</a>
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
    { key: 'radar', label: 'เรดาร์ฝน AI', icon: CloudRain, on: showRadar, toggle: () => setShowRadar(v => !v), onClass: 'border-sky-200 bg-sky-50 text-sky-700' },
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
              WeatherNext 3 + GISTDA
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
              ผิวน้ำท่วมจากดาวเทียม (GISTDA)
            </p>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
              {[
                { swatch: 'bg-violet-700', label: 'ลึก > 1.8 ม.' },
                { swatch: 'bg-rose-600', label: '1.2 – 2.0 ม.' },
                { swatch: 'bg-amber-500', label: '0.8 – 1.4 ม.' },
                { swatch: 'bg-sky-500', label: 'ท่วมผิวจราจร' }
              ].map(item => (
                <li key={item.label} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                  <span className={`size-2.5 shrink-0 rounded-sm ${item.swatch}`} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-2 border-t border-slate-100 pt-2">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-sky-700">
              <CloudRain className="size-3" />
              เรดาร์ฝน AI
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

        {/* Selected satellite zone detail */}
        {activeZone && (
          <button
            onClick={() => setActiveZone(null)}
            className="absolute bottom-5 right-5 z-20 max-w-xs animate-fade rounded-2xl border border-violet-200 bg-white/95 p-3 text-left shadow-[var(--shadow-lift)] backdrop-blur-md"
          >
            <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-700">
              <LocateFixed className="size-3" />
              เขตเฝ้าระวังน้ำท่วม
            </span>
            <span className="block text-[12px] font-bold text-slate-900">{activeZone.name}</span>
            <span className="mt-0.5 block text-[11px] text-slate-600">{activeZone.description}</span>
            <span className="mt-1 block text-[10px] text-slate-400">
              {activeZone.depthEstimate} · แตะเพื่อปิด
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
