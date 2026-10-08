import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MapPin,
  ListFilter,
  PhoneCall,
  BookOpen,
  PlusCircle,
  LifeBuoy,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Radio
} from 'lucide-react';
import type { SOSRequest, UserProfile } from '../types/sos';
import { isMyCase } from '../services/userService';

export type TabKey = 'form' | 'feed' | 'map' | 'hotlines' | 'guide' | 'login';

const NAV_ITEMS: { key: TabKey; label: string; icon: typeof AlertTriangle }[] = [
  { key: 'form', label: 'แจ้งขอความช่วยเหลือ', icon: AlertTriangle },
  { key: 'feed', label: 'รายการเคส', icon: ListFilter },
  { key: 'map', label: 'แผนที่พิกัด', icon: MapPin },
  { key: 'hotlines', label: 'เบอร์สายด่วน', icon: PhoneCall },
  { key: 'guide', label: 'เอาตัวรอด', icon: BookOpen },
];

const QUICK_DIALS = [
  { phone: '1784', label: 'ปภ.' },
  { phone: '1669', label: 'กู้ชีพ' },
  { phone: '199', label: 'กู้ภัย' }
];

interface NavbarProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  requests: SOSRequest[];
  isAdmin?: boolean;
  showAdminOption?: boolean;
  currentUser?: UserProfile | null;
  onOpenUserAuth?: () => void;
  onLogoutUser?: () => void;
  onOpenAdminLogin?: () => void;
  onLogoutAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  requests,
  isAdmin = false,
  showAdminOption = false,
  currentUser,
  onOpenUserAuth,
  onLogoutUser,
  onOpenAdminLogin,
  onLogoutAdmin,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const criticalCount = requests.filter(r => r.urgency === 'CRITICAL' && r.status === 'PENDING').length;
  const myCasesCount = requests.filter(r => isMyCase(r, currentUser || null)).length;
  const live = isOnline;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl backdrop-saturate-150">
      {/* Brand + account + primary action */}
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={() => setActiveTab('form')}
          className="group flex min-w-0 items-center gap-2.5 text-left"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-xs transition-transform duration-200 group-hover:scale-105">
            <LifeBuoy className="size-5 text-rose-500" strokeWidth={2.5} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                น้ำใจไทย
              </span>
              <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                SOS
              </span>
              <span
                className="hidden size-1.5 shrink-0 rounded-full sm:block"
                style={{ backgroundColor: live ? '#10b981' : '#f59e0b' }}
                title={live ? 'เชื่อมต่อระบบสดแล้ว' : 'โหมดออฟไลน์'}
              />
            </span>
            <span className="hidden truncate text-[11px] font-medium text-slate-500 sm:block">
              ศูนย์ประสานงานกู้ภัยอุทกภัย 24 ชม.
            </span>
          </span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {myCasesCount > 0 && (
            <button
              onClick={() => setActiveTab('feed')}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100 cursor-pointer shadow-2xs"
              title="ดูสถานะเคสขอความช่วยเหลือของคุณ"
            >
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>เคสของฉัน ({myCasesCount})</span>
            </button>
          )}

          {criticalCount > 0 && (
            <button
              onClick={() => setActiveTab('feed')}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
            >
              <span className="size-1.5 animate-sos-pulse rounded-full bg-red-600" />
              <span className="hidden sm:inline">วิกฤต</span> {criticalCount} เคส
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-1.5">
              {isAdmin ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-900"
                  title="สิทธิ์แอดมินยืนยันโดยเซิร์ฟเวอร์"
                >
                  <ShieldCheck className="size-3.5" />
                  <span>แอดมิน</span>
                </span>
              ) : (
                null
              )}

              <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-1.5 text-xs font-semibold text-slate-800">
                <span className="grid size-6 place-items-center overflow-hidden rounded-full bg-emerald-100">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.firstName} className="size-full object-cover" />
                  ) : (
                    <UserIcon className="size-3.5 text-emerald-700" />
                  )}
                </span>
                <span className="hidden max-w-[6rem] truncate sm:max-w-[8rem] sm:inline">
                  {currentUser.firstName}
                </span>
                <button
                  onClick={onLogoutUser}
                  title="ออกจากระบบ"
                  className="rounded-full px-1.5 text-[10px] font-bold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                >
                  ออก
                </button>
              </div>
            </div>
          ) : (
            onOpenUserAuth && activeTab !== 'login' && (
              <button
                onClick={onOpenUserAuth}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer shadow-xs"
              >
                <svg className="size-3.5 fill-[#06C755] shrink-0" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 5.82 2 10.53c0 2.94 1.76 5.53 4.45 6.99-.18.66-.66 2.39-.75 2.76-.12.45.16.44.34.32.14-.09 1.94-1.32 2.73-1.85.4.06.81.09 1.23.09 5.52 0 10-3.82 10-8.53S17.52 2 12 2z"/>
                </svg>
                <span>เข้าสู่ระบบด้วย LINE</span>
              </button>
            )
          )}

          {activeTab !== 'form' && (
            <button
              onClick={() => setActiveTab('form')}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-red-700 active:scale-95 sm:text-sm"
            >
              <PlusCircle className="size-4" />
              <span className="hidden sm:inline">แจ้งขอความช่วยเหลือ</span>
              <span className="sm:hidden">แจ้ง SOS</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation + utility (desktop only — mobile uses the bottom tab bar) */}
      <div className="hidden border-t border-slate-100 bg-white/60 sm:block">
        <nav className="mx-auto flex w-full max-w-7xl items-center gap-1.5 px-4 py-2 sm:px-6">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="size-4" strokeWidth={isActive ? 2.4 : 2} />
                <span>{label}</span>
                {key === 'feed' && requests.length > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums ${
                      isActive ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {requests.length}
                  </span>
                )}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden items-center gap-1.5 text-[11px] font-medium text-slate-400 xl:inline-flex">
              <Radio className="size-3.5" />
              สายด่วน
            </span>
            {QUICK_DIALS.map(({ phone, label }) => (
              <a
                key={phone}
                href={`tel:${phone}`}
                className="hidden items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 md:inline-flex"
              >
                <PhoneCall className="size-3 text-rose-500" />
                {label} {phone}
              </a>
            ))}

            <span className="mx-1 hidden h-4 w-px bg-slate-200 md:block" />

            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500"
              title={live ? 'เชื่อมต่อฐานข้อมูลแบบเรียลไทม์' : 'ทำงานในโหมดออฟไลน์'}
            >
              <span className="relative flex size-2">
                {live && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${live ? 'bg-emerald-500' : 'bg-amber-400'}`}
                />
              </span>
              <span className="hidden lg:inline">{live ? 'ระบบออนไลน์' : 'ออฟไลน์'}</span>
            </span>

            {showAdminOption &&
              (isAdmin ? (
                <button
                  onClick={onLogoutAdmin}
                  title="ออกจากโหมดแอดมิน"
                  className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-200 transition-colors hover:bg-violet-100"
                >
                  <ShieldCheck className="size-3.5" />
                  แอดมิน · ออก
                </button>
              ) : (
                onOpenAdminLogin && (
                  <button
                    onClick={onOpenAdminLogin}
                    title="เข้าสู่โหมดแอดมิน"
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-slate-500 transition-colors hover:bg-amber-50 hover:text-amber-700"
                  >
                    <Shield className="size-3.5" />
                    <span className="hidden lg:inline">แอดมิน</span>
                  </button>
                )
              ))}
          </div>
        </nav>
      </div>
    </header>
  );
};
