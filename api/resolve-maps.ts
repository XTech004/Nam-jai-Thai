/**
 * Vercel Serverless Function: /api/resolve-maps
 * Resolves Google Maps URLs (including short links like maps.app.goo.gl)
 * and extracts precise latitude and longitude coordinates.
 * Prioritizes the true location pin (!3d!4d) over the camera viewport (@lat,lng).
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const rawUrl = req.method === 'POST' ? req.body?.url : req.query?.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing url parameter' });
    }

    const trimmedUrl = rawUrl.trim();
    const isAllowedMapsHost = (hostname: string) => {
      const host = hostname.toLowerCase();
      return host === 'goo.gl' || host.endsWith('.goo.gl') || host === 'google.com' || host.endsWith('.google.com');
    };
    let inputUrl: URL;
    try { inputUrl = new URL(trimmedUrl); } catch { return res.status(400).json({ success: false, error: 'Invalid URL' }); }
    if (inputUrl.protocol !== 'https:' || !isAllowedMapsHost(inputUrl.hostname)) {
      return res.status(400).json({ success: false, error: 'Only HTTPS Google Maps links are supported' });
    }

    // Helper to extract place name from Google Maps URL if available
    const extractPlaceName = (text: string): string | null => {
      if (!text) return null;
      const placeMatch = text.match(/\/place\/([^/@?]+)/);
      if (placeMatch) {
        try {
          const raw = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
          // If the place name is just coordinates (e.g. 13.7498,100.4915), ignore it
          if (!/^-?\d{1,2}\.\d+[,\+\s]+-?\d{1,3}\.\d+$/.test(raw)) {
            return raw;
          }
        } catch {
          // ignore uri decode error
        }
      }
      return null;
    };

    // Helper regex coordinate parser with strict priority for TRUE PIN LOCATION
    const extractCoords = (text: string): { lat: number; lng: number } | null => {
      if (!text) return null;

      // 1. Exact place pin in Google Maps data params: !3d13.7498558!4d100.4915765
      // MUST be highest priority because @lat,lng in place URLs is only the camera viewport/zoom
      const data = text.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
      if (data) {
        const lat = parseFloat(data[1]);
        const lng = parseFloat(data[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }

      // 2. Explicit dropped pin in /place/lat,lng or /place/lat+lng
      const placeCoord = text.match(/\/place\/(-?\d{1,2}\.\d+)[,\+\s]+(-?\d{1,3}\.\d+)/);
      if (placeCoord) {
        const lat = parseFloat(placeCoord[1]);
        const lng = parseFloat(placeCoord[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }

      // 3. Query param ?q=lat,lng or ?query=lat,lng or ?ll=lat,lng
      const query = text.match(/[?&](?:q|query|ll)=(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/i);
      if (query) {
        const lat = parseFloat(query[1]);
        const lng = parseFloat(query[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }

      // 4. destination=lat,lng or center=lat,lng query param
      const dest = text.match(/[?&](?:destination|center)=(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/i);
      if (dest) {
        const lat = parseFloat(dest[1]);
        const lng = parseFloat(dest[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }

      // 5. Direct coordinates string: "19.9071, 99.8325"
      const direct = text.match(/^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/);
      if (direct) {
        const lat = parseFloat(direct[1]);
        const lng = parseFloat(direct[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }

      // 6. Camera viewport center @lat,lng (Fallback ONLY if no pin coordinates found above)
      const at = text.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
      if (at) {
        const lat = parseFloat(at[1]);
        const lng = parseFloat(at[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }

      return null;
    };

    // First try direct parse without network request
    const directCoords = extractCoords(trimmedUrl);
    const directPlace = extractPlaceName(trimmedUrl);
    if (directCoords) {
      return res.status(200).json({
        success: true,
        lat: directCoords.lat,
        lng: directCoords.lng,
        placeName: directPlace,
        resolvedUrl: trimmedUrl,
        source: 'direct'
      });
    }

    // Follow redirect to resolve short URLs (e.g. maps.app.goo.gl/...)
    let response: Response | null = null;
    let currentUrl = trimmedUrl;
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      const current = new URL(currentUrl);
      if (current.protocol !== 'https:' || !isAllowedMapsHost(current.hostname)) {
        return res.status(400).json({ success: false, error: 'Google Maps redirected to a blocked host' });
      }
      response = await fetch(currentUrl, {
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
        headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'th,en-US;q=0.9,en;q=0.8'
        }
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      if (!location || redirectCount === 5) return res.status(400).json({ success: false, error: 'Too many or invalid redirects' });
      currentUrl = new URL(location, currentUrl).toString();
    }
    if (!response) return res.status(502).json({ success: false, error: 'Unable to resolve map URL' });

    const finalUrl = currentUrl;
    let coords = extractCoords(finalUrl);
    let placeName = extractPlaceName(finalUrl);

    // If still not in the URL, inspect the HTML response for coordinates
    if (!coords) {
      const html = await response.text();
      // Look for !3d!4d pin in HTML first, then meta center
      const htmlPin = html.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
      if (htmlPin) {
        coords = { lat: parseFloat(htmlPin[1]), lng: parseFloat(htmlPin[2]) };
      } else {
        const htmlCenter =
          html.match(/center=(-?\d{1,2}\.\d+)%2C(-?\d{1,3}\.\d+)/i) ||
          html.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
        if (htmlCenter) {
          coords = { lat: parseFloat(htmlCenter[1]), lng: parseFloat(htmlCenter[2]) };
        }
      }

      if (!placeName) {
        // Try extracting place name from title or og:title in HTML
        const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        if (ogTitle && ogTitle[1] && !ogTitle[1].includes('Google Maps')) {
          placeName = ogTitle[1].trim();
        }
      }
    }

    if (coords) {
      return res.status(200).json({
        success: true,
        lat: coords.lat,
        lng: coords.lng,
        placeName: placeName || null,
        resolvedUrl: finalUrl,
        source: 'resolved'
      });
    }

    return res.status(200).json({
      success: false,
      message: 'ไม่สามารถตรวจพบพิกัดตัวเลขจากลิงก์นี้ได้โดยอัตโนมัติ',
      resolvedUrl: finalUrl
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to resolve map URL'
    });
  }
}
