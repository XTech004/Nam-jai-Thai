import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, X, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;
const FAILED_COUNT_KEY = 'thai_flood_admin_failed_attempts';
const LOCKOUT_TIME_KEY = 'thai_flood_admin_lockout_time';

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Check lockout on open
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      checkLockout();
    }
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    let timer: any;
    if (lockoutRemaining > 0) {
      timer = setInterval(() => {
        setLockoutRemaining(prev => {
          if (prev <= 1) {
            localStorage.removeItem(LOCKOUT_TIME_KEY);
            localStorage.removeItem(FAILED_COUNT_KEY);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const checkLockout = () => {
    try {
      const lockedUntil = localStorage.getItem(LOCKOUT_TIME_KEY);
      if (lockedUntil) {
        const remaining = Math.ceil((parseInt(lockedUntil, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutRemaining(remaining);
          return true;
        } else {
          localStorage.removeItem(LOCKOUT_TIME_KEY);
          localStorage.removeItem(FAILED_COUNT_KEY);
        }
      }
    } catch (e) {
      // ignore
    }
    return false;
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;

    const trimmed = pin.trim();

    // Verify Admin / Rescuer PIN
    if (trimmed === '1784' || trimmed.toLowerCase() === 'admin' || trimmed === '8888') {
      try {
        localStorage.setItem('thai_flood_is_admin', 'true');
        localStorage.removeItem(FAILED_COUNT_KEY);
        localStorage.removeItem(LOCKOUT_TIME_KEY);
      } catch (e) {
        // ignore
      }
      setError('');
      setPin('');
      onLoginSuccess();
      onClose();
    } else {
      // Record failed attempt
      try {
        const currentFailed = parseInt(localStorage.getItem(FAILED_COUNT_KEY) || '0', 10) + 1;
        localStorage.setItem(FAILED_COUNT_KEY, currentFailed.toString());

        if (currentFailed >= MAX_FAILED_ATTEMPTS) {
          const lockTime = Date.now() + LOCKOUT_SECONDS * 1000;
          localStorage.setItem(LOCKOUT_TIME_KEY, lockTime.toString());
          setLockoutRemaining(LOCKOUT_SECONDS);
          setError(`ป้อนรหัสผิดเกินกำหนด ระบบระงับการเข้าสู่ระบบชั่วคราว ${LOCKOUT_SECONDS} วินาที`);
        } else {
          setError(`รหัสผ่านไม่ถูกต้อง (เหลือโอกาสอีก ${MAX_FAILED_ATTEMPTS - currentFailed} ครั้ง)`);
        }
      } catch (e) {
        setError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              เข้าสู่ระบบเจ้าหน้าที่ / แอดมิน
            </h3>
            <p className="text-xs text-slate-500">
              สำหรับทีมกู้ภัยและผู้ดูแลระบบเท่านั้น
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสผ่านยืนยันตัวตน (PIN Code)
            </label>
            <div className="relative">
              <input
                type="password"
                autoFocus
                disabled={lockoutRemaining > 0}
                placeholder="กรอกรหัส PIN สำหรับเจ้าหน้าที่"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none tracking-widest font-mono disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {lockoutRemaining > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ระงับการเข้าสู่ระบบ: กรุณารอ {lockoutRemaining} วินาที</span>
              </div>
            )}
          </div>

          {error && lockoutRemaining === 0 && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={lockoutRemaining > 0 || !pin.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ยืนยันเข้าสู่ระบบ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
