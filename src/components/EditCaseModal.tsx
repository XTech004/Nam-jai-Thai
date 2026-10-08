import React, { useState } from 'react';
import {
  X,
  Save,
  AlertTriangle,
  Users,
  Waves,
  MapPin,
  Flag,
  Phone,
  MessageCircle,
  CheckCircle2,
  Lock,
  OctagonAlert,
  Info,
  Footprints,
  Building2,
  Home,
  ShieldOff,
  Plus,
  Minus,
  Check,
  AlertOctagon
} from 'lucide-react';
import type { SOSRequest, WaterLevel, UrgencyLevel, PeopleCount, RequestStatus, UserProfile } from '../types/sos';
import { COMMON_NEEDS_LIST } from '../data/mockData';
import { canEditCase, isMyCase } from '../services/userService';

interface EditCaseModalProps {
  request: SOSRequest;
  isOpen: boolean;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSave: (updatedRequest: SOSRequest) => void;
  onOpenLineLogin: () => void;
}

const WATER_LEVELS: { id: WaterLevel; label: string; desc: string }[] = [
  { id: 'ROOF_TOP', label: 'บนหลังคา / ดาดฟ้า', desc: 'วิกฤตสูงสุด น้ำท่วมมิดชั้น 2' },
  { id: 'SECOND_FLOOR', label: 'ท่วมชั้น 1 (อยู่ชั้น 2)', desc: 'น้ำมิดชั้นล่าง ไม่สามารถลงมาชั้นล่างได้' },
  { id: 'WAIST_CHEST', label: 'ระดับเอว - หน้าอก', desc: 'น้ำสูง ~80-130 ซม. เดินลุยน้ำยากลำบาก' },
  { id: 'ANKLE_KNEE', label: 'ระดับข้อเท้า - เข่า', desc: 'น้ำสูง ~20-50 ซม. รถเล็กวิ่งไม่ได้' },
  { id: 'SURROUNDED', label: 'น้ำล้อมรอบ / ตัดขาด', desc: 'เกาะดอน ถนนทางเข้า-ออกถูกตัดขาด' }
];

const URGENCY_OPTIONS: { id: UrgencyLevel; label: string; badge: string }[] = [
  { id: 'CRITICAL', label: 'วิกฤตสีแดง (อันตรายถึงชีวิต)', badge: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'URGENT', label: 'เร่งด่วนสีเหลือง (ต้องการเรืออพยพ)', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'NORMAL', label: 'ทั่วไปสีเขียว (ขอถุงยังชีพ/ยาสามัญ)', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
];

export const EditCaseModal: React.FC<EditCaseModalProps> = ({
  request,
  isOpen,
  currentUser,
  onClose,
  onSave,
  onOpenLineLogin
}) => {
  if (!isOpen) return null;

  const permission = canEditCase(request, currentUser);
  const isOwner = isMyCase(request, currentUser);

  // Form State initialized from request
  const [urgency, setUrgency] = useState<UrgencyLevel>(request.urgency);
  const [waterLevel, setWaterLevel] = useState<WaterLevel>(request.waterLevel);
  const [people, setPeople] = useState<PeopleCount>({ ...request.people });
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([...request.needs]);
  const [customNeed, setCustomNeed] = useState<string>('');
  const [landmark, setLandmark] = useState<string>(request.landmark || '');
  const [address, setAddress] = useState<string>(request.address || '');
  const [primaryPhone, setPrimaryPhone] = useState<string>(request.primaryPhone || '');
  const [secondaryPhone, setSecondaryPhone] = useState<string>(request.secondaryPhone || '');
  const [lineId, setLineId] = useState<string>(request.lineId || '');
  const [notes, setNotes] = useState<string>(request.notes || '');
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleUpdatePeople = (key: keyof PeopleCount, delta: number) => {
    setPeople(prev => {
      const nextVal = Math.max(0, (prev[key] || 0) + delta);
      const nextState = { ...prev, [key]: nextVal };
      // Auto-escalate to CRITICAL if bedridden > 0
      if (key === 'bedridden' && nextVal > 0) {
        setUrgency('CRITICAL');
      }
      return nextState;
    });
  };

  const handleToggleNeed = (need: string) => {
    setSelectedNeeds(prev =>
      prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]
    );
  };

  const handleAddCustomNeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (customNeed.trim() && !selectedNeeds.includes(customNeed.trim())) {
      setSelectedNeeds(prev => [...prev, customNeed.trim()]);
      setCustomNeed('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permission.allowed) return;

    setIsSaving(true);

    const updated: SOSRequest = {
      ...request,
      urgency,
      waterLevel,
      people,
      needs: selectedNeeds.length > 0 ? selectedNeeds : ['ต้องการความช่วยเหลือเร่งด่วน'],
      landmark: landmark.trim(),
      address: address.trim(),
      primaryPhone: primaryPhone.trim(),
      secondaryPhone: secondaryPhone.trim() || undefined,
      lineId: lineId.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      updatedAt: new Date().toISOString(),
      // Ensure LINE UID stamped if available
      createdByLineUserId: request.createdByLineUserId || currentUser?.lineUserId || undefined,
      createdByUserId: request.createdByUserId || currentUser?.id || undefined,
    };

    onSave(updated);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="relative my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <svg className="size-5 fill-white" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 5.82 2 10.53c0 2.94 1.76 5.53 4.45 6.99-.18.66-.66 2.39-.75 2.76-.12.45.16.44.34.32.14-.09 1.94-1.32 2.73-1.85.4.06.81.09 1.23.09 5.52 0 10-3.82 10-8.53S17.52 2 12 2z"/>
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">แก้ไขข้อมูลเคสของคุณ</h3>
                <span className="rounded-md bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                  {request.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                อัปเดตสถานการณ์น้ำ จำนวนคน หรือความต้องการเร่งด่วนแบบเรียลไทม์
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="ปิด"
            className="grid size-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Permission Gate Check */}
        {!permission.allowed ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-amber-50 text-amber-600 border border-amber-200">
              <Lock className="size-8" />
            </div>

            {permission.reason === 'NOT_LOGGED_IN' && (
              <>
                <h4 className="text-lg font-black text-slate-900">
                  เข้าสู่ระบบด้วย LINE เพื่อแก้ไขข้อมูลเคสนี้
                </h4>
                <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-600">
                  เพื่อความปลอดภัยและป้องกันบุคคลอื่นเปลี่ยนแปลงข้อมูล ระบบกำหนดให้เฉพาะผู้แจ้งที่เข้าสู่ระบบด้วย <b>LINE</b> เท่านั้นที่สามารถแก้ไขสถานการณ์หรือยกเลิกคำขอได้
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLineLogin();
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <svg className="size-5 fill-white shrink-0" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 5.82 2 10.53c0 2.94 1.76 5.53 4.45 6.99-.18.66-.66 2.39-.75 2.76-.12.45.16.44.34.32.14-.09 1.94-1.32 2.73-1.85.4.06.81.09 1.23.09 5.52 0 10-3.82 10-8.53S17.52 2 12 2z"/>
                    </svg>
                    <span>เข้าสู่ระบบด้วย LINE เดี๋ยวนี้</span>
                  </button>
                </div>
              </>
            )}

            {permission.reason === 'NOT_LINE_USER' && (
              <>
                <h4 className="text-lg font-black text-slate-900">
                  ต้องเข้าสู่ระบบด้วยบัญชี LINE
                </h4>
                <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-600">
                  คุณกำลังเข้าสู่ระบบด้วยเบอร์โทรศัพท์ เพื่อสิทธิ์ในการแก้ไขข้อมูล โปรดเข้าสู่ระบบด้วย <b>LINE</b> เพื่อยืนยันความเป็นเจ้าของเคส
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLineLogin();
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] px-6 py-3 text-sm font-bold text-white shadow-md transition-all cursor-pointer"
                  >
                    <svg className="size-5 fill-white shrink-0" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 5.82 2 10.53c0 2.94 1.76 5.53 4.45 6.99-.18.66-.66 2.39-.75 2.76-.12.45.16.44.34.32.14-.09 1.94-1.32 2.73-1.85.4.06.81.09 1.23.09 5.52 0 10-3.82 10-8.53S17.52 2 12 2z"/>
                    </svg>
                    <span>สลับไปเข้าสู่ระบบด้วย LINE</span>
                  </button>
                </div>
              </>
            )}

            {permission.reason === 'NOT_OWNER' && (
              <>
                <h4 className="text-lg font-black text-slate-900">
                  คุณไม่มีสิทธิ์แก้ไขเคสนี้
                </h4>
                <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-600">
                  เคสนี้ถูกสร้างโดยผู้ใช้งานอื่น คุณสามารถติดตามสถานะการช่วยเหลือได้ที่หน้ารายการเคส แต่ไม่สามารถแก้ไขข้อมูลของผู้ประสบภัยท่านนี้ได้
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    กลับสู่หน้ารายละเอียดเคส
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* Allowed: Editable Form for Citizen Case Owner            */
          /* ======================================================== */
          <form onSubmit={handleSubmit} className="max-h-[78vh] overflow-y-auto p-5 sm:p-6 space-y-5">
            
            {/* Status (Display Only) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                สถานะคำขอปัจจุบัน
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {status === 'PENDING' && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-2xs">
                    <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                    <span>🟡 รอดำเนินการ (รอทีมกู้ภัยเข้าพื้นที่รับเรื่อง)</span>
                  </span>
                )}
                {status === 'RESPONDING' && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-900 shadow-2xs">
                    <span className="size-2 rounded-full bg-sky-500 animate-pulse" />
                    <span>🚨 กำลังเข้าช่วยเหลือ (มีทีมกู้ภัยรับเรื่องแล้ว)</span>
                  </span>
                )}
                {status === 'COMPLETED' && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-2xs">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>🟢 ปลอดภัยแล้ว / ได้รับการช่วยเหลือเรียบร้อย</span>
                  </span>
                )}
                {status === 'CANCELLED' && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs">
                    <span>⚪ ยกเลิกคำขอแล้ว</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                * สถานะจะได้รับการอัปเดตและบันทึกโดยตรงจากทีมกู้ภัยในพื้นที่
              </p>
            </div>

            {/* Urgency Level */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                ระดับความเร่งด่วน
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {URGENCY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setUrgency(opt.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      urgency === opt.id
                        ? `${opt.badge} ring-2 ring-offset-1`
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Water Level */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                ระดับน้ำปัจจุบัน
              </label>
              <div className="space-y-1.5">
                {WATER_LEVELS.map(w => (
                  <label
                    key={w.id}
                    onClick={() => setWaterLevel(w.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      waterLevel === w.id
                        ? 'border-sky-500 bg-sky-50 text-sky-950 ring-2 ring-sky-300 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block font-bold">{w.label}</span>
                      <span className="text-[11px] font-normal text-slate-500">{w.desc}</span>
                    </div>
                    {waterLevel === w.id && <Check className="size-4 text-sky-600" />}
                  </label>
                ))}
              </div>
            </div>

            {/* People Count */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                จำนวนผู้ประสบภัยที่ติดค้าง
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { key: 'adults' as const, label: 'ผู้ใหญ่' },
                  { key: 'elderly' as const, label: 'ผู้สูงอายุ' },
                  { key: 'bedridden' as const, label: 'ผู้ป่วยติดเตียง', highlight: true },
                  { key: 'children' as const, label: 'เด็กเล็ก/ทารก' },
                  { key: 'pets' as const, label: 'สัตว์เลี้ยง' }
                ].map(({ key, label, highlight }) => (
                  <div
                    key={key}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      highlight && (people[key] || 0) > 0
                        ? 'border-red-300 bg-red-50/70 text-red-950'
                        : 'border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    <span className="text-xs font-semibold">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdatePeople(key, -1)}
                        className="size-6 rounded-lg bg-slate-100 hover:bg-slate-200 grid place-items-center text-slate-700 cursor-pointer"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="font-bold text-xs tabular-nums w-4 text-center">
                        {people[key] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdatePeople(key, 1)}
                        className="size-6 rounded-lg bg-slate-900 hover:bg-slate-800 grid place-items-center text-white cursor-pointer"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Needs */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                ความต้องการเร่งด่วน
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_NEEDS_LIST.map(need => {
                  const active = selectedNeeds.includes(need);
                  return (
                    <button
                      key={need}
                      type="button"
                      onClick={() => handleToggleNeed(need)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                        active
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {active ? `✓ ${need}` : `+ ${need}`}
                    </button>
                  );
                })}
              </div>

              {/* Add custom need */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="เพิ่มสิ่งที่ต้องการอื่นๆ..."
                  value={customNeed}
                  onChange={(e) => setCustomNeed(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  type="button"
                  onClick={handleAddCustomNeed}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900"
                >
                  เพิ่ม
                </button>
              </div>
            </div>

            {/* Contact Phones & Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรหลักที่ติดต่อได้ *
                </label>
                <input
                  type="tel"
                  required
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรสำรอง
                </label>
                <input
                  type="tel"
                  placeholder="ไม่มีเว้นว่างได้"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  LINE ID ผู้ติดต่อ
                </label>
                <input
                  type="text"
                  placeholder="เช่น @somchai123"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จุดสังเกตเด่น (เช่น รั้วสีฟ้า, หลังวัด)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ข้อความเพิ่มเติมถึงทีมกู้ภัย
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุอาการผู้ป่วย หรือระดับน้ำที่เปลี่ยนไป..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Bottom Submit Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>บันทึกสำเร็จแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขข้อมูล'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
