import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ShieldCheck,
  Zap,
  Lock
} from 'lucide-react';
import type { UserProfile } from '../types/sos';
import { getCurrentUser } from '../services/userService';
import { loginWithLine } from '../services/liffService';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isLineLoggingIn, setIsLineLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successUser, setSuccessUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessUser(null);
      setIsLineLoggingIn(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle LINE Login Trigger
  const handleLineLogin = async () => {
    setIsLineLoggingIn(true);
    setErrorMessage('');
    try {
      await loginWithLine();
      const user = getCurrentUser();
      if (user) {
        setSuccessUser(user);
        setTimeout(() => {
          if (onSuccess) onSuccess(user);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error('LINE login failed:', err);
      setErrorMessage(err?.message || 'ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLineLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {successUser ? (
          /* Success Screen */
          <div className="p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900">
              เข้าสู่ระบบสำเร็จ!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ยินดีต้อนรับ คุณ <b className="text-slate-800">{successUser.firstName} {successUser.lastName}</b>
            </p>
            <p className="text-[11px] text-emerald-600 mt-2 font-medium">
              ✓ ข้อมูลผู้ติดต่อจะถูกกรอกลงในฟอร์มแจ้งเหตุอัตโนมัติ
            </p>
          </div>
        ) : (
          /* LINE Login Screen */
          <div className="p-6 sm:p-7 text-center">
            
            {/* Header Icon */}
            <div className="w-14 h-14 bg-[#06C755]/10 text-[#06C755] rounded-3xl flex items-center justify-center mx-auto mb-3.5 border border-[#06C755]/20 shadow-xs">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 5.82 2 10.53c0 2.94 1.76 5.53 4.45 6.99-.18.66-.66 2.39-.75 2.76-.12.45.16.44.34.32.14-.09 1.94-1.32 2.73-1.85.4.06.81.09 1.23.09 5.52 0 10-3.82 10-8.53S17.52 2 12 2z"/>
              </svg>
            </div>

            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              เข้าสู่ระบบด้วย LINE
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              ยืนยันตัวตนสะดวกรวดเร็ว ปลอดภัย และไม่ต้องจำรหัสผ่าน
            </p>

            {/* Official LINE Login Button */}
            <button
              type="button"
              onClick={handleLineLogin}
              disabled={isLineLoggingIn}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] active:scale-98 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
            >
              {isLineLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>กำลังเชื่อมต่อ LINE...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 5.82 2 10.53c0 2.94 1.76 5.53 4.45 6.99-.18.66-.66 2.39-.75 2.76-.12.45.16.44.34.32.14-.09 1.94-1.32 2.73-1.85.4.06.81.09 1.23.09 5.52 0 10-3.82 10-8.53S17.52 2 12 2z"/>
                  </svg>
                  <span>เข้าสู่ระบบด้วย LINE (คลิกเดียว)</span>
                </>
              )}
            </button>

            {errorMessage && (
              <div className="mt-3.5 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Benefit Highlights */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-left space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ไม่ต้องกรอกเบอร์โทรหรือรอรหัส SMS</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ดึงชื่อและรูปโปรไฟล์อัตโนมัติ</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>ปลอดภัย 100% ป้องกันการสวมรอย</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4">
              🔒 ข้อมูลบัญชีใช้เพื่อการประสานงานช่วยเหลือผู้ประสบภัยเท่านั้น
            </p>

          </div>
        )}

      </div>
    </div>
  );
};
