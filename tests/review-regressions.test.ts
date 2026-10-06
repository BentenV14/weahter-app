import { it, expect } from 'vitest';
import { relativeDayLabel, isCurrentHour, chartDateLabel } from '@/lib/weather/format';
import { weatherSchema } from '@/lib/weather/schema';
import { matchingClimateAnomaly } from '@/lib/weather/statistics';
it('labels civil dates across DST and does not mark future midnight as now', () => {
  const now = Date.parse('2026-03-28T22:30Z') / 1000;
  expect(relativeDayLabel(Date.parse('2026-03-28T23:00Z') / 1000, 'Europe/Brussels', now)).toBe(
    'Tomorrow',
  );
  expect(relativeDayLabel(Date.parse('2026-03-30T22:00Z') / 1000, 'Europe/Brussels', now)).not.toBe(
    'Today',
  );
  expect(isCurrentHour(now + 86400, now)).toBe(false);
  expect(isCurrentHour(now - 1800, now)).toBe(true);
});
it('rejects unrenderable, duplicate and unordered timestamps including current time', () => {
  const common = { latitude: 0, longitude: 0, timezone: 'UTC' };
  for (const time of [[1e100], [1, 1], [2, 1]])
    expect(
      weatherSchema.safeParse({ ...common, hourly: { time, temperature_2m: time.map(() => 20) } })
        .success,
    ).toBe(false);
  expect(
    weatherSchema.safeParse({ ...common, current: { time: 1e100, temperature_2m: 20 } }).success,
  ).toBe(false);
});
it('never mixes model identifiers in a climate baseline anomaly', () => {
  const a = {
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      daily: { time: [1], temperature_2m_mean: [20] },
    },
    b = { ...a, daily: { time: [1], temperature_2m_mean: [10] } };
  expect(matchingClimateAnomaly([{ id: 'second', data: a }], b, 'first')).toBeNull();
  expect(matchingClimateAnomaly([{ id: 'first', data: a }], b, 'first')).toBe(10);
});
it('includes the projection year in climate chart labels', () => {
  expect(chartDateLabel(Date.parse('2041-01-01T00:00Z') / 1000, 'UTC', 'annual')).toBe('2041');
  expect(chartDateLabel(Date.parse('2041-02-01T00:00Z') / 1000, 'UTC', 'monthly')).toContain(
    '2041',
  );
});
