import type { UserProfile } from '../types/sos';
import { getSupabaseClient } from './supabaseClient';

const LOCAL_USERS_KEY = 'thai_flood_registered_users_v1';
const CURRENT_USER_KEY = 'thai_flood_current_user_v1';
export const USER_AUTH_EVENT = 'thai_flood_user_auth_changed';

// Clean and normalize Thai phone number
export function normalizePhone(rawPhone: string): string {
  let cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.startsWith('66') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

// Format 10-digit phone for human reading: 081-234-5678
export function formatPhone(phone: string): string {
  const norm = normalizePhone(phone);
  if (norm.length === 10) {
    return `${norm.slice(0, 3)}-${norm.slice(3, 6)}-${norm.slice(6)}`;
  }
  if (norm.length === 9) {
    return `${norm.slice(0, 2)}-${norm.slice(2, 5)}-${norm.slice(5)}`;
  }
  return phone;
}

// Get all registered users from local cache
export function getRegisteredUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read registered users from localStorage:', e);
    return [];
  }
}

// Save registered users list
function saveRegisteredUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save registered users to localStorage:', e);
  }
}

// Get current logged-in user
export function getCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch (e) {
    console.error('Failed to read current user:', e);
    return null;
  }
}

// Save current logged-in user session
export function setCurrentUser(user: UserProfile | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(USER_AUTH_EVENT, { detail: user }));
    }
  } catch (e) {
    console.error('Failed to set current user:', e);
  }
}

// Logout user
export function logoutUser(): void {
  setCurrentUser(null);
}

// ==========================================
// Phone Number Duplicate Check
// ==========================================

export async function checkPhoneExists(phone: string): Promise<{ exists: boolean; user?: UserProfile }> {
  const clean = normalizePhone(phone);
  if (clean.length < 9) {
    return { exists: false };
  }

  // 1. Check local registered users first (Instant)
  const localUsers = getRegisteredUsers();
  const foundLocal = localUsers.find(u => normalizePhone(u.phone) === clean);
  if (foundLocal) {
    return { exists: true, user: foundLocal };
  }

  // 2. Check Supabase (if connected)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Check in sos_users table
      const { data: usersData, error: userError } = await supabase
        .from('sos_users')
        .select('*')
        .eq('phone', clean)
        .limit(1);

      if (!userError && usersData && usersData.length > 0) {
        const row = usersData[0];
        const profile: UserProfile = {
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          phone: row.phone,
          registeredAt: row.created_at || new Date().toISOString(),
        };
        // Cache locally
        saveRegisteredUsers([...localUsers, profile]);
        return { exists: true, user: profile };
      }

      // Check in sos_requests table as secondary reference
      const { data: reqData, error: reqError } = await supabase
        .from('sos_requests')
        .select('full_name, primary_phone, created_at')
        .eq('primary_phone', clean)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!reqError && reqData && reqData.length > 0) {
        const r = reqData[0];
        const parts = (r.full_name || '').trim().split(/\s+/);
        const firstName = parts[0] || 'ผู้ประสบภัย';
        const lastName = parts.slice(1).join(' ') || '';
        const profile: UserProfile = {
          id: `USR-${clean}`,
          firstName,
          lastName,
          phone: clean,
          registeredAt: r.created_at || new Date().toISOString(),
        };
        saveRegisteredUsers([...localUsers, profile]);
        return { exists: true, user: profile };
      }
    } catch (e) {
      console.warn('Error checking phone in Supabase:', e);
    }
  }

  return { exists: false };
}

// ==========================================
// Register or Update User Profile
// ==========================================

export async function registerOrLoginUser(
  firstName: string,
  lastName: string,
  phone: string
): Promise<UserProfile> {
  const cleanPhone = normalizePhone(phone);
  const now = new Date().toISOString();
  const userId = `USR-${cleanPhone}`;

  const profile: UserProfile = {
    id: userId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: cleanPhone,
    registeredAt: now,
  };

  // 1. Update local storage
  const currentUsers = getRegisteredUsers().filter(u => normalizePhone(u.phone) !== cleanPhone);
  saveRegisteredUsers([profile, ...currentUsers]);

  // 2. Set as active session
  setCurrentUser(profile);

  // 3. Sync to Supabase if sos_users table is present
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('sos_users').upsert({
        id: userId,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: cleanPhone,
        updated_at: now,
      });
    } catch (e) {
      console.warn('Could not sync user to Supabase (table may not exist yet):', e);
    }
  }

  return profile;
}

// ==========================================
// LINE User Registration & Session
// ==========================================

export async function registerOrLoginLineUser(lineProfile: {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}): Promise<UserProfile> {
  const parts = lineProfile.displayName.trim().split(/\s+/);
  const firstName = parts[0] || lineProfile.displayName;
  const lastName = parts.slice(1).join(' ') || '';
  const now = new Date().toISOString();
  const userId = `LINE-${lineProfile.userId}`;

  // Check if existing user with this LINE ID
  const localUsers = getRegisteredUsers();
  const existing = localUsers.find(u => u.lineUserId === lineProfile.userId || u.id === userId);

  const profile: UserProfile = {
    id: userId,
    firstName: existing?.firstName || firstName,
    lastName: existing?.lastName || lastName,
    phone: existing?.phone || '',
    registeredAt: existing?.registeredAt || now,
    avatarUrl: lineProfile.pictureUrl,
    lineUserId: lineProfile.userId,
    loginMethod: 'line',
    role: existing?.role || 'CITIZEN',
    rescueOrg: existing?.rescueOrg,
    callsign: existing?.callsign,
  };

  const currentUsers = localUsers.filter(u => u.id !== userId && u.lineUserId !== lineProfile.userId);
  saveRegisteredUsers([profile, ...currentUsers]);
  setCurrentUser(profile);

  // Sync to Supabase if sos_users table is present
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('sos_users').upsert({
        id: userId,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone || '',
        avatar_url: profile.avatarUrl || '',
        line_user_id: profile.lineUserId,
        login_method: 'line',
        role: profile.role,
        rescue_org: profile.rescueOrg,
        callsign: profile.callsign,
        updated_at: now
      });
    } catch (e) {
      console.warn('Could not sync LINE user to Supabase:', e);
    }
  }

  return profile;
}

// ==========================================
// Rescuer Verification & Role Management
// ==========================================

const DEFAULT_RESCUER_PIN = '2567';

export async function verifyAsRescuer(
  userId: string,
  orgName: string,
  callsign: string,
  pin: string
): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  const currentPin = localStorage.getItem('thai_flood_admin_pin') || DEFAULT_RESCUER_PIN;
  if (pin.trim() !== currentPin && pin.trim() !== DEFAULT_RESCUER_PIN) {
    return {
      success: false,
      message: 'รหัสยืนยันหน่วยงานกู้ภัยไม่ถูกต้อง กรุณาติดต่อหัวหน้าศูนย์กู้ภัยของคุณ (PIN เริ่มต้น: 2567)',
    };
  }

  const localUsers = getRegisteredUsers();
  const targetUser = localUsers.find(u => u.id === userId) || getCurrentUser();
  if (!targetUser) {
    return { success: false, message: 'ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบด้วย LINE ก่อน' };
  }

  const updatedProfile: UserProfile = {
    ...targetUser,
    role: 'RESCUER',
    rescueOrg: orgName.trim() || 'หน่วยกู้ภัยอาสา',
    callsign: callsign.trim() || undefined,
  };

  const remaining = localUsers.filter(u => u.id !== userId);
  saveRegisteredUsers([updatedProfile, ...remaining]);
  setCurrentUser(updatedProfile);

  return {
    success: true,
    message: `ยืนยันตัวตนเจ้าหน้าที่กู้ภัยสังกัด "${updatedProfile.rescueOrg}" สำเร็จแล้ว!`,
    user: updatedProfile,
  };
}

export async function revertToCitizen(userId: string): Promise<UserProfile | null> {
  const localUsers = getRegisteredUsers();
  const targetUser = localUsers.find(u => u.id === userId) || getCurrentUser();
  if (!targetUser) return null;

  const updatedProfile: UserProfile = {
    ...targetUser,
    role: 'CITIZEN',
    rescueOrg: undefined,
    callsign: undefined,
  };

  const remaining = localUsers.filter(u => u.id !== userId);
  saveRegisteredUsers([updatedProfile, ...remaining]);
  setCurrentUser(updatedProfile);
  return updatedProfile;
}

// ==========================================
// Realistic Interactive OTP Verification System
// ==========================================

interface ActiveOTP {
  code: string;
  phone: string;
  expiresAt: number;
}

const otpStore = new Map<string, ActiveOTP>();

export async function requestOTP(phone: string): Promise<{ success: boolean; otpCode: string; message: string }> {
  const clean = normalizePhone(phone);
  if (clean.length < 9) {
    return { success: false, otpCode: '', message: 'เบอร์โทรศัพท์ไม่ถูกต้อง' };
  }

  // Generate 6-digit random OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  otpStore.set(clean, {
    code: otpCode,
    phone: clean,
    expiresAt
  });

  return {
    success: true,
    otpCode,
    message: `ส่งรหัส OTP 6 หลักไปยังเบอร์ ${formatPhone(clean)} เรียบร้อยแล้ว`,
  };
}

export function verifyOTP(phone: string, inputCode: string): { success: boolean; message: string } {
  const clean = normalizePhone(phone);
  const record = otpStore.get(clean);

  if (!record) {
    return { success: false, message: 'ไม่พบคำขอรหัส OTP หรือรหัสหมดอายุแล้ว กรุณากดส่งรหัสใหม่' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(clean);
    return { success: false, message: 'รหัส OTP หมดอายุแล้ว (เกิน 5 นาที) กรุณากดขอรหัสใหม่' };
  }

  if (record.code !== inputCode.trim()) {
    return { success: false, message: 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง' };
  }

  // Verification succeeded - clear OTP
  otpStore.delete(clean);
  return { success: true, message: 'ยืนยันรหัส OTP สำเร็จ' };
}
