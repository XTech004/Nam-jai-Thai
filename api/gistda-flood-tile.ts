/**
 * Vercel Serverless Function: /api/gistda-flood-tile
 * Proxies GISTDA flood map tiles without exposing the API key to browsers.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GISTDA_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ error: 'GISTDA_API_KEY is not configured on the server' });
  }

  const readInteger = (value: unknown) => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string' && typeof raw !== 'number') return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : null;
  };

  const z = readInteger(req.query?.z);
  const x = readInteger(req.query?.x);
  const y = readInteger(req.query?.y);
  if (z === null || x === null || y === null || z < 0 || z > 18) {
    return res.status(400).json({ error: 'Invalid tile coordinates' });
  }

  const tileCount = 2 ** z;
  if (x < 0 || y < 0 || x >= tileCount || y >= tileCount) {
    return res.status(400).json({ error: 'Tile coordinates are out of range' });
  }

  const target = new URL(
    `https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/1day/tms/${z}/${x}/${y}`
  );
  target.searchParams.set('api_key', apiKey);

  try {
    const upstream = await fetch(target, { signal: AbortSignal.timeout(15000) });
    const body = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get('content-type') || 'image/png';

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', upstream.ok && contentType.includes('image/')
      ? 'public, s-maxage=300, stale-while-revalidate=600'
      : 'no-store');
    res.setHeader('X-GISTDA-Data-Period', 'flood-extent-1day');
    return res.status(upstream.ok ? 200 : 502).send(body);
  } catch {
    return res.status(502).json({ error: 'GISTDA flood tile service is unavailable' });
  }
}
