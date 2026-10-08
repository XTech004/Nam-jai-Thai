import type { UserProfile, SOSRequest } from '../types/sos';

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
    const profile = JSON.parse(raw) as UserProfile;
    // A client-stored profile/role is display data only; never grant admin here.
    return { ...profile, role: 'CITIZEN' };
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
    role: 'CITIZEN',
    rescueOrg: existing?.rescueOrg,
    callsign: existing?.callsign,
  };

  const currentUsers = localUsers.filter(u => u.id !== userId && u.lineUserId !== lineProfile.userId);
  saveRegisteredUsers([profile, ...currentUsers]);
  setCurrentUser(profile);

  return profile;
}

// ==========================================
// Case Ownership & LINE Login Authorization
// ==========================================

const MY_CASES_KEY = 'thai_flood_my_case_ids';

/**
 * Returns list of SOS request IDs submitted from this client device
 */
export function getMyCaseIds(): string[] {
  try {
    const raw = localStorage.getItem(MY_CASES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Persists an SOS request ID as belonging to this client
 */
export function addMyCaseId(id: string): void {
  try {
    const current = getMyCaseIds();
    if (!current.includes(id)) {
      localStorage.setItem(MY_CASES_KEY, JSON.stringify([id, ...current]));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('thai_flood_my_cases_updated'));
      }
    }
  } catch (e) {
    console.error('Failed to save my case ID:', e);
  }
}

/**
 * Checks whether an SOS request belongs to the current user
 */
export function isMyCase(request: SOSRequest, currentUser: UserProfile | null): boolean {
  // 1. Device storage match (submitted on this browser)
  const localIds = getMyCaseIds();
  if (localIds.includes(request.id)) {
    return true;
  }

  // 2. LINE User ID match (logged in on any device)
  if (currentUser?.lineUserId && request.createdByLineUserId) {
    if (currentUser.lineUserId === request.createdByLineUserId) {
      return true;
    }
  }

  // 3. User profile ID match
  if (currentUser?.id && request.createdByUserId) {
    if (currentUser.id === request.createdByUserId) {
      return true;
    }
  }

  // 4. Phone number match if both exist
  if (currentUser?.phone && request.primaryPhone) {
    if (normalizePhone(currentUser.phone) === normalizePhone(request.primaryPhone)) {
      return true;
    }
  }

  return false;
}

export type EditCasePermission =
  | { allowed: true }
  | { allowed: false; reason: 'NOT_LOGGED_IN' | 'NOT_LINE_USER' | 'NOT_OWNER' };

/**
 * Evaluates whether the current user is permitted to edit this request's citizen details.
 * Rule: Must be logged in via LINE AND must be the owner of the case.
 */
export function canEditCase(request: SOSRequest, currentUser: UserProfile | null): EditCasePermission {
  if (!currentUser) {
    return { allowed: false, reason: 'NOT_LOGGED_IN' };
  }

  const isLine = Boolean(currentUser.lineUserId) || currentUser.loginMethod === 'line';
  if (!isLine) {
    return { allowed: false, reason: 'NOT_LINE_USER' };
  }

  if (!isMyCase(request, currentUser)) {
    return { allowed: false, reason: 'NOT_OWNER' };
  }

  return { allowed: true };
}
