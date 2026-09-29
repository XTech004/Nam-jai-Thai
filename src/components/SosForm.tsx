import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  AlertOctagon, 
  Phone, 
  Users, 
  Package, 
  CheckCircle2, 
  Camera, 
  AlertCircle,
  Loader2,
  Navigation,
  Info,
  HelpCircle
} from 'lucide-react';
import type { SOSRequest, UrgencyLevel, WaterLevel, PeopleCount } from '../types/sos';
import { COMMON_NEEDS_LIST } from '../data/mockData';
import { getProvinces, getDistricts, getSubDistricts } from '../utils/thaiAddresses';

interface SosFormProps {
  onSubmitSuccess: (newRequest: SOSRequest) => void;
}

export const SosForm: React.FC<SosFormProps> = ({ onSubmitSuccess }) => {
  // Form State
  const [urgency, setUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [waterLevel, setWaterLevel] = useState<WaterLevel>('SECOND_FLOOR');
  
  // Geolocation
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string>('');

  // People
  const [people, setPeople] = useState<PeopleCount>({
    adults: 2,
    elderly: 0,
    bedridden: 0,
    children: 0,
    pets: 0
  });

  // Needs
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([
    'เรือท้องแบน/เรือกู้ภัยอพยพด่วน',
    'น้ำดื่มสะอาด (ขาดแคลนหนัก)'
  ]);

  // Contact & Location
  const [fullName, setFullName] = useState<string>('');
  const [primaryPhone, setPrimaryPhone] = useState<string>('');
  const [secondaryPhone, setSecondaryPhone] = useState<string>('');
  const [lineId, setLineId] = useState<string>('');
  
  const [province, setProvince] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [subDistrict, setSubDistrict] = useState<string>('');

  // Thai Address Cascading Dropdowns
  const availableProvinces = useMemo(() => getProvinces(), []);
  const availableDistricts = useMemo(() => getDistricts(province), [province]);
  const availableSubDistricts = useMemo(() => getSubDistricts(province, district), [province, district]);

  const handleProvinceChange = (newProvince: string) => {
    setProvince(newProvince);
    setDistrict('');
    setSubDistrict('');
    if (formErrors.province) {
      setFormErrors(prev => ({ ...prev, province: '' }));
    }
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    setSubDistrict('');
    if (formErrors.district) {
      setFormErrors(prev => ({ ...prev, district: '' }));
    }
  };

  const handleSubDistrictChange = (newSubDistrict: string) => {
    setSubDistrict(newSubDistrict);
  };
  const [address, setAddress] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Trigger GPS retrieval
  const handleGetGPS = () => {
    setGpsLoading(true);
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('อุปกรณ์ของคุณไม่รองรับการดึงพิกัด GPS กรุณากรอกที่อยู่และจุดสังเกตอย่างละเอียด');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy)
        });
        setGpsLoading(false);
      },
      (error) => {
        console.warn('GPS Error:', error);
        let errorMsg = 'ไม่สามารถดึงพิกัดได้ กรุณากด "อนุญาตเข้าถึงตำแหน่ง" บนเบราว์เซอร์';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'ท่านปฏิเสธการเข้าถึงตำแหน่ง GPS กรุณาเปิดการอนุญาตในตั้งค่าของเบราว์เซอร์ หรือระบุที่อยู่ด้านล่าง';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'หมดเวลาค้นหาสัญญาณ GPS กรุณาลองใหม่อีกครั้ง';
        }
        setGpsError(errorMsg);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Toggle Needs
  const toggleNeed = (need: string) => {
    if (selectedNeeds.includes(need)) {
      setSelectedNeeds(selectedNeeds.filter(n => n !== need));
    } else {
      setSelectedNeeds([...selectedNeeds, need]);
    }
  };

  // Adjust people count
  const updatePeople = (field: keyof PeopleCount, delta: number) => {
    setPeople(prev => ({
      ...prev,
      [field]: Math.max(0, prev[field] + delta)
    }));
  };

  // Handle Image Upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('กรุณาเลือกรูปภาพขนาดไม่เกิน 8MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form Validation & Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!fullName.trim()) {
      errors.fullName = 'กรุณาระบุชื่อ-นามสกุล หรือชื่อเรียก';
    }
    if (!primaryPhone.trim() || primaryPhone.replace(/[^0-9]/g, '').length < 9) {
      errors.primaryPhone = 'กรุณาระบุเบอร์โทรศัพท์ที่ติดต่อได้ (อย่างน้อย 9-10 หลัก)';
    }
    if (!province.trim()) {
      errors.province = 'กรุณาระบุจังหวัด';
    }
    if (!district.trim()) {
      errors.district = 'กรุณาระบุอำเภอ';
    }
    if (!address.trim() && !landmark.trim()) {
      errors.address = 'กรุณาระบุบ้านเลขที่ ซอย หรือจุดสังเกตเด่น เพื่อให้ทีมกู้ภัยหาพบ';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    // Fallback coordinates if GPS not acquired
    // Default to approximate center or regional coordinate
    const finalCoordinates = coords || {
      lat: 18.7883 + (Math.random() - 0.5) * 0.1, // Approximate northern flood region
      lng: 98.9853 + (Math.random() - 0.5) * 0.1,
      accuracy: 100
    };

    const newSosRequest: SOSRequest = {
      id: `SOS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      urgency,
      status: 'PENDING',
      fullName: fullName.trim(),
      primaryPhone: primaryPhone.trim(),
      secondaryPhone: secondaryPhone.trim() || undefined,
      lineId: lineId.trim() || undefined,
      province: province.trim(),
      district: district.trim(),
      subDistrict: subDistrict.trim() || undefined,
      address: address.trim(),
      landmark: landmark.trim(),
      coordinates: finalCoordinates,
      waterLevel,
      people,
      needs: selectedNeeds.length > 0 ? selectedNeeds : ['ต้องการความช่วยเหลือเร่งด่วน'],
      notes: notes.trim() || undefined,
      imageUrl: imagePreview || undefined,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      onSubmitSuccess(newSosRequest);
    }, 400);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6">
      {/* Alert Header Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-4 sm:p-5 rounded-2xl shadow-lg mb-6">
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-8 h-8 shrink-0 text-yellow-300 animate-pulse mt-0.5" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              แบบฟอร์มแจ้งขอความช่วยเหลือฉุกเฉินน้ำท่วม
            </h1>
            <p className="text-xs sm:text-sm text-red-100 mt-1 leading-relaxed">
              ข้อมูลนี้จะถูกส่งไปยังระบบประสานงานกู้ภัยและจิตอาสาทันที กรุณาระบุข้อมูลตามความจริงเพื่อให้ทีมกู้ภัยจัดลำดับความเร่งด่วนได้อย่างถูกต้อง
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: ระดับความเร่งด่วน (Urgency Triage) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <label className="block text-base font-bold text-slate-900 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 font-extrabold flex items-center justify-center text-xs">
                1
              </span>
              ระดับความเร่งด่วน (ประเมินสถานการณ์) <span className="text-red-600">*</span>
            </span>
          </label>
          <p className="text-xs text-slate-500 mb-3">
            เลือกระดับที่ตรงกับสถานการณ์ปัจจุบันที่สุด เพื่อให้กู้ภัยคัดกรองเคสช่วยชีวิตก่อน
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Critical */}
            <div
              onClick={() => setUrgency('CRITICAL')}
              className={`cursor-pointer p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between ${
                urgency === 'CRITICAL'
                  ? 'border-red-600 bg-red-50 ring-2 ring-red-300'
                  : 'border-slate-200 hover:border-red-300 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
                    🔴 วิกฤตสีแดง
                  </span>
                  {urgency === 'CRITICAL' && <CheckCircle2 className="w-5 h-5 text-red-600" />}
                </div>
                <h4 className="font-bold text-slate-900 text-sm">อันตรายถึงชีวิต</h4>
                <p className="text-xs text-slate-600 mt-1">
                  • มีผู้ป่วยติดเตียง / ทารก<br />
                  • อยู่บนหลังคา / น้ำมิดชั้น 1<br />
                  • อดน้ำ-อาหารเกิน 24 ชม.<br />
                  • กระแสน้ำเชี่ยวกราก
                </p>
              </div>
            </div>

            {/* Urgent */}
            <div
              onClick={() => setUrgency('URGENT')}
              className={`cursor-pointer p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between ${
                urgency === 'URGENT'
                  ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300'
                  : 'border-slate-200 hover:border-amber-300 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-900">
                    🟡 เร่งด่วนสีเหลือง
                  </span>
                  {urgency === 'URGENT' && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                </div>
                <h4 className="font-bold text-slate-900 text-sm">ต้องอพยพ / เสบียงหมด</h4>
                <p className="text-xs text-slate-600 mt-1">
                  • น้ำท่วมเข้าบ้านระดับเอว-อก<br />
                  • น้ำกำลังขึ้นต่อเนื่อง<br />
                  • ไฟฟ้า-ประปาถูกตัด<br />
                  • ต้องการเรืออพยพ
                </p>
              </div>
            </div>

            {/* Normal */}
            <div
              onClick={() => setUrgency('NORMAL')}
              className={`cursor-pointer p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between ${
                urgency === 'NORMAL'
                  ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-300'
                  : 'border-slate-200 hover:border-emerald-300 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                    🟢 ทั่วไปสีเขียว
                  </span>
                  {urgency === 'NORMAL' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                </div>
                <h4 className="font-bold text-slate-900 text-sm">ขอถุงยังชีพ / พ้นวิกฤต</h4>
                <p className="text-xs text-slate-600 mt-1">
                  • ยังพักอาศัยได้อย่างปลอดภัย<br />
                  • ขออาหารแห้ง / น้ำดื่ม<br />
                  • ขออาหารสัตว์เลี้ยง<br />
                  • ยาทาน้ำกัดเท้า / ยาสามัญ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: ระดับน้ำ & สภาพพื้นที่ */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <label className="block text-base font-bold text-slate-900 mb-2">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs">
                2
              </span>
              ระดับน้ำปัจจุบันรอบตัวคุณ <span className="text-red-600">*</span>
            </span>
          </label>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'ROOF_TOP' as WaterLevel, label: '🏠 ติดอยู่บนหลังคา/ดาดฟ้า', badge: 'วิกฤตสูงสุด' },
              { id: 'SECOND_FLOOR' as WaterLevel, label: '⬆️ ท่วมมิดชั้น 1 (อยู่ชั้น 2)', badge: 'น้ำสูง >2 ม.' },
              { id: 'WAIST_CHEST' as WaterLevel, label: '🌊 ระดับเอว - หน้าอก', badge: 'ประมาณ 80-130 ซม.' },
              { id: 'ANKLE_KNEE' as WaterLevel, label: '🚶 ระดับข้อเท้า - หัวเข่า', badge: 'ประมาณ 20-50 ซม.' },
              { id: 'SURROUNDED' as WaterLevel, label: '🏝️ น้ำล้อมรอบ/ถนนตัดขาด', badge: 'เรือเท่านั้น' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setWaterLevel(item.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  waterLevel === item.id
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs sm:text-sm">{item.label}</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">{item.badge}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: ตำแหน่ง & พิกัด GPS ด่วน (One-tap Geolocation) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <label className="block text-base font-bold text-slate-900 mb-1">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs">
                3
              </span>
              พิกัด GPS และตำแหน่งที่อยู่ <span className="text-red-600">*</span>
            </span>
          </label>
          <p className="text-xs text-slate-500 mb-3">
            การกดดึงพิกัด GPS จะช่วยให้ทีมกู้ภัยแล่นเรือตรงไปยังจุดที่คุณอยู่ได้แม่นยำที่สุด
          </p>

          {/* Big GPS Button */}
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGetGPS}
              disabled={gpsLoading}
              className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
                coords 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-98 animate-pulse'
              }`}
            >
              {gpsLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>กำลังค้นหาสัญญาณดาวเทียม GPS...</span>
                </>
              ) : coords ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                  <span>ดึงพิกัดสำเร็จ ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}) - แตะเพื่ออัปเดตใหม่</span>
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  <span>📍 แตะตรงนี้เพื่อดึงพิกัด GPS ปัจจุบันทันที</span>
                </>
              )}
            </button>

            {gpsError && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{gpsError}</span>
              </div>
            )}

            {coords && (
              <div className="mt-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <span>
                  ✓ ความแม่นยำรัศมีประมาณ {coords.accuracy ? `${coords.accuracy} เมตร` : 'สูง'}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline text-emerald-800 hover:text-emerald-950"
                >
                  เปิดดูบน Google Maps ↗
                </a>
              </div>
            )}
          </div>

          {/* Address fields: Cascading Dropdowns (Province -> District -> Subdistrict) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จังหวัด <span className="text-red-600">*</span>
              </label>
              <select
                value={province}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 cursor-pointer font-medium ${
                  formErrors.province ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:ring-red-400'
                }`}
              >
                <option value="">-- เลือกจังหวัด (77 จังหวัด) --</option>
                {availableProvinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {formErrors.province && <p className="text-[11px] text-red-600 mt-1">{formErrors.province}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อำเภอ <span className="text-red-600">*</span>
              </label>
              <select
                value={district}
                disabled={!province}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 cursor-pointer font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                  formErrors.district ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:ring-red-400'
                }`}
              >
                <option value="">
                  {province ? `-- เลือกอำเภอ (${availableDistricts.length} อำเภอ) --` : '-- กรุณาเลือกจังหวัดก่อน --'}
                </option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {formErrors.district && <p className="text-[11px] text-red-600 mt-1">{formErrors.district}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ตำบล / แขวง</label>
              <select
                value={subDistrict}
                disabled={!district}
                onChange={(e) => handleSubDistrictChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <option value="">
                  {district ? `-- เลือกตำบล / แขวง (${availableSubDistricts.length} ตำบล) --` : '-- กรุณาเลือกอำเภอก่อน --'}
                </option>
                {availableSubDistricts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                บ้านเลขที่ / หมู่ / ซอย / ถนน
              </label>
              <input
                type="text"
                placeholder="เช่น 123/4 หมู่ 5 ซอย 3"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              🚩 จุดสังเกตเด่น (สำคัญมากเมื่อป้ายบ้านจมน้ำ) <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น บ้านไม้ 2 ชั้น สีฟ้า หลังวัดเกาะทราย มีผูกธงสีส้มไว้ตรงระเบียง"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                formErrors.address ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:ring-red-400'
              }`}
            />
            {formErrors.address && <p className="text-[11px] text-red-600 mt-1">{formErrors.address}</p>}
          </div>
        </div>

        {/* Section 4: สมาชิกและผู้ติดค้าง (People Breakdown) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <label className="block text-base font-bold text-slate-900 mb-1">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-extrabold flex items-center justify-center text-xs">
                4
              </span>
              จำนวนสมาชิกที่ติดอยู่ในบ้าน
            </span>
          </label>
          <p className="text-xs text-slate-500 mb-4">
            ช่วยให้ทีมกู้ภัยจัดเตรียมขนาดเรือและทีมแพทย์ให้เพียงพอ
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Adults */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-700 block">ผู้ใหญ่ทั่วไป</span>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => updatePeople('adults', -1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-bold text-base text-slate-900">{people.adults}</span>
                <button
                  type="button"
                  onClick={() => updatePeople('adults', 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Elderly */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-700 block">ผู้สูงอายุ</span>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => updatePeople('elderly', -1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-bold text-base text-slate-900">{people.elderly}</span>
                <button
                  type="button"
                  onClick={() => updatePeople('elderly', 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Bedridden (Critical) */}
            <div className="bg-red-50/70 p-3 rounded-xl border border-red-200">
              <span className="text-xs font-bold text-red-700 block">⚠️ ผู้ป่วยติดเตียง/พิการ</span>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => updatePeople('bedridden', -1)}
                  className="w-8 h-8 rounded-lg bg-white border border-red-300 text-red-700 font-bold active:bg-red-100 flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-bold text-base text-red-700">{people.bedridden}</span>
                <button
                  type="button"
                  onClick={() => updatePeople('bedridden', 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-red-300 text-red-700 font-bold active:bg-red-100 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Children */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-700 block">เด็กเล็ก / ทารก</span>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => updatePeople('children', -1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-bold text-base text-slate-900">{people.children}</span>
                <button
                  type="button"
                  onClick={() => updatePeople('children', 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Pets */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-700 block">สุนัข / แมว / สัตว์เลี้ยง</span>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => updatePeople('pets', -1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-bold text-base text-slate-900">{people.pets}</span>
                <button
                  type="button"
                  onClick={() => updatePeople('pets', 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: สิ่งที่ต้องการเร่งด่วน (Urgent Needs) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <label className="block text-base font-bold text-slate-900 mb-1">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-xs">
                5
              </span>
              สิ่งของและความช่วยเหลือที่ต้องการเร่งด่วน
            </span>
          </label>
          <p className="text-xs text-slate-500 mb-3">
            เลือกรายการที่ต้องการ (เลือกได้หลายข้อ)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {COMMON_NEEDS_LIST.map((need) => {
              const isSelected = selectedNeeds.includes(need);
              return (
                <button
                  key={need}
                  type="button"
                  onClick={() => toggleNeed(need)}
                  className={`p-2.5 rounded-xl border text-left text-xs sm:text-sm font-medium flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{need}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 6: ข้อมูลติดต่อ (Contact Information) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <label className="block text-base font-bold text-slate-900 mb-1">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-xs">
                6
              </span>
              ข้อมูลผู้แจ้ง / ช่องทางติดต่อ <span className="text-red-600">*</span>
            </span>
          </label>
          <p className="text-xs text-slate-500 mb-3">
            ระบุเบอร์โทรศัพท์ที่เปิดเครื่องไว้ หรือเบอร์ญาติที่คอยประสานงานแทนได้
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อ-นามสกุล หรือชื่อเล่นผู้ติดต่อ <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น สมศักดิ์ วงศ์สว่าง (ลุงศักดิ์)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                  formErrors.fullName ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:ring-red-400'
                }`}
              />
              {formErrors.fullName && <p className="text-[11px] text-red-600 mt-1">{formErrors.fullName}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์หลัก <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="08X-XXX-XXXX"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                      formErrors.primaryPhone ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:ring-red-400'
                    }`}
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                {formErrors.primaryPhone && <p className="text-[11px] text-red-600 mt-1">{formErrors.primaryPhone}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรสำรอง (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 09X-XXX-XXXX"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  LINE ID (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น line_id_123"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รายละเอียดสถานการณ์เพิ่มเติม (ถ้ามี)
              </label>
              <textarea
                rows={2}
                placeholder="เช่น แบตเตอรี่โทรศัพท์ใกล้หมด, ไฟฟ้าถูกตัด, น้ำกำลังไหลแรงมาก"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                แนบรูปถ่ายสถานการณ์จริง (ถ้าสัญญาณเน็ตรองรับ)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>ถ่ายภาพ / เลือกรูป</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {imagePreview && (
                  <div className="flex items-center gap-2">
                    <img
                      src={imagePreview}
                      alt="พรีวิว"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setImagePreview('')}
                      className="text-xs text-red-600 hover:underline"
                    >
                      ลบรูป
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-3 z-40 bg-white/95 p-3 rounded-2xl border border-slate-200 shadow-xl backdrop-blur-md">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-extrabold text-lg sm:text-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>กำลังบันทึกและส่งข้อมูล...</span>
              </>
            ) : (
              <>
                <AlertOctagon className="w-6 h-6" />
                <span>ส่งข้อมูลขอความช่วยเหลือฉุกเฉิน (SOS)</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-center text-slate-500 mt-2">
            เมื่อส่งแล้ว ระบบจะสร้างรหัสเคส พร้อมปุ่มส่ง SMS และแชร์เข้า LINE กู้ภัยได้ทันที
          </p>
        </div>

      </form>
    </div>
  );
};
