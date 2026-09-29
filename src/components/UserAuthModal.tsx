import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Phone, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  MessageSquare, 
  RefreshCw,
  Sparkles,
  Lock
} from 'lucide-react';
import type { UserProfile } from '../types/sos';
import { 
  checkPhoneExists, 
  normalizePhone, 
  formatPhone, 
  requestOTP, 
  verifyOTP, 
  registerOrLoginUser,
  getCurrentUser
} from '../services/userService';
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
  const [step, setStep] = useState<'PHONE_NAME' | 'OTP' | 'SUCCESS'>('PHONE_NAME');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [existingUserName, setExistingUserName] = useState('');
  
  // OTP State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [simulatedSmsOtp, setSimulatedSmsOtp] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(60);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successUser, setSuccessUser] = useState<UserProfile | null>(null);
  const [isLineLoggingIn, setIsLineLoggingIn] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Fast LINE Login Handler
  const handleLineLogin = async () => {
    setIsLineLoggingIn(true);
    setErrorMessage('');
    try {
      await loginWithLine();
      const user = getCurrentUser();
      if (user) {
        setSuccessUser(user);
        setStep('SUCCESS');
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('PHONE_NAME');
      setPhone('');
      setFirstName('');
      setLastName('');
      setIsExistingUser(false);
      setExistingUserName('');
      setOtpDigits(['', '', '', '', '', '']);
      setSimulatedSmsOtp(null);
      setErrorMessage('');
      setSuccessUser(null);
    }
  }, [isOpen]);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: any;
    if (step === 'OTP' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  if (!isOpen) return null;

  // Handle phone input changes & check duplicate
  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setPhone(rawVal);
    setErrorMessage('');

    const cleaned = normalizePhone(rawVal);
    if (cleaned.length === 10) {
      setIsCheckingPhone(true);
      try {
        const result = await checkPhoneExists(cleaned);
        if (result.exists && result.user) {
          setIsExistingUser(true);
          setExistingUserName(`${result.user.firstName} ${result.user.lastName}`);
          setFirstName(result.user.firstName);
          setLastName(result.user.lastName);
        } else {
          setIsExistingUser(false);
          setExistingUserName('');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingPhone(false);
      }
    } else {
      setIsExistingUser(false);
      setExistingUserName('');
    }
  };

  // Submit Step 1: Request OTP
  const handleRequestOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 9) {
      setErrorMessage('กรุณาระบุเบอร์โทรศัพท์ 10 หลักให้ถูกต้อง');
      return;
    }

    if (!isExistingUser) {
      if (!firstName.trim()) {
        setErrorMessage('กรุณาระบุชื่อจริงเพื่อลงทะเบียน');
        return;
      }
      if (!lastName.trim()) {
        setErrorMessage('กรุณาระบุนามสกุล');
        return;
      }
    }

    setIsRequestingOtp(true);
    try {
      const res = await requestOTP(cleanPhone);
      if (res.success) {
        setSimulatedSmsOtp(res.otpCode);
        setOtpTimer(60);
        setStep('OTP');
        // Auto focus first OTP input
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 100);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'เกิดข้อผิดพลาดในการส่งรหัส OTP');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    const cleanPhone = normalizePhone(phone);
    setIsRequestingOtp(true);
    setErrorMessage('');
    try {
      const res = await requestOTP(cleanPhone);
      if (res.success) {
        setSimulatedSmsOtp(res.otpCode);
        setOtpTimer(60);
        setOtpDigits(['', '', '', '', '', '']);
        otpInputsRef.current[0]?.focus();
      }
    } catch (e: any) {
      setErrorMessage('ไม่สามารถส่งรหัสใหม่ได้ กรุณาลองใหม่');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpDigitChange = (index: number, val: string) => {
    const digit = val.slice(-1).replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setErrorMessage('');

    // Advance to next input
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // If all 6 digits entered, auto-verify
    if (digit && index === 5 && newDigits.every(d => d !== '')) {
      handleVerifyOtp(newDigits.join(''));
    }
  };

  // Handle OTP Keydown (Backspace navigation)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Auto-fill OTP from simulated SMS
  const handleAutoFillOtp = () => {
    if (simulatedSmsOtp) {
      const digits = simulatedSmsOtp.split('');
      setOtpDigits(digits);
      handleVerifyOtp(simulatedSmsOtp);
    }
  };

  // Verify OTP & Save Session
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMessage('');

    try {
      const verifyResult = verifyOTP(phone, fullCode);
      if (!verifyResult.success) {
        setErrorMessage(verifyResult.message);
        setIsVerifyingOtp(false);
        return;
      }

      // OTP is valid! Register or login user
      const user = await registerOrLoginUser(firstName, lastName, phone);
      setSuccessUser(user);
      setStep('SUCCESS');

      setTimeout(() => {
        if (onSuccess) onSuccess(user);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'เกิดข้อผิดพลาดในการตรวจสอบรหัส');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step 1: Phone & Name Input */}
        {step === 'PHONE_NAME' && (
          <div className="p-6 sm:p-7">
            
            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-red-100 shadow-xs">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                เข้าสู่ระบบ / ลงทะเบียน
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                เข้าใช้งานสะดวกรวดเร็วด้วย LINE หรือเบอร์โทรศัพท์
              </p>
            </div>

            {/* Instant LINE Login Option */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleLineLogin}
                disabled={isLineLoggingIn}
                className="w-full py-3 px-4 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] active:scale-98 text-white font-bold text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
              >
                {isLineLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
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
              
              <div className="flex items-center gap-3 my-3.5">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-[11px] font-semibold text-slate-400">หรือ ยืนยันด้วยเบอร์โทรศัพท์</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
            </div>

            <form onSubmit={handleRequestOtpSubmit} className="space-y-4">
              
              {/* Phone Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เบอร์โทรศัพท์มือถือ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-semibold border-r border-slate-200 pr-2">
                    <span>🇹🇭</span>
                    <span>+66</span>
                  </div>
                  <input
                    type="tel"
                    autoFocus
                    placeholder="08X-XXX-XXXX"
                    value={phone}
                    onChange={handlePhoneChange}
                    maxLength={12}
                    className="w-full pl-20 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50/50"
                  />
                  {isCheckingPhone && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-3" />
                  )}
                </div>
              </div>

              {/* Duplicate Phone Detection Badge */}
              {isExistingUser && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">พบเบอร์นี้ในระบบแล้ว!</span>
                    <p className="text-emerald-700 text-[11px] mt-0.5">
                      ยินดีต้อนรับกลับ คุณ <b>{existingUserName}</b> — กดปุ่มด้านล่างเพื่อรับรหัส OTP เข้าสู่ระบบได้ทันที
                    </p>
                  </div>
                </div>
              )}

              {/* If Phone is NOT duplicate (New User) -> Ask for First & Last Name */}
              {!isExistingUser && normalizePhone(phone).length >= 10 && (
                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>เบอร์ใหม่ยังไม่เคยลงทะเบียน — กรุณากรอกชื่อและนามสกุล</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ชื่อจริง <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น สมศักดิ์"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        นามสกุล <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น วงศ์สว่าง"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isRequestingOtp || normalizePhone(phone).length < 9}
                className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isRequestingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังส่งรหัส OTP...</span>
                  </>
                ) : (
                  <>
                    <span>{isExistingUser ? 'ขอรหัส OTP เพื่อเข้าสู่ระบบ' : 'ขอรหัส OTP เพื่อยืนยันเบอร์'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-400 mt-2">
                🔒 ข้อมูลส่วนบุคคลจะถูกเก็บรักษาอย่างปลอดภัยเพื่อการประสานงานช่วยเหลือ
              </p>

            </form>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'OTP' && (
          <div className="p-6 sm:p-7">
            
            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-purple-100 shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                ยืนยันรหัส OTP 6 หลัก
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                รหัสส่งไปยังเบอร์ <span className="font-bold text-slate-800">{formatPhone(phone)}</span>
              </p>
            </div>

            {/* Realistic Interactive SMS Notification Toast */}
            {simulatedSmsOtp && (
              <div className="mb-5 p-3.5 rounded-2xl bg-slate-900 text-white shadow-lg border border-slate-700 animate-in slide-in-from-top-3 duration-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>ข้อความ SMS ใหม่ (จำลองส่งฟรี)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">ตอนนี้</span>
                </div>
                <div className="mt-2 text-xs flex items-center justify-between">
                  <div>
                    รหัส OTP คือ: <span className="font-mono text-base font-extrabold tracking-widest text-yellow-300 bg-slate-800 px-2 py-0.5 rounded">{simulatedSmsOtp}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFillOtp}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[11px] transition-colors cursor-pointer"
                  >
                    กรอกให้อัตโนมัติ ⚡
                  </button>
                </div>
              </div>
            )}

            {/* 6 OTP Input Boxes */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { otpInputsRef.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl border-2 border-slate-300 focus:border-red-500 focus:bg-red-50/30 focus:outline-none transition-all"
                />
              ))}
            </div>

            {errorMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Verify Button */}
            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={isVerifyingOtp || otpDigits.some(d => d === '')}
              className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifyingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังตรวจสอบรหัส...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ยืนยันรหัส OTP และเข้าสู่ระบบ</span>
                </>
              )}
            </button>

            {/* Resend Timer & Change Phone */}
            <div className="flex items-center justify-between text-xs text-slate-500 mt-4 px-1">
              <button
                type="button"
                onClick={() => setStep('PHONE_NAME')}
                className="hover:text-slate-800 underline cursor-pointer"
              >
                ← เปลี่ยนเบอร์โทร
              </button>

              {otpTimer > 0 ? (
                <span className="text-slate-400">
                  ส่งรหัสใหม่อีกครั้งใน ({otpTimer} วิ)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-red-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>ขอรหัส OTP อีกครั้ง</span>
                </button>
              )}
            </div>

          </div>
        )}

        {/* Step 3: Success Screen */}
        {step === 'SUCCESS' && successUser && (
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
        )}

      </div>
    </div>
  );
};
