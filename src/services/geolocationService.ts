import type { InspectionLocation } from '../types/inspection';

/** Фиксированная демонстрационная точка — центр Шымкента. Не отражает фактическое положение устройства. */
export const TEST_CITIES = {
  shymkent: { name: 'Шымкент', latitude: 42.3417, longitude: 69.5901 },
} as const;

export type TestCityId = keyof typeof TEST_CITIES;

export class GeoError extends Error {
  constructor(public code: 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'insecure') {
    super(code);
  }
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new GeoError('unsupported'));
    if (!window.isSecureContext) return reject(new GeoError('insecure'));
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) =>
        reject(
          new GeoError(
            err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable',
          ),
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}

/** Обратное геокодирование через Nominatim (OpenStreetMap). При ошибке возвращает null. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=ru&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json();
    const a = data?.address ?? {};
    return a.city || a.town || a.village || a.municipality || a.county || a.state || null;
  } catch {
    return null;
  }
}

export function testLocation(city: TestCityId): InspectionLocation {
  const c = TEST_CITIES[city];
  return {
    latitude: c.latitude,
    longitude: c.longitude,
    city: c.name,
    source: 'test',
    capturedAt: new Date().toISOString(),
    accuracy: null,
  };
}

export const formatCoords = (lat: number, lon: number) => `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

export const googleMapsUrl = (lat: number, lon: number) => `https://www.google.com/maps?q=${lat},${lon}`;
