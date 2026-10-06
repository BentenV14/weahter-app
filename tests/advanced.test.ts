import { describe, it, expect } from 'vitest';
import { astronomy } from '@/lib/weather/astronomy';
import { shiftYear, monthlyAggregation, periodStats } from '@/lib/weather/aggregation';
import { evaluateAlerts } from '@/lib/weather/alerts';
import { defaultSettings } from '@/lib/store';
describe('long-range and astronomy calculations', () => {
  it('shifts leap-day ranges safely and aggregates valid calendar months', () => {
    expect(shiftYear('2024-02-29', 2025)).toBe('2025-02-28');
    const data = [
      {
        time: Date.parse('2025-01-01T00:00Z') / 1000,
        temperature_2m_mean: 10,
        temperature_2m_max: 25,
        temperature_2m_min: -1,
        precipitation_sum: 2,
      },
      {
        time: Date.parse('2025-01-02T00:00Z') / 1000,
        temperature_2m_mean: 20,
        temperature_2m_max: 27,
        temperature_2m_min: 2,
        precipitation_sum: null,
      },
    ];
    expect(monthlyAggregation(data)[0]).toMatchObject({
      temperature_2m_mean: 15,
      precipitation_sum: 2,
      days: 2,
    });
    expect(periodStats(data)).toMatchObject({ heatDays: 2, frostDays: 1, rainDays: 1 });
  });
  it('handles polar events without crashing and uses SunCalc degree units', () => {
    const d = astronomy(
      { name: 'Pole', latitude: 80, longitude: 0 },
      'UTC',
      Date.parse('2026-06-21T12:00Z') / 1000,
    );
    expect(d.sun.alwaysUp).toBe(true);
    expect(d.path.every((p) => p.altitude != null && Math.abs(p.altitude) <= 90)).toBe(true);
  });
  it('derives alerts from selected thresholds with no default permission request', () => {
    const alerts = evaluateAlerts(
      [{ time: 1, temperature_2m: 35, wind_gusts_10m: 70, precipitation: 0 }],
      defaultSettings,
    );
    expect(alerts.map((a) => a.id)).toEqual(['gust', 'heat']);
    expect(evaluateAlerts([{ time: 1 }], defaultSettings)).toEqual([]);
  });
});
