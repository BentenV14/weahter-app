import { aggregate } from './statistics';
import { localDate } from './format';
import type { WeatherRow } from './types';
export function monthlyAggregation(
  data: WeatherRow[],
  timezone = 'UTC',
  annual = false,
): WeatherRow[] {
  const groups = new Map<string, WeatherRow[]>();
  for (const row of data) {
    const key = localDate(row.time, timezone).slice(0, annual ? 4 : 7);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return Array.from(groups.entries()).map(([key, list]) => ({
    time: Date.parse(`${annual ? `${key}-01` : key}-01T12:00:00Z`) / 1000,
    temperature_2m_mean: aggregate(
      list.map((d) => d.temperature_2m_mean),
      'mean',
    ),
    temperature_2m_max: aggregate(
      list.map((d) => d.temperature_2m_max),
      'max',
    ),
    temperature_2m_min: aggregate(
      list.map((d) => d.temperature_2m_min),
      'min',
    ),
    precipitation_sum: aggregate(
      list.map((d) => d.precipitation_sum),
      'sum',
    ),
    days: list.length,
  }));
}
export function shiftYear(date: string, year: number) {
  const [, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1, Math.min(d, new Date(Date.UTC(year, m, 0)).getUTCDate())))
    .toISOString()
    .slice(0, 10);
}
export function periodStats(data: WeatherRow[]) {
  return {
    mean: aggregate(
      data.map((d) => d.temperature_2m_mean),
      'mean',
    ),
    max: aggregate(
      data.map((d) => d.temperature_2m_max),
      'max',
    ),
    min: aggregate(
      data.map((d) => d.temperature_2m_min),
      'min',
    ),
    rain: aggregate(
      data.map((d) => d.precipitation_sum),
      'sum',
    ),
    sunshine: aggregate(
      data.map((d) => d.sunshine_duration),
      'sum',
    ),
    wind: aggregate(
      data.map((d) => d.wind_speed_10m_max),
      'mean',
    ),
    heatDays: data.filter((d) => d.temperature_2m_max != null && d.temperature_2m_max >= 25).length,
    frostDays: data.filter((d) => d.temperature_2m_min != null && d.temperature_2m_min < 0).length,
    rainDays: data.filter((d) => d.precipitation_sum != null && d.precipitation_sum >= 0.1).length,
  };
}
