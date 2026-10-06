import { NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/server/cache';
import { parseCountries, countryCatalogSchema } from '@/lib/location/countries';
import snapshot from '@/lib/location/data/countries.json';
export async function GET() {
  const result = await cachedFetch('countries:geonames:v2', 86400000, async () => {
    try {
      const response = await fetch('https://download.geonames.org/export/dump/countryInfo.txt', {
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Country data unavailable');
      const countries = parseCountries(await response.text());
      if (countries.length < 150) throw new Error('Incomplete country data');
      return countryCatalogSchema.parse({
        countries,
        source: 'GeoNames',
        updatedAt: new Date().toISOString(),
        cachedSnapshot: false,
      });
    } catch {
      return countryCatalogSchema.parse(snapshot);
    }
  });
  return NextResponse.json(result.value, {
    headers: { 'Cache-Control': 'public, max-age=86400', 'X-Cache': result.hit ? 'HIT' : 'MISS' },
  });
}
