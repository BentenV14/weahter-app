import { z } from 'zod';
export const countrySchema = z.object({
  code: z.string().regex(/^[A-Z]{2}$/),
  name: z.string().min(1).max(150),
  capital: z.string().max(150),
  continent: z.string(),
  areaKm2: z.number().finite().nonnegative().nullable(),
  population: z.number().int().nonnegative().nullable(),
  currencyCode: z.string(),
  currency: z.string(),
  callingCode: z.string(),
  languages: z.array(z.string().max(40)),
  neighbours: z.array(z.string().regex(/^[A-Z]{2}$/)),
});
export type CountryInfo = z.infer<typeof countrySchema>;
export const countryCatalogSchema = z.object({
  countries: z.array(countrySchema).min(1).max(300),
  source: z.literal('GeoNames'),
  updatedAt: z.string().datetime(),
  cachedSnapshot: z.boolean(),
});
export type CountryCatalog = z.infer<typeof countryCatalogSchema>;
const continents: Record<string, string> = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America',
};
export function parseCountries(text: string): CountryInfo[] {
  const countries = text
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .flatMap((line) => {
      const cells = line.split('\t');
      const number = (value: string | undefined) => (value?.trim() ? Number(value) : null);
      const result = countrySchema.safeParse({
        code: cells[0],
        name: cells[4],
        capital: cells[5],
        areaKm2: number(cells[6]),
        population: number(cells[7]),
        continent: continents[cells[8]] ?? cells[8],
        currencyCode: cells[10],
        currency: cells[11],
        callingCode: cells[12],
        languages: (cells[15] ?? '').split(',').filter(Boolean),
        neighbours: (cells[17] ?? '').split(',').filter(Boolean),
      });
      return result.success && !['AN', 'CS'].includes(result.data.code) ? [result.data] : [];
    });
  if (!countries.length) throw new Error('Country information is unavailable.');
  return countries.sort((a, b) => a.name.localeCompare(b.name));
}
export function countryName(code: string, language = 'en'): string {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
export function languageName(code: string, language = 'en'): string {
  try {
    return new Intl.DisplayNames([language], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}
