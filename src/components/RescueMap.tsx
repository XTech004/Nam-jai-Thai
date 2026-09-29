import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SOSRequest } from '../types/sos';
import { getUrgencyInfo, getWaterLevelInfo, getGoogleMapsUrl, formatThaiDateTime } from '../utils/formatters';
import { maskPhone } from '../utils/privacy';
import { getGistdaFloodZones, type GistdaFloodZone } from '../services/weatherAiService';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  Filter, 
  Maximize2, 
  Layers, 
  CloudRain, 
  Waves, 
  Sparkles,
  Info,
  ShieldAlert,
  Eye,
  EyeOff
} from 'lucide-react';

interface RescueMapProps {
  requests: SOSRequest[];
  onSelectCase: (req: SOSRequest) => void;
  isAdmin?: boolean;
}

export const RescueMap: React.FC<RescueMapProps> = ({ 
  requests, 
  onSelectCase,
  isAdmin = false 
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  // Layer Groups
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const gistdaLayerRef = useRef<L.LayerGroup | null>(null);
  const weatherRadarLayerRef = useRef<L.LayerGroup | null>(null);

  // States
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [showGistda, setShowGistda] = useState<boolean>(true);
  const [showWeatherRadar, setShowWeatherRadar] = useState<boolean>(true);
  const [showSosMarkers, setShowSosMarkers] = useState<boolean>(true);
  const [activeZoneDetail, setActiveZoneDetail] = useState<GistdaFloodZone | null>(null);

  // Filter requests
  const filteredRequests = requests.filter(r => {
    if (urgencyFilter !== 'ALL' && r.urgency !== urgencyFilter) return false;
    return true;
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Northern Thailand where flood activity is highest
    const map = L.map(mapContainerRef.current, {
      center: [19.2, 99.8],
      zoom: 8,
      zoomControl: true,
    });

    // Base Street Layer
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap | GISTDA Satellite | Google DeepMind WeatherNext 3',
      maxZoom: 19,
    }).addTo(map);
    baseTileLayerRef.current = streetLayer;

    // Create Layer Groups
    const gistdaGroup = L.layerGroup().addTo(map);
    gistdaLayerRef.current = gistdaGroup;

    const radarGroup = L.layerGroup().addTo(map);
    weatherRadarLayerRef.current = radarGroup;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    mapInstanceRef.current = map;

    // Fix container sizing when mounted in tabs
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Base Tile (Streets vs Satellite)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    if (mapType === 'satellite') {
      baseTileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri & GISTDA Satellite Imagery | ThaiFlood SOS',
          maxZoom: 18,
        }
      ).addTo(map);
    } else {
      baseTileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap | GISTDA | ThaiFlood SOS',
          maxZoom: 19,
          zIndex: 1,
        }
      ).addTo(map);
    }
  }, [mapType]);

  // Render GISTDA Satellite Flood Extent Polygons
  useEffect(() => {
    if (!gistdaLayerRef.current) return;
    const layer = gistdaLayerRef.current;
    layer.clearLayers();

    if (!showGistda) return;

    const floodZones = getGistdaFloodZones();

    floodZones.forEach((zone) => {
      // Create colored polygon
      const polygon = L.polygon(zone.polygon, {
        color: zone.strokeColor,
        fillColor: zone.fillColor,
        fillOpacity: 0.42,
        weight: 2.5,
        dashArray: zone.hazardLevel === 'CRITICAL' ? '4, 4' : undefined,
      });

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; min-width: 230px; line-height: 1.45;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: bold; background: #581c87; color: #f3e8ff; padding: 2px 6px; rounded: 4px; border-radius: 4px;">
              🛰️ GISTDA Satellite
            </span>
            <span style="font-size: 10px; font-weight: bold; color: ${zone.strokeColor};">
              ${zone.hazardLevel === 'CRITICAL' ? '⚠️ วิกฤตระดับสูงสุด' : '⚡ เฝ้าระวังน้ำท่วม'}
            </span>
          </div>

          <h4 style="font-weight: bold; font-size: 13px; color: #0f172a; margin: 0 0 4px 0;">
            ${zone.name}
          </h4>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; margin: 6px 0;">
            <div style="font-size: 11px; color: #475569;">ความลึกน้ำท่วมประเมิน:</div>
            <div style="font-size: 13px; font-weight: 800; color: ${zone.strokeColor};">
              🌊 ${zone.depthEstimate}
            </div>
          </div>

          <p style="font-size: 11px; color: #334155; margin: 4px 0;">
            ${zone.description}
          </p>

          <div style="border-top: 1px solid #f1f5f9; padding-top: 4px; margin-top: 6px; font-size: 10px; color: #64748b;">
            ดาวเทียม: ${zone.satelliteSensor} • ${zone.detectionDate}
          </div>
        </div>
      `;

      polygon.bindPopup(popupContent);
      polygon.on('click', () => {
        setActiveZoneDetail(zone);
      });

      layer.addLayer(polygon);
    });
  }, [showGistda]);

  // Render Google DeepMind WeatherNext 3 Precipitation Radar Cells
  useEffect(() => {
    if (!weatherRadarLayerRef.current) return;
    const radarGroup = weatherRadarLayerRef.current;
    radarGroup.clearLayers();

    if (!showWeatherRadar) return;

    // Simulated WeatherNext 3 Hourly Precipitation Radar Storm Cells across Northern/Central Basins
    const radarStormCells: Array<{
      center: [number, number];
      radiusKm: number;
      rainIntensity: string;
      rainMmH: number;
      fillColor: string;
    }> = [
      { center: [20.38, 99.88], radiusKm: 28000, rainIntensity: 'พายุฝนตกหนักรุนแรง', rainMmH: 52, fillColor: '#9333ea' },
      { center: [19.90, 99.85], radiusKm: 32000, rainIntensity: 'ฝนตกหนักต่อเนื่อง', rainMmH: 42, fillColor: '#dc2626' },
      { center: [18.82, 99.02], radiusKm: 26000, rainIntensity: 'ฝนตกปานกลาง-หนัก', rainMmH: 28, fillColor: '#f59e0b' },
      { center: [19.18, 99.90], radiusKm: 24000, rainIntensity: 'ฝนตกต่อเนื่อง', rainMmH: 22, fillColor: '#3b82f6' },
      { center: [17.15, 99.80], radiusKm: 30000, rainIntensity: 'ฝนตกปานกลาง', rainMmH: 19, fillColor: '#06b6d4' },
    ];

    radarStormCells.forEach(cell => {
      const circle = L.circle(cell.center, {
        radius: cell.radiusKm,
        color: cell.fillColor,
        fillColor: cell.fillColor,
        fillOpacity: 0.22,
        weight: 1.5,
      });

      const tooltipContent = `
        <div style="font-family: sans-serif; font-size: 11px;">
          <b>🌧️ เรดาร์ AI WeatherNext 3</b><br/>
          สถานะ: ${cell.rainIntensity}<br/>
          ความเข้มฝน: <b>${cell.rainMmH} มม./ชม.</b>
        </div>
      `;
      circle.bindTooltip(tooltipContent, { sticky: true });

      radarGroup.addLayer(circle);
    });
  }, [showWeatherRadar]);

  // Update SOS Markers when requests or filter change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    if (!showSosMarkers) return;

    const bounds: [number, number][] = [];

    filteredRequests.forEach((req) => {
      const { lat, lng } = req.coordinates;
      if (!lat || !lng) return;

      bounds.push([lat, lng]);

      const urgency = getUrgencyInfo(req.urgency);
      const water = getWaterLevelInfo(req.waterLevel);

      // Custom SVG DivIcon
      const isCritical = req.urgency === 'CRITICAL';
      const markerHtml = `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${
            isCritical
              ? `<span style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background-color: rgba(220, 38, 38, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
              : ''
          }
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: ${urgency.markerColor};
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 13px;
            font-weight: bold;
          ">
            ${isCritical ? '🚨' : req.urgency === 'URGENT' ? '⚡' : '🆘'}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-sos-marker',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const displayedPhone = isAdmin ? req.primaryPhone : maskPhone(req.primaryPhone);

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; min-width: 230px; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: bold; background: #0f172a; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-family: monospace;">
              ${req.id}
            </span>
            <span style="font-size: 11px; font-weight: bold; color: ${urgency.markerColor};">
              ${urgency.shortLabel}
            </span>
          </div>

          <h3 style="font-weight: bold; font-size: 14px; margin: 4px 0 2px 0; color: #0f172a;">
            ${req.fullName}
          </h3>

          <p style="color: #475569; margin: 2px 0 6px 0; font-size: 11px;">
            📍 ${req.address} ต.${req.subDistrict || '-'} อ.${req.district} จ.${req.province}
          </p>

          ${
            req.landmark
              ? `<div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 4px 6px; border-radius: 6px; font-size: 11px; color: #92400e; margin-bottom: 6px;">
                  🚩 <b>จุดสังเกต:</b> ${req.landmark}
                </div>`
              : ''
          }

          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
            <span>ระดับน้ำ: <b>${water.label}</b></span>
            <span>ติดค้าง: <b>${req.people.adults + req.people.elderly + req.people.bedridden + req.people.children} คน</b></span>
          </div>

          <div style="display: flex; gap: 4px; margin-top: 8px;">
            <a href="tel:${req.primaryPhone}" style="flex: 1; text-align: center; background: #059669; color: white; padding: 6px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 11px;">
              📞 โทร (${displayedPhone})
            </a>
            <a href="${getGoogleMapsUrl(lat, lng)}" target="_blank" style="flex: 1; text-align: center; background: #2563eb; color: white; padding: 6px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 11px;">
              🗺️ นำทาง
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        onSelectCase(req);
      });

      markersGroup.addLayer(marker);
    });

    // Fit Bounds if markers exist
    if (bounds.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [filteredRequests, showSosMarkers, isAdmin, onSelectCase]);

  const handleFitAll = () => {
    if (!mapInstanceRef.current || filteredRequests.length === 0) return;
    const bounds: [number, number][] = filteredRequests.map(r => [r.coordinates.lat, r.coordinates.lng]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      
      {/* Top Intelligence Ribbon: WeatherNext 3 & GISTDA Info */}
      <div className="mb-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4 rounded-3xl shadow-lg border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-indigo-400/30 shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                แผนที่บูรณาการภัยพิบัติอัจฉริยะ (Satellite & AI Map)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                WeatherNext 3 (DeepMind)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-400/20 text-purple-300 border border-purple-400/30">
                GISTDA Satellite
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              แสดงภาพถ่ายดาวเทียมตรวจจับผิวน้ำท่วมขัง ซ้อนทับกับเรดาร์พยากรณ์ฝนรายชั่วโมง (ความละเอียด 5 กม.)
            </p>
          </div>
        </div>

        {/* Layer Controls Switchers */}
        <div className="flex items-center gap-1.5 flex-wrap self-end md:self-auto">
          {/* GISTDA Toggle */}
          <button
            onClick={() => setShowGistda(!showGistda)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showGistda 
                ? 'bg-purple-600 text-white border-purple-400 shadow-xs' 
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>ดาวเทียม GISTDA</span>
          </button>

          {/* WeatherNext 3 Toggle */}
          <button
            onClick={() => setShowWeatherRadar(!showWeatherRadar)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showWeatherRadar 
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-xs' 
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>เรดาร์ฝน AI</span>
          </button>

          {/* SOS Markers Toggle */}
          <button
            onClick={() => setShowSosMarkers(!showSosMarkers)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showSosMarkers 
                ? 'bg-red-600 text-white border-red-400 shadow-xs' 
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>หมุด SOS ({filteredRequests.length})</span>
          </button>

          {/* Map Base Type */}
          <button
            onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mapType === 'streets' ? '🛰️ ภาพดาวเทียม' : '🗺️ แผนที่ถนน'}</span>
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="bg-white p-2 rounded-3xl border border-slate-200/90 shadow-xl relative overflow-hidden">
        
        {/* Floating Urgency Filter Bar (Top of Map) */}
        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-md flex items-center gap-1 text-xs">
          <span className="text-[11px] font-bold text-slate-500 px-2 hidden sm:inline">กรองเหตุ:</span>
          <button
            onClick={() => setUrgencyFilter('ALL')}
            className={`px-2.5 py-1 rounded-xl font-semibold transition-colors cursor-pointer ${
              urgencyFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setUrgencyFilter('CRITICAL')}
            className={`px-2.5 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
              urgencyFilter === 'CRITICAL' ? 'bg-red-600 text-white' : 'text-red-700 hover:bg-red-50'
            }`}
          >
            🔴 วิกฤต
          </button>
          <button
            onClick={() => setUrgencyFilter('URGENT')}
            className={`px-2.5 py-1 rounded-xl font-semibold transition-colors cursor-pointer ${
              urgencyFilter === 'URGENT' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            🟡 เร่งด่วน
          </button>
          <button
            onClick={handleFitAll}
            className="ml-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title="ซูมพอดีทุกหมุด"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>

        {/* Leaflet Map Div */}
        <div 
          ref={mapContainerRef} 
          style={{ width: '100%', height: '620px', minHeight: '520px' }}
          className="w-full rounded-2xl z-10" 
        />

        {/* Comprehensive Flood & Weather Legend (Bottom Left) */}
        <div className="absolute bottom-5 left-5 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 shadow-xl text-xs space-y-2 max-w-[280px]">
          <div className="font-extrabold text-slate-900 text-[11px] uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span>คำอธิบายสัญลักษณ์แผนที่</span>
            <span className="text-[10px] text-slate-400 font-normal">v3.2</span>
          </div>

          {/* GISTDA Satellite Flood Depth Tiers */}
          <div>
            <div className="font-bold text-[10px] text-purple-900 mb-1 flex items-center gap-1">
              <Waves className="w-3 h-3 text-purple-600" />
              <span>ระดับน้ำท่วมดาวเทียม (GISTDA)</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-700 border border-purple-900 shrink-0"></span>
                <span>ม่วง: ลึก &gt; 1.8 ม. (มิดชั้น 1)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-600 border border-red-800 shrink-0"></span>
                <span>แดง: ลึก 1.2 - 2.0 ม.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500 border border-amber-700 shrink-0"></span>
                <span>ส้ม: ลึก 0.8 - 1.4 ม.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-sky-500 border border-sky-700 shrink-0"></span>
                <span>ฟ้า: ท่วมผิวจราจร</span>
              </div>
            </div>
          </div>

          {/* WeatherNext 3 Precipitation Radar */}
          <div className="border-t border-slate-100 pt-1.5">
            <div className="font-bold text-[10px] text-cyan-900 mb-1 flex items-center gap-1">
              <CloudRain className="w-3 h-3 text-cyan-600" />
              <span>เรดาร์ฝน AI (WeatherNext 3)</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-600 px-0.5">
              <span>ฝนเบาบาง</span>
              <div className="h-2 w-28 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-purple-600"></div>
              <span>พายุฝนหนัก</span>
            </div>
          </div>

          {/* SOS Markers */}
          <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
              <span className="font-bold text-red-700">วิกฤต</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="font-semibold text-amber-700">เร่งด่วน</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span className="font-medium text-emerald-700">ทั่วไป</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
