import { createClient } from '@supabase/supabase-js';

const env = (globalThis as any).process?.env || {};

export function bearer(req: any): string | null {
  const value = String(req.headers?.authorization || '');
  return value.startsWith('Bearer ') ? value.slice(7).trim() : null;
}

export async function isAdminToken(token: string | null): Promise<boolean> {
  const channelId = env.LINE_CHANNEL_ID || '2011792268';
  const adminId = env.ADMIN_LINE_USER_ID;
  if (!token || !adminId) return false;
  try {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: token, client_id: channelId }),
    });
    if (!response.ok) return false;
    const claims = await response.json();
    return claims.sub === adminId && claims.aud === channelId && claims.iss === 'https://access.line.me' && Number(claims.exp) * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function database() {
  const url = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('ระบบฐานข้อมูลยังไม่ได้ตั้งค่า');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function toDbRow(req: any) {
  return {
    id: req.id,
    created_at: req.createdAt,
    updated_at: req.updatedAt,
    urgency: req.urgency,
    status: 'PENDING',
    full_name: req.fullName,
    primary_phone: req.primaryPhone,
    secondary_phone: req.secondaryPhone || null,
    line_id: req.lineId || null,
    province: req.province,
    district: req.district,
    sub_district: req.subDistrict || null,
    address: req.address,
    landmark: req.landmark || '',
    latitude: req.coordinates.lat,
    longitude: req.coordinates.lng,
    water_level: req.waterLevel,
    people: req.people,
    needs: req.needs,
    notes: req.notes || null,
    image_url: null,
    responder_notes: null,
    rescued_by: null,
  };
}

export function fromDbRow(row: any) {
  return {
    id: row.id, createdAt: row.created_at, updatedAt: row.updated_at || row.created_at,
    urgency: row.urgency, status: row.status, fullName: row.full_name, primaryPhone: row.primary_phone,
    secondaryPhone: row.secondary_phone || undefined, lineId: row.line_id || undefined,
    province: row.province, district: row.district, subDistrict: row.sub_district || undefined,
    address: row.address, landmark: row.landmark || '', coordinates: { lat: Number(row.latitude), lng: Number(row.longitude) },
    waterLevel: row.water_level, people: row.people, needs: row.needs || [], notes: row.notes || undefined,
    responderNotes: row.responder_notes || '', rescuedBy: row.rescued_by || '',
  };
}

export function validRequest(req: any): boolean {
  const urgencies = ['CRITICAL', 'URGENT', 'NORMAL'];
  const levels = ['ANKLE_KNEE', 'WAIST_CHEST', 'SECOND_FLOOR', 'ROOF_TOP', 'SURROUNDED'];
  const coords = req?.coordinates;
  return Boolean(
    req && typeof req.fullName === 'string' && req.fullName.trim().length >= 2 && req.fullName.length <= 100 &&
    typeof req.primaryPhone === 'string' && /^[0-9+() -]{8,24}$/.test(req.primaryPhone) &&
    typeof req.province === 'string' && req.province.length <= 100 && typeof req.district === 'string' && req.district.length <= 100 &&
    typeof req.address === 'string' && req.address.trim().length >= 3 && req.address.length <= 500 &&
    typeof (req.landmark || '') === 'string' && (req.landmark || '').length <= 250 &&
    (!req.secondaryPhone || (typeof req.secondaryPhone === 'string' && req.secondaryPhone.length <= 24)) &&
    (!req.lineId || (typeof req.lineId === 'string' && req.lineId.length <= 100)) &&
    (!req.notes || (typeof req.notes === 'string' && req.notes.length <= 1200)) &&
    urgencies.includes(req.urgency) && levels.includes(req.waterLevel) &&
    Number.isFinite(coords?.lat) && coords.lat >= 5 && coords.lat <= 21 &&
    Number.isFinite(coords?.lng) && coords.lng >= 97 && coords.lng <= 106 &&
    Array.isArray(req.needs) && req.needs.length <= 20 && req.needs.every((item: unknown) => typeof item === 'string' && item.length <= 100) &&
    typeof req.people === 'object' && req.people !== null &&
    ['adults', 'elderly', 'bedridden', 'children', 'pets'].every((key) => Number.isInteger(req.people[key]) && req.people[key] >= 0 && req.people[key] <= 200)
  );
}

export async function sendLineAlert(req: any): Promise<{ sent: boolean; message: string }> {
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
  const target = env.LINE_TARGET_ID;
  if (!accessToken || !target) return { sent: false, message: 'ยังไม่ได้ตั้งค่าช่องทางแจ้งเตือน LINE' };
  const text = [
    `🚨 แจ้งขอความช่วยเหลือ #${req.id} (${req.urgency})`,
    `ผู้แจ้ง: ${req.fullName} โทร ${req.primaryPhone}`,
    `ที่อยู่: ${req.address} ${req.district} ${req.province}`,
    `พิกัด: https://www.google.com/maps?q=${req.coordinates.lat},${req.coordinates.lng}`,
  ].join('\n').slice(0, 4500);
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ to: target, messages: [{ type: 'text', text }] }),
    });
    return response.ok ? { sent: true, message: 'ส่งแจ้งเตือนไปยัง LINE ที่กำหนดแล้ว (ยังไม่ยืนยันว่าทีมรับเคส)' } : { sent: false, message: 'LINE ไม่รับการแจ้งเตือน' };
  } catch {
    return { sent: false, message: 'เชื่อมต่อ LINE เพื่อแจ้งเตือนไม่สำเร็จ' };
  }
}
