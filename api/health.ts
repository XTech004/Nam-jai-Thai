import { database } from '../server/security';

export default async function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!configured) return res.status(503).json({ ready: false, message: 'ยังไม่ได้ตั้งค่า Supabase server-side environment variables' });
  try {
    const db = database();
    const [cases, limits] = await Promise.all([
      db.from('sos_requests').select('id').limit(0),
      db.from('sos_submission_limits').select('fingerprint').limit(0),
    ]);
    if (cases.error || limits.error) return res.status(503).json({ ready: false, message: 'ยังสร้างตารางหรือรัน security migration ไม่ครบ' });
    return res.status(200).json({ ready: true, message: 'API และฐานข้อมูลพร้อมใช้งาน' });
  } catch {
    return res.status(503).json({ ready: false, message: 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบ environment variables' });
  }
}
