export type Nullable = number | null;
export type WeatherRow = { time: number } & Record<string, Nullable>;
export interface WeatherSeries {
  time: number[];
  [variable: string]: Nullable[];
}
export interface WeatherResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds?: number;
  elevation?: number;
  generationtime_ms?: number;
  current?: Record<string, Nullable>;
  hourly?: WeatherSeries;
  daily?: WeatherSeries;
  minutely_15?: WeatherSeries;
  weekly?: WeatherSeries;
  monthly?: WeatherSeries;
  hourly_units?: Record<string, string>;
  daily_units?: Record<string, string>;
  fetchedAt?: number;
  provider?: string;
  model?: string;
}
export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  elevation?: number;
  id?: number;
}
export interface Settings {
  temperature: 'celsius' | 'fahrenheit';
  wind: 'kmh' | 'ms' | 'mph' | 'kn';
  pressure: 'hPa' | 'mmHg' | 'inHg';
  precipitation: 'mm' | 'inch';
  distance: 'km' | 'mi';
  time: '24h' | '12h';
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'nl';
  alerts: boolean;
  gustThreshold: number;
  heatThreshold: number;
}
export type ApiKind =
  | 'forecast'
  | 'airQuality'
  | 'marine'
  | 'flood'
  | 'ensemble'
  | 'historical'
  | 'historicalForecast'
  | 'previousRuns'
  | 'singleRuns'
  | 'climate'
  | 'seasonal'
  | 'radiation';
export interface RequestOptions {
  model?: string;
  start?: string;
  end?: string;
  run?: string;
  tilt?: number;
  azimuth?: number;
}
export function rows(series?: WeatherSeries): WeatherRow[] {
  if (!series) return [];
  const keys = Object.keys(series).filter((k) => k !== 'time');
  return series.time.map((time, i) =>
    Object.assign({ time }, Object.fromEntries(keys.map((k) => [k, series[k][i] ?? null]))),
  );
}
export function value(row: Record<string, Nullable> | undefined, key: string): Nullable {
  return row?.[key] ?? null;
}
