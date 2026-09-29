import { useState } from 'react';
import { Phone, Shield, Ambulance, Truck, Search, PhoneCall, Zap } from 'lucide-react';
import { EMERGENCY_CONTACTS } from '../data/mockData';
import type { EmergencyContact } from '../types/sos';

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

  const getIcon = (type: EmergencyContact['iconType']) => {
    switch (type) {
      case 'ambulance':
        return <Ambulance className="w-5 h-5 text-red-600" />;
      case 'shield':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'truck':
        return <Truck className="w-5 h-5 text-amber-600" />;
      case 'utility':
        return <Zap className="w-5 h-5 text-yellow-600" />;
      default:
        return <Phone className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
          <PhoneCall className="w-7 h-7 text-red-600" />
          <span>รวมเบอร์สายด่วนฉุกเฉินน้ำท่วม</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          โทรฟรีได้ตลอด 24 ชั่วโมง ทุกเครือข่ายมือถือ (แม้ไม่มีเงินในซิม)
        </p>
      </div>

      {/* Quick Dial Top 3 Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <a
          href="tel:1784"
          className="p-4 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-md hover:shadow-lg transition-transform active:scale-98 flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-semibold text-red-200">สายด่วนนิรภัย ปภ.</span>
            <div className="text-2xl font-black">1784</div>
            <span className="text-[11px] text-red-100">แจ้งอุทกภัย กู้ภัยทั่วประเทศ</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Phone className="w-6 h-6" />
          </div>
        </a>

        <a
          href="tel:1669"
          className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md hover:shadow-lg transition-transform active:scale-98 flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-semibold text-emerald-200">การแพทย์ฉุกเฉิน (สพฉ.)</span>
            <div className="text-2xl font-black">1669</div>
            <span className="text-[11px] text-emerald-100">ผู้ป่วยวิกฤต เจ็บป่วยฉุกเฉิน</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Ambulance className="w-6 h-6" />
          </div>
        </a>

        <a
          href="tel:199"
          className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md hover:shadow-lg transition-transform active:scale-98 flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-semibold text-blue-200">ดับเพลิง & กู้ภัยทางน้ำ</span>
            <div className="text-2xl font-black">199</div>
            <span className="text-[11px] text-blue-100">บรรเทาสาธารณภัย ค้นหาคน</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Truck className="w-6 h-6" />
          </div>
        </a>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm mb-4 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="ค้นหาเบอร์ หรือหน่วยงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'medical', label: 'การแพทย์ & ผู้ป่วย' },
            { id: 'rescue', label: 'กู้ภัย & สาธารณภัย' },
            { id: 'national', label: 'ศูนย์ประสานงานรัฐ' },
            { id: 'utility', label: 'ไฟฟ้า & น้ำประปา' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                categoryFilter === tab.id
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredContacts.map((contact, index) => (
          <div
            key={index}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(contact.iconType)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{contact.name}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{contact.desc}</p>
              </div>
            </div>

            <a
              href={`tel:${contact.phone}`}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-extrabold text-sm flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <Phone className="w-4 h-4" />
              <span>{contact.phone}</span>
            </a>
          </div>
        ))}
      </div>

    </div>
  );
};
