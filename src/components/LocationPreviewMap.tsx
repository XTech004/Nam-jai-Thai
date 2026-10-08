import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Satellite, Map as MapIcon, ExternalLink, CheckCircle2, Move, Sparkles, Loader2 } from 'lucide-react';
import { getGoogleMapsUrl } from '../utils/formatters';

interface LocationPreviewMapProps {
  lat: number;
  lng: number;
  onLocationChange?: (newLat: number, newLng: number) => void;
  isFromGoogleMaps?: boolean;
  googleMapsUrl?: string;
  isGeocoding?: boolean;
  autoFilledSummary?: string;
  onTriggerAutoFill?: () => void;
}

export const LocationPreviewMap: React.FC<LocationPreviewMapProps> = ({
  lat,
  lng,
  onLocationChange,
  isFromGoogleMaps = false,
  googleMapsUrl,
  isGeocoding = false,
  autoFilledSummary,
  onTriggerAutoFill
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({ lat, lng });

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Custom glowing rescue marker
    const pinIcon = L.divIcon({
      className: 'preview-location-pin',
      html: `
        <div style="position:relative;display:grid;place-items:center;width:40px;height:40px;">
          <span style="position:absolute;width:40px;height:40px;border-radius:9999px;background:rgba(225,29,72,0.35);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
          <div style="
            position:relative;width:28px;height:28px;border-radius:9999px;
            background:#e11d48;border:3px solid #ffffff;
            box-shadow:0 8px 16px -2px rgba(15,23,42,0.6);
            display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z"></path>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([lat, lng], {
      icon: pinIcon,
      draggable: true,
      title: 'ลากเพื่อปรับตำแหน่งให้ตรงบ้าน',
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setCurrentCoords({ lat: pos.lat, lng: pos.lng });
      if (onLocationChange) {
        onLocationChange(pos.lat, pos.lng);
      }
    });

    markerRef.current = marker;
    mapRef.current = map;

    // Invalidate size to ensure full container fill
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center & marker position when lat/lng changes from parent
  useEffect(() => {
    setCurrentCoords({ lat, lng });
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom() || 16, { animate: true });
    }
  }, [lat, lng]);

  // Switch between Street and Satellite imagery
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    if (mapType === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18 }
      ).addTo(mapRef.current);
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current);
    }
  }, [mapType]);

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView([currentCoords.lat, currentCoords.lng], 17, { animate: true });
    }
  };

  const previewGoogleUrl = googleMapsUrl || getGoogleMapsUrl(currentCoords.lat, currentCoords.lng);

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      {/* Header status bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span className="font-bold text-slate-800 truncate">
            {isFromGoogleMaps ? 'เชื่อมกับ Google Maps สำเร็จ' : 'พิกัดบนแผนที่'}
          </span>
          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
            {isFromGoogleMaps ? 'แม่นยำสูง' : 'พร้อมส่ง'}
          </span>
          {isGeocoding && (
            <span className="flex items-center gap-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 animate-pulse shrink-0">
              <Loader2 className="size-2.5 animate-spin text-sky-600" />
              <span>ตรวจจับที่อยู่...</span>
            </span>
          )}
          {!isGeocoding && autoFilledSummary && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
              <Sparkles className="size-2.5 text-emerald-600" />
              <span>กรอกที่อยู่อัตโนมัติแล้ว</span>
            </span>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMapType('streets')}
            className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
              mapType === 'streets' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ถนน
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
              mapType === 'satellite' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Satellite className="size-2.5" />
            ดาวเทียม
          </button>
        </div>
      </div>

      {/* Map container */}
      <div className="relative h-44 w-full bg-slate-100">
        <div ref={containerRef} className="h-full w-full" />

        {/* Quick action buttons on map */}
        <div className="absolute bottom-2.5 right-2.5 z-400 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRecenter}
            className="rounded-xl bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-md backdrop-blur-xs transition-colors hover:bg-white cursor-pointer"
            title="จัดกึ่งกลางหมุด"
          >
            เล็งหมุด
          </button>
          <a
            href={previewGoogleUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-xl bg-slate-900/90 hover:bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-xs transition-colors"
            title="เปิดตรวจสอบบน Google Maps"
          >
            <span>Google Maps</span>
            <ExternalLink className="size-3" />
          </a>
        </div>

        {/* Drag guidance tag */}
        <div className="absolute top-2 left-2 z-400 pointer-events-none">
          <span className="flex items-center gap-1 rounded-lg bg-slate-900/80 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-xs shadow-xs">
            <Move className="size-2.5 text-rose-300" />
            ลากหมุดสีแดงเพื่อขยับตำแหน่งได้
          </span>
        </div>
      </div>

      {/* Footer coordinates bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span>ละติจูด: <b className="text-slate-800 font-mono">{currentCoords.lat.toFixed(5)}</b></span>
          <span>ลองจิจูด: <b className="text-slate-800 font-mono">{currentCoords.lng.toFixed(5)}</b></span>
        </div>
        {onTriggerAutoFill && (
          <button
            type="button"
            onClick={onTriggerAutoFill}
            disabled={isGeocoding}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="size-3 text-blue-600" />
            <span>กรอกที่อยู่อัตโนมัติจากหมุด</span>
          </button>
        )}
      </div>
    </div>
  );
};
