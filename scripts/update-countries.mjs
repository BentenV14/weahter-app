import { mkdir, writeFile } from 'node:fs/promises';
import { parseCountries } from '../src/lib/location/countries.ts';
const response = await fetch('https://download.geonames.org/export/dump/countryInfo.txt', {
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw new Error(`Country dataset unavailable: ${response.status}`);
const countries = parseCountries(await response.text());
await mkdir('src/lib/location/data', { recursive: true });
await writeFile(
  'src/lib/location/data/countries.json',
  JSON.stringify(
    { countries, source: 'GeoNames', updatedAt: new Date().toISOString(), cachedSnapshot: true },
    null,
    2,
  ) + '\n',
);
console.log(`Saved ${countries.length} countries and territories from GeoNames.`);
