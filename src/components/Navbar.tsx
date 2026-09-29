import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  ListFilter, 
  PhoneCall, 
  BookOpen, 
  Wifi, 
  WifiOff, 
  PlusCircle,
  LifeBuoy,
  Shield,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import type { SOSRequest, UserProfile } from '../types/sos';
import { isSupabaseActive } from '../services/supabaseClient';
import { User as UserIcon } from 'lucide-react';

interface NavbarProps {
  activeTab: 'form' | 'feed' | 'map' | 'hotlines' | 'guide';
  setActiveTab: (tab: 'form' | 'feed' | 'map' | 'hotlines' | 'guide') => void;
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
  onLogoutAdmin
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const isDbCloud = isSupabaseActive();

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
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      {/* Sleek Top Utility & Hotline Strip */}
      <div className="bg-slate-900 text-slate-300 px-3 sm:px-6 py-1.5 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Quick-dial emergency hotline chips */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
            <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">
              สายด่วน 24 ชม:
            </span>
            <a 
              href="tel:1784" 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-red-900/60 hover:text-white transition-colors text-[11px] text-slate-200 font-bold border border-slate-700/60"
            >
              <PhoneCall className="w-3 h-3 text-red-400" />
              <span>ปภ. 1784</span>
            </a>
            <a 
              href="tel:1669" 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-emerald-900/60 hover:text-white transition-colors text-[11px] text-slate-200 font-bold border border-slate-700/60"
            >
              <span>กู้ชีพ 1669</span>
            </a>
            <a 
              href="tel:199" 
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-blue-900/60 hover:text-white transition-colors text-[11px] text-slate-200 font-bold border border-slate-700/60"
            >
              <span>กู้ภัย 199</span>
            </a>
          </div>

          {/* Cloud Sync & Admin Controls */}
          <div className="flex items-center gap-2 text-[11px] shrink-0">
            {showAdminOption && (
              isAdmin ? (
                <div className="flex items-center gap-1 bg-purple-950/90 text-purple-200 px-2 py-0.5 rounded-md border border-purple-500/40 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span className="font-semibold">แอดมิน</span>
                  {onLogoutAdmin && (
                    <button
                      onClick={onLogoutAdmin}
                      className="ml-1 text-purple-300 hover:text-white underline text-[10px] cursor-pointer"
                      title="ออกจากโหมดแอดมิน"
                    >
                      ออก
                    </button>
                  )}
                </div>
              ) : (
                onOpenAdminLogin && (
                  <button
                    onClick={onOpenAdminLogin}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-amber-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer border border-amber-400/30"
                    title="เข้าสู่โหมดแอดมิน"
                  >
                    <Shield className="w-3 h-3 text-amber-400" />
                    <span>เข้าสู่ระบบแอดมิน</span>
                  </button>
                )
              )
            )}

            {showAdminOption && <span className="text-slate-700 hidden sm:inline">|</span>}

            {/* Realtime Status Indicator */}
            {isDbCloud ? (
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline text-slate-400">ระบบเชื่อมต่อสด</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="hidden sm:inline">โหมดออฟไลน์</span>
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Main Brand & Action Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div 
          onClick={() => setActiveTab('form')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-red-500/20 group-hover:scale-105 transition-transform duration-200">
            <LifeBuoy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                ThaiFlood <span className="text-red-600">SOS</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                น้ำใจไทย
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              ระบบศูนย์ประสานงานและแจ้งขอความช่วยเหลือฉุกเฉินน้ำท่วม
            </p>
          </div>
        </div>

        {/* Right side: Urgent Live Stats & User Profile / CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Profile or Login Button */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs">
              <UserIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">คุณ</span>
              <span className="font-bold max-w-[90px] sm:max-w-[120px] truncate">{currentUser.firstName}</span>
              {onLogoutUser && (
                <button 
                  onClick={onLogoutUser}
                  className="text-[10px] text-slate-400 hover:text-red-600 underline ml-1 cursor-pointer"
                  title="ออกจากระบบ"
                >
                  ออก
                </button>
              )}
            </div>
          ) : (
            onOpenUserAuth && (
              <button
                onClick={onOpenUserAuth}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200/60"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>เข้าสู่ระบบ</span>
              </button>
            )
          )}

          {/* Live emergency counter (only shown if there are critical/pending cases) */}
          {criticalCount > 0 && (
            <div 
              onClick={() => setActiveTab('feed')}
              className="cursor-pointer flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-xl text-xs font-bold text-red-700 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <span>วิกฤต {criticalCount} เคส</span>
            </div>
          )}

          {activeTab !== 'form' && (
            <button
              onClick={() => setActiveTab('form')}
              className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl shadow-sm shadow-red-600/20 flex items-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>แจ้งขอความช่วยเหลือ</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Navigation Tabs (Hidden on mobile to eliminate double-tab clutter) */}
      <div className="hidden sm:block border-t border-slate-100 bg-slate-50/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 py-1.5">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'form'
                ? 'bg-white text-red-600 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${activeTab === 'form' ? 'text-red-600' : 'text-slate-400'}`} />
            <span>แจ้งขอความช่วยเหลือ (SOS)</span>
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'feed'
                ? 'bg-white text-red-600 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ListFilter className={`w-4 h-4 ${activeTab === 'feed' ? 'text-red-600' : 'text-slate-400'}`} />
            <span>รายการขอความช่วยเหลือ</span>
            {requests.length > 0 && (
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'feed' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'
              }`}>
                {requests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'map'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <MapPin className={`w-4 h-4 ${activeTab === 'map' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>แผนที่พิกัดกู้ภัย</span>
          </button>

          <button
            onClick={() => setActiveTab('hotlines')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'hotlines'
                ? 'bg-white text-emerald-600 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <PhoneCall className={`w-4 h-4 ${activeTab === 'hotlines' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>เบอร์สายด่วนฉุกเฉิน</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'guide'
                ? 'bg-white text-amber-600 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${activeTab === 'guide' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>ข้อควรรู้ & เอาตัวรอด</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
