import { weatherSchema } from '../../schema';
import type { WeatherResponse } from '../../types';
export async function fetchProvider(url: string): Promise<WeatherResponse | WeatherResponse[]> {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000), cache: 'no-store' });
  const body: unknown = await response.json();
  if (!response.ok) {
    const reason =
      typeof body === 'object' && body && 'reason' in body
        ? String(body.reason)
        : response.status === 429
          ? 'Provider rate limit reached. Try again shortly.'
          : 'Provider is currently unavailable.';
    throw new Error(reason.slice(0, 300));
  }
  const parsed = Array.isArray(body)
    ? body.map((item) => weatherSchema.parse(item))
    : weatherSchema.parse(body);
  return parsed;
}
