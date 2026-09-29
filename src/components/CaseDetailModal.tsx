import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Phone, 
  Navigation, 
  Users, 
  Package, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Copy, 
  Share2, 
  Edit3, 
  Save, 
  MessageSquare,
  Trash2,
  Lock,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import type { SOSRequest, RequestStatus } from '../types/sos';
import { 
  formatThaiDateTime, 
  getUrgencyInfo, 
  getWaterLevelInfo, 
  getStatusInfo, 
  getGoogleMapsUrl 
} from '../utils/formatters';
import { buildSosShareText, copyToClipboard, getLineShareUrl, getSmsLink } from '../utils/shareHelpers';

interface CaseDetailModalProps {
  request: SOSRequest | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: RequestStatus, note?: string, rescuer?: string) => void;
  isAdmin?: boolean;
  onDeleteCase?: (id: string) => void;
  onRequestAdminLogin?: () => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  request,
  onClose,
  onUpdateStatus,
  isAdmin = false,
  onDeleteCase,
  onRequestAdminLogin
}) => {
  if (!request) return null;

  const [copied, setCopied] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>(request.status);
  const [responderNotes, setResponderNotes] = useState<string>(request.responderNotes || '');
  const [rescuerName, setRescuerName] = useState<string>(request.rescuedBy || '');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const urgency = getUrgencyInfo(request.urgency);
  const water = getWaterLevelInfo(request.waterLevel);
  const currentStatus = getStatusInfo(request.status);
  const mapsUrl = getGoogleMapsUrl(request.coordinates.lat, request.coordinates.lng);
  const shareText = buildSosShareText(request);

  const handleCopy = async () => {
    const success = await copyToClipboard(shareText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveUpdate = () => {
    onUpdateStatus(request.id, selectedStatus, responderNotes, rescuerName);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header with Urgency theme */}
        <div className={`p-4 sm:p-5 text-white flex items-start justify-between ${
          request.urgency === 'CRITICAL' 
            ? 'bg-gradient-to-r from-red-600 to-rose-700' 
            : request.urgency === 'URGENT' 
            ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
            : 'bg-gradient-to-r from-emerald-600 to-teal-700'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold bg-black/25 px-2 py-0.5 rounded text-xs">
                {request.id}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                {urgency.shortLabel}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold">{request.fullName}</h2>
            <div className="text-xs text-white/80 flex items-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>แจ้งเหตุเมื่อ: {formatThaiDateTime(request.createdAt)}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Quick Rescuer Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <a
              href={`tel:${request.primaryPhone}`}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm text-center"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>โทรหาผู้ประสบภัย</span>
            </a>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm text-center"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>เปิด Google Maps</span>
            </a>

            <a
              href={getLineShareUrl(shareText)}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm text-center"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>แชร์เข้า LINE</span>
            </a>

            <button
              onClick={handleCopy}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความ'}</span>
            </button>
          </div>

          {/* Location & Landmark Section */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs sm:text-sm space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-red-600" />
              <span>ตำแหน่งและจุดสังเกต</span>
            </div>
            <p className="text-slate-700 pl-5">
              <b>ที่อยู่:</b> {request.address} ต.{request.subDistrict || '-'} อ.{request.district} จ.{request.province}
            </p>
            {request.landmark && (
              <div className="ml-5 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900 font-medium">
                🚩 <b>จุดสังเกตเด่น:</b> {request.landmark}
              </div>
            )}
            <div className="ml-5 text-slate-500 text-xs">
              พิกัด GPS: {request.coordinates.lat.toFixed(5)}, {request.coordinates.lng.toFixed(5)}
            </div>
          </div>

          {/* Inhabitants & Water Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>จำนวนผู้ประสบภัยที่ติดค้าง</span>
              </div>
              <ul className="space-y-1 text-slate-700">
                <li>• ผู้ใหญ่: <b>{request.people.adults} คน</b></li>
                <li>• ผู้สูงอายุ: <b>{request.people.elderly} คน</b></li>
                {request.people.bedridden > 0 && (
                  <li className="text-red-700 font-bold bg-red-50 p-1 rounded">
                    ⚠️ ผู้ป่วยติดเตียง / พิการ: {request.people.bedridden} คน
                  </li>
                )}
                <li>• เด็กเล็ก / ทารก: <b>{request.people.children} คน</b></li>
                {request.people.pets > 0 && (
                  <li>• สัตว์เลี้ยง: <b>{request.people.pets} ตัว</b></li>
                )}
              </ul>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>ระดับน้ำและสภาพแวดล้อม</span>
              </div>
              <div className="mb-2">
                <span className="text-slate-500 block mb-0.5">ระดับน้ำ:</span>
                <span className={`px-2 py-1 rounded font-bold border inline-block ${water.badgeColor}`}>
                  {water.label}
                </span>
                <p className="text-slate-500 text-[11px] mt-1">{water.description}</p>
              </div>

              {request.lineId && (
                <div className="text-slate-700 mt-2">
                  <b>LINE ID:</b> {request.lineId}
                </div>
              )}
            </div>
          </div>

          {/* Urgent Needs */}
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>ความต้องการเร่งด่วน</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {request.needs.map((need, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium text-xs border border-emerald-200"
                >
                  ✓ {need}
                </span>
              ))}
            </div>
          </div>

          {/* Additional Notes or Image */}
          {request.notes && (
            <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
              <b>ข้อความเพิ่มเติมจากผู้แจ้ง:</b>
              <p className="mt-1 italic">{request.notes}</p>
            </div>
          )}

          {request.imageUrl && (
            <div>
              <span className="block text-xs font-bold text-slate-700 mb-1">ภาพถ่ายสถานที่จริง:</span>
              <img
                src={request.imageUrl}
                alt="ภาพถ่ายน้ำท่วม"
                className="w-full max-h-64 object-cover rounded-xl border border-slate-300"
              />
            </div>
          )}

          {/* Rescuer Status Section */}
          <div className="border-t border-slate-200 pt-4 bg-slate-50 -mx-4 -mb-4 p-4 sm:p-5 rounded-b-3xl">
            {isAdmin ? (
              /* ======================================================== */
              /* Admin / Rescuer Mode: Full Editable Controls             */
              /* ======================================================== */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-purple-700" />
                    <span>บันทึกสถานะการเข้าช่วยเหลือ (โหมดแอดมิน / กู้ภัย)</span>
                  </h4>
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full">
                    ✓ ปลดล็อคสิทธิ์แล้ว
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะปัจจุบัน</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as RequestStatus)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-purple-400 font-medium"
                    >
                      <option value="PENDING">🔴 รอดำเนินการ (PENDING)</option>
                      <option value="RESPONDING">🟡 ทีมกู้ภัยกำลังเดินทางไปช่วย (RESPONDING)</option>
                      <option value="COMPLETED">🟢 ช่วยเหลือสำเร็จแล้ว (COMPLETED)</option>
                      <option value="CANCELLED">⚪ ยกเลิกเคส (CANCELLED)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อทีมกู้ภัย / ผู้รับผิดชอบ</label>
                    <input
                      type="text"
                      placeholder="เช่น กู้ภัยสว่างเชียงราย ทีม 2"
                      value={rescuerName}
                      onChange={(e) => setRescuerName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-purple-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">บันทึกการปฏิบัติการ</label>
                  <textarea
                    rows={2}
                    placeholder="เช่น ส่งเรือท้องแบนเข้าช่วยอพยพผู้ป่วยไปยังโรงพยาบาลสนามเรียบร้อย"
                    value={responderNotes}
                    onChange={(e) => setResponderNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <button
                  onClick={handleSaveUpdate}
                  className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaved ? '✓ บันทึกข้อมูลเรียบร้อยแล้ว' : 'บันทึกการเปลี่ยนแปลงสถานะ'}</span>
                </button>

                {onDeleteCase && (
                  <div className="pt-2 border-t border-purple-200/80 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเคส "${request.fullName}" (รหัส: ${request.id}) ออกจากระบบ?`)) {
                          onDeleteCase(request.id);
                          onClose();
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-red-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบเคสนี้ออกจากระบบ</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ======================================================== */
              /* Public Viewer Mode: Read-Only with Security Lock Notice  */
              /* ======================================================== */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>สถานะการช่วยเหลือและบันทึกกู้ภัย</span>
                  </h4>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${currentStatus.badgeClass}`}>
                    {currentStatus.label}
                  </span>
                </div>

                {/* Read-Only Status Details */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">ทีมกู้ภัยที่รับผิดชอบ:</span>
                    <span className="font-bold text-slate-800">
                      {request.rescuedBy ? `🚒 ${request.rescuedBy}` : '— รอทีมกู้ภัยลงพื้นที่รับเรื่อง —'}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 pt-2">
                    <span className="text-slate-500 font-medium block mb-1">บันทึกการปฏิบัติการ:</span>
                    <div className="bg-slate-50 p-2.5 rounded-xl text-slate-700 text-xs whitespace-pre-wrap border border-slate-200/60 leading-relaxed">
                      {request.responderNotes || 'ยังไม่มีบันทึกเพิ่มเติมจากเจ้าหน้าที่'}
                    </div>
                  </div>
                </div>

                {/* Security Lock Card & Unlock Button */}
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-900 leading-relaxed">
                      <span className="font-bold">ระบบรักษาความปลอดภัย:</span> บุคคลทั่วไปสามารถดูข้อมูลได้อย่างเดียว เพื่อป้องกันการแก้ไขข้อมูลโดยไม่ได้รับอนุญาต
                    </div>
                  </div>

                  {onRequestAdminLogin && (
                    <button
                      type="button"
                      onClick={onRequestAdminLogin}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>เจ้าหน้าที่กู้ภัย? ใส่ PIN</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
