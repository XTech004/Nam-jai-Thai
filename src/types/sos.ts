export type UrgencyLevel = 'CRITICAL' | 'URGENT' | 'NORMAL';

export type WaterLevel =
  | 'ANKLE_KNEE'   // ข้อเท้า - เข่า (~20-50 ซม.)
  | 'WAIST_CHEST'  // เอว - หน้าอก (~80-130 ซม.)
  | 'SECOND_FLOOR' // น้ำท่วมมิดชั้น 1 ต้องหนีขึ้นชั้น 2
  | 'ROOF_TOP'     // ติดอยู่บนหลังคา (วิกฤตสูงสุด)
  | 'SURROUNDED';  // ตัดขาดจากภายนอก น้ำล้อมรอบเกาะ/ถนนตัดขาด

export type RequestStatus = 'PENDING' | 'RESPONDING' | 'COMPLETED' | 'CANCELLED';

export interface PeopleCount {
  adults: number;
  elderly: number;
  bedridden: number; // ผู้ป่วยติดเตียง / ผู้พิการ
  children: number;  // เด็กเล็ก / ทารก
  pets: number;      // สัตว์เลี้ยง
}

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface SOSRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
  urgency: UrgencyLevel;
  status: RequestStatus;
  
  // ผู้ติดต่อ
  fullName: string;
  primaryPhone: string;
  secondaryPhone?: string;
  lineId?: string;
  
  // ตำแหน่งที่อยู่
  province: string;
  district: string;
  subDistrict?: string;
  address: string;
  landmark: string; // จุดสังเกต เช่น บ้านรั้วสีฟ้า หลังวัด
  coordinates: Coordinates;
  
  // สถานการณ์น้ำ & ผู้อยู่อาศัย
  waterLevel: WaterLevel;
  people: PeopleCount;
  needs: string[];
  notes?: string;
  imageUrl?: string;
  
  // กู้ภัยติดตามสถานะ
  responderNotes?: string;
  rescuedBy?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  desc: string;
  iconType: 'ambulance' | 'shield' | 'truck' | 'phone' | 'utility';
  category: 'national' | 'medical' | 'rescue' | 'utility';
}

export type UserRole = 'CITIZEN' | 'RESCUER' | 'ADMIN';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  registeredAt: string;
  avatarUrl?: string;
  lineUserId?: string;
  loginMethod?: 'phone' | 'line';
  role?: UserRole;
  rescueOrg?: string;
  callsign?: string;
}
