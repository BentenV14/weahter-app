import { geocodingSchema } from '../../schema';
export async function searchLocations(search: string, language = 'en', country?: string) {
  const query = new URLSearchParams({ name: search, count: '100', language, format: 'json' });
  if (country) query.set('countryCode', country);
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${query}`, {
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Location search is unavailable. Try coordinates instead.');
  return geocodingSchema.parse(await response.json()).results ?? [];
}
