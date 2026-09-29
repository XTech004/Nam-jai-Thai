import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Phone, 
  Navigation, 
  Clock, 
  MapPin, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Share2, 
  RefreshCw,
  Copy,
  ChevronDown,
  Trash2,
  LifeBuoy,
  PlusCircle,
  Sparkles
} from 'lucide-react';
import type { SOSRequest, RequestStatus } from '../types/sos';
import { formatThaiDateTime, getUrgencyInfo, getWaterLevelInfo, getStatusInfo, getGoogleMapsUrl } from '../utils/formatters';
import { buildSosShareText, copyToClipboard } from '../utils/shareHelpers';

interface RescueFeedProps {
  requests: SOSRequest[];
  onSelectCase: (request: SOSRequest) => void;
  onUpdateStatus: (id: string, status: RequestStatus, note?: string, rescuer?: string) => void;
  onResetMock?: () => void;
  isAdmin?: boolean;
  onDeleteCase?: (id: string) => void;
  onDeleteAllCompleted?: () => void;
  onClearAll?: () => void;
}

export const RescueFeed: React.FC<RescueFeedProps> = ({
  requests,
  onSelectCase,
  onUpdateStatus,
  onResetMock,
  isAdmin = false,
  onDeleteCase,
  onDeleteAllCompleted,
  onClearAll
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [provinceFilter, setProvinceFilter] = useState<string>('ALL');
  const [copyStatusId, setCopyStatusId] = useState<string | null>(null);

  // Available provinces
  const provinces = useMemo(() => {
    const set = new Set<string>();
    requests.forEach(r => {
      if (r.province) set.add(r.province);
    });
    return Array.from(set);
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = req.fullName.toLowerCase().includes(term);
        const matchesPhone = req.primaryPhone.includes(term) || (req.secondaryPhone?.includes(term) ?? false);
        const matchesLoc = `${req.province} ${req.district} ${req.subDistrict} ${req.address} ${req.landmark}`.toLowerCase().includes(term);
        const matchesId = req.id.toLowerCase().includes(term);
        if (!matchesName && !matchesPhone && !matchesLoc && !matchesId) {
          return false;
        }
      }

      // Urgency filter
      if (urgencyFilter !== 'ALL' && req.urgency !== urgencyFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && req.status !== statusFilter) {
        return false;
      }

      // Province filter
      if (provinceFilter !== 'ALL' && req.province !== provinceFilter) {
        return false;
      }

      return true;
    });
  }, [requests, searchTerm, urgencyFilter, statusFilter, provinceFilter]);

  const handleCopy = async (req: SOSRequest, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = buildSosShareText(req);
    await copyToClipboard(text);
    setCopyStatusId(req.id);
    setTimeout(() => setCopyStatusId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 sm:py-8">
      
      {/* Title & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              รายการขอความช่วยเหลือ (Live Feed)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            กระดานข้อมูลสดแบบเรียลไทม์ สำหรับทีมกู้ภัย จิตอาสา และศูนย์ประสานงาน
          </p>
        </div>

        {/* Admin Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && onDeleteAllCompleted && requests.some(r => r.status === 'COMPLETED') && (
            <button
              onClick={() => {
                const count = requests.filter(r => r.status === 'COMPLETED').length;
                if (window.confirm(`คุณต้องการลบเคสที่ช่วยเหลือสำเร็จแล้วทั้งหมด (${count} เคส) ออกจากระบบหรือไม่?`)) {
                  onDeleteAllCompleted();
                }
              }}
              title="ลบเคสที่ช่วยเหลือสำเร็จแล้วทั้งหมด (เฉพาะแอดมิน)"
              className="text-xs text-red-600 hover:text-white hover:bg-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-all font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบเคสสำเร็จแล้ว ({requests.filter(r => r.status === 'COMPLETED').length})</span>
            </button>
          )}

          {isAdmin && onClearAll && requests.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`⚠️ คำเตือน: คุณต้องการล้างข้อมูลทั้งหมดในระบบให้ว่างเปล่า (${requests.length} เคส) หรือไม่?\n\nข้อมูลจะถูกล้างออกจากฐานข้อมูลอย่างถาวร เพื่อให้ระบบโล่งพร้อมใช้งานจริง`)) {
                  onClearAll();
                }
              }}
              title="ล้างข้อมูลทั้งหมดให้ระบบว่างเปล่า/โล่ง (เฉพาะแอดมิน)"
              className="text-xs text-white bg-red-600 hover:bg-red-700 border border-red-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-all font-bold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างกระดานให้โล่ง ({requests.length})</span>
            </button>
          )}

          {onResetMock && (
            <button
              onClick={onResetMock}
              title="รีเซ็ตเป็นข้อมูลตัวอย่างตั้งต้น"
              className="text-xs text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ข้อมูลตัวอย่าง</span>
            </button>
          )}
        </div>
      </div>

      {/* If No Requests At All -> Beautiful, Serene Empty State (Decluttered!) */}
      {requests.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xs">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">
            ยังไม่มีรายการขอความช่วยเหลือในระบบ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            กระดานข้อมูลว่างเปล่าและพร้อมใช้งานจริง ข้อมูลที่ประชาชนแจ้งผ่านหน้า "แจ้ง SOS ด่วน" จะปรากฏขึ้นที่นี่แบบเรียลไทม์ทันที
          </p>
        </div>
      ) : (
        <>
          {/* Filter and Search Box (Only shown when there are requests) */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] mb-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาชื่อ, เบอร์โทร, จังหวัด, อำเภอ หรือจุดสังเกต..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50/60"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setUrgencyFilter('ALL')}
                className={`px-3 py-1 rounded-xl font-medium transition-all ${
                  urgencyFilter === 'ALL'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ทั้งหมด ({requests.length})
              </button>

              <button
                onClick={() => setUrgencyFilter('CRITICAL')}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  urgencyFilter === 'CRITICAL'
                    ? 'bg-red-600 text-white ring-2 ring-red-200'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                🔴 วิกฤต ({requests.filter(r => r.urgency === 'CRITICAL').length})
              </button>

              <button
                onClick={() => setUrgencyFilter('URGENT')}
                className={`px-3 py-1 rounded-xl font-semibold transition-all ${
                  urgencyFilter === 'URGENT'
                    ? 'bg-amber-500 text-slate-900 ring-2 ring-amber-200'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                🟡 เร่งด่วน ({requests.filter(r => r.urgency === 'URGENT').length})
              </button>

              <button
                onClick={() => setUrgencyFilter('NORMAL')}
                className={`px-3 py-1 rounded-xl font-medium transition-all ${
                  urgencyFilter === 'NORMAL'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                🟢 ทั่วไป ({requests.filter(r => r.urgency === 'NORMAL').length})
              </button>

              {/* Status and Province dropdowns */}
              <div className="ml-auto flex items-center gap-1.5">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1 focus:outline-none"
                >
                  <option value="ALL">สถานะทั้งหมด</option>
                  <option value="PENDING">รอดำเนินการ</option>
                  <option value="RESPONDING">กำลังไปช่วย</option>
                  <option value="COMPLETED">ช่วยเหลือแล้ว</option>
                </select>

                {provinces.length > 0 && (
                  <select
                    value={provinceFilter}
                    onChange={(e) => setProvinceFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1 focus:outline-none"
                  >
                    <option value="ALL">ทุกจังหวัด</option>
                    {provinces.map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Case List Feed */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/80 p-6">
              <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700 text-sm">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</h3>
              <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือกดเลือกตัวกรอง "ทั้งหมด"</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredRequests.map((req) => {
                const urgency = getUrgencyInfo(req.urgency);
                const water = getWaterLevelInfo(req.waterLevel);
                const status = getStatusInfo(req.status);

                return (
                  <div
                    key={req.id}
                    onClick={() => onSelectCase(req)}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer p-4 sm:p-5 relative"
                  >
                    {/* Header Row: ID, Time, Urgency & Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${urgency.badgeClass}`}>
                          {urgency.shortLabel}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {req.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatThaiDateTime(req.createdAt)}</span>
                      </div>
                    </div>

                    {/* Primary Contact & Location */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                      <div className="md:col-span-7">
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          <span>{req.fullName}</span>
                          {req.people.bedridden > 0 && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold border border-red-200">
                              มีผู้ป่วยติดเตียง ({req.people.bedridden})
                            </span>
                          )}
                        </h3>

                        {/* Address & Landmark */}
                        <div className="text-xs text-slate-600 mt-1 space-y-1">
                          <p className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span className="font-medium">
                              {req.address} ต.{req.subDistrict || '-'} อ.{req.district} จ.{req.province}
                            </span>
                          </p>
                          {req.landmark && (
                            <p className="text-slate-800 bg-amber-50/80 p-1.5 rounded-xl border border-amber-200/60 font-medium text-[11px]">
                              🚩 จุดสังเกต: {req.landmark}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Water & Inhabitants summary */}
                      <div className="md:col-span-5 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/70 text-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-500 text-[11px]">ระดับน้ำ:</span>
                            <span className={`px-2 py-0.5 rounded-md font-bold border text-[11px] ${water.badgeColor}`}>
                              {water.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-700 text-[11px]">
                            <span className="text-slate-500">ผู้ประสบภัย:</span>
                            <span className="font-semibold">
                              ผู้ใหญ่ {req.people.adults} | คนแก่ {req.people.elderly} | เด็ก {req.people.children}
                              {req.people.pets > 0 ? ` | สัตว์ ${req.people.pets}` : ''}
                            </span>
                          </div>
                        </div>

                        {req.responderNotes && (
                          <div className="mt-2 pt-1 border-t border-slate-200 text-[11px] text-blue-700 font-medium truncate">
                            🚑 {req.responderNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Needs Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {req.needs.map((need, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 bg-slate-100/90 text-slate-700 rounded-md border border-slate-200/80"
                        >
                          • {need}
                        </span>
                      ))}
                    </div>

                    {/* Notes if any */}
                    {req.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 mb-3 italic">
                        "{req.notes}"
                      </p>
                    )}

                    {/* Rescuer Quick Actions Bar */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Direct Call Button */}
                        <a
                          href={`tel:${req.primaryPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>โทร: {req.primaryPhone}</span>
                        </a>

                        {/* Google Maps Nav */}
                        <a
                          href={getGoogleMapsUrl(req.coordinates.lat, req.coordinates.lng)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>นำทาง</span>
                        </a>

                        {/* Copy info */}
                        <button
                          type="button"
                          onClick={(e) => handleCopy(req, e)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1 border border-slate-300 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copyStatusId === req.id ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
                        </button>
                      </div>

                      {/* Status Toggle Buttons & Admin Delete */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => onUpdateStatus(req.id, 'RESPONDING', 'ทีมกู้ภัยรับเรื่องแล้ว กำลังเดินทางเข้าช่วยเหลือ')}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer"
                          >
                            รับเคส / ไปช่วย
                          </button>
                        )}
                        {req.status === 'RESPONDING' && (
                          <button
                            onClick={() => onUpdateStatus(req.id, 'COMPLETED', 'ช่วยเหลือและส่งตัวยังศูนย์พักพิงเรียบร้อย')}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                          >
                            ✓ ช่วยสำเร็จแล้ว
                          </button>
                        )}
                        {req.status === 'COMPLETED' && (
                          <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" /> สำเร็จแล้ว
                          </span>
                        )}

                        {isAdmin && onDeleteCase && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`คุณต้องการลบเคส "${req.fullName}" (รหัส: ${req.id}) ออกจากระบบหรือไม่?`)) {
                                onDeleteCase(req.id);
                              }
                            }}
                            title="ลบเคสนี้ออกจากระบบ (เฉพาะแอดมิน)"
                            className="px-2 py-1 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1 border border-red-200 cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบ</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
  );
};
