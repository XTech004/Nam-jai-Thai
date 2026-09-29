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
  Database,
  Shield,
  ShieldCheck
} from 'lucide-react';
import type { SOSRequest } from '../types/sos';
import { isSupabaseActive } from '../services/supabaseClient';

interface NavbarProps {
  activeTab: 'form' | 'feed' | 'map' | 'hotlines' | 'guide';
  setActiveTab: (tab: 'form' | 'feed' | 'map' | 'hotlines' | 'guide') => void;
  requests: SOSRequest[];
  isAdmin?: boolean;
  onOpenAdminLogin?: () => void;
  onLogoutAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  requests,
  isAdmin = false,
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200">
      {/* Emergency Top Hotline Bar */}
      <div className="bg-red-600 text-white px-3 py-1.5 text-xs sm:text-sm font-medium flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-700 rounded font-bold">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            สายด่วน 24 ชม.
          </span>
          <a href="tel:1784" className="hover:underline font-bold flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5 inline" /> ปภ. 1784
          </a>
          <span className="opacity-60">|</span>
          <a href="tel:1669" className="hover:underline font-bold flex items-center gap-1">
            การแพทย์ฉุกเฉิน 1669
          </a>
          <span className="opacity-60">|</span>
          <a href="tel:199" className="hover:underline font-bold hidden sm:inline">
            ดับเพลิง/กู้ภัย 199
          </a>
        </div>
        
        {/* Status indicator & Admin Mode Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0 pl-2">
          {isAdmin ? (
            <div className="flex items-center gap-1 bg-purple-950/80 text-purple-200 px-2 py-0.5 rounded text-[11px] font-semibold border border-purple-400/40">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
              <span>โหมดแอดมิน</span>
              {onLogoutAdmin && (
                <button
                  onClick={onLogoutAdmin}
                  className="ml-1 text-purple-300 hover:text-white underline text-[10px] cursor-pointer"
                  title="ออกจากโหมดแอดมิน"
                >
                  (ออก)
                </button>
              )}
            </div>
          ) : (
            onOpenAdminLogin && (
              <button
                onClick={onOpenAdminLogin}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-red-100 hover:text-white hover:bg-red-700/80 transition-colors cursor-pointer border border-red-400/40"
                title="เข้าสู่โหมดแอดมิน"
              >
                <Shield className="w-3 h-3 text-red-200" />
                <span>แอดมิน</span>
              </button>
            )
          )}

          {isDbCloud ? (
            <span className="inline-flex items-center gap-1 text-emerald-200 text-[11px] font-medium bg-red-700/60 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="hidden sm:inline">เซิร์ฟเวอร์ Real-time</span>
              <span className="sm:hidden">Real-time</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-200 text-[11px] font-medium bg-red-700/60 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span className="hidden sm:inline">โหมดสำรอง (Local DB)</span>
              <span className="sm:hidden">Local DB</span>
            </span>
          )}

          {isOnline ? (
            <span className="inline-flex items-center gap-1 text-emerald-200">
              <Wifi className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden md:inline">ออนไลน์</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-yellow-300 font-bold bg-red-800 px-2 py-0.5 rounded">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" />
              <span>โหมดออฟไลน์</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Brand & Action Header */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between">
        <div 
          onClick={() => setActiveTab('form')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <LifeBuoy className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                ThaiFlood <span className="text-red-600">SOS</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full border border-red-200">
                ฉุกเฉิน
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal hidden sm:block">
              ระบบแจ้งขอความช่วยเหลือ & แผนที่กู้ภัยผู้ประสบอุทกภัย
            </p>
          </div>
        </div>

        {/* SOS Action Button & Stats */}
        <div className="flex items-center gap-2">
          {activeTab !== 'form' && (
            <button
              onClick={() => setActiveTab('form')}
              className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5 text-sm transition-all animate-sos-pulse"
            >
              <PlusCircle className="w-4 h-4" />
              <span>แจ้งขอความช่วยเหลือ</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-600">เคสวิกฤตสีแดง:</span>
            <span className="font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
              {criticalCount} เคส
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">รอดำเนินการ:</span>
            <span className="font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
              {pendingCount} เคส
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-2 sm:px-4 flex border-t border-slate-100 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('form')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'form'
              ? 'border-red-600 text-red-600 bg-red-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span>แจ้งขอความช่วยเหลือ (SOS)</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'feed'
              ? 'border-red-600 text-red-600 bg-red-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>รายการขอความช่วยเหลือ</span>
          <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
            {requests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'map'
              ? 'border-red-600 text-red-600 bg-red-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <MapPin className="w-4 h-4 text-blue-500" />
          <span>แผนที่พิกัดกู้ภัย</span>
        </button>

        <button
          onClick={() => setActiveTab('hotlines')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'hotlines'
              ? 'border-red-600 text-red-600 bg-red-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <PhoneCall className="w-4 h-4 text-emerald-500" />
          <span>เบอร์สายด่วนฉุกเฉิน</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'guide'
              ? 'border-red-600 text-red-600 bg-red-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span>ข้อควรรู้ & เอาตัวรอด</span>
        </button>
      </nav>
    </header>
  );
};
