import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Vercel Serverless Function: /api/resolve-maps
 * Resolves Google Maps URLs (including short links like maps.app.goo.gl)
 * and extracts precise latitude and longitude coordinates.
 */
export default async function handler(req: any, res: any) {
  // Allow CORS from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawUrl = req.method === 'POST' ? req.body?.url : req.query?.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing url parameter' });
    }

    const trimmedUrl = rawUrl.trim();

    // Helper regex coordinate parser
    const extractCoords = (text: string) => {
      if (!text) return null;

      // 1. Direct coordinates: "19.9071, 99.8325"
      const direct = text.match(/^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/);
      if (direct) {
        return { lat: parseFloat(direct[1]), lng: parseFloat(direct[2]) };
      }

      // 2. Query param ?q=lat,lng or query=lat,lng or ll=lat,lng
      const query = text.match(/[?&](?:q|query|ll)=(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/i);
      if (query) {
        return { lat: parseFloat(query[1]), lng: parseFloat(query[2]) };
      }

      // 3. Path @lat,lng,zoom pattern: .../@19.9071,99.8325,17z...
      const at = text.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
      if (at) {
        return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
      }

      // 4. Data pattern !3dlat!4dlng
      const data = text.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
      if (data) {
        return { lat: parseFloat(data[1]), lng: parseFloat(data[2]) };
      }

      // 5. destination=lat,lng or center=lat,lng
      const dest = text.match(/[?&](?:destination|center)=(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/i);
      if (dest) {
        return { lat: parseFloat(dest[1]), lng: parseFloat(dest[2]) };
      }

      return null;
    };

    // First try direct parse without network request
    const directCoords = extractCoords(trimmedUrl);
    if (directCoords && directCoords.lat >= -90 && directCoords.lat <= 90 && directCoords.lng >= -180 && directCoords.lng <= 180) {
      return res.status(200).json({
        success: true,
        lat: directCoords.lat,
        lng: directCoords.lng,
        resolvedUrl: trimmedUrl,
        source: 'direct'
      });
    }

    // Follow redirect to resolve short URLs (e.g. maps.app.goo.gl/...)
    const response = await fetch(trimmedUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'th,en-US;q=0.9,en;q=0.8'
      }
    });

    const finalUrl = response.url || trimmedUrl;
    let coords = extractCoords(finalUrl);

    // If still not in the URL, inspect the HTML response for coordinates
    if (!coords) {
      const html = await response.text();
      // Look for meta static map center: center=19.9071%2C99.8325 or /@19.9071,99.8325/
      const htmlMatch =
        html.match(/center=(-?\d{1,2}\.\d+)%2C(-?\d{1,3}\.\d+)/i) ||
        html.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) ||
        html.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);

      if (htmlMatch) {
        coords = { lat: parseFloat(htmlMatch[1]), lng: parseFloat(htmlMatch[2]) };
      }
    }

    if (coords && coords.lat >= -90 && coords.lat <= 90 && coords.lng >= -180 && coords.lng <= 180) {
      return res.status(200).json({
        success: true,
        lat: coords.lat,
        lng: coords.lng,
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
