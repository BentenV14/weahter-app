'use client';
import { useQuery } from '@tanstack/react-query';
import { getWeather } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { locationKey } from '@/lib/weather/format';
import { weatherSchema } from '@/lib/weather/schema';
import type { ApiKind, Location, RequestOptions, WeatherResponse } from '@/lib/weather/types';
const freshness: Record<ApiKind, number> = {
  forecast: 600000,
  airQuality: 1800000,
  marine: 1800000,
  flood: 21600000,
  ensemble: 3600000,
  historical: 86400000,
  historicalForecast: 86400000,
  previousRuns: 3600000,
  singleRuns: 86400000,
  climate: 604800000,
  seasonal: 21600000,
  radiation: 1800000,
};
export function useWeather(
  kind: ApiKind,
  options: RequestOptions = {},
  enabled = true,
  override?: Location,
) {
  const selected = useAppStore((s) => s.location),
    location = override ?? selected;
  return useQuery({
    queryKey: ['weather', kind, locationKey(location), options],
    enabled,
    staleTime: freshness[kind],
    retry: 1,
    queryFn: ({ signal }) => getWeather(kind, location, options, signal),
  });
}
function readForecast(key: string): WeatherResponse | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? weatherSchema.parse(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
export function useForecast(override?: Location) {
  const selected = useAppStore((s) => s.location),
    location = override ?? selected,
    key = `atmos-forecast:${locationKey(location)}`;
  return useQuery({
    queryKey: ['forecast', locationKey(location)],
    staleTime: 600000,
    refetchInterval: 600000,
    refetchOnWindowFocus: true,
    retry: 1,
    refetchOnReconnect: true,
    networkMode: 'always',
    queryFn: async ({ signal }) => {
      if (!navigator.onLine) {
        const cached = readForecast(key);
        if (cached) return { weather: cached, offline: true };
        throw new Error(
          'You’re offline and no forecast has been downloaded for this place. Reconnect or switch to a saved place.',
        );
      }
      try {
        const result = await getWeather('forecast', location, {}, signal);
        const data = Array.isArray(result) ? result[0] : result;
        try {
          localStorage.setItem(key, JSON.stringify(data));
          const keys = Object.keys(localStorage).filter((k) => k.startsWith('atmos-forecast:'));
          if (keys.length > 12)
            for (const old of keys.slice(0, keys.length - 12))
              if (old !== key) localStorage.removeItem(old);
        } catch {
          /* Weather remains available if storage is full. */
        }
        return { weather: data, offline: false };
      } catch (error) {
        if (signal.aborted) throw error;
        const cached = readForecast(key);
        if (cached) return { weather: cached, offline: true };
        throw error;
      }
    },
  });
}
