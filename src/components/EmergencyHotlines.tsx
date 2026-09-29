import React, { useState } from 'react';
import {
  Phone,
  Shield,
  Ambulance,
  Truck,
  Search,
  PhoneCall,
  Zap,
  X,
  type LucideIcon
} from 'lucide-react';
import { EMERGENCY_CONTACTS } from '../data/mockData';
import type { EmergencyContact } from '../types/sos';

const CATEGORY_TABS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'medical', label: 'การแพทย์' },
  { id: 'rescue', label: 'กู้ภัย' },
  { id: 'national', label: 'ศูนย์ประสานงาน' },
  { id: 'utility', label: 'สาธารณูปโภค' }
];

const ICONS: Record<EmergencyContact['iconType'], LucideIcon> = {
  ambulance: Ambulance,
  shield: Shield,
  truck: Truck,
  utility: Zap,
  phone: Phone
};

const QUICK_DIALS = [
  { phone: '1784', label: 'สายด่วนนิรภัย ปภ.', desc: 'แจ้งอุทกภัย กู้ภัยทั่วประเทศ', icon: Shield, tone: 'from-rose-500 to-red-700' },
  { phone: '1669', label: 'การแพทย์ฉุกเฉิน', desc: 'ผู้ป่วยวิกฤต เจ็บป่วยฉุกเฉิน', icon: Ambulance, tone: 'from-emerald-500 to-teal-700' },
  { phone: '199', label: 'ดับเพลิง & กู้ภัย', desc: 'บรรเทาสาธารณภัย ค้นหาคน', icon: Truck, tone: 'from-sky-500 to-indigo-700' }
];

export const EmergencyHotlines: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredContacts = EMERGENCY_CONTACTS.filter(contact => {
    if (categoryFilter !== 'all' && contact.category !== categoryFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        contact.name.toLowerCase().includes(term) ||
        contact.phone.includes(term) ||
        contact.desc.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">

      <header className="mb-6 text-center">
        <h2 className="page-title flex items-center justify-center gap-2.5">
          <PhoneCall className="size-6 text-rose-600" />
          เบอร์สายด่วนฉุกเฉิน
        </h2>
        <p className="page-subtitle">
          โทรฟรีตลอด 24 ชั่วโมง ทุกเครือข่ายมือถือ (แม้ไม่มีเงินในซิม)
        </p>
      </header>

      {/* One-tap dials */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {QUICK_DIALS.map(({ phone, label, desc, icon: Icon, tone }) => (
          <a
            key={phone}
            href={`tel:${phone}`}
            className={`group flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-br ${tone} p-4 text-white shadow-[var(--shadow-soft)] transition-all duration-200 hover:shadow-[var(--shadow-lift)] active:scale-[0.98]`}
          >
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold opacity-80">{label}</p>
              <p className="text-2xl font-black leading-tight tabular-nums">{phone}</p>
              <p className="mt-0.5 truncate text-[11px] opacity-75">{desc}</p>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/20 transition-transform duration-200 group-hover:scale-110">
              <Icon className="size-5" />
            </span>
          </a>
        ))}
      </div>

      {/* Search + category filter */}
      <div className="surface mb-4 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาเบอร์ หรือหน่วยงาน..."
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

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {CATEGORY_TABS.map(tab => {
            const isActive = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                aria-pressed={isActive}
                className={`chip ${
                  isActive ? 'border-slate-900 bg-slate-900 text-white' : 'chip-idle'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contact list */}
      {filteredContacts.length === 0 ? (
        <div className="surface p-12 text-center">
          <Search className="mx-auto mb-2 size-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">ไม่พบเบอร์ที่ตรงกับคำค้นหา</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {filteredContacts.map(contact => {
            const Icon = ICONS[contact.iconType];
            return (
              <li key={contact.phone}>
                <a
                  href={`tel:${contact.phone}`}
                  className="group flex h-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[var(--shadow-lift)] active:scale-[0.99]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-rose-50 group-hover:text-rose-600">
                    <Icon className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold leading-snug text-slate-900">
                      {contact.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                      {contact.desc}
                    </span>
                  </span>

                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-extrabold tabular-nums text-slate-800 transition-colors group-hover:border-rose-600 group-hover:bg-rose-600 group-hover:text-white">
                    <Phone className="size-3.5" />
                    {contact.phone}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
