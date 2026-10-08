import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Phone,
  Navigation,
  Clock,
  MapPin,
  Flag,
  CheckCircle,
  CheckCircle2,
  Trash2,
  SlidersHorizontal,
  OctagonAlert,
  AlertTriangle,
  Info,
  ChevronDown,
  Users,
  BedDouble,
  Share2,
  MessageCircle,
  Edit3,
  Star
} from 'lucide-react';
import type { SOSRequest, RequestStatus, UserProfile } from '../types/sos';
import { formatThaiDateTime, getUrgencyInfo, getWaterLevelInfo, getStatusInfo, getGoogleMapsUrl } from '../utils/formatters';
import { buildSosShareText, copyToClipboard } from '../utils/shareHelpers';
import { maskPhone } from '../utils/privacy';
import { isMyCase } from '../services/userService';
import { EditCaseModal } from './EditCaseModal';

interface RescueFeedProps {
  requests: SOSRequest[];
  onSelectCase: (request: SOSRequest) => void;
  onUpdateStatus: (id: string, status: RequestStatus, note?: string, rescuer?: string) => void;
  onUpdateCase?: (updatedRequest: SOSRequest) => void;
  currentUser?: UserProfile | null;
  onOpenLineLogin?: () => void;
  onGoToForm?: () => void;
  initialScope?: 'ALL' | 'MY_CASES';
  onResetMock?: () => void;
  isAdmin?: boolean;
  onDeleteCase?: (id: string) => void;
  onDeleteAllCompleted?: () => void;
  onClearAll?: () => void;
}

const URGENCY_FILTERS = [
  { id: 'ALL', label: 'ทั้งหมด', dot: 'bg-slate-400' },
  { id: 'CRITICAL', label: 'วิกฤต', dot: 'bg-rose-500', icon: OctagonAlert },
  { id: 'URGENT', label: 'เร่งด่วน', dot: 'bg-amber-500', icon: AlertTriangle },
  { id: 'NORMAL', label: 'ทั่วไป', dot: 'bg-emerald-500', icon: Info }
] as const;

const URGENCY_ACCENT: Record<SOSRequest['urgency'], string> = {
  CRITICAL: 'bg-rose-500',
  URGENT: 'bg-amber-500',
  NORMAL: 'bg-emerald-500'
};

export const RescueFeed: React.FC<RescueFeedProps> = ({
  requests,
  onSelectCase,
  onUpdateStatus,
  onUpdateCase,
  currentUser = null,
  onOpenLineLogin,
  onGoToForm,
  initialScope = 'ALL',
  onResetMock,
  isAdmin = false,
  onDeleteCase,
  onDeleteAllCompleted,
  onClearAll
}) => {
  const [viewScope, setViewScope] = useState<'ALL' | 'MY_CASES'>(initialScope);
  const [caseToEdit, setCaseToEdit] = useState<SOSRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [myCaseLookup, setMyCaseLookup] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [provinceFilter, setProvinceFilter] = useState<string>('ALL');
  const [copyStatusId, setCopyStatusId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);

  // Sync initialScope if changed externally
  useEffect(() => {
    if (initialScope) {
      setViewScope(initialScope);
    }
  }, [initialScope]);

  useEffect(() => {
    if (!showAdminMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setShowAdminMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAdminMenu]);

  // Available provinces
  const provinces = useMemo(() => {
    const set = new Set<string>();
    requests.forEach(r => {
      if (r.province) set.add(r.province);
    });
    return Array.from(set);
  }, [requests]);

  // My Cases list
  const myCases = useMemo(() => {
    return requests.filter(r => isMyCase(r, currentUser));
  }, [requests, currentUser]);

  const myCasesCount = myCases.length;

  const counts = useMemo(
    () => {
      const scopeList = viewScope === 'MY_CASES' ? myCases : requests;
      return {
        total: scopeList.length,
        critical: scopeList.filter(r => r.urgency === 'CRITICAL').length,
        pending: scopeList.filter(r => r.status === 'PENDING').length,
        responding: scopeList.filter(r => r.status === 'RESPONDING').length,
        completed: scopeList.filter(r => r.status === 'COMPLETED').length
      };
    },
    [requests, viewScope, myCases]
  );

  // Filtered requests
  const filteredRequests = useMemo(() => {
    const baseList = viewScope === 'MY_CASES' ? myCases : requests;
    return baseList.filter(req => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = req.fullName.toLowerCase().includes(term);
        const matchesPhone = req.primaryPhone.includes(term) || (req.secondaryPhone?.includes(term) ?? false);
        const matchesLoc = `${req.province} ${req.district} ${req.subDistrict} ${req.address} ${req.landmark}`.toLowerCase().includes(term);
        const matchesId = req.id.toLowerCase().includes(term);
        if (!matchesName && !matchesPhone && !matchesLoc && !matchesId) {
          return false;
        }
      }

      if (urgencyFilter !== 'ALL' && req.urgency !== urgencyFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && req.status !== statusFilter) {
        return false;
      }

      if (provinceFilter !== 'ALL' && req.province !== provinceFilter) {
        return false;
      }

      return true;
    });
  }, [requests, viewScope, myCases, searchTerm, urgencyFilter, statusFilter, provinceFilter]);

  const hasAdvancedFilter = statusFilter !== 'ALL' || provinceFilter !== 'ALL';

  const resetFilters = () => {
    setSearchTerm('');
    setUrgencyFilter('ALL');
    setStatusFilter('ALL');
    setProvinceFilter('ALL');
  };

  const handleMyCaseLookup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const caseId = myCaseLookup.trim();
    setViewScope('MY_CASES');
    setSearchTerm(caseId);
    setUrgencyFilter('ALL');
    setStatusFilter('ALL');
    setProvinceFilter('ALL');
  };

  const handleCopy = async (req: SOSRequest, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = buildSosShareText(req);
    await copyToClipboard(text);
    setCopyStatusId(req.id);
    setTimeout(() => setCopyStatusId(null), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">

      {/* Header */}
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <span className="size-2.5 animate-sos-pulse rounded-full bg-rose-600" />
            รายการขอความช่วยเหลือ
          </h1>
          <p className="page-subtitle">
            กระดานข้อมูลสดเรียลไทม์ สำหรับทีมกู้ภัย จิตอาสา และศูนย์ประสานงาน
          </p>
        </div>

        {/* Live Triage Ribbon */}
        {requests.length > 0 && (
          <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <button
              onClick={() => {
                setUrgencyFilter('CRITICAL');
                setStatusFilter('ALL');
              }}
              title="คลิกเพื่อกรองเคสวิกฤต"
              className={`px-3 py-2 text-center transition-colors hover:bg-red-50/60 ${
                urgencyFilter === 'CRITICAL' ? 'bg-red-50 ring-1 ring-inset ring-red-200' : ''
              }`}
            >
              <div className="text-lg font-black leading-none text-red-600 tabular-nums">{counts.critical}</div>
              <div className="mt-1 text-[11px] font-bold text-red-900">วิกฤต</div>
            </button>
            <div className="h-7 w-px bg-slate-200" />
            <button
              onClick={() => {
                setStatusFilter('PENDING');
                setUrgencyFilter('ALL');
              }}
              title="คลิกเพื่อกรองเคสที่รอดำเนินการ"
              className={`px-3 py-2 text-center transition-colors hover:bg-amber-50/60 ${
                statusFilter === 'PENDING' ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : ''
              }`}
            >
              <div className="text-lg font-black leading-none text-amber-600 tabular-nums">{counts.pending}</div>
              <div className="mt-1 text-[11px] font-bold text-amber-900">รอช่วย</div>
            </button>
            <div className="h-7 w-px bg-slate-200" />
            <button
              onClick={() => {
                setStatusFilter('RESPONDING');
                setUrgencyFilter('ALL');
              }}
              title="คลิกเพื่อกรองเคสที่กำลังเดินทางไปช่วย"
              className={`px-3 py-2 text-center transition-colors hover:bg-sky-50/60 ${
                statusFilter === 'RESPONDING' ? 'bg-sky-50 ring-1 ring-inset ring-sky-200' : ''
              }`}
            >
              <div className="text-lg font-black leading-none text-sky-600 tabular-nums">{counts.responding}</div>
              <div className="mt-1 text-[11px] font-bold text-sky-900">กำลังช่วย</div>
            </button>
            <div className="h-7 w-px bg-slate-200" />
            <button
              onClick={() => {
                setStatusFilter('COMPLETED');
                setUrgencyFilter('ALL');
              }}
              title="คลิกเพื่อกรองเคสที่ช่วยเหลือสำเร็จแล้ว"
              className={`px-3 py-2 text-center transition-colors hover:bg-emerald-50/60 ${
                statusFilter === 'COMPLETED' ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : ''
              }`}
            >
              <div className="text-lg font-black leading-none text-emerald-600 tabular-nums">{counts.completed}</div>
              <div className="mt-1 text-[11px] font-bold text-emerald-900">สำเร็จ</div>
            </button>
          </div>
        )}
      </header>

      {/* Private case tracking: only filters cases already linked to this account/device. */}
      <form onSubmit={handleMyCaseLookup} className="surface mb-4 flex flex-col gap-3 border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <label htmlFor="my-case-lookup" className="block text-sm font-bold text-slate-900">
            ติดตามเคสของฉัน
          </label>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            ค้นหาด้วยรหัสเคส ระบบจะแสดงเฉพาะเคสที่เชื่อมกับบัญชีหรือเบราว์เซอร์นี้
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto sm:min-w-[21rem]">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="my-case-lookup"
              type="search"
              value={myCaseLookup}
              onChange={event => setMyCaseLookup(event.target.value)}
              placeholder="เช่น SOS-2026-1234"
              autoComplete="off"
              className="field bg-white pl-9"
              aria-label="รหัสเคสของฉัน"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            ค้นหาเคส
          </button>
        </div>
      </form>

      {/* Scope Switcher: All Cases vs My Cases */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-white p-2 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewScope('ALL')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewScope === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>📋 เคสทั้งหมดในระบบ</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
              viewScope === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {requests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewScope('MY_CASES')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewScope === 'MY_CASES'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm ring-2 ring-emerald-400'
                : 'text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200/70'
            }`}
          >
            <span className="text-amber-300">⭐</span>
            <span>เคสของฉัน (ติดตามสถานะรับเรื่อง)</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
              viewScope === 'MY_CASES' ? 'bg-white/25 text-white' : 'bg-emerald-200 text-emerald-900'
            }`}>
              {myCasesCount}
            </span>
          </button>
        </div>

        {viewScope === 'MY_CASES' && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-[11px] font-semibold text-emerald-800 border border-emerald-200/80 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>แสดงเฉพาะเคสที่คุณแจ้ง เพื่อตรวจสอบว่ามีทีมกู้ภัยรับเรื่องแล้วหรือยัง</span>
          </div>
        )}
      </div>

      {/* Empty states */}
      {viewScope === 'MY_CASES' && myCasesCount === 0 ? (
        <div className="surface px-6 py-12 sm:py-16 text-center space-y-3">
          <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-amber-50 text-amber-600 border border-amber-200">
            <Star className="size-8 text-amber-500 fill-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            ยังไม่พบรายการขอความช่วยเหลือของคุณ
          </h2>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-500">
            {currentUser?.lineUserId ? (
              'คุณยังไม่มีเคสที่แจ้งขอความช่วยเหลือไว้ในระบบ หากประสบภัยและต้องการความช่วยเหลือ สามารถกดแจ้ง SOS ได้ทันที'
            ) : (
              'หากคุณเคยแจ้งเหตุไว้ หรือแจ้งจากเครื่องอื่น โปรดเข้าสู่ระบบด้วย LINE เพื่อซิงค์และดูว่ามีทีมกู้ภัยรับเรื่องแล้วหรือยัง'
            )}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {!currentUser?.lineUserId && onOpenLineLogin && (
              <button
                type="button"
                onClick={onOpenLineLogin}
                className="inline-flex items-center gap-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] px-4 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                <svg className="size-4 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 5.82 2 10.53c0 2.94 1.76 5.53 4.45 6.99-.18.66-.66 2.39-.75 2.76-.12.45.16.44.34.32.14-.09 1.94-1.32 2.73-1.85.4.06.81.09 1.23.09 5.52 0 10-3.82 10-8.53S17.52 2 12 2z"/>
                </svg>
                <span>เข้าสู่ระบบด้วย LINE</span>
              </button>
            )}
            {onGoToForm && (
              <button
                type="button"
                onClick={onGoToForm}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                <span>แจ้งขอความช่วยเหลือ (SOS)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewScope('ALL')}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              ดูรายการเคสทั้งหมดในระบบ
            </button>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="surface px-6 py-16 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
            <CheckCircle className="size-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">ยังไม่มีรายการขอความช่วยเหลือในระบบ</h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-slate-500">
            กระดานข้อมูลว่างเปล่าและพร้อมใช้งานจริง เคสที่ประชาชนแจ้งจะปรากฏที่นี่แบบเรียลไทม์ทันที
          </p>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="surface mb-4 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อ, เบอร์โทร, จังหวัด, อำเภอ, จุดสังเกต หรือรหัสเคส"
                  className="field bg-slate-50 pl-9 pr-9"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    aria-label="ล้างคำค้นหา"
                    className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-slate-200 text-slate-500 transition-colors hover:bg-slate-300"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowAdvanced(v => !v)}
                className={`chip ${
                  showAdvanced || hasAdvancedFilter
                    ? 'border-slate-300 bg-white text-slate-900 shadow-xs'
                    : 'chip-idle'
                }`}
              >
                <SlidersHorizontal className="size-3.5" />
                ตัวกรอง
                {hasAdvancedFilter && <span className="size-1.5 rounded-full bg-rose-500" />}
                <ChevronDown className={`size-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {URGENCY_FILTERS.map(f => {
                const isActive = urgencyFilter === f.id;
                const value = f.id === 'ALL' ? counts.total : requests.filter(r => r.urgency === f.id).length;
                return (
                  <button
                    key={f.id}
                    onClick={() => setUrgencyFilter(f.id)}
                    aria-pressed={isActive}
                    className={`chip ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'chip-idle'
                    }`}
                  >
                    {'icon' in f && f.icon ? (
                      <f.icon className={`size-3.5 ${isActive ? 'text-white' : f.dot}`} />
                    ) : (
                      <span className={`size-2 rounded-full ${f.dot}`} />
                    )}
                    {f.label}
                    <span className={`tabular-nums ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{value}</span>
                  </button>
                );
              })}
            </div>

            {showAdvanced && (
              <div className="mt-3 flex animate-fade flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="field w-auto min-w-[9rem] py-1.5 text-xs"
                >
                  <option value="ALL">สถานะทั้งหมด</option>
                  <option value="PENDING">รอดำเนินการ</option>
                  <option value="RESPONDING">กำลังไปช่วย</option>
                  <option value="COMPLETED">ช่วยเหลือแล้ว</option>
                </select>

                {provinces.length > 0 && (
                  <select
                    value={provinceFilter}
                    onChange={(e) => setProvinceFilter(e.target.value)}
                    className="field w-auto min-w-[9rem] py-1.5 text-xs"
                  >
                    <option value="ALL">ทุกจังหวัด</option>
                    {provinces.map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                )}

                <span className="text-[11px] text-slate-400 tabular-nums">
                  แสดง {filteredRequests.length} จาก {counts.total} เคส
                </span>

                {(hasAdvancedFilter || searchTerm) && (
                  <button
                    onClick={resetFilters}
                    className="ml-auto text-[11px] font-semibold text-slate-500 underline-offset-4 transition-colors hover:text-rose-600 hover:underline"
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Admin actions — collapsed behind one control */}
          {isAdmin && (
            <div ref={adminMenuRef} className="relative mb-4 flex justify-end">
              <button
                onClick={() => setShowAdminMenu(v => !v)}
                className="chip border-slate-200 bg-white text-slate-600 shadow-xs hover:border-slate-300 hover:text-slate-900"
              >
                <SlidersHorizontal className="size-3.5" />
                จัดการข้อมูล
                <ChevronDown className={`size-3 transition-transform ${showAdminMenu ? 'rotate-180' : ''}`} />
              </button>

              {showAdminMenu && (
                <div className="absolute right-0 top-full z-20 mt-2 flex w-56 animate-fade flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[var(--shadow-lift)]">
                  {onDeleteAllCompleted && counts.completed > 0 && (
                    <button
                      onClick={() => {
                        setShowAdminMenu(false);
                        if (window.confirm(`คุณต้องการลบเคสที่ช่วยเหลือสำเร็จแล้วทั้งหมด (${counts.completed} เคส) ออกจากระบบหรือไม่?`)) {
                          onDeleteAllCompleted();
                        }
                      }}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <Trash2 className="size-3.5" />
                      ลบเคสสำเร็จแล้ว ({counts.completed})
                    </button>
                  )}

                  {onResetMock && (
                    <button
                      onClick={() => {
                        setShowAdminMenu(false);
                        onResetMock();
                      }}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <Users className="size-3.5" />
                      รีเซ็ตเป็นข้อมูลตัวอย่าง
                    </button>
                  )}

                  {onClearAll && requests.length > 0 && (
                    <button
                      onClick={() => {
                        setShowAdminMenu(false);
                        if (window.confirm(`⚠️ คำเตือน: คุณต้องการล้างข้อมูลทั้งหมดให้ระบบว่างเปล่า (${requests.length} เคส) หรือไม่?\n\nข้อมูลจะถูกล้างออกจากฐานข้อมูลอย่างถาวร`)) {
                          onClearAll();
                        }
                      }}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                    >
                      <Trash2 className="size-3.5" />
                      ล้างกระดานให้โล่ง ({requests.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Case list */}
          {filteredRequests.length === 0 ? (
            <div className="surface p-12 text-center">
              <AlertTriangle className="mx-auto mb-2 size-9 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</h3>
              <button
                onClick={resetFilters}
                className="mt-2 text-xs font-semibold text-rose-600 underline-offset-4 hover:underline"
              >
                ล้างตัวกรอง
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredRequests.map(req => {
                const urgency = getUrgencyInfo(req.urgency);
                const water = getWaterLevelInfo(req.waterLevel);
                const status = getStatusInfo(req.status);
                const isOwner = isMyCase(req, currentUser);
                const totalPeople =
                  req.people.adults + req.people.elderly + req.people.bedridden + req.people.children;

                return (
                  <li key={req.id}>
                    <article
                      onClick={() => onSelectCase(req)}
                      className={`surface surface-interactive relative cursor-pointer overflow-hidden p-4 pl-5 sm:p-5 sm:pl-6 ${
                        req.status === 'COMPLETED' ? 'opacity-70' : ''
                      }`}
                    >
                      <span
                        className={`absolute inset-y-0 left-0 w-1 ${URGENCY_ACCENT[req.urgency]}`}
                      />

                      {/* Meta row */}
                      <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${urgency.badgeClass}`}>
                          {urgency.shortLabel}
                        </span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                          {req.id}
                        </span>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${status.badgeClass}`}>
                          {status.label}
                        </span>
                        {isOwner && (
                          <span className="rounded-full bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                            ⭐ เคสของคุณ
                          </span>
                        )}
                        <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="size-3" />
                          {formatThaiDateTime(req.createdAt)}
                        </span>
                      </div>

                      {/* Name + location */}
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                        <div className="md:col-span-7">
                          <h3 className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-slate-900">
                            {req.fullName}
                            {req.people.bedridden > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                <BedDouble className="size-3" />
                                ผู้ป่วยติดเตียง {req.people.bedridden}
                              </span>
                            )}
                          </h3>

                          <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-slate-600">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                            <span>
                              {req.address} ต.{req.subDistrict || '-'} อ.{req.district} จ.{req.province}
                            </span>
                          </p>

                          {req.landmark && (
                            <p className="mt-1.5 flex items-start gap-1.5 rounded-xl border border-amber-200/70 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-900">
                              <Flag className="mt-0.5 size-3 shrink-0 text-amber-500" />
                              {req.landmark}
                            </p>
                          )}
                        </div>

                        {/* Conditions summary */}
                        <div className="md:col-span-5">
                          <div className="h-full space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-[11px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500">ระดับน้ำ</span>
                              <span className={`rounded-md border px-1.5 py-0.5 font-bold ${water.badgeColor}`}>
                                {water.label}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-slate-600">
                              <span className="text-slate-500">ผู้ติดค้าง</span>
                              <span className="font-semibold text-slate-800">
                                {totalPeople} คน
                                {req.people.pets > 0 && ` (+${req.people.pets} สัตว์เลี้ยง)`}
                              </span>
                            </div>
                            {req.people.children > 0 && (
                              <div className="flex items-center justify-between gap-2 text-slate-600">
                                <span className="text-slate-500">เด็กเล็ก</span>
                                <span className="font-semibold text-slate-800">{req.people.children} คน</span>
                              </div>
                            )}
                            {req.responderNotes && (
                              <p className="truncate border-t border-slate-200 pt-1.5 font-medium text-sky-700">
                                {req.responderNotes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rescue Response Status Banner for this case */}
                      {req.status === 'PENDING' && (
                        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 flex items-center justify-between text-xs text-amber-950 shadow-2xs">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                            <span className="font-bold text-amber-900">🟡 รอทีมกู้ภัยรับเรื่อง</span>
                            <span className="hidden sm:inline text-amber-700 text-[11px]">(ระบบกำลังกระจายพิกัดสู่ทีมกู้ภัยในพื้นที่)</span>
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCaseToEdit(req);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="แก้ไขข้อมูลเคสของคุณ"
                            >
                              <Edit3 className="size-3" />
                              <span>แก้ไขข้อมูล</span>
                            </button>
                          )}
                        </div>
                      )}

                      {req.status === 'RESPONDING' && (
                        <div className="mt-3 rounded-xl border border-sky-300 bg-sky-50/90 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-sky-950 shadow-2xs">
                          <div className="flex items-start sm:items-center gap-2">
                            <span className="size-2.5 mt-0.5 sm:mt-0 rounded-full bg-sky-600 animate-pulse shrink-0" />
                            <div>
                              <span className="font-bold text-sky-900">🚨 มีทีมกู้ภัยรับเรื่องแล้ว!</span>
                              <span className="ml-1.5 font-bold text-sky-950">
                                🚒 {req.rescuedBy || 'ทีมกู้ภัยในพื้นที่'}
                              </span>
                              {req.responderNotes && (
                                <span className="block sm:inline sm:ml-2 text-sky-800 text-[11px]">
                                  ("{req.responderNotes}")
                                </span>
                              )}
                            </div>
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCaseToEdit(req);
                              }}
                              className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="แก้ไขข้อมูลเคสของคุณ"
                            >
                              <Edit3 className="size-3" />
                              <span>แก้ไขข้อมูล</span>
                            </button>
                          )}
                        </div>
                      )}

                      {req.status === 'COMPLETED' && (
                        <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50/90 p-2.5 flex items-center justify-between text-xs text-emerald-950 shadow-2xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                            <span className="font-bold text-emerald-900">🟢 ได้รับความช่วยเหลือแล้ว</span>
                            {req.rescuedBy && <span className="text-[11px] text-emerald-800">โดย {req.rescuedBy}</span>}
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCaseToEdit(req);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Edit3 className="size-3" />
                              <span>อัปเดตข้อมูล</span>
                            </button>
                          )}
                        </div>
                      )}

                      {req.status === 'CANCELLED' && (
                        <div className="mt-3 rounded-xl border border-slate-300 bg-slate-100 p-2 flex items-center justify-between text-xs text-slate-800 shadow-2xs">
                          <span className="font-medium text-slate-600">⚪ ยกเลิกคำขอแล้ว</span>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCaseToEdit(req);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="size-3" />
                              <span>แก้ไข</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Needs */}
                      {req.needs.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {req.needs.map((need, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600"
                            >
                              {need}
                            </span>
                          ))}
                        </div>
                      )}

                      {req.notes && (
                        <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] italic text-slate-600">
                          {req.notes}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isAdmin ? (
                            <a
                              href={`tel:${req.primaryPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700"
                            >
                              <Phone className="size-3.5" />
                              <span className="hidden sm:inline">โทร</span>
                              {req.primaryPhone}
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600"
                              title="ปกปิดเบอร์โทรตาม PDPA (เจ้าหน้าที่เข้าสู่ระบบด้วย PIN เพื่อดูเบอร์เต็ม)"
                            >
                              <Phone className="size-3 text-slate-400" />
                              {maskPhone(req.primaryPhone)}
                            </span>
                          )}

                          {req.lineId && (
                            <a
                              href={`https://line.me/ti/p/~${encodeURIComponent(req.lineId.replace(/^@/, ''))}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#06C755] hover:bg-[#05b34c] px-3 py-1.5 text-[11px] font-bold text-white transition-colors shadow-2xs"
                              title={`เปิดแชท LINE กับผู้แจ้ง: @${req.lineId.replace(/^@/, '')}`}
                            >
                              <MessageCircle className="size-3.5" />
                              <span>แชท LINE</span>
                            </a>
                          )}

                          <a
                            href={req.googleMapsUrl || getGoogleMapsUrl(req.coordinates.lat, req.coordinates.lng)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-slate-800"
                            title={req.googleMapsUrl ? 'เปิดพิกัดจริงที่ผู้ประสบภัยแนบมา' : 'เปิด Google Maps นำทาง'}
                          >
                            <Navigation className="size-3.5" />
                            นำทาง
                          </a>

                          <button
                            type="button"
                            onClick={(e) => handleCopy(req, e)}
                            title="คัดลอกข้อมูลเคส"
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                          >
                            {copyStatusId === req.id ? (
                              <>
                                <CheckCircle2 className="size-3.5 text-emerald-600" />
                                คัดลอกแล้ว
                              </>
                            ) : (
                              <>
                                <Share2 className="size-3.5" />
                                คัดลอก
                              </>
                            )}
                          </button>
                            {isOwner && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCaseToEdit(req);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 transition-colors hover:bg-emerald-100 cursor-pointer shadow-2xs"
                                title="แก้ไขข้อมูลเคสของคุณ"
                              >
                                <Edit3 className="size-3.5" />
                                <span>แก้ไขเคสนี้</span>
                              </button>
                            )}
                          </div>

                        <div className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {req.status === 'PENDING' && (
                            <button
                              onClick={() => onUpdateStatus(req.id, 'RESPONDING', 'ทีมกู้ภัยรับเรื่องแล้ว กำลังเดินทางเข้าช่วยเหลือ')}
                              className="rounded-full bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-slate-900 transition-colors hover:bg-amber-500"
                            >
                              รับเคส / ไปช่วย
                            </button>
                          )}
                          {req.status === 'RESPONDING' && (
                            <button
                              onClick={() => onUpdateStatus(req.id, 'COMPLETED', 'ช่วยเหลือและส่งตัวยังศูนย์พักพิงเรียบร้อย')}
                              className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700"
                            >
                              ช่วยสำเร็จแล้ว
                            </button>
                          )}
                          {req.status === 'COMPLETED' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700">
                              <CheckCircle className="size-3.5" />
                              สำเร็จแล้ว
                            </span>
                          )}

                          {isAdmin && onDeleteCase && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`คุณต้องการลบเคส "${req.fullName}" (รหัส: ${req.id}) ออกจากระบบหรือไม่?`)) {
                                  onDeleteCase(req.id);
                                }
                              }}
                              title="ลบเคสนี้ (เฉพาะแอดมิน)"
                              className="grid size-7 place-items-center rounded-full border border-rose-200 bg-white text-rose-600 transition-colors hover:bg-rose-600 hover:text-white"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* Citizen Case Owner Edit Modal */}
      {caseToEdit && (
        <EditCaseModal
          request={caseToEdit}
          isOpen={Boolean(caseToEdit)}
          currentUser={currentUser || null}
          onClose={() => setCaseToEdit(null)}
          onSave={(updated) => {
            if (onUpdateCase) {
              onUpdateCase(updated);
            }
            setCaseToEdit(null);
          }}
          onOpenLineLogin={() => {
            if (onOpenLineLogin) {
              onOpenLineLogin();
            }
          }}
        />
      )}
    </div>
  );
};
