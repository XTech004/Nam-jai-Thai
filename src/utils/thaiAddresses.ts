import thaiLocationsData from '../data/thaiLocations.json';

type LocationHierarchy = Record<string, Record<string, string[]>>;

const locations: LocationHierarchy = thaiLocationsData as LocationHierarchy;

export const ALL_PROVINCES: string[] = Object.keys(locations);

export function getProvinces(): string[] {
  return ALL_PROVINCES;
}

export function getDistricts(province: string): string[] {
  if (!province || !locations[province]) {
    return [];
  }
  return Object.keys(locations[province]);
}

export function getSubDistricts(province: string, district: string): string[] {
  if (!province || !district || !locations[province] || !locations[province][district]) {
    return [];
  }
  return locations[province][district];
}
