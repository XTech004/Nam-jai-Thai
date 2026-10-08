import { bearer, database, fromDbRow, isAdminToken, sendLineAlert, toDbRow, validRequest } from '../server/security.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const db = database();
    if (req.method === 'POST') {
      const request = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!validRequest(request)) return res.status(400).json({ error: 'ข้อมูลแจ้งเหตุไม่ครบหรือไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่' });
      const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      const fingerprint = await rateLimitFingerprint(ip);
      const { data: allowed, error: limitError } = await db.rpc('try_allow_sos_submission', { p_fingerprint: fingerprint });
      if (limitError) {
        console.error('SOS rate limiter unavailable:', limitError.message);
        return res.status(503).json({ error: 'ระบบรับแจ้งเหตุยังตั้งค่าไม่ครบ กรุณาโทร 1784 หรือ 1669' });
      }
      if (allowed !== true) return res.status(429).json({ error: 'ส่งคำขอถี่เกินไป กรุณารอสักครู่ หรือโทร 1784 หากเป็นเหตุฉุกเฉิน' });
      const now = new Date().toISOString();
      const id = `SOS-${new Date().getFullYear()}-${globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const accepted = { ...request, id, createdAt: now, updatedAt: now, status: 'PENDING' };
      const { data, error } = await db.from('sos_requests').insert(toDbRow(accepted)).select('*').single();
      if (error || !data) {
        console.error('SOS insert failed:', error?.message);
        return res.status(503).json({ error: 'บันทึกเคสไม่สำเร็จ กรุณาโทร 1784 หรือ 1669 โดยตรง' });
      }
      const notification = await sendLineAlert(accepted);
      return res.status(201).json({ request: { ...fromDbRow(data), notificationSent: notification.sent, notificationMessage: notification.message } });
    }

    if (!(await isAdminToken(bearer(req)))) return res.status(401).json({ error: 'ต้องยืนยันบัญชี LINE แอดมินก่อน' });
    if (req.method === 'GET') {
      const { data, error } = await db.from('sos_requests').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return res.status(200).json({ requests: (data || []).map(fromDbRow) });
    }
    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      let query: any;
      if (body.action === 'update-status') {
        const allowed = ['PENDING', 'RESPONDING', 'COMPLETED', 'CANCELLED'];
        if (!allowed.includes(body.status) || typeof body.requestId !== 'string') return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
        query = db.from('sos_requests').update({ status: body.status, responder_notes: body.responderNotes || null, rescued_by: body.rescuedBy || null, updated_at: new Date().toISOString() }).eq('id', body.requestId);
      } else if (body.action === 'update' && body.request?.id && validRequest(body.request)) {
        query = db.from('sos_requests').update({ ...toDbRow(body.request), status: body.request.status, updated_at: new Date().toISOString() }).eq('id', body.request.id);
      } else return res.status(400).json({ error: 'คำสั่งไม่ถูกต้อง' });
      const { error } = await query;
      if (error) throw error;
      return await sendAll(db, res);
    }
    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (body.action === 'delete' && typeof body.requestId === 'string') {
        const { error } = await db.from('sos_requests').delete().eq('id', body.requestId);
        if (error) throw error;
      } else return res.status(400).json({ error: 'คำสั่งไม่ถูกต้อง' });
      return await sendAll(db, res);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('SOS API error:', error?.message || error);
    return res.status(503).json({ error: error?.message || 'ระบบชั่วคราวไม่พร้อมใช้งาน' });
  }
}

async function rateLimitFingerprint(ip: string): Promise<string> {
  const env = (globalThis as any).process?.env || {};
  const secret = env.RATE_LIMIT_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || '';
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(ip));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sendAll(db: any, res: any) {
  const { data, error } = await db.from('sos_requests').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return res.status(200).json({ requests: (data || []).map(fromDbRow) });
}
