import { ALL_PROVINCES, getDistricts, getSubDistricts } from './thaiAddresses';

export interface ReverseGeocodeResult {
  province?: string;
  district?: string;
  subDistrict?: string;
  road?: string;
  suggestedAddress?: string;
  suggestedLandmark?: string;
  displayName?: string;
}

function cleanThaiPrefix(text: string): string {
  if (!text) return '';
  return text
    .replace(/^(จังหวัด|จ\.|อำเภอ|อ\.|เขต|ตำบล|ต\.|แขวง|เทศบาลตำบล|เทศบาลเมือง|เทศบาลนคร)\s*/g, '')
    .trim();
}

function findBestMatch(input: string, candidates: string[]): string | undefined {
  if (!input || !candidates || candidates.length === 0) return undefined;
  const cleanInput = cleanThaiPrefix(input);

  // 1. Exact match
  const exact = candidates.find(c => c === cleanInput || c === input);
  if (exact) return exact;

  // 2. Direct startsWith or inclusion
  const partial = candidates.find(c => c.includes(cleanInput) || cleanInput.includes(c));
  if (partial) return partial;

  return undefined;
}

/**
 * Reverse geocodes coordinates (lat, lng) to standard Thai administrative names
 * (Province, District, SubDistrict) matching the application's thaiLocations database.
 */
export async function reverseGeocodeThaiLocation(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  // Validate coordinates are within Thailand's geographic bounding box
  if (lat < 5 || lat > 21 || lng < 97 || lng > 106) {
    return null;
  }

  // 1. Try Nominatim OpenStreetMap (High precision Thai administrative boundaries)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=th`;
    const res = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NamJaiThaiFloodRelief/2.0 (contact@namjai-thai.org)'
      }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      // Match Province
      const provCandidates = [addr.province, addr.state, addr.city, addr.region].filter(Boolean);
      let matchedProvince: string | undefined;
      for (const p of provCandidates) {
        matchedProvince = findBestMatch(p, ALL_PROVINCES);
        if (matchedProvince) break;
      }

      // Match District
      let matchedDistrict: string | undefined;
      if (matchedProvince) {
        const availableDistricts = getDistricts(matchedProvince);
        const distCandidates = [
          addr.county,
          addr.district,
          addr.suburb,
          addr.city_district,
          addr.town,
          addr.city,
          addr.municipality
        ].filter(Boolean);

        for (const d of distCandidates) {
          matchedDistrict = findBestMatch(d, availableDistricts);
          if (matchedDistrict) break;
        }
      }

      // Match SubDistrict
      let matchedSubDistrict: string | undefined;
      if (matchedProvince && matchedDistrict) {
        const availableSubDistricts = getSubDistricts(matchedProvince, matchedDistrict);
        const subCandidates = [
          addr.city_district,
          addr.quarter,
          addr.suburb,
          addr.neighbourhood,
          addr.village,
          addr.town
        ].filter(Boolean);

        for (const s of subCandidates) {
          matchedSubDistrict = findBestMatch(s, availableSubDistricts);
          if (matchedSubDistrict) break;
        }
      }

      const road = addr.road || addr.highway || undefined;
      const suggestedLandmark = data.name && data.name !== road ? data.name : undefined;

      let suggestedAddress = '';
      if (road) suggestedAddress = road;
      if (addr.village && !suggestedAddress.includes(addr.village)) {
        suggestedAddress = suggestedAddress ? `${addr.village} ${suggestedAddress}` : addr.village;
      }

      if (matchedProvince || matchedDistrict || matchedSubDistrict) {
        return {
          province: matchedProvince,
          district: matchedDistrict,
          subDistrict: matchedSubDistrict,
          road,
          suggestedAddress: suggestedAddress.trim() || undefined,
          suggestedLandmark: suggestedLandmark || undefined,
          displayName: data.display_name
        };
      }
    }
  } catch (nominatimErr) {
    console.warn('Nominatim reverse geocode notice, falling back:', nominatimErr);
  }

  // 2. Fallback to BigDataCloud client API
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=th`;
    const res = await fetch(bdcUrl);
    if (res.ok) {
      const data = await res.json();
      const provCandidates = [data.principalSubdivision, data.city].filter(Boolean);
      let matchedProvince: string | undefined;
      for (const p of provCandidates) {
        matchedProvince = findBestMatch(p, ALL_PROVINCES);
        if (matchedProvince) break;
      }

      let matchedDistrict: string | undefined;
      if (matchedProvince) {
        const availableDistricts = getDistricts(matchedProvince);
        const distCandidates = [data.locality, data.city].filter(Boolean);
        if (data.localityInfo?.administrative) {
          for (const admin of data.localityInfo.administrative) {
            distCandidates.push(admin.name);
          }
        }
        for (const d of distCandidates) {
          matchedDistrict = findBestMatch(d, availableDistricts);
          if (matchedDistrict) break;
        }
      }

      let matchedSubDistrict: string | undefined;
      if (matchedProvince && matchedDistrict) {
        const availableSubDistricts = getSubDistricts(matchedProvince, matchedDistrict);
        const subCandidates: string[] = [];
        if (data.localityInfo?.administrative) {
          for (const admin of data.localityInfo.administrative) {
            subCandidates.push(admin.name);
          }
        }
        for (const s of subCandidates) {
          matchedSubDistrict = findBestMatch(s, availableSubDistricts);
          if (matchedSubDistrict) break;
        }
      }

      if (matchedProvince || matchedDistrict) {
        return {
          province: matchedProvince,
          district: matchedDistrict,
          subDistrict: matchedSubDistrict,
          displayName: `${matchedProvince || ''} ${matchedDistrict || ''} ${matchedSubDistrict || ''}`.trim()
        };
      }
    }
  } catch (bdcErr) {
    console.warn('BigDataCloud reverse geocode notice:', bdcErr);
  }

  return null;
}
