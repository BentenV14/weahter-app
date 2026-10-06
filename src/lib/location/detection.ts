import { z } from 'zod';
import type { Location } from '../weather/types';
const reverseSchema = z.object({
  locality: z.string().max(150).optional(),
  city: z.string().max(150).optional(),
  countryName: z.string().max(150).optional(),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  principalSubdivision: z.string().max(150).optional(),
  lookupSource: z.string().optional(),
  localityInfo: z
    .object({
      informative: z
        .array(z.object({ name: z.string(), description: z.string().optional() }))
        .optional(),
    })
    .optional(),
});
export class LocationAccessError extends Error {
  constructor(public code: number) {
    super(
      code === 1
        ? 'Location access denied.'
        : code === 3
          ? 'Your location could not be determined before the timeout.'
          : 'Your location could not be determined.',
    );
  }
}
export async function resolveDeviceLocation(language: string): Promise<Location> {
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new LocationAccessError(2));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => reject(new LocationAccessError(error.code)),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  });
  const point: Location = {
    name: 'Your location',
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
  try {
    const params = new URLSearchParams({
      latitude: String(point.latitude),
      longitude: String(point.longitude),
      localityLanguage: language,
    });
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
      { signal: AbortSignal.timeout(8000), credentials: 'omit', referrerPolicy: 'no-referrer' },
    );
    if (!response.ok) return point;
    const data = reverseSchema.parse(await response.json());
    if (data.lookupSource?.toLowerCase().includes('ip')) return point;
    const timezone = data.localityInfo?.informative
      ?.map((item) => item.name)
      .find((name) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: name });
          return name.includes('/') || name === 'UTC';
        } catch {
          return false;
        }
      });
    return {
      ...point,
      name: data.locality?.trim() || data.city?.trim() || point.name,
      country: data.countryName,
      country_code: data.countryCode,
      admin1: data.principalSubdivision,
      timezone,
    };
  } catch {
    return point;
  }
}
export async function detectCountry(): Promise<string> {
  const response = await fetch('https://api.country.is/', {
    signal: AbortSignal.timeout(6000),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error('Country detection is unavailable.');
  return z.object({ country: z.string().regex(/^[A-Z]{2}$/) }).parse(await response.json()).country;
}
