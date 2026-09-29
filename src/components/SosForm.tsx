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
  Sparkles,
  Info,
  Clock,
  Home
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
      setGpsError('อุปกรณ์ของคุณไม่รองรับการดึงพิกัด GPS กรุณาระบุที่อยู่และจุดสังเกตด้านล่าง');
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
        let errorMsg = 'ไม่สามารถดึงพิกัดได้ กรุณากด "อนุญาต" เข้าถึงตำแหน่งบนเบราว์เซอร์';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'ท่านปฏิเสธการเข้าถึงตำแหน่ง GPS กรุณาระบุที่อยู่และจุดสังเกตด้านล่าง';
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
      errors.fullName = 'กรุณาระบุชื่อ-นามสกุล หรือชื่อเล่นผู้ติดต่อ';
    }
    if (!primaryPhone.trim()) {
      errors.primaryPhone = 'กรุณาระบุเบอร์โทรศัพท์ที่ติดต่อได้';
    } else if (!/^[0-9\-+\s]{8,15}$/.test(primaryPhone.trim())) {
      errors.primaryPhone = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง';
    }
    if (!province) {
      errors.province = 'กรุณาเลือกจังหวัด';
    }
    if (!district) {
      errors.district = 'กรุณาเลือกอำเภอ';
    }
    if (!address.trim() && !landmark.trim()) {
      errors.address = 'กรุณาระบุบ้านเลขที่ ซอย หรือจุดสังเกตเด่น';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    const finalCoordinates = coords || {
      lat: 18.7883 + (Math.random() - 0.5) * 0.1,
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
    <div className="max-w-2xl mx-auto px-4 py-5 sm:py-8">
      
      {/* Modern, Reassuring Hero Card */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200/60 mb-2">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
          <span>ระบบรับแจ้งเหตุฉุกเฉินน้ำท่วม 24 ชม.</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          แจ้งขอความช่วยเหลือ (SOS)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
          กรอกข้อมูลสำคัญเบื้องต้น เพื่อให้ทีมกู้ภัยและจิตอาสาเข้าถึงจุดเกิดเหตุได้อย่างรวดเร็วและแม่นยำ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        
        {/* Card 1: ระดับความเร่งด่วน & ระดับน้ำ */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h2 className="text-base font-bold text-slate-900">
              ระดับความเร่งด่วน & สภาพน้ำ <span className="text-red-500">*</span>
            </h2>
          </div>

          {/* Clean 3 Urgency Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
            
            {/* Critical */}
            <div
              onClick={() => setUrgency('CRITICAL')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                urgency === 'CRITICAL'
                  ? 'border-red-600 bg-red-50/70 shadow-xs ring-2 ring-red-200'
                  : 'border-slate-200/90 bg-slate-50/50 hover:border-red-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-xs text-red-700 flex items-center gap-1">
                  🔴 วิกฤตสีแดง
                </span>
                {urgency === 'CRITICAL' && <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />}
              </div>
              <div className="font-bold text-slate-900 text-xs sm:text-sm">อันตรายถึงชีวิต</div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                ติดบนหลังคา, ผู้ป่วยติดเตียง, เด็กทารก, น้ำมิดชั้น 1
              </p>
            </div>

            {/* Urgent */}
            <div
              onClick={() => setUrgency('URGENT')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                urgency === 'URGENT'
                  ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-200'
                  : 'border-slate-200/90 bg-slate-50/50 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-xs text-amber-800 flex items-center gap-1">
                  🟡 เร่งด่วน
                </span>
                {urgency === 'URGENT' && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
              </div>
              <div className="font-bold text-slate-900 text-xs sm:text-sm">ต้องการเรืออพยพ</div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                น้ำเข้าบ้านระดับเอว-อก, ไฟฟ้าถูกตัด, เสบียงหมด
              </p>
            </div>

            {/* Normal */}
            <div
              onClick={() => setUrgency('NORMAL')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                urgency === 'NORMAL'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-200'
                  : 'border-slate-200/90 bg-slate-50/50 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-xs text-emerald-800 flex items-center gap-1">
                  🟢 ขอรับเสบียง
                </span>
                {urgency === 'NORMAL' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              </div>
              <div className="font-bold text-slate-900 text-xs sm:text-sm">ยังปลอดภัยในบ้าน</div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                ขอถุงยังชีพ, น้ำดื่มสะอาด, ยาสามัญ, อาหารสัตว์
              </p>
            </div>
          </div>

          {/* Compact Water Level Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              ระดับน้ำปัจจุบันรอบตัวคุณ
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'ROOF_TOP' as WaterLevel, label: '🏠 บนหลังคา / ดาดฟ้า' },
                { id: 'SECOND_FLOOR' as WaterLevel, label: '⬆️ ท่วมมิดชั้น 1 (อยู่ชั้น 2)' },
                { id: 'WAIST_CHEST' as WaterLevel, label: '🌊 ระดับเอว - หน้าอก' },
                { id: 'ANKLE_KNEE' as WaterLevel, label: '🚶 ระดับข้อเท้า - หัวเข่า' },
                { id: 'SURROUNDED' as WaterLevel, label: '🏝️ น้ำล้อมรอบ/ตัดขาด' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setWaterLevel(item.id)}
                  className={`py-2 px-3 rounded-xl border text-left text-xs font-medium transition-all ${
                    waterLevel === item.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Card 2: ตำแหน่ง & พิกัด GPS */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h2 className="text-base font-bold text-slate-900">
              พิกัด GPS & ที่อยู่ <span className="text-red-500">*</span>
            </h2>
          </div>

          {/* Sleek One-Tap GPS Button */}
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGetGPS}
              disabled={gpsLoading}
              className={`w-full py-3 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-xs sm:text-sm ${
                coords 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 active:scale-98'
              }`}
            >
              {gpsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังค้นหาสัญญาณดาวเทียม GPS...</span>
                </>
              ) : coords ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>บันทึกพิกัดแล้ว ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}) — แตะเพื่ออัปเดตใหม่</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>📍 แตะเพื่อดึงพิกัด GPS อัตโนมัติ (ช่วยกู้ภัยตรงจุด)</span>
                </>
              )}
            </button>

            {gpsError && (
              <p className="mt-1.5 text-[11px] text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{gpsError}</span>
              </p>
            )}
          </div>

          {/* Cascading Dropdowns: Province -> District -> Sub-district */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                จังหวัด <span className="text-red-500">*</span>
              </label>
              <select
                value={province}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 cursor-pointer font-medium ${
                  formErrors.province ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-blue-400'
                }`}
              >
                <option value="">-- เลือกจังหวัด --</option>
                {availableProvinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {formErrors.province && <p className="text-[10px] text-red-600 mt-0.5">{formErrors.province}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                อำเภอ <span className="text-red-500">*</span>
              </label>
              <select
                value={district}
                disabled={!province}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 cursor-pointer font-medium disabled:bg-slate-100 disabled:text-slate-400 ${
                  formErrors.district ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-blue-400'
                }`}
              >
                <option value="">{province ? '-- เลือกอำเภอ --' : '-- รอเลือกจังหวัด --'}</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {formErrors.district && <p className="text-[10px] text-red-600 mt-0.5">{formErrors.district}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                ตำบล / แขวง
              </label>
              <select
                value={subDistrict}
                disabled={!district}
                onChange={(e) => handleSubDistrictChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer font-medium disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">{district ? '-- เลือกตำบล --' : '-- รอเลือกอำเภอ --'}</option>
                {availableSubDistricts.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Address & Landmark */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                บ้านเลขที่ / หมู่ / ซอย / ถนน
              </label>
              <input
                type="text"
                placeholder="เช่น 123/4 หมู่ 5 ซอยริมน้ำ 3"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                🚩 จุดสังเกตเด่น (สำคัญมากเมื่อป้ายบ้านจมน้ำ) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น บ้านไม้ 2 ชั้น รั้วสีฟ้า ติดวัดเกาะทราย มีผูกธงสีส้มตรงระเบียง"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.address ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-blue-400'
                }`}
              />
              {formErrors.address && <p className="text-[10px] text-red-600 mt-0.5">{formErrors.address}</p>}
            </div>
          </div>

        </div>

        {/* Card 3: สมาชิกติดค้าง & สิ่งที่ต้องการ */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h2 className="text-base font-bold text-slate-900">
              ผู้ติดค้าง & สิ่งที่ต้องการ
            </h2>
          </div>

          {/* Compact Stepper Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            
            {/* Adults */}
            <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">ผู้ใหญ่</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updatePeople('adults', -1)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center text-xs"
                >-</button>
                <span className="font-bold text-xs sm:text-sm text-slate-900 w-4 text-center">{people.adults}</span>
                <button
                  type="button"
                  onClick={() => updatePeople('adults', 1)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center text-xs"
                >+</button>
              </div>
            </div>

            {/* Elderly */}
            <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">ผู้สูงอายุ</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updatePeople('elderly', -1)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center text-xs"
                >-</button>
                <span className="font-bold text-xs sm:text-sm text-slate-900 w-4 text-center">{people.elderly}</span>
                <button
                  type="button"
                  onClick={() => updatePeople('elderly', 1)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center text-xs"
                >+</button>
              </div>
            </div>

            {/* Bedridden (Critical Highlight) */}
            <div className="bg-red-50/80 p-2.5 rounded-2xl border border-red-200 flex items-center justify-between">
              <span className="text-xs font-bold text-red-700">ผู้ป่วยติดเตียง</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updatePeople('bedridden', -1)}
                  className="w-7 h-7 rounded-lg bg-white border border-red-300 text-red-700 font-bold active:bg-red-100 flex items-center justify-center text-xs"
                >-</button>
                <span className="font-bold text-xs sm:text-sm text-red-700 w-4 text-center">{people.bedridden}</span>
                <button
                  type="button"
                  onClick={() => updatePeople('bedridden', 1)}
                  className="w-7 h-7 rounded-lg bg-white border border-red-300 text-red-700 font-bold active:bg-red-100 flex items-center justify-center text-xs"
                >+</button>
              </div>
            </div>

            {/* Children */}
            <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">เด็กเล็ก/ทารก</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updatePeople('children', -1)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center text-xs"
                >-</button>
                <span className="font-bold text-xs sm:text-sm text-slate-900 w-4 text-center">{people.children}</span>
                <button
                  type="button"
                  onClick={() => updatePeople('children', 1)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center text-xs"
                >+</button>
              </div>
            </div>

            {/* Pets */}
            <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">สัตว์เลี้ยง</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updatePeople('pets', -1)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center text-xs"
                >-</button>
                <span className="font-bold text-xs sm:text-sm text-slate-900 w-4 text-center">{people.pets}</span>
                <button
                  type="button"
                  onClick={() => updatePeople('pets', 1)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold active:bg-slate-200 flex items-center justify-center text-xs"
                >+</button>
              </div>
            </div>

          </div>

          {/* Urgent Needs Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              สิ่งของหรือความช่วยเหลือที่ต้องการ (เลือกได้หลายข้อ)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_NEEDS_LIST.map((need) => {
                const isSelected = selectedNeeds.includes(need);
                return (
                  <button
                    key={need}
                    type="button"
                    onClick={() => toggleNeed(need)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{need}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Card 4: ข้อมูลติดต่อผู้แจ้ง */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h2 className="text-base font-bold text-slate-900">
              ข้อมูลติดต่อผู้แจ้ง <span className="text-red-500">*</span>
            </h2>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  ชื่อ-นามสกุล หรือชื่อเล่น <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น สมศักดิ์ วงศ์สว่าง (ลุงศักดิ์)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                    formErrors.fullName ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-purple-400'
                  }`}
                />
                {formErrors.fullName && <p className="text-[10px] text-red-600 mt-0.5">{formErrors.fullName}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  เบอร์โทรศัพท์หลัก <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="08X-XXX-XXXX"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      formErrors.primaryPhone ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-purple-400'
                    }`}
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
                {formErrors.primaryPhone && <p className="text-[10px] text-red-600 mt-0.5">{formErrors.primaryPhone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  เบอร์โทรสำรอง (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 09X-XXX-XXXX (เบอร์ญาติ)"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  LINE ID (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น line_id_123"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                รายละเอียดสถานการณ์เพิ่มเติม (ถ้ามี)
              </label>
              <textarea
                rows={2}
                placeholder="เช่น แบตเตอรี่โทรศัพท์ใกล้หมด, ไฟฟ้าถูกตัด, น้ำกำลังไหลแรงมาก"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Photo upload */}
            <div>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>แนบภาพถ่ายสถานที่ (ถ้ามี)</span>
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
                      className="w-10 h-10 rounded-xl object-cover border border-slate-300"
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

        {/* Floating / Sticky Submit Button */}
        <div className="sticky bottom-4 z-40 bg-white/90 p-3 rounded-3xl border border-slate-200/80 shadow-xl backdrop-blur-md">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-98 text-white font-extrabold text-base sm:text-lg shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังส่งข้อมูลแจ้งเหตุ...</span>
              </>
            ) : (
              <>
                <AlertOctagon className="w-5 h-5" />
                <span>🚨 ส่งข้อมูลแจ้งขอความช่วยเหลือ (SOS)</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-center text-slate-500 mt-1.5">
            ส่งข้อมูลแล้ว ระบบจะสร้างรหัสเคส พร้อมปุ่มส่ง SMS และแชร์เข้า LINE กู้ภัยได้ทันที
          </p>
        </div>

      </form>
    </div>
  );
};
