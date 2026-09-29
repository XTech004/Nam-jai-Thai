import React from 'react';
import { 
  Zap, 
  BatteryCharging, 
  AlertTriangle, 
  HelpCircle, 
  ShieldCheck, 
  Waves, 
  Luggage,
  Flag
} from 'lucide-react';

export const EmergencyGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
          <ShieldCheck className="w-7 h-7 text-emerald-600" />
          <span>คู่มือเอาตัวรอดในสถานการณ์น้ำท่วม</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          คำแนะนำเพื่อความปลอดภัยสูงสุดสำหรับผู้ประสบภัยและครอบครัว
        </p>
      </div>

      {/* Critical Safety Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: อันตรายจากไฟฟ้า */}
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">1. ระวังกระแสไฟฟ้ารั่ว (อันตรายถึงชีวิต)</h3>
              <ul className="text-xs text-slate-600 mt-2 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><b>สับคัตเอาต์/เบรกเกอร์ทันที</b> หากน้ำเริ่มเอ่อท่วมชั้นล่างของบ้าน</li>
                <li>ห้ามสัมผัสสวิตช์ไฟ ปลั๊กไฟ หรือเครื่องใช้ไฟฟ้าขณะตัวเปียกหรือแช่น้ำเด็ดขาด</li>
                <li>สังเกตเสาไฟฟ้า ป้ายโฆษณา หรือหม้อแปลงไฟฟ้า หากเดินลุยน้ำให้ถอยห่างทันที</li>
                <li>หากรู้สึกชาหรือมีกระตุกบริเวณเท้า ให้รีบก้าวถอยหลังออกจากจุดนั้น</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card 2: สัตว์มีพิษและเชื้อโรค */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">2. สัตว์มีพิษหนีน้ำ & สุขอนามัย</h3>
              <ul className="text-xs text-slate-600 mt-2 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>งู ตะขาบ แมงป่อง มักหนีน้ำขึ้นมาหลบตามขอบหน้าต่าง เพดาน หรือเสื้อผ้า</li>
                <li>เคาะหรือตรวจสอบสิ่งของก่อนหยิบจับเสมอ โดยเฉพาะในเวลากลางคืน</li>
                <li><b>ห้ามดื่มน้ำท่วมเด็ดขาด</b> ดื่มเฉพาะน้ำขวดหรือน้ำต้มสุก เพื่อป้องกันอหิวาตกโรค</li>
                <li>หากมีแผลที่เท้า ให้เช็ดแห้งและทายาฆ่าเชื้อทันที ป้องกันโรคน้ำกัดเท้าและโรคฉี่หนู</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card 3: การประหยัดแบตเตอรี่มือถือ */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <BatteryCharging className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">3. ถนอมแบตเตอรี่โทรศัพท์มือถือ</h3>
              <ul className="text-xs text-slate-600 mt-2 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><b>เปิดโหมดประหยัดพลังงานขั้นสูง (Ultra Power Saving Mode)</b></li>
                <li>ลดความสว่างหน้าจอลงให้เหลือน้อยที่สุด</li>
                <li>ปิด Bluetooth, GPS (เมื่อส่งพิกัดเรียบร้อยแล้ว) และปิดแอปเบื้องหลังทั้งหมด</li>
                <li><b>ใช้การส่ง SMS หรือแชทตัวหนังสือ</b> แทนการโทรด้วยเสียง เพราะประหยัดแบตและส่งผ่านสัญญาณอ่อนได้ดีกว่า</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card 4: การส่งสัญญาณขอความช่วยเหลือ */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">4. ส่งสัญญาณให้กู้ภัยมองเห็น</h3>
              <ul className="text-xs text-slate-600 mt-2 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><b>กลางวัน:</b> ผูกผ้าสีสด (แดง/ส้ม/เหลือง) ไว้ตรงระเบียง เสา หรือหลังคาที่มองเห็นได้จากทางอากาศ/เรือ</li>
                <li><b>กลางคืน:</b> ใช้ไฟฉายส่องเป็นสัญญาณรหัสมอส SOS: <b>สั้น 3 ครั้ง / ยาว 3 ครั้ง / สั้น 3 ครั้ง (... --- ...)</b></li>
                <li>ใช้นกหวีดเป่าเป็นจังหวะเพื่อบอกตำแหน่ง เสียงนกหวีดจะดังกว่าการตะโกนและไม่เหนื่อย</li>
                <li>เขียนรหัสหรือจำนวนคนติดค้างด้วยสีหรือชอล์กตัวใหญ่ๆ บนดาดฟ้าหรือหลังคา</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* 72-Hour Go Bag Checklist */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 sm:p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-2.5 mb-3">
          <Luggage className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-bold">เช็กลิสต์: กระเป๋ายังชีพฉุกเฉิน 72 ชั่วโมง (Go-Bag)</h3>
        </div>
        <p className="text-xs text-slate-300 mb-4">
          ควรใส่ไว้ในถุงพลาสติกกันน้ำหรือเป้สะพายหลังที่หยิบฉวยได้ทันทีเมื่อต้องอพยพด่วน
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <div className="font-bold text-yellow-300 mb-1">📦 อาหารและน้ำ</div>
            <p className="text-slate-300">น้ำดื่มสะอาด (คนละ 2 ลิตร/วัน), ปลากระป๋อง, อาหารแห้งที่ไม่ต้องต้ม, นมกล่อง, ขนมปังกรอบ</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <div className="font-bold text-yellow-300 mb-1">💊 ยาและสุขอนามัย</div>
            <p className="text-slate-300">ยาประจำตัว (เบาหวาน/ความดัน), พาราเซตามอล, ยาแก้ท้องเสีย, พลาสเตอร์ยา, ผ้าอ้อมผู้ใหญ่/เด็ก</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <div className="font-bold text-yellow-300 mb-1">🔦 เครื่องมือสื่อสาร</div>
            <p className="text-slate-300">ไฟฉาย, ถ่านสำรอง, พาวเวอร์แบงก์ชาร์จเต็ม, นกหวีด, ถุงกันน้ำสำหรับใส่มือถือ</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <div className="font-bold text-yellow-300 mb-1">📄 เอกสารสำคัญ</div>
            <p className="text-slate-300">บัตรประชาชน, ทะเบียนบ้าน, สมุดบัญชี, กรมธรรม์ประกันภัย (ใส่ซองซิปล็อกกันน้ำ)</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <div className="font-bold text-yellow-300 mb-1">👕 เครื่องนุ่งห่ม</div>
            <p className="text-slate-300">เสื้อกันฝน, เสื้อผ้าสำรอง 1 ชุด, ถุงเท้า, ผ้าเช็ดตัวผืนเล็ก, เสื้อชูชีพ (ถ้ามี)</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <div className="font-bold text-yellow-300 mb-1">💵 เงินสดฉุกเฉิน</div>
            <p className="text-slate-300">ธนบัตรย่อย (แบงก์ 20, 50, 100) เพราะไฟฟ้าดับตู้ ATM และระบบสแกนจ่ายอาจใช้การไม่ได้</p>
          </div>
        </div>
      </div>

    </div>
  );
};
