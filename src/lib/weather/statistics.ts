import type { Nullable } from './types';
import { rows, type WeatherResponse } from './types';
export function matchingClimateAnomaly(
  datasets: { id: string; data: WeatherResponse }[],
  baseline: WeatherResponse | undefined,
  model: string,
): Nullable {
  const projected = datasets.find((d) => d.id === model)?.data;
  if (!projected || !baseline) return null;
  const mean = aggregate(
      rows(projected.daily).map((r) => r.temperature_2m_mean),
      'mean',
    ),
    base = aggregate(
      rows(baseline.daily).map((r) => r.temperature_2m_mean),
      'mean',
    );
  return mean == null || base == null ? null : mean - base;
}
export function present(values: (Nullable | undefined)[]): number[] {
  return values.filter((v): v is number => v != null && Number.isFinite(v));
}
export function aggregate(
  values: (Nullable | undefined)[],
  method: 'mean' | 'sum' | 'min' | 'max',
): Nullable {
  const v = present(values);
  if (!v.length) return null;
  if (method === 'min') return Math.min(...v);
  if (method === 'max') return Math.max(...v);
  const sum = v.reduce((a, b) => a + b, 0);
  return method === 'mean' ? sum / v.length : sum;
}
export function percentile(values: number[], fraction: number): Nullable {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b),
    index = Math.max(0, Math.min(1, fraction)) * (sorted.length - 1),
    low = Math.floor(index);
  return sorted[low] + (sorted[Math.ceil(index)] - sorted[low]) * (index - low);
}
export function ensembleStats(values: Nullable[], threshold = 25) {
  const v = present(values);
  return {
    mean: aggregate(v, 'mean'),
    min: aggregate(v, 'min'),
    max: aggregate(v, 'max'),
    p10: percentile(v, 0.1),
    p90: percentile(v, 0.9),
    median: percentile(v, 0.5),
    probability: v.length ? v.filter((n) => n > threshold).length / v.length : null,
    count: v.length,
  };
}
export function confidence(values: Nullable[], leadHours: number) {
  const v = present(values);
  if (v.length < 2)
    return {
      label: 'Unavailable',
      spread: null,
      explanation: 'At least two predictions are needed to estimate agreement.',
    };
  const spread = Math.max(...v) - Math.min(...v),
    adjusted = spread + Math.max(0, leadHours - 48) / 48;
  const label = adjusted < 2 ? 'High' : adjusted < 5 ? 'Moderate' : 'Low';
  return {
    label,
    spread,
    explanation: `${spread.toFixed(1)} °C temperature spread across ${v.length} predictions, ${Math.round(leadHours)} hours ahead. App-derived agreement; not a calibrated probability.`,
  };
}
