import type { Location, Nullable, Settings } from './types';
export type Quantity = 'temperature' | 'wind' | 'pressure' | 'precipitation' | 'distance' | 'raw';
export function convert(value: Nullable | undefined, kind: Quantity, unit: string): Nullable {
  if (value == null || !Number.isFinite(value)) return null;
  if (kind === 'temperature' && unit === 'fahrenheit') return (value * 9) / 5 + 32;
  if (kind === 'wind') return value * ({ ms: 1 / 3.6, mph: 0.621371, kn: 0.539957 }[unit] ?? 1);
  if (kind === 'pressure') return value * ({ mmHg: 0.750062, inHg: 0.02953 }[unit] ?? 1);
  if (kind === 'precipitation' && unit === 'inch') return value / 25.4;
  if (kind === 'distance' && unit === 'mi') return value * 0.621371;
  return value;
}
export function unitFor(kind: Quantity, settings: Settings): string {
  return kind === 'temperature'
    ? settings.temperature === 'celsius'
      ? '°C'
      : '°F'
    : kind === 'wind'
      ? { kmh: 'km/h', ms: 'm/s', mph: 'mph', kn: 'kn' }[settings.wind]
      : kind === 'pressure'
        ? settings.pressure
        : kind === 'precipitation'
          ? settings.precipitation === 'mm'
            ? 'mm'
            : 'in'
          : kind === 'distance'
            ? settings.distance
            : '';
}
export function display(
  value: Nullable | undefined,
  kind: Quantity,
  settings: Settings,
  digits = 0,
  unit = true,
): string {
  const converted = convert(value, kind, kind === 'raw' ? '' : settings[kind]);
  if (converted === null) return '—';
  return `${converted.toLocaleString(settings.language === 'nl' ? 'nl-BE' : 'en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits })}${unit ? ` ${unitFor(kind, settings)}` : ''}`.trim();
}
export function compass(degrees: Nullable | undefined): string {
  if (degrees == null) return '—';
  return [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ][Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
}
export function formatTime(epoch: number, timezone: string, twelve = false): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: twelve,
  }).format(new Date(epoch * 1000));
}
export function localDate(epoch: number, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epoch * 1000));
}
export function relativeDayLabel(epoch: number, timezone: string, now: number): string {
  const today = localDate(now, timezone),
    date = localDate(epoch, timezone),
    tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  return date === today
    ? 'Today'
    : date === tomorrow
      ? 'Tomorrow'
      : dateLabel(epoch, timezone, { weekday: 'short', day: 'numeric', month: 'short' });
}
export function isCurrentHour(epoch: number, now: number): boolean {
  return epoch <= now && epoch > now - 3600;
}
export function chartDateLabel(
  epoch: number,
  timezone: string,
  mode: 'daily' | 'annual' | 'monthly',
): string {
  return dateLabel(
    epoch,
    timezone,
    mode === 'annual'
      ? { year: 'numeric' }
      : mode === 'monthly'
        ? { year: 'numeric', month: 'short' }
        : { month: 'short', day: 'numeric' },
  );
}
export function dateLabel(
  epoch: number,
  timezone: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' },
): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, ...options }).format(
    new Date(epoch * 1000),
  );
}
export function coordinateSearch(input: string): Location | null {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]),
    longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { name: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`, latitude, longitude };
}
export function flag(code?: string): string {
  return code && /^[A-Z]{2}$/i.test(code)
    ? String.fromCodePoint(
        ...code
          .toUpperCase()
          .split('')
          .map((c) => 127397 + c.charCodeAt(0)),
      )
    : '';
}
export function locationKey(location: Location): string {
  return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
}
