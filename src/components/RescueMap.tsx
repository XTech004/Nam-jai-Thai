import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { SOSRequest } from '../types/sos';
import { getUrgencyInfo, getWaterLevelInfo, getGoogleMapsUrl, formatThaiDateTime } from '../utils/formatters';
import { MapPin, Navigation, Phone, Filter, Maximize2 } from 'lucide-react';

interface RescueMapProps {
  requests: SOSRequest[];
  onSelectCase: (req: SOSRequest) => void;
}

export const RescueMap: React.FC<RescueMapProps> = ({ requests, onSelectCase }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');

  // Filter requests
  const filteredRequests = requests.filter(r => {
    if (urgencyFilter !== 'ALL' && r.urgency !== urgencyFilter) return false;
    return true;
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Default center in Northern / Central Thailand
    const map = L.map(mapContainerRef.current, {
      center: [18.5, 100.0],
      zoom: 7,
      zoomControl: true,
    });

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | ThaiFlood SOS',
      maxZoom: 19,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when requests or filter change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    const bounds: [number, number][] = [];

    filteredRequests.forEach((req) => {
      const { lat, lng } = req.coordinates;
      if (!lat || !lng) return;

      bounds.push([lat, lng]);

      const urgency = getUrgencyInfo(req.urgency);
      const water = getWaterLevelInfo(req.waterLevel);

      // Create Custom SVG DivIcon
      const isCritical = req.urgency === 'CRITICAL';
      const markerHtml = `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
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
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 13px;
            font-weight: bold;
          ">
            ${isCritical ? '🚨' : req.urgency === 'URGENT' ? '⚠️' : '📍'}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-flood-pin',
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Popup Content
      const popupHtml = `
        <div style="min-width: 220px; font-family: 'Prompt', sans-serif; font-size: 12px; line-height: 1.4; color: #1e293b;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: bold; color: ${urgency.markerColor}; font-size: 11px;">
              ${urgency.shortLabel}
            </span>
            <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">
              ${req.id}
            </span>
          </div>

          <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #0f172a;">
            ${req.fullName}
          </div>

          <div style="color: #475569; margin-bottom: 4px;">
            📍 ${req.address || ''} อ.${req.district} จ.${req.province}
          </div>

          ${
            req.landmark
              ? `<div style="background: #fffbeb; padding: 4px 6px; border-radius: 6px; border: 1px solid #fde68a; margin-bottom: 6px; font-size: 11px;">
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
              📞 โทร
            </a>
            <a href="${getGoogleMapsUrl(lat, lng)}" target="_blank" style="flex: 1; text-align: center; background: #2563eb; color: white; padding: 6px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 11px;">
              🗺️ นำทาง
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        // Option to trigger parent callback
      });

      markersGroup.addLayer(marker);
    });

    // Fit Bounds if markers exist
    if (bounds.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [filteredRequests]);

  const handleFitAll = () => {
    if (!mapInstanceRef.current || filteredRequests.length === 0) return;
    const bounds: [number, number][] = filteredRequests.map(r => [r.coordinates.lat, r.coordinates.lng]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
      
      {/* Header and Map Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>🗺️ แผนที่พิกัดผู้ประสบอุทกภัย (Rescue Map)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            คลิกที่หมุดบนแผนที่เพื่อดูข้อมูลผู้ประสบภัย โทรติดต่อ หรือเปิดระบบนำทางเรือ/รถยกสูง
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Urgency Filter buttons */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1 text-xs">
            <button
              onClick={() => setUrgencyFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                urgencyFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ทั้งหมด ({requests.length})
            </button>
            <button
              onClick={() => setUrgencyFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                urgencyFilter === 'CRITICAL' ? 'bg-red-600 text-white' : 'text-red-700 hover:bg-red-50'
              }`}
            >
              🔴 วิกฤต
            </button>
            <button
              onClick={() => setUrgencyFilter('URGENT')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                urgencyFilter === 'URGENT' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              🟡 เร่งด่วน
            </button>
            <button
              onClick={() => setUrgencyFilter('NORMAL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                urgencyFilter === 'NORMAL' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              🟢 ทั่วไป
            </button>
          </div>

          <button
            onClick={handleFitAll}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>ซูมดูทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden">
        <div 
          ref={mapContainerRef} 
          className="w-full h-[520px] sm:h-[600px] rounded-xl z-10" 
        />

        {/* Legend Overlay at bottom left */}
        <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5 max-w-[200px]">
          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
            สัญลักษณ์ระดับความเร่งด่วน
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-red-300"></span>
            <span className="text-slate-700 font-bold">สีแดง: วิกฤตถึงชีวิต</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-slate-700 font-semibold">สีเหลือง: เร่งด่วน/น้ำขึ้น</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
            <span className="text-slate-700 font-medium">สีเขียว: ช่วยเหลือทั่วไป</span>
          </div>
        </div>
      </div>

    </div>
  );
};
