import { z } from 'zod';
import type { WeatherSeries } from './types';
const number = z.number().finite();
const renderableTime = (t: number | null) =>
  t !== null && Number.isFinite(new Date(t * 1000).getTime());
export const locationSchema = z.object({
  name: z.string().min(1).max(150),
  latitude: number.min(-90).max(90),
  longitude: number.min(-180).max(180),
  country: z.string().optional(),
  country_code: z.string().optional(),
  admin1: z.string().optional(),
  timezone: z.string().optional(),
  elevation: number.optional(),
  id: number.optional(),
});
export const seriesSchema = z
  .record(z.string(), z.array(number.nullable()))
  .superRefine((series, ctx) => {
    if (!series.time) {
      ctx.addIssue({ code: 'custom', message: 'Missing time axis' });
      return;
    }
    if (series.time.some((t, i) => !renderableTime(t) || (i > 0 && t! <= series.time[i - 1]!)))
      ctx.addIssue({ code: 'custom', message: 'Invalid timestamp' });
    for (const [key, values] of Object.entries(series))
      if (values.length !== series.time.length)
        ctx.addIssue({ code: 'custom', message: `Length mismatch: ${key}` });
  })
  .transform((series) => ({ ...series, time: series.time as number[] }) as WeatherSeries);
export const weatherSchema = z.object({
  latitude: number.min(-90).max(90),
  longitude: number.min(-180).max(180),
  timezone: z
    .string()
    .default('UTC')
    .refine((t) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: t });
        return true;
      } catch {
        return false;
      }
    }, 'Invalid timezone'),
  utc_offset_seconds: number.optional(),
  elevation: number.optional(),
  generationtime_ms: number.optional(),
  current: z
    .record(z.string(), number.nullable())
    .refine((c) => c.time === undefined || renderableTime(c.time), 'Invalid current timestamp')
    .optional(),
  hourly: seriesSchema.optional(),
  daily: seriesSchema.optional(),
  minutely_15: seriesSchema.optional(),
  weekly: seriesSchema.optional(),
  monthly: seriesSchema.optional(),
  hourly_units: z.record(z.string(), z.string()).optional(),
  daily_units: z.record(z.string(), z.string()).optional(),
  fetchedAt: number.optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
});
export const geocodingSchema = z.object({ results: z.array(locationSchema).optional() });
