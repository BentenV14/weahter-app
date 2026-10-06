import { z } from 'zod';
import type { ApiKind, Location, RequestOptions } from '../../types';
import { models, ensembleModels, climateModels } from '../../models';
import { forecast } from './forecast';
import { airQuality } from './airQuality';
import { marine } from './marine';
import { ensemble } from './ensemble';
import { historical, historicalForecast, previousRuns, singleRuns } from './historical';
import { climate } from './climate';
import { flood } from './flood';
import { seasonal } from './seasonal';
import { radiation } from './radiation';
export interface ProviderConfig {
  endpoint: string;
  ttl: number;
  current?: string[];
  hourly?: string[];
  daily?: string[];
  weekly?: string[];
  monthly?: string[];
}
export const providers: Record<ApiKind, ProviderConfig> = {
  forecast,
  airQuality,
  marine,
  ensemble,
  historical,
  historicalForecast,
  previousRuns,
  singleRuns,
  climate,
  flood,
  seasonal,
  radiation,
};
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (d) => Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d,
    'Invalid date',
  );
export const requestSchema = z.object({
  kind: z.enum([
    'forecast',
    'airQuality',
    'marine',
    'flood',
    'ensemble',
    'historical',
    'historicalForecast',
    'previousRuns',
    'singleRuns',
    'climate',
    'seasonal',
    'radiation',
  ]),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  model: z.string().max(150).optional(),
  start: isoDate.optional(),
  end: isoDate.optional(),
  run: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T(00|06|12|18):00$/)
    .optional(),
  tilt: z.coerce.number().min(0).max(90).optional(),
  azimuth: z.coerce.number().min(-180).max(180).optional(),
});
export function buildRequest(kind: ApiKind, location: Location, options: RequestOptions = {}) {
  const config = providers[kind],
    p = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      timeformat: 'unixtime',
    });
  if (kind !== 'climate') p.set('timezone', 'auto');
  if (config.current) p.set('current', config.current.join(','));
  if (config.hourly) p.set('hourly', config.hourly.join(','));
  if (config.daily) p.set('daily', config.daily.join(','));
  if (config.weekly) p.set('weekly', config.weekly.join(','));
  if (config.monthly) p.set('monthly', config.monthly.join(','));
  if (kind === 'forecast') {
    p.set('forecast_days', '16');
    p.set('minutely_15', 'precipitation');
    p.set('forecast_minutely_15', '24');
    p.set('tilt', String(options.tilt ?? 35));
    p.set('azimuth', String(options.azimuth ?? 0));
  }
  if (kind === 'airQuality' || kind === 'marine') p.set('forecast_days', '7');
  if (kind === 'flood') {
    p.set('forecast_days', '30');
    p.set('past_days', '30');
  }
  if (kind === 'ensemble') {
    p.set('forecast_days', '16');
    p.set('models', options.model ?? 'ecmwf_ifs025');
  }
  if (kind === 'seasonal') p.set('forecast_days', '90');
  if (kind === 'radiation') {
    p.set('past_days', '1');
    p.set('tilt', String(options.tilt ?? 35));
    p.set('azimuth', String(options.azimuth ?? 0));
  }
  if (kind === 'climate') {
    p.set('models', options.model ?? 'MRI_AGCM3_2_S');
    if (!options.start || !options.end) throw new Error('Select a climate date range.');
    if (options.start < '1950-01-01' || options.end > '2050-01-01')
      throw new Error('Climate dates must be between 1950 and 2050.');
  }
  if (['historical', 'historicalForecast'].includes(kind) && (!options.start || !options.end))
    throw new Error('Select a start and end date.');
  if (options.start && options.end) {
    if (options.start > options.end) throw new Error('End date must follow start date.');
    const years = (Date.parse(options.end) - Date.parse(options.start)) / 86400000 / 365.25;
    if (years > 31) throw new Error('Select a range of 31 years or less.');
    p.set('start_date', options.start);
    p.set('end_date', options.end);
    p.delete('forecast_days');
  }
  if (kind === 'historical' && options.start && options.start < '1940-01-01')
    throw new Error('Historical data begins in 1940.');
  if (options.model && options.model !== 'best_match') {
    const allowed =
      kind === 'climate'
        ? climateModels
        : kind === 'ensemble'
          ? ensembleModels.map((m) => m.id)
          : models.map((m) => m.id);
    if (!options.model.split(',').every((m) => allowed.includes(m)))
      throw new Error('Unsupported model.');
    p.set('models', options.model);
    if (kind === 'forecast') {
      const chosen = models.find((m) => m.id === options.model);
      if (chosen) p.set('forecast_days', String(chosen.horizon));
    }
  }
  if (kind === 'singleRuns') {
    if (!options.run) throw new Error('Select a model initialization time.');
    p.set('run', options.run);
  }
  if (kind === 'previousRuns') p.set('forecast_days', '7');
  return { url: `${config.endpoint}?${p}`, ttl: config.ttl };
}
