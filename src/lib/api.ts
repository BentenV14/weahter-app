import type { ApiKind, Location, RequestOptions, WeatherResponse } from './weather/types';
import { weatherSchema, geocodingSchema } from './weather/schema';
export interface DebugRequest {
  url: string;
  duration: number;
  cache: string;
  timestamp: number;
  status: number;
}
let requests: DebugRequest[] = [];
export function debugRequests() {
  return [...requests];
}
export async function apiFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const start = performance.now(),
    timeout = AbortSignal.timeout(35000);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  requests = [
    {
      url,
      duration: performance.now() - start,
      cache: response.headers.get('X-Cache') ?? '—',
      timestamp: Date.now(),
      status: response.status,
    },
    ...requests,
  ].slice(0, 20);
  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'error' in body
        ? String(body.error)
        : 'Request failed. Please retry.';
    throw new Error(message);
  }
  return body as T;
}
export function weatherUrl(kind: ApiKind, location: Location, options: RequestOptions = {}) {
  const params = new URLSearchParams({
    kind,
    lat: String(location.latitude),
    lon: String(location.longitude),
  });
  for (const [key, v] of Object.entries(options))
    if (v !== undefined && v !== '') params.set(key, String(v));
  return `/api/weather?${params}`;
}
export async function getWeather(
  kind: ApiKind,
  location: Location,
  options: RequestOptions = {},
  signal?: AbortSignal,
): Promise<WeatherResponse | WeatherResponse[]> {
  const body = await apiFetch<unknown>(weatherUrl(kind, location, options), signal);
  return Array.isArray(body) ? body.map((d) => weatherSchema.parse(d)) : weatherSchema.parse(body);
}
export async function getLocations(
  search: string,
  language: string,
  signal?: AbortSignal,
  country?: string,
) {
  const body = await apiFetch<unknown>(
    `/api/search?q=${encodeURIComponent(search)}&lang=${language}${country ? `&country=${encodeURIComponent(country)}` : ''}`,
    signal,
  );
  return geocodingSchema.parse({ results: body }).results ?? [];
}
