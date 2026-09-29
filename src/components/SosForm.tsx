import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  AlertOctagon,
  Phone,
  CheckCircle2,
  Camera,
  AlertCircle,
  Loader2,
  Navigation,
  Info,
  Home,
  Building2,
  Waves,
  Footprints,
  ShieldOff,
  ShieldAlert,
  Minus,
  Plus,
  UserRound,
  OctagonAlert,
  Link2,
  X,
  type LucideIcon
} from 'lucide-react';
import type { SOSRequest, UrgencyLevel, WaterLevel, PeopleCount, UserProfile } from '../types/sos';
import { COMMON_NEEDS_LIST } from '../data/mockData';
import { getProvinces, getDistricts, getSubDistricts } from '../utils/thaiAddresses';
import { formatPhone } from '../services/userService';
import { parseGoogleMapsCoordinates } from '../utils/formatters';
import { IncompleteFormModal, type MissingFieldItem } from './IncompleteFormModal';

interface SosFormProps {
  onSubmitSuccess: (newRequest: SOSRequest) => void;
  currentUser?: UserProfile | null;
  onOpenUserAuth?: () => void;
}

const URGENCY_OPTIONS: {
  id: UrgencyLevel;
  title: string;
  headline: string;
  hint: string;
  icon: LucideIcon;
  active: string;
  idle: string;
}[] = [
  {
    id: 'CRITICAL',
    title: 'วิกฤตสีแดง',
    headline: 'อันตรายถึงชีวิต',
    hint: 'ติดบนหลังคา, ผู้ป่วยติดเตียง, เด็กทารก, น้ำมิดชั้น 1',
    icon: OctagonAlert,
    active: 'border-rose-500 bg-rose-50 ring-2 ring-rose-200/70 text-rose-700',
    idle: 'border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/40 text-slate-700'
  },
  {
    id: 'URGENT',
    title: 'เร่งด่วนสีเหลือง',
    headline: 'ต้องการเรืออพยพ',
    hint: 'น้ำเข้าบ้านระดับเอว-อก, ไฟฟ้าถูกตัด, เสบียงหมด',
    icon: AlertOctagon,
    active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200/70 text-amber-800',
    idle: 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40 text-slate-700'
  },
  {
    id: 'NORMAL',
    title: 'ทั่วไปสีเขียว',
    headline: 'ยังปลอดภัยในบ้าน',
    hint: 'ขอถุงยังชีพ, น้ำดื่มสะอาด, ยาสามัญ, อาหารสัตว์',
    icon: Info,
    active: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200/70 text-emerald-800',
    idle: 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-700'
  }
];

const WATER_OPTIONS: { id: WaterLevel; label: string; icon: LucideIcon }[] = [
  { id: 'ROOF_TOP', label: 'บนหลังคา / ดาดฟ้า', icon: Home },
  { id: 'SECOND_FLOOR', label: 'ท่วมชั้น 1 (อยู่ชั้น 2)', icon: Building2 },
  { id: 'WAIST_CHEST', label: 'ระดับเอว - หน้าอก', icon: Waves },
  { id: 'ANKLE_KNEE', label: 'ระดับข้อเท้า - เข่า', icon: Footprints },
  { id: 'SURROUNDED', label: 'ถูกน้ำล้อมรอบ/ตัดขาด', icon: ShieldOff }
];

const PEOPLE_FIELDS: { key: keyof PeopleCount; label: string; critical?: boolean }[] = [
  { key: 'adults', label: 'ผู้ใหญ่' },
  { key: 'elderly', label: 'ผู้สูงอายุ' },
  { key: 'bedridden', label: 'ผู้ป่วยติดเตียง', critical: true },
  { key: 'children', label: 'เด็กเล็ก/ทารก' },
  { key: 'pets', label: 'สัตว์เลี้ยง' }
];

const SectionHeading: React.FC<{ step: number; title: string; required?: boolean; hint?: string }> = ({
  step,
  title,
  required,
  hint
}) => (
  <div className="mb-4 flex items-start gap-3">
    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-xl bg-slate-900 text-xs font-bold text-white tabular-nums">
      {step}
    </span>
    <div className="min-w-0">
      <h2 className="text-[15px] font-bold leading-tight text-slate-900">
        {title}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </h2>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</p>}
    </div>
  </div>
);

export const SosForm: React.FC<SosFormProps> = ({
  onSubmitSuccess,
  currentUser,
  onOpenUserAuth
}) => {
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

  const [address, setAddress] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Google Maps URL & Precision Coordinates
  const [googleMapsInput, setGoogleMapsInput] = useState<string>('');
  const [isParsedFromUrl, setIsParsedFromUrl] = useState<boolean>(false);

  // Missing Fields Modal State
  const [missingList, setMissingList] = useState<MissingFieldItem[]>([]);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false);

  const handleGoogleMapsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGoogleMapsInput(val);

    if (!val.trim()) {
      setIsParsedFromUrl(false);
      return;
    }

    const parsed = parseGoogleMapsCoordinates(val);
    if (parsed) {
      setCoords({
        lat: parsed.lat,
        lng: parsed.lng,
        accuracy: 5
      });
      setIsParsedFromUrl(true);
      setGpsError('');
    } else {
      setIsParsedFromUrl(false);
    }
  };

  const handleClearGoogleMapsInput = () => {
    setGoogleMapsInput('');
    setIsParsedFromUrl(false);
  };

  const handleFixField = (elementId: string) => {
    setIsValidationModalOpen(false);
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.classList.add('ring-4', 'ring-rose-400', 'border-rose-500');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-rose-400', 'border-rose-500');
        }, 3000);
      }
    }, 150);
  };

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

  // Auto-fill contact info if currentUser is logged in
  useEffect(() => {
    if (currentUser) {
      if (!fullName) {
        setFullName(`${currentUser.firstName} ${currentUser.lastName}`.trim());
      }
      if (!primaryPhone && currentUser.phone) {
        setPrimaryPhone(currentUser.phone);
      }
      if (!lineId && currentUser.loginMethod === 'line') {
        setLineId(currentUser.firstName);
      }
    }
  }, [currentUser]);

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
    const missing: MissingFieldItem[] = [];

    if (!fullName.trim()) {
      errors.fullName = 'กรุณาระบุชื่อ-นามสกุล หรือชื่อเล่นผู้ติดต่อ';
      missing.push({
        id: 'missing-fullname',
        fieldKey: 'fullName',
        elementId: 'field-fullName',
        label: 'ชื่อ-นามสกุล ผู้ติดต่อ',
        message: 'ยังไม่ได้ระบุชื่อผู้ติดต่อ หรือชื่อเล่นของผู้ประสบภัย',
        severity: 'critical'
      });
    }

    if (!primaryPhone.trim()) {
      errors.primaryPhone = 'กรุณาระบุเบอร์โทรศัพท์ที่ติดต่อได้';
      missing.push({
        id: 'missing-phone',
        fieldKey: 'primaryPhone',
        elementId: 'field-primaryPhone',
        label: 'เบอร์โทรศัพท์ติดต่อ',
        message: 'จำเป็นต้องมีเบอร์โทรเพื่อให้ทีมกู้ภัยสามารถติดต่อและประสานงานได้',
        severity: 'critical'
      });
    } else if (!/^[0-9\-+\s]{8,15}$/.test(primaryPhone.trim())) {
      errors.primaryPhone = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (กรุณากรอก 9-10 หลัก)';
      missing.push({
        id: 'invalid-phone',
        fieldKey: 'primaryPhone',
        elementId: 'field-primaryPhone',
        label: 'เบอร์โทรศัพท์ไม่ถูกต้อง',
        message: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง กรุณาตรวจสอบตัวเลข 9-10 หลัก',
        severity: 'critical'
      });
    }

    if (!province) {
      errors.province = 'กรุณาเลือกจังหวัด';
      missing.push({
        id: 'missing-province',
        fieldKey: 'province',
        elementId: 'field-province',
        label: 'จังหวัด',
        message: 'ยังไม่ได้เลือกจังหวัด เพื่อให้ส่งเรื่องไปยังศูนย์กู้ภัยในพื้นที่',
        severity: 'critical'
      });
    }

    if (!district) {
      errors.district = 'กรุณาเลือกอำเภอ';
      missing.push({
        id: 'missing-district',
        fieldKey: 'district',
        elementId: 'field-district',
        label: 'อำเภอ',
        message: 'ยังไม่ได้เลือกอำเภอ สำหรับระบุพิกัดกู้ภัยประจำพื้นที่',
        severity: 'critical'
      });
    }

    if (!address.trim() && !landmark.trim()) {
      errors.address = 'กรุณาระบุบ้านเลขที่ ซอย หรือจุดสังเกตเด่น';
      missing.push({
        id: 'missing-landmark',
        fieldKey: 'landmark',
        elementId: 'field-landmark',
        label: 'จุดสังเกตเด่น / ที่อยู่',
        message: 'จำเป็นอย่างยิ่งในสถานการณ์น้ำท่วมเมื่อป้ายบ้านจมน้ำ (เช่น บ้านรั้วสีฟ้า หลังวัด)',
        severity: 'critical'
      });
    }

    const totalPeople = people.adults + people.elderly + people.bedridden + people.children + people.pets;
    if (totalPeople === 0) {
      errors.people = 'กรุณาระบุจำนวนผู้ติดค้างอย่างน้อย 1 คน';
      missing.push({
        id: 'missing-people',
        fieldKey: 'people',
        elementId: 'field-people',
        label: 'จำนวนผู้ประสบภัยที่ติดค้าง',
        message: 'ยังไม่ได้ระบุจำนวนผู้ติดค้าง เพื่อให้กู้ภัยจัดเตรียมเรือและขนาดทีมได้ถูกต้อง',
        severity: 'warning'
      });
    }

    if (missing.length > 0) {
      setFormErrors(errors);
      setMissingList(missing);
      setIsValidationModalOpen(true);
      return;
    }

    // Anti-spam Cooldown Check (60 seconds per device)
    const LAST_SOS_KEY = 'thai_flood_last_sos_timestamp';
    try {
      const lastSent = localStorage.getItem(LAST_SOS_KEY);
      if (lastSent) {
        const elapsedSec = Math.floor((Date.now() - parseInt(lastSent, 10)) / 1000);
        if (elapsedSec < 60) {
          alert(`⚠️ ระบบได้รับคำขอของคุณเรียบร้อยแล้ว เพื่อป้องกันข้อมูลซ้ำซ้อน กรุณารออีก ${60 - elapsedSec} วินาที หากต้องการส่งข้อมูลเพิ่มเติม`);
          return;
        }
      }
    } catch (e) {
      // ignore
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
      googleMapsUrl: googleMapsInput.trim() || undefined,
      waterLevel,
      people,
      needs: selectedNeeds.length > 0 ? selectedNeeds : ['ต้องการความช่วยเหลือเร่งด่วน'],
      notes: notes.trim() || undefined,
      imageUrl: imagePreview || undefined,
    };

    try {
      localStorage.setItem(LAST_SOS_KEY, Date.now().toString());
    } catch (e) {
      // ignore
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onSubmitSuccess(newSosRequest);
    }, 400);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">

      {/* Hero */}
      <header className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">
          <span className="size-1.5 animate-sos-pulse rounded-full bg-rose-600" />
          รับแจ้งเหตุฉุกเฉินน้ำท่วม 24 ชม.
        </span>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-[28px]">
          แจ้งขอความช่วยเหลือ
        </h1>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-slate-500">
          กรอกข้อมูลเบื้องต้น 4 ขั้นตอน เพื่อให้ทีมกู้ภัยเข้าถึงจุดเกิดเหตุได้เร็วและแม่นยำที่สุด
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* 1 — Urgency & water level */}
        <section className="surface p-5 sm:p-6">
          <SectionHeading step={1} title="ระดับความเร่งด่วน & สภาพน้ำ" required />

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {URGENCY_OPTIONS.map(({ id, title, headline, hint, icon: Icon, active, idle }) => {
              const isSelected = urgency === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUrgency(id)}
                  aria-pressed={isSelected}
                  className={`rounded-2xl border p-3.5 text-left transition-all duration-200 ${isSelected ? active : idle}`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide">
                      <Icon className="size-3.5" strokeWidth={2.5} />
                      {title}
                    </span>
                    {isSelected && <CheckCircle2 className="size-4 shrink-0 opacity-80" />}
                  </div>
                  <div className="text-[13px] font-bold text-slate-900">{headline}</div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <span className="label">ระดับน้ำปัจจุบันรอบตัวคุณ</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {WATER_OPTIONS.map(({ id, label, icon: Icon }) => {
                const isSelected = waterLevel === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setWaterLevel(id)}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12px] font-medium transition-all duration-200 ${
                      isSelected
                        ? 'border-sky-400 bg-sky-50 font-bold text-sky-800 ring-2 ring-sky-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`size-4 shrink-0 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span className="leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2 — Location */}
        <section className="surface p-5 sm:p-6">
          <SectionHeading
            step={2}
            title="พิกัด GPS & ที่อยู่"
            required
            hint="ยิ่งชัดเจนเท่าไร ทีมกู้ภัยยิ่งเข้าถึงคุณได้เร็ว"
          />

          <button
            type="button"
            onClick={handleGetGPS}
            disabled={gpsLoading}
            className={`mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[13px] font-bold transition-all duration-200 active:scale-[0.99] ${
              coords
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-transparent bg-slate-900 text-white shadow-[0_10px_26px_-14px_rgba(15,23,42,0.8)] hover:bg-slate-800'
            }`}
          >
            {gpsLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                กำลังค้นหาสัญญาณ GPS...
              </>
            ) : coords ? (
              <>
                <CheckCircle2 className="size-4 text-emerald-600" />
                บันทึกพิกัดแล้ว ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}) — แตะเพื่ออัปเดต
              </>
            ) : (
              <>
                <Navigation className="size-4" />
                แตะเพื่อดึงพิกัด GPS อัตโนมัติ
              </>
            )}
          </button>

          {gpsError && (
            <p className="mb-4 flex items-start gap-1.5 text-[11px] text-rose-600">
              <AlertCircle className="mt-px size-3.5 shrink-0" />
              <span>{gpsError}</span>
            </p>
          )}

          {/* Google Maps Link / Direct Coordinates Attachment */}
          <div id="field-googleMaps" className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="input-google-maps" className="font-bold text-slate-800 flex items-center gap-1.5">
                <Link2 className="size-3.5 text-blue-600" />
                <span>หรือ แนบลิงก์ Google Maps / ระบุพิกัด (แนะนำเพื่อความแม่นยำ 100%)</span>
              </label>
              {isParsedFromUrl && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  ดึงพิกัดแล้ว!
                </span>
              )}
            </div>

            <div className="relative">
              <input
                id="input-google-maps"
                type="text"
                placeholder="วางลิงก์ Google Maps (เช่น https://maps.app.goo.gl/...) หรือพิกัด 19.9071, 99.8325"
                value={googleMapsInput}
                onChange={handleGoogleMapsInputChange}
                className={`field bg-white pr-9 text-xs font-mono ${
                  coords && isParsedFromUrl ? 'border-emerald-400 ring-2 ring-emerald-100' : ''
                }`}
              />
              {googleMapsInput && (
                <button
                  type="button"
                  onClick={handleClearGoogleMapsInput}
                  title="ล้างข้อความ"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {coords && isParsedFromUrl && (
              <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                <span>ปักหมุดแล้ว: ละติจูด {coords.lat.toFixed(5)}, ลองจิจูด {coords.lng.toFixed(5)}</span>
              </p>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 <b>วิธีแชร์:</b> เปิดแอป Google Maps &gt; กดค้างที่บ้านของคุณ &gt; กด <b>แชร์ (Share)</b> แล้วคัดลอกลิงก์มาวางที่นี่ ระบบจะปักหมุดบนแผนที่กู้ภัยให้ตรงตำแหน่งเป๊ะ
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div>
              <span className="label">
                จังหวัด <span className="text-rose-500">*</span>
              </span>
              <select
                id="field-province"
                value={province}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className={`field ${formErrors.province ? 'field-invalid' : ''}`}
              >
                <option value="">-- เลือกจังหวัด --</option>
                {availableProvinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {formErrors.province && <p className="mt-1 text-[10px] text-rose-600">{formErrors.province}</p>}
            </div>

            <div>
              <span className="label">
                อำเภอ <span className="text-rose-500">*</span>
              </span>
              <select
                id="field-district"
                value={district}
                disabled={!province}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className={`field ${formErrors.district ? 'field-invalid' : ''}`}
              >
                <option value="">{province ? '-- เลือกอำเภอ --' : '-- รอเลือกจังหวัด --'}</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {formErrors.district && <p className="mt-1 text-[10px] text-rose-600">{formErrors.district}</p>}
            </div>

            <div>
              <span className="label">ตำบล / แขวง</span>
              <select
                value={subDistrict}
                disabled={!district}
                onChange={(e) => handleSubDistrictChange(e.target.value)}
                className="field"
              >
                <option value="">{district ? '-- เลือกตำบล --' : '-- รอเลือกอำเภอ --'}</option>
                {availableSubDistricts.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <span className="label">บ้านเลขที่ / หมู่ / ซอย / ถนน</span>
              <input
                id="field-address"
                type="text"
                placeholder="เช่น 123/4 หมู่ 5 ซอยริมน้ำ 3"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="field"
              />
            </div>

            <div>
              <span className="label">
                จุดสังเกตเด่น (สำคัญมากเมื่อป้ายบ้านจมน้ำ) <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-500" />
                <input
                  id="field-landmark"
                  type="text"
                  placeholder="เช่น บ้านไม้ 2 ชั้น รั้วสีฟ้า ติดวัดเกาะทราย"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className={`field pl-9 ${formErrors.address ? 'field-invalid' : ''}`}
                />
              </div>
              {formErrors.address && <p className="mt-1 text-[10px] text-rose-600">{formErrors.address}</p>}
            </div>
          </div>
        </section>

        {/* 3 — People & needs */}
        <section id="field-people" className="surface p-5 sm:p-6">
          <SectionHeading step={3} title="ผู้ติดค้าง & สิ่งที่ต้องการ" />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PEOPLE_FIELDS.map(({ key, label, critical }) => (
              <div
                key={key}
                className={`flex items-center justify-between gap-1 rounded-2xl border p-2 ${
                  critical ? 'border-rose-200 bg-rose-50/70' : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <span className={`text-[11px] font-semibold leading-tight ${critical ? 'text-rose-700' : 'text-slate-600'}`}>
                  {label}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updatePeople(key, -1)}
                    aria-label={`ลด${label}`}
                    className={`grid size-6 place-items-center rounded-lg border bg-white transition-colors active:scale-95 ${
                      critical ? 'border-rose-200 text-rose-600' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Minus className="size-3" strokeWidth={3} />
                  </button>
                  <span className={`w-4 text-center text-[13px] font-bold tabular-nums ${critical ? 'text-rose-700' : 'text-slate-900'}`}>
                    {people[key]}
                  </span>
                  <button
                    type="button"
                    onClick={() => updatePeople(key, 1)}
                    aria-label={`เพิ่ม${label}`}
                    className={`grid size-6 place-items-center rounded-lg border bg-white transition-colors active:scale-95 ${
                      critical ? 'border-rose-200 text-rose-600' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Plus className="size-3" strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <span className="label">สิ่งของหรือความช่วยเหลือที่ต้องการ (เลือกได้หลายข้อ)</span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_NEEDS_LIST.map((need) => {
                const isSelected = selectedNeeds.includes(need);
                return (
                  <button
                    key={need}
                    type="button"
                    onClick={() => toggleNeed(need)}
                    aria-pressed={isSelected}
                    className={`chip ${
                      isSelected
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'chip-idle'
                    }`}
                  >
                    {isSelected ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Plus className="size-3.5 text-slate-400" />}
                    <span>{need}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4 — Contact */}
        <section className="surface p-5 sm:p-6">
          <SectionHeading step={4} title="ข้อมูลติดต่อผู้แจ้ง" required />

          {currentUser ? (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-900">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>
                กรอกข้อมูลอัตโนมัติจากบัญชี <b>{currentUser.firstName} {currentUser.lastName}</b> ({formatPhone(currentUser.phone)})
              </span>
            </div>
          ) : (
            onOpenUserAuth && (
              <div className="mb-4 flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[11px] leading-snug text-slate-600">
                  💡 แนะนำ: เข้าสู่ระบบด้วย LINE เพื่อดึงชื่ออัตโนมัติและเพิ่มความน่าเชื่อถือให้เคส
                </span>
                <button
                  type="button"
                  onClick={onOpenUserAuth}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 transition-colors hover:bg-emerald-100 cursor-pointer shadow-2xs"
                >
                  <svg className="size-3.5 fill-[#06C755]" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 5.82 2 10.53c0 2.94 1.76 5.53 4.45 6.99-.18.66-.66 2.39-.75 2.76-.12.45.16.44.34.32.14-.09 1.94-1.32 2.73-1.85.4.06.81.09 1.23.09 5.52 0 10-3.82 10-8.53S17.52 2 12 2z"/>
                  </svg>
                  <span>เข้าสู่ระบบด้วย LINE</span>
                </button>
              </div>
            )
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="label">
                ชื่อ-นามสกุล หรือชื่อเล่น <span className="text-rose-500">*</span>
              </span>
              <input
                id="field-fullName"
                type="text"
                placeholder="เช่น สมศักดิ์ วงศ์สว่าง"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`field ${formErrors.fullName ? 'field-invalid' : ''}`}
              />
              {formErrors.fullName && <p className="mt-1 text-[10px] text-rose-600">{formErrors.fullName}</p>}
            </div>

            <div>
              <span className="label">
                เบอร์โทรศัพท์หลัก <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="field-primaryPhone"
                  type="tel"
                  placeholder="08X-XXX-XXXX"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  className={`field pl-9 ${formErrors.primaryPhone ? 'field-invalid' : ''}`}
                />
              </div>
              {formErrors.primaryPhone && <p className="mt-1 text-[10px] text-rose-600">{formErrors.primaryPhone}</p>}
            </div>

            <div>
              <span className="label">เบอร์โทรสำรอง (ถ้ามี)</span>
              <input
                type="text"
                placeholder="เช่น 09X-XXX-XXXX (เบอร์ญาติ)"
                value={secondaryPhone}
                onChange={(e) => setSecondaryPhone(e.target.value)}
                className="field"
              />
            </div>

            <div>
              <span className="label">LINE ID สำหรับให้กู้ภัยทักแชท (ถ้ามี)</span>
              <input
                type="text"
                placeholder="เช่น somchai_123 (ไอดีสำหรับค้นหาใน LINE)"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                className="field"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                💬 ระบุ LINE ID เพื่อให้เจ้าหน้าที่กู้ภัยสามารถกดปุ่มเด้งเปิดแชท LINE คุยกับคุณได้ทันที
              </p>
            </div>
          </div>

          <div className="mt-3">
            <span className="label">รายละเอียดสถานการณ์เพิ่มเติม (ถ้ามี)</span>
            <textarea
              rows={2}
              placeholder="เช่น แบตเตอรี่โทรศัพท์ใกล้หมด, ไฟฟ้าถูกตัด, น้ำกำลังไหลแรงมาก"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="field resize-none"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900">
              <Camera className="size-4 text-slate-400" />
              แนบภาพถ่ายสถานที่ (ถ้ามี)
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
                  className="size-10 rounded-xl border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImagePreview('')}
                  className="text-[11px] font-semibold text-rose-600 transition-colors hover:text-rose-700"
                >
                  ลบรูป
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Legal notice */}
        <p className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50 px-3.5 py-3 text-[11px] leading-relaxed text-amber-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            <b>ระบบรักษาความปลอดภัย & กฎหมาย:</b> ข้อมูลนี้จะส่งตรงถึงทีมกู้ภัยเพื่อจัดสรรเรือและกำลังพล
            การแจ้งเหตุเท็จหรือกดเล่นมีความผิดตามประมวลกฎหมายอาญา มาตรา 137 และ พ.ร.บ.คอมพิวเตอร์
          </span>
        </p>

        {/* Sticky submit */}
        <div className="sticky bottom-24 z-30 rounded-3xl border border-slate-200/80 bg-white/85 p-2.5 shadow-[var(--shadow-lift)] backdrop-blur-xl sm:bottom-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-6 py-3.5 text-[15px] font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(225,29,72,0.85)] transition-all hover:from-rose-700 hover:to-red-700 active:scale-[0.99] disabled:opacity-70 sm:text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                กำลังส่งข้อมูลแจ้งเหตุ...
              </>
            ) : (
              <>
                <AlertOctagon className="size-5" />
                ส่งข้อมูลแจ้งขอความช่วยเหลือ (SOS)
              </>
            )}
          </button>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            ส่งแล้วระบบจะสร้างรหัสเคส พร้อมปุ่มส่ง SMS และแชร์เข้า LINE กู้ภัยได้ทันที
          </p>
        </div>
      </form>

      {/* Missing Form Information Alert Modal */}
      <IncompleteFormModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        missingFields={missingList}
        onFixField={handleFixField}
      />
    </div>
  );
};
