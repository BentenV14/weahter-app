import type { WeatherRow, Settings } from './types';
import { aggregate, present } from './statistics';
import { formatTime, convert } from './format';
export function summarize(
  hours: WeatherRow[],
  timezone: string,
  settings: Pick<Settings, 'temperature' | 'wind' | 'time'> = {
    temperature: 'celsius',
    wind: 'kmh',
    time: '24h',
  },
) {
  if (!hours.length)
    return { text: 'Forecast summary unavailable.', rainTime: null, peak: null, dryHours: 0 };
  const rain = hours.find(
    (h) => (h.precipitation ?? 0) >= 0.1 || (h.precipitation_probability ?? 0) >= 40,
  );
  const peak = aggregate(
    hours.map((h) => h.temperature_2m),
    'max',
  );
  const gust = aggregate(
    hours.map((h) => h.wind_gusts_10m),
    'max',
  );
  const complete = hours.every(
      (h) => h.precipitation != null || h.precipitation_probability != null,
    ),
    dryHours = hours.findIndex(
      (h) =>
        (h.precipitation == null && h.precipitation_probability == null) ||
        (h.precipitation ?? 0) >= 0.1 ||
        (h.precipitation_probability ?? 0) >= 40,
    );
  const rainText = rain
    ? `Rain possible around ${formatTime(rain.time, timezone, settings.time === '12h')}.`
    : complete
      ? `Mostly dry for the next ${hours.length} hours.`
      : 'Precipitation outlook unavailable for part of this period.';
  const tempUnit = settings.temperature === 'fahrenheit' ? '°F' : '°C',
    windUnit = { kmh: 'km/h', ms: 'm/s', mph: 'mph', kn: 'kn' }[settings.wind];
  return {
    text: `${rainText}${peak !== null ? ` Temperatures peak near ${Math.round(convert(peak, 'temperature', settings.temperature)!)} ${tempUnit}.` : ''}${gust !== null && gust >= 40 ? ` Gusts may reach ${Math.round(convert(gust, 'wind', settings.wind)!)} ${windUnit}.` : ''}`,
    rainTime: rain?.time ?? null,
    peak,
    dryHours: dryHours === -1 ? hours.length : dryHours,
  };
}
export interface Advisory {
  title: string;
  detail: string;
  level: 'notice' | 'caution';
}
export function advisories(hours: WeatherRow[]): Advisory[] {
  const notices: Advisory[] = [];
  const max = (key: string) =>
      aggregate(
        hours.map((h) => h[key]),
        'max',
      ),
    min = (key: string) =>
      aggregate(
        hours.map((h) => h[key]),
        'min',
      );
  if ((max('wind_gusts_10m') ?? 0) >= 50)
    notices.push({
      title: 'Strong gusts',
      detail: 'Exposed routes may be uncomfortable. Check the hourly wind forecast.',
      level: 'caution',
    });
  if ((min('temperature_2m') ?? 100) <= 0)
    notices.push({
      title: 'Freezing conditions',
      detail: 'Sub-zero air temperatures are forecast. Local surfaces may differ.',
      level: 'caution',
    });
  if ((max('precipitation') ?? 0) >= 5)
    notices.push({
      title: 'Heavy rainfall',
      detail: 'At least 5 mm is forecast in an hour. Watch for local ponding.',
      level: 'caution',
    });
  if ((max('uv_index') ?? 0) >= 6)
    notices.push({
      title: 'High UV',
      detail: 'A high UV index is forecast around midday.',
      level: 'caution',
    });
  if ((max('temperature_2m') ?? 0) >= 32)
    notices.push({
      title: 'Hot conditions',
      detail: 'Temperatures above 32 °C are forecast.',
      level: 'caution',
    });
  if ((min('visibility') ?? Infinity) < 1000)
    notices.push({
      title: 'Low visibility',
      detail: 'Visibility below 1 km is forecast.',
      level: 'caution',
    });
  if ((max('snowfall') ?? 0) > 0)
    notices.push({
      title: 'Snow possible',
      detail: 'The model forecasts snowfall. Accumulation depends on local conditions.',
      level: 'caution',
    });
  if (hours.some((h) => [95, 96, 99].includes(h.weather_code ?? -1)))
    notices.push({
      title: 'Thunderstorm signal',
      detail: 'Thunderstorm weather codes occur in the forecast.',
      level: 'caution',
    });
  const pressures = present(hours.slice(0, 6).map((h) => h.pressure_msl));
  if (pressures.length >= 2 && pressures[0] - pressures[pressures.length - 1] >= 6)
    notices.push({
      title: 'Falling pressure',
      detail: 'Sea-level pressure is forecast to fall at least 6 hPa over six hours.',
      level: 'notice',
    });
  if (!notices.length && hours.length)
    notices.push({
      title: 'No notable extremes',
      detail:
        'No threshold-based weather insights in the upcoming forecast. Conditions can change.',
      level: 'notice',
    });
  return notices;
}
export type Activity =
  | 'running'
  | 'cycling'
  | 'walking'
  | 'bbq'
  | 'football'
  | 'photography'
  | 'stargazing'
  | 'beach'
  | 'sailing'
  | 'skiing';
export function activityScore(activity: Activity, hour: WeatherRow) {
  const needed = ['temperature_2m', 'precipitation', 'wind_gusts_10m', 'visibility'];
  if (needed.some((k) => hour[k] == null))
    return {
      score: null,
      label: 'Insufficient data',
      factors: [] as { label: string; penalty: number }[],
    };
  const t = hour.temperature_2m!,
    rain = hour.precipitation!,
    gust = hour.wind_gusts_10m!,
    visibility = hour.visibility!;
  const comfort = activity === 'beach' ? [22, 32] : activity === 'skiing' ? [-10, 1] : [8, 24];
  const factors = [
    { label: rain < 0.1 ? 'Dry' : `${rain} mm precipitation`, penalty: Math.min(40, rain * 12) },
    {
      label: `${Math.round(t)} °C air temperature`,
      penalty: Math.min(25, Math.max(0, comfort[0] - t, t - comfort[1]) * 2),
    },
    {
      label: `${Math.round(gust)} km/h gusts`,
      penalty: Math.min(30, Math.max(0, gust - 25) * 0.6),
    },
    {
      label: visibility >= 5000 ? 'Good visibility' : 'Reduced visibility',
      penalty: visibility < 1000 ? 20 : visibility < 5000 ? 10 : 0,
    },
  ];
  if (activity === 'stargazing') {
    if (hour.cloud_cover == null || hour.is_day == null)
      return { score: null, label: 'Insufficient data', factors: [] };
    factors.push(
      { label: `${hour.cloud_cover}% cloud cover`, penalty: hour.cloud_cover * 0.5 },
      { label: hour.is_day ? 'Daytime' : 'Nighttime', penalty: hour.is_day ? 100 : 0 },
    );
  }
  const score = Math.max(0, Math.round(100 - factors.reduce((sum, f) => sum + f.penalty, 0)));
  return {
    score,
    label: score >= 80 ? 'Good' : score >= 60 ? 'Fair' : score >= 40 ? 'Challenging' : 'Poor',
    factors,
  };
}
