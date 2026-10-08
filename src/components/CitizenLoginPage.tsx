import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import type { UserProfile } from '../types/sos';
import { getCurrentUser } from '../services/userService';
import { loginWithLine } from '../services/liffService';

interface CitizenLoginPageProps {
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onContinueAsGuest: () => void;
}

export function CitizenLoginPage({ currentUser, onLoginSuccess, onContinueAsGuest }: CitizenLoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleLineLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await loginWithLine();
      const user = getCurrentUser();
      if (user) {
        onLoginSuccess(user);
        return;
      }
      // LIFF may redirect to LINE and reload this page; App restores the session on return.
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setErrorMessage(message || 'เชื่อมต่อ LINE ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] lg:grid-cols-[1fr_0.92fr]">
        <section className="relative flex min-h-0 flex-col justify-between overflow-hidden bg-slate-950 p-5 text-white sm:min-h-[320px] sm:p-9 lg:p-12">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-8 -top-12 size-48 rounded-full border border-white/10" />
          <div className="relative">
            <button onClick={onContinueAsGuest} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="กลับไปแจ้งเหตุ">
              <ArrowLeft className="size-3.5" /> กลับไปแจ้งเหตุ
            </button>
            <div className="mt-7 inline-flex size-12 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-950/40 sm:mt-12">
              <UserRound className="size-6" />
            </div>
            <h1 className="mt-4 max-w-md text-2xl font-black leading-tight tracking-tight sm:mt-5 sm:text-4xl">บัญชีของคุณ<br />สำหรับติดตามการช่วยเหลือ</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-300 sm:mt-3">เข้าสู่ระบบเพื่อดูเคสที่คุณแจ้งไว้ และรับการอัปเดตในบัญชีเดิม</p>
          </div>
          <div className="relative mt-6 hidden gap-3 border-t border-white/15 pt-5 sm:grid sm:grid-cols-3">
            {[
              { label: 'แจ้งเหตุ', detail: 'ส่งข้อมูลและพิกัด' },
              { label: 'ติดตาม', detail: 'ดูสถานะเคสของคุณ' },
              { label: 'อัปเดต', detail: 'กลับมาดูข้อมูลล่าสุด' },
            ].map((step, index) => (
              <div key={step.label} className="flex items-start gap-2 sm:block">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white/10 text-[11px] font-black text-rose-300">{index + 1}</span>
                <div className="sm:mt-2"><p className="text-xs font-extrabold text-white">{step.label}</p><p className="mt-0.5 text-[11px] text-slate-400">{step.detail}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col justify-center p-5 sm:p-9 lg:p-12">
          <div className="mb-4 sm:mb-6">
            <p className="text-xs font-bold text-emerald-700">ประชาชนทั่วไป</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">เข้าสู่ระบบหรือสมัคร</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">ใช้ LINE ได้เลย ครั้งแรกระบบสร้างบัญชีให้โดยอัตโนมัติ ไม่ต้องตั้งรหัสผ่านใหม่</p>
          </div>

          {currentUser && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
              <span className="grid size-9 place-items-center rounded-full bg-white text-emerald-700"><Check className="size-4" /></span>
              <span>เข้าสู่ระบบอยู่แล้วในชื่อ <b>{currentUser.firstName}</b></span>
            </div>
          )}

          <button
            type="button"
            onClick={handleLineLogin}
            disabled={isLoading}
            className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#06C755] px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(6,199,85,0.85)] transition-colors hover:bg-[#05b34c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C755] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          >
            {isLoading ? <LoaderCircle className="size-5 animate-spin" /> : (
              <svg className="size-5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 5.82 2 10.53c0 2.94 1.76 5.53 4.45 6.99-.18.66-.66 2.39-.75 2.76-.12.45.16.44.34.32.14-.09 1.94-1.32 2.73-1.85.4.06.81.09 1.23.09 5.52 0 10-3.82 10-8.53S17.52 2 12 2z" />
              </svg>
            )}
            {isLoading ? 'กำลังเชื่อมต่อ LINE…' : 'เข้าสู่ระบบ / สมัครด้วย LINE'}
            {!isLoading && <ArrowRight className="size-4" />}
          </button>

          {errorMessage && <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><AlertCircle className="mt-0.5 size-4 shrink-0" />{errorMessage}</p>}

          <div className="my-3 flex items-center gap-3 text-[10px] font-bold text-slate-400 sm:my-5"><span className="h-px flex-1 bg-slate-200" />หรือ<span className="h-px flex-1 bg-slate-200" /></div>

          <button type="button" onClick={onContinueAsGuest} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 sm:min-h-12">
            แจ้ง SOS โดยไม่สมัคร <ArrowRight className="size-4" />
          </button>
          <p className="mt-2 text-center text-[11px] leading-5 text-slate-500">หากเป็นเหตุฉุกเฉิน สามารถแจ้งเหตุได้โดยไม่ต้องมีบัญชี</p>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex items-start gap-2.5 text-xs leading-5 text-slate-600">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-slate-500" />
              <p><b className="text-slate-800">ข้อมูลบัญชีใช้เพื่อเชื่อมเคสของคุณ</b><br />ระบบใช้ชื่อและรหัสบัญชี LINE เพื่อจำบัญชี ไม่ขอรหัสผ่าน LINE และการเข้าสู่ระบบไม่ได้ใช้ยืนยันสังกัดเจ้าหน้าที่</p>
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-400"><ShieldCheck className="size-3.5" />กรอกเบอร์โทรเฉพาะตอนที่ต้องการให้เจ้าหน้าที่ติดต่อกลับ</p>
          </div>
        </section>
      </div>
    </main>
  );
}
