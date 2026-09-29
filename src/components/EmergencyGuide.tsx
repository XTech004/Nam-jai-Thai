import React, { useState } from 'react';
import {
  Zap,
  BatteryCharging,
  ShieldCheck,
  Flag,
  Bug,
  Waves,
  Package,
  FileText,
  Shirt,
  Banknote,
  Flashlight,
  Check,
  type LucideIcon
} from 'lucide-react';

interface GuideTopic {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: string;
  items: string[];
}

const TOPICS: GuideTopic[] = [
  {
    id: 'electric',
    title: 'ไฟฟ้ารั่ว',
    subtitle: 'อันตรายถึงชีวิต',
    icon: Zap,
    tone: 'text-rose-600 bg-rose-50 border-rose-100',
    items: [
      'สับคัตเอาต์/เบรกเกอร์ทันที หากน้ำเริ่มเอ่อท่วมชั้นล่างของบ้าน',
      'ห้ามสัมผัสสวิตช์ไฟ ปลั๊กไฟ หรือเครื่องใช้ไฟฟ้าขณะตัวเปียกหรือแช่น้ำเด็ดขาด',
      'สังเกตเสาไฟฟ้า ป้ายโฆษณา หรือหม้อแปลงไฟฟ้า หากเดินลุยน้ำให้ถอยห่างทันที',
      'หากรู้สึกชาหรือมีกระตุกบริเวณเท้า ให้รีบก้าวถอยหลังออกจากจุดนั้น'
    ]
  },
  {
    id: 'health',
    title: 'สัตว์มีพิษ & สุขอนามัย',
    subtitle: 'ป้องกันโรคและอาการกัด',
    icon: Bug,
    tone: 'text-amber-600 bg-amber-50 border-amber-100',
    items: [
      'งู ตะขาบ แมงป่อง มักหนีน้ำขึ้นมาหลบตามขอบหน้าต่าง เพดาน หรือเสื้อผ้า',
      'เคาะหรือตรวจสอบสิ่งของก่อนหยิบจับเสมอ โดยเฉพาะในเวลากลางคืน',
      'ห้ามดื่มน้ำท่วมเด็ดขาด ดื่มเฉพาะน้ำขวดหรือน้ำต้มสุก เพื่อป้องกันอหิวาตกโรค',
      'หากมีแผลที่เท้า ให้เช็ดแห้งและทายาฆ่าเชื้อทันที ป้องกันโรคน้ำกัดเท้า'
    ]
  },
  {
    id: 'battery',
    title: 'ถนอมแบตเตอรี่',
    subtitle: 'ให้เครื่องใช้ไฟอยู่นาน',
    icon: BatteryCharging,
    tone: 'text-sky-600 bg-sky-50 border-sky-100',
    items: [
      'เปิดโหมดประหยัดพลังงานขั้นสูง (Ultra Power Saving Mode)',
      'ลดความสว่างหน้าจอลงให้เหลือน้อยที่สุด',
      'ปิด Bluetooth, GPS (เมื่อส่งพิกัดเรียบร้อยแล้ว) และปิดแอปเบื้องหลังทั้งหมด',
      'ใช้การส่ง SMS แทนการโทรเสียง เพราะประหยัดแบตและส่งผ่านสัญญาณอ่อนได้ดีกว่า'
    ]
  },
  {
    id: 'signal',
    title: 'ส่งสัญญาณให้กู้ภัยเห็น',
    subtitle: 'เพิ่มโอกาสถูกค้นพบ',
    icon: Flag,
    tone: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    items: [
      'กลางวัน: ผูกผ้าสีสด (แดง/ส้ม/เหลือง) ไว้ที่ระเบียง เสา หรือหลังคาที่มองเห็นได้จากทางอากาศ',
      'กลางคืน: ใช้ไฟฉายเป็นรหัสมอส SOS — สั้น 3 ครั้ง / ยาว 3 ครั้ง / สั้น 3 ครั้ง (... --- ...)',
      'ใช้นกหวีดเป่าเป็นจังหวะเพื่อบอกตำแหน่ง เสียงดังกว่าการตะโกนและไม่เหนื่อย',
      'เขียนรหัสหรือจำนวนคนติดค้างด้วยสีหรือชอล์กตัวใหญ่ ๆ บนดาดฟ้าหรือหลังคา'
    ]
  }
];

const GO_BAG: { id: string; title: string; detail: string; icon: LucideIcon }[] = [
  { id: 'food', title: 'อาหารและน้ำ', detail: 'น้ำดื่ม 2 ลิตร/คน/วัน, ปลากระป๋อง, อาหารแห้ง, นมกล่อง', icon: Package },
  { id: 'med', title: 'ยาและสุขอนามัย', detail: 'ยาประจำตัว, พาราเซตามอล, ยาแก้ท้องเสีย, ผ้าอ้อม', icon: ShieldCheck },
  { id: 'comms', title: 'เครื่องมือสื่อสาร', detail: 'ไฟฉาย, ถ่านสำรอง, พาวเวอร์แบงก์ชาร์จเต็ม, นกหวีด', icon: Flashlight },
  { id: 'docs', title: 'เอกสารสำคัญ', detail: 'บัตรประชาชน, ทะเบียนบ้าน, กรมธรรม์ประกันภัย', icon: FileText },
  { id: 'cloth', title: 'เครื่องนุ่งห่ม', detail: 'เสื้อกันฝน, เสื้อผ้าสำรอง, ถุงเท้า, ผ้าเช็ดตัว', icon: Shirt },
  { id: 'cash', title: 'เงินสดฉุกเฉิน', detail: 'ธนบัตรย่อย (20/50/100) เพราะไฟดับ ATM ใช้ไม่ได้', icon: Banknote }
];

export const EmergencyGuide: React.FC = () => {
  const [activeTopic, setActiveTopic] = useState<string>(TOPICS[0].id);
  const [checkedBag, setCheckedBag] = useState<Record<string, boolean>>({});

  const current = TOPICS.find(t => t.id === activeTopic) ?? TOPICS[0];
  const ActiveIcon = current.icon;
  const packedCount = GO_BAG.filter(item => checkedBag[item.id]).length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">

      <header className="mb-6 text-center">
        <h2 className="page-title flex items-center justify-center gap-2.5">
          <ShieldCheck className="size-6 text-emerald-600" />
          คู่มือเอาตัวรอดเมื่อน้ำท่วม
        </h2>
        <p className="page-subtitle">
          สี่สิ่งที่ต้องจำให้ปลอดภัยที่สุด และเช็กลิสต์กระเป๋ายังชีพ 72 ชั่วโมง
        </p>
      </header>

      {/* Topic switcher */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TOPICS.map(topic => {
          const isActive = activeTopic === topic.id;
          const Icon = topic.icon;
          return (
            <button
              key={topic.id}
              onClick={() => setActiveTopic(topic.id)}
              aria-pressed={isActive}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all duration-200 ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow-[var(--shadow-lift)]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-[var(--shadow-soft)]'
              }`}
            >
              <span className={`grid size-9 place-items-center rounded-xl border ${isActive ? 'border-white/20 bg-white/10' : topic.tone}`}>
                <Icon className={`size-4.5 ${isActive ? 'text-white' : ''}`} />
              </span>
              <span className={`text-[12px] font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-800'}`}>
                {topic.title}
              </span>
              <span className={`text-[10px] leading-tight ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                {topic.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active topic */}
      <section className="surface mb-6 p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2.5">
          <span className={`grid size-8 place-items-center rounded-xl border ${current.tone}`}>
            <ActiveIcon className="size-4" />
          </span>
          <h3 className="text-[15px] font-bold text-slate-900">
            {current.title}
          </h3>
        </div>
        <ul className="space-y-2.5">
          {current.items.map(item => (
            <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-600">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Go-bag checklist */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-[var(--shadow-lift)] sm:p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Waves className="size-5 text-sky-400" />
            กระเป๋ายังชีพฉุกเฉิน 72 ชั่วโมง
          </h3>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-200">
            พร้อมแล้ว {packedCount}/{GO_BAG.length}
          </span>
        </div>
        <p className="mb-4 text-[11px] text-slate-400">
          ใส่ในถุงพลาสติกกันน้ำหรือเป้สะพายหลังที่หยิบได้ทันทีเมื่อต้องอพยพด่วน
        </p>

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${(packedCount / GO_BAG.length) * 100}%` }}
          />
        </div>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GO_BAG.map(item => {
            const isChecked = !!checkedBag[item.id];
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCheckedBag(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  aria-pressed={isChecked}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
                    isChecked
                      ? 'border-emerald-400/40 bg-emerald-400/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${
                      isChecked ? 'border-emerald-400 bg-emerald-400 text-slate-900' : 'border-white/25'
                    }`}
                  >
                    {isChecked && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`flex items-center gap-1.5 text-[12px] font-bold ${isChecked ? 'text-emerald-300' : 'text-white'}`}>
                      <Icon className="size-3.5" />
                      {item.title}
                    </span>
                    <span className={`mt-0.5 block text-[11px] leading-relaxed ${isChecked ? 'text-emerald-200/50 line-through' : 'text-slate-400'}`}>
                      {item.detail}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};
