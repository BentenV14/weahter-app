import { countryCatalogSchema } from './countries';
import { apiFetch } from '../api';
export async function getCountries(signal?: AbortSignal) {
  try {
    return countryCatalogSchema.parse(await apiFetch('/api/countries', signal));
  } catch (error) {
    if (signal?.aborted) throw error;
    const { default: snapshot } = await import('./data/countries.json');
    return countryCatalogSchema.parse(snapshot);
  }
}
