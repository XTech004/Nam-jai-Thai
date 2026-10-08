import { bearer, isAdminToken } from '../server/security';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const isAdmin = await isAdminToken(bearer(req));
  return res.status(isAdmin ? 200 : 401).json({ isAdmin });
}
