import type { UrgencyLevel, WaterLevel, RequestStatus } from '../types/sos';

export function formatThaiDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    // Relative time calculation
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 1) return 'เมื่อสักครู่';
    if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;

    return date.toLocaleDateString('th-TH', {
      year: '2-digit',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.';
  } catch {
    return isoString;
  }
}

export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function getWaterLevelInfo(level: WaterLevel): { label: string; description: string; badgeColor: string } {
  switch (level) {
    case 'ROOF_TOP':
      return {
        label: 'ติดอยู่บนหลังคา/ดาดฟ้า',
        description: 'ระดับน้ำท่วมมิดชั้น 2 วิกฤตสูงสุด',
        badgeColor: 'bg-red-950 text-red-200 border-red-800'
      };
    case 'SECOND_FLOOR':
      return {
        label: 'ต้องหนีขึ้นชั้น 2',
        description: 'ระดับน้ำท่วมชั้นล่างเกิน 2 เมตร',
        badgeColor: 'bg-red-900 text-red-200 border-red-700'
      };
    case 'WAIST_CHEST':
      return {
        label: 'ระดับเอว - หน้าอก',
        description: 'น้ำสูงประมาณ 80 - 130 ซม.',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300'
      };
    case 'ANKLE_KNEE':
      return {
        label: 'ระดับข้อเท้า - หัวเข่า',
        description: 'น้ำสูงประมาณ 20 - 50 ซม.',
        badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300'
      };
    case 'SURROUNDED':
      return {
        label: 'ถูกน้ำล้อมรอบ/ตัดขาด',
        description: 'ถนนทางเข้า-ออกสัญจรไม่ได้',
        badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300'
      };
    default:
      return {
        label: 'ระดับน้ำไม่ระบุ',
        description: '',
        badgeColor: 'bg-gray-100 text-gray-800 border-gray-300'
      };
  }
}

export function getUrgencyInfo(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'CRITICAL':
      return {
        label: 'วิกฤตอันตรายถึงชีวิต (สีแดง)',
        shortLabel: 'วิกฤตสีแดง',
        badgeClass: 'bg-red-600 text-white font-bold ring-2 ring-red-400 animate-sos-pulse',
        cardBorder: 'border-l-8 border-l-red-600 border-red-200 bg-red-50/40',
        markerColor: '#dc2626',
        description: 'มีผู้ป่วยติดเตียง / เด็กทารก / อยู่บนหลังคา / สัญญาณชีพวิกฤต / ขาดอาหารเกิน 24 ชม.'
      };
    case 'URGENT':
      return {
        label: 'เร่งด่วน (สีเหลือง)',
        shortLabel: 'เร่งด่วนสีเหลือง',
        badgeClass: 'bg-amber-500 text-slate-900 font-semibold',
        cardBorder: 'border-l-8 border-l-amber-500 border-amber-200 bg-amber-50/30',
        markerColor: '#f59e0b',
        description: 'น้ำท่วมเข้าบ้าน / ไฟฟ้าดับ / เสบียงเหลือน้อย / ขอเรืออพยพ'
      };
    case 'NORMAL':
      return {
        label: 'ขอความช่วยเหลือทั่วไป (สีเขียว)',
        shortLabel: 'ช่วยเหลือทั่วไป',
        badgeClass: 'bg-emerald-600 text-white font-medium',
        cardBorder: 'border-l-8 border-l-emerald-600 border-emerald-200 bg-emerald-50/20',
        markerColor: '#10b981',
        description: 'ขอถุงยังชีพ / ยาสามัญ / อาหารสัตว์ / ประสานงานช่วยเหลือทั่วไป'
      };
  }
}

export function getStatusInfo(status: RequestStatus) {
  switch (status) {
    case 'PENDING':
      return {
        label: 'รอความช่วยเหลือ',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300'
      };
    case 'RESPONDING':
      return {
        label: 'กู้ภัยกำลังเดินทาง',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300'
      };
    case 'COMPLETED':
      return {
        label: 'ช่วยเหลือสำเร็จแล้ว',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      };
    case 'CANCELLED':
      return {
        label: 'ยกเลิกคำขอ',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
      };
  }
}

/**
 * Parses Google Maps URL or raw coordinate strings into { lat, lng }
 * Supports:
 * - "19.9071, 99.8325"
 * - https://www.google.com/maps?q=19.9071,99.8325
 * - https://www.google.com/maps/place/.../@19.9071,99.8325,17z/...
 * - https://maps.google.com/?query=19.9071,99.8325
 * - https://www.google.com/maps/...!3d19.9071!4d99.8325...
 */
export function parseGoogleMapsCoordinates(input: string): { lat: number; lng: number } | null {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();

  // 1. Direct coordinates: "19.9071, 99.8325" or "19.9071,99.8325"
  const directCoordMatch = str.match(/^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/);
  if (directCoordMatch) {
    const lat = parseFloat(directCoordMatch[1]);
    const lng = parseFloat(directCoordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 2. Query param q=lat,lng or query=lat,lng or ll=lat,lng
  const queryMatch = str.match(/[?&](?:q|query|ll)=(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 3. Path @lat,lng,zoom pattern: .../@19.9071,99.8325,17z...
  const atMatch = str.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 4. Pattern !3dlat!4dlng in Google Maps URLs
  const dataMatch = str.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}
