import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  Check, 
  AlertTriangle, 
  Building2, 
  Radio, 
  Lock, 
  RefreshCw,
  LogOut,
  UserCheck
} from 'lucide-react';
import type { UserProfile } from '../types/sos';
import { verifyAsRescuer, revertToCitizen } from '../services/userService';

interface RescuerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onVerified: (updatedUser: UserProfile) => void;
  onOpenLineLogin?: () => void;
}

const COMMON_ORGS = [
  'ปภ. (กรมป้องกันและบรรเทาสาธารณภัย)',
  'สมาคมกู้ภัยสว่าง (เชียงราย/แม่สาย/พะเยา)',
  'มูลนิธิร่วมกตัญญู',
  'มูลนิธิป่อเต็กตึ๊ง',
  'กู้ภัยเทศบาล / กองบรรเทาสาธารณภัยท้องถิ่น',
  'อาสาสมัครกู้ภัยอิสระ',
];

export const RescuerVerificationModal: React.FC<RescuerVerificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onVerified,
  onOpenLineLogin,
}) => {
  const [selectedOrg, setSelectedOrg] = useState(currentUser?.rescueOrg || COMMON_ORGS[1]);
  const [customOrg, setCustomOrg] = useState('');
  const [callsign, setCallsign] = useState(currentUser?.callsign || '');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const effectiveOrg = selectedOrg === 'OTHER' ? customOrg : selectedOrg;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!currentUser) {
      setError('กรุณาเข้าสู่ระบบด้วย LINE ก่อนเพื่อผูกสิทธิ์กู้ภัยกับบัญชีของคุณ');
      return;
    }

    if (!effectiveOrg.trim()) {
      setError('กรุณาระบุชื่อหน่วยงานหรือมูลนิธิต้นสังกัด');
      return;
    }

    if (!pin.trim()) {
      setError('กรุณากรอกรหัส PIN ยืนยันหน่วยกู้ภัย (เริ่มต้น: 2567)');
      return;
    }

    setLoading(true);
    const result = await verifyAsRescuer(currentUser.id, effectiveOrg, callsign, pin);
    setLoading(false);

    if (result.success && result.user) {
      setSuccessMsg(result.message);
      onVerified(result.user);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setError(result.message);
    }
  };

  const handleRevert = async () => {
    if (!currentUser) return;
    setLoading(true);
    const user = await revertToCitizen(currentUser.id);
    setLoading(false);
    if (user) {
      onVerified(user);
      onClose();
    }
  };

  const isAlreadyRescuer = currentUser?.role === 'RESCUER';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              ยืนยันตัวตนเจ้าหน้าที่กู้ภัย
              {isAlreadyRescuer && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full border border-orange-300">
                  ✓ ยืนยันสิทธิ์แล้ว
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              สำหรับเจ้าหน้าที่กู้ภัยและอาสาสมัครที่ได้รับมอบหมายเข้าช่วยเหลือผู้ประสบอุทกภัย
            </p>
          </div>
        </div>

        {/* Role Separation Clarification Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs mb-4 text-slate-700 space-y-1.5 leading-relaxed">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>การแยกสิทธิ์การใช้งาน (Role Separation):</span>
          </div>
          <ul className="space-y-1 pl-4 list-disc text-slate-600 text-[11px]">
            <li><b>👤 ประชาชนทั่วไป:</b> สามารถส่งแจ้งขอความช่วยเหลือ (SOS) ติดตามเคสของตัวเอง และแชร์ข้อมูล (เบอร์โทรคนอื่นถูกปิดบังตาม PDPA)</li>
            <li><b>🚒 เจ้าหน้าที่กู้ภัย:</b> เข้าถึงเบอร์ติดต่อเต็ม โทรออก แชท LINE ตรง กดรับเคส และบันทึกการส่งเรือ/รถช่วยเหลือ</li>
          </ul>
        </div>

        {!currentUser ? (
          <div className="text-center py-6 space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <p className="text-xs text-slate-600 font-medium">
              คุณต้องเข้าสู่ระบบด้วย LINE ก่อน จึงจะสามารถยืนยันตัวตนและผูกสิทธิ์เจ้าหน้าที่กู้ภัยได้
            </p>
            {onOpenLineLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLineLogin();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                <span>เข้าสู่ระบบด้วย LINE ก่อน</span>
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Logged in User info */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <span className="text-slate-600">
                บัญชี LINE: <b>{currentUser.firstName} {currentUser.lastName}</b>
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                สถานะปัจจุบัน: <b>{currentUser.role === 'RESCUER' ? '🚒 เจ้าหน้าที่กู้ภัย' : '👤 ประชาชนทั่วไป'}</b>
              </span>
            </div>

            {/* Organization Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-orange-600" />
                <span>หน่วยงาน / สังกัดกู้ภัย</span>
              </label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-orange-400 font-medium"
              >
                {COMMON_ORGS.map((org, idx) => (
                  <option key={idx} value={org}>
                    {org}
                  </option>
                ))}
                <option value="OTHER">-- ระบุสังกัดอื่น ๆ ด้วยตนเอง --</option>
              </select>

              {selectedOrg === 'OTHER' && (
                <input
                  type="text"
                  placeholder="ระบุชื่อสังกัดของคุณ เช่น ทีมกู้ภัยแม่สายเหนือ"
                  value={customOrg}
                  onChange={(e) => setCustomOrg(e.target.value)}
                  className="w-full mt-2 p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-400 font-medium"
                />
              )}
            </div>

            {/* Callsign / Team ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-indigo-600" />
                <span>รหัสเรียกขาน / ชื่อทีม (ถ้ามี)</span>
              </label>
              <input
                type="text"
                placeholder="เช่น สายธาร 01, ทีมเรือท้องแบน 2"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-400 font-medium"
              />
            </div>

            {/* PIN verification */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>รหัสผ่านยืนยันสิทธิ์กู้ภัย (PIN ประจำหน่วย)</span>
              </label>
              <input
                type="password"
                placeholder="กรอก PIN เพื่อยืนยัน (รหัสเริ่มต้น: 2567)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={8}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-400 font-mono tracking-widest text-center"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                * ป้องกันบุคคลทั่วไปแอบอ้างสิทธิ์กู้ภัยเพื่อเข้าถึงข้อมูลส่วนตัวของผู้ประสบภัย
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isAlreadyRescuer ? 'อัปเดตข้อมูลสังกัดกู้ภัย' : 'ยืนยันตัวตนเจ้าหน้าที่กู้ภัย'}</span>
                  </>
                )}
              </button>

              {isAlreadyRescuer && (
                <button
                  type="button"
                  onClick={handleRevert}
                  disabled={loading}
                  className="py-2.5 px-3 border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                  title="สลับกลับเป็นโหมดประชาชนทั่วไป"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>เป็นคนทั่วไป</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
