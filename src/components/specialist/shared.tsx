'use client';
import { Info } from 'lucide-react';
import { useWeather } from '@/hooks/use-weather';
import type { ApiKind, RequestOptions, WeatherRow } from '@/lib/weather/types';
import { ForecastChart, type ChartSeries } from '../weather/forecast-chart';
import { SectionHeader, ErrorState, LoadingState } from '../ui/states';
export function useDataset(kind: ApiKind, options: RequestOptions = {}, enabled = true) {
  const q = useWeather(kind, options, enabled);
  return { ...q, dataset: Array.isArray(q.data) ? q.data[0] : q.data };
}
export function DataStatus({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => void;
}) {
  return pending ? (
    <LoadingState />
  ) : error ? (
    <ErrorState message={error.message} onRetry={retry} />
  ) : null;
}
export function MethodNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="method-note">
      <Info size={17} />
      <div>{children}</div>
    </div>
  );
}
export function Stat({
  label,
  value,
  unit,
  detail,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="stat-panel panel">
      <span className="stat-label">{label}</span>
      <h2>
        {value}
        <small>{unit}</small>
      </h2>
      <p>{detail}</p>
      {children}
    </section>
  );
}
export function ChartPanel({
  title,
  data,
  series,
  timezone = 'UTC',
  daily = false,
  dateMode,
  syncId = 'specialist',
  children,
}: {
  title: string;
  data: WeatherRow[];
  series: ChartSeries[];
  timezone?: string;
  daily?: boolean;
  dateMode?: 'daily' | 'annual' | 'monthly';
  syncId?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="panel chart-panel">
      <SectionHeader title={title}>{children}</SectionHeader>
      {data.length && series.length ? (
        <ForecastChart
          data={data}
          series={series}
          timezone={timezone}
          daily={daily}
          dateMode={dateMode}
          syncId={syncId}
        />
      ) : (
        <div className="chart-empty">This dataset has no available values for this view.</div>
      )}
    </section>
  );
}
export function val(n: number | null | undefined, digits = 1) {
  return n == null ? '—' : n.toFixed(digits);
}
