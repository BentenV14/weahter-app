import { describe, expect, it } from 'vitest';
import { weatherCode } from '@/lib/weather/codes';
import { compass, convert, formatTime, localDate, coordinateSearch } from '@/lib/weather/format';
import { summarize, activityScore, advisories } from '@/lib/weather/insights';
import { confidence, percentile, ensembleStats, aggregate } from '@/lib/weather/statistics';
import { weatherSchema, locationSchema } from '@/lib/weather/schema';

describe('weather interpretation', () => {
  it('maps all documented WMO codes and has an honest unknown fallback', () => {
    for (const code of [
      0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85,
      86, 95, 96, 99,
    ])
      expect(weatherCode(code).label).not.toBe('Unknown conditions');
    expect(weatherCode(0, false).icon).toBe('moon');
    expect(weatherCode(99).severity).toBe(3);
    expect(weatherCode(1000).label).toBe('Unknown conditions');
  });
  it('converts display values without mutating source units', () => {
    expect(convert(0, 'temperature', 'fahrenheit')).toBe(32);
    expect(convert(36, 'wind', 'ms')).toBe(10);
    expect(convert(25.4, 'precipitation', 'inch')).toBeCloseTo(1);
    expect(convert(null, 'wind', 'mph')).toBeNull();
    expect(compass(359)).toBe('N');
    expect(compass(225)).toBe('SW');
  });
  it('uses the location timezone across DST and international dates', () => {
    expect(formatTime(Date.parse('2026-10-25T00:30:00Z') / 1000, 'Europe/Brussels', false)).toBe(
      '02:30',
    );
    expect(formatTime(Date.parse('2026-10-25T01:30:00Z') / 1000, 'Europe/Brussels', false)).toBe(
      '02:30',
    );
    expect(localDate(Date.parse('2026-10-05T23:00:00Z') / 1000, 'Asia/Tokyo')).toBe('2026-10-06');
  });
  it('parses valid coordinate searches and refuses impossible ones', () => {
    expect(coordinateSearch('51.2, 3.2')).toMatchObject({ latitude: 51.2, longitude: 3.2 });
    expect(coordinateSearch('91, 3')).toBeNull();
    expect(coordinateSearch('London')).toBeNull();
  });
});

describe('derived information', () => {
  const hours = [0, 1, 2, 3].map((i) => ({
    time: 1800000000 + i * 3600,
    temperature_2m: 16 + i,
    precipitation: i === 2 ? 1.2 : 0,
    precipitation_probability: i === 2 ? 70 : 10,
    wind_speed_10m: 15,
    wind_gusts_10m: 25,
    visibility: 12000,
    weather_code: 2,
  }));
  it('derives a real rain window instead of conflating chance and amount', () => {
    expect(summarize(hours, 'UTC').rainTime).toBe(hours[2].time);
    expect(summarize(hours, 'UTC').text).toContain('19');
    expect(
      summarize(
        hours.map((h) => ({ ...h, precipitation: 0, precipitation_probability: 0 })),
        'UTC',
      ).rainTime,
    ).toBeNull();
    expect(summarize([], 'UTC').text).toContain('unavailable');
  });
  it('adds transparent activity penalties and handles missing data', () => {
    const good = activityScore('cycling', hours[0]);
    const bad = activityScore('cycling', {
      ...hours[0],
      precipitation: 8,
      wind_gusts_10m: 75,
      visibility: 100,
    });
    expect(good.score).toBeGreaterThan(bad.score!);
    expect(bad.factors.some((f) => f.penalty > 0)).toBe(true);
    expect(activityScore('cycling', { time: 1 }).score).toBeNull();
  });
  it('labels advisories and detects actual hazards', () => {
    expect(
      advisories([{ ...hours[0], wind_gusts_10m: 90, temperature_2m: -2 }]).map((a) => a.title),
    ).toEqual(expect.arrayContaining(['Strong gusts', 'Freezing conditions']));
  });
  it('calculates ensemble percentiles with null-safe probabilities', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(ensembleStats([1, null, 3, 5], 2)).toMatchObject({
      mean: 3,
      min: 1,
      max: 5,
      probability: 2 / 3,
    });
    expect(ensembleStats([null, null], 2).mean).toBeNull();
    expect(confidence([10, 10.2, 10.4], 24).label).toBe('High');
    expect(confidence([5, 15, 25], 168).label).toBe('Low');
    expect(confidence([null], 24).label).toBe('Unavailable');
  });
  it('aggregates only present values', () => {
    expect(aggregate([1, null, 3], 'mean')).toBe(2);
    expect(aggregate([null], 'sum')).toBeNull();
  });
  it('does not label missing precipitation as dry weather', () => {
    const result = summarize([{ time: 1800000000, temperature_2m: 20 }], 'UTC');
    expect(result.text).toContain('Precipitation outlook unavailable');
    expect(result.dryHours).toBe(0);
    expect(
      summarize(hours, 'UTC', { temperature: 'fahrenheit', wind: 'mph', time: '12h' }).text,
    ).toContain('66 °F');
  });
});

describe('untrusted provider input', () => {
  it('rejects invalid coordinates, nonfinite values, and mismatched series lengths', () => {
    expect(locationSchema.safeParse({ name: 'bad', latitude: 91, longitude: 0 }).success).toBe(
      false,
    );
    expect(
      weatherSchema.safeParse({
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        hourly: { time: [1, 2], temperature_2m: [1] },
      }).success,
    ).toBe(false);
    expect(
      weatherSchema.safeParse({
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        hourly: { time: [1], temperature_2m: [Infinity] },
      }).success,
    ).toBe(false);
  });
  it('preserves missing variables and valid null values', () => {
    const result = weatherSchema.parse({
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      hourly: { time: [1], temperature_2m: [null] },
    });
    expect(result.hourly?.temperature_2m).toEqual([null]);
  });
});
