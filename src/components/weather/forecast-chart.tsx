'use client';
import { useId } from 'react';
import { useNow } from '@/hooks/use-now';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { useAppStore } from '@/lib/store';
import {
  convert,
  formatTime,
  dateLabel,
  chartDateLabel,
  unitFor,
  type Quantity,
} from '@/lib/weather/format';
import { aggregate } from '@/lib/weather/statistics';
import type { WeatherRow } from '@/lib/weather/types';
export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
  type?: 'area' | 'line' | 'bar';
  quantity?: Quantity;
  unit?: string;
  dash?: string;
}
export function ForecastChart({
  data,
  series,
  timezone = 'UTC',
  height = 230,
  daily = false,
  dateMode,
  syncId = 'forecast',
  showNow = false,
  showNight = false,
}: {
  data: WeatherRow[];
  series: ChartSeries[];
  timezone?: string;
  height?: number;
  daily?: boolean;
  dateMode?: 'daily' | 'annual' | 'monthly';
  syncId?: string;
  showNow?: boolean;
  showNight?: boolean;
}) {
  const now = useNow(),
    chartId = useId().replaceAll(':', '');
  const settings = useAppStore((s) => s.settings),
    stride = Math.max(1, Math.ceil(data.length / 400));
  const plotted = data
    .filter((_, i) => i % stride === 0)
    .map((row) => ({
      ...row,
      ...Object.fromEntries(
        series.map((s) => [
          s.key,
          convert(
            row[s.key],
            s.quantity ?? 'raw',
            s.quantity && s.quantity !== 'raw' ? settings[s.quantity] : '',
          ),
        ]),
      ),
    }));
  const night: { from: number; to: number }[] = [];
  if (showNight) {
    let start: number | null = null;
    for (let i = 0; i < data.length; i++) {
      if (data[i].is_day === 0 && start === null) start = data[i].time;
      if (start !== null && (data[i].is_day === 1 || i === data.length - 1)) {
        night.push({ from: start, to: data[i].time });
        start = null;
      }
    }
  }
  const primary = series[0],
    min = aggregate(
      plotted.map((r) => r[primary?.key]),
      'min',
    ),
    max = aggregate(
      plotted.map((r) => r[primary?.key]),
      'max',
    );
  return (
    <div className="forecast-chart">
      <div className="chart-legend">
        {series.length <= 8 ? (
          series.map((s) => (
            <span key={s.key}>
              <i style={{ background: s.color ?? '#efba7a' }} />
              {s.label}
              {s.unit ? ` (${s.unit})` : s.quantity ? ` (${unitFor(s.quantity, settings)})` : ''}
            </span>
          ))
        ) : (
          <span>{series.length - 1} individual members and ensemble mean</span>
        )}
      </div>
      <p className="sr-only">
        {primary?.label}: minimum {min ?? 'unavailable'}, maximum {max ?? 'unavailable'}.{' '}
        {data.length} time steps. Forecast times use {timezone}.
      </p>
      <div style={{ height, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={plotted}
            syncId={syncId}
            syncMethod="value"
            margin={{ top: 12, right: 12, left: -18, bottom: 4 }}
            accessibilityLayer
          >
            <defs>
              {series.map((s, i) => (
                <linearGradient
                  key={s.key}
                  id={`fill-${chartId}-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={s.color ?? '#efba7a'}
                    stopOpacity={i === 0 ? 0.18 : 0.08}
                  />
                  <stop offset="100%" stopColor={s.color ?? '#efba7a'} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" />
            <XAxis
              dataKey="time"
              ticks={plotted
                .filter((_, i) => i % Math.max(1, Math.ceil(plotted.length / 6)) === 0)
                .map((r) => r.time)}
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(t) =>
                daily
                  ? chartDateLabel(t, timezone, dateMode ?? 'daily')
                  : formatTime(t, timezone, settings.time === '12h')
              }
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={45}
            />
            <YAxis
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                color: 'var(--text)',
                fontSize: 12,
              }}
              labelFormatter={(t) =>
                `${daily ? chartDateLabel(Number(t), timezone, dateMode ?? 'daily') : dateLabel(Number(t), timezone)} ${daily ? '' : formatTime(Number(t), timezone, settings.time === '12h')}`
              }
              formatter={(value, name) => [
                typeof value === 'number' ? value.toFixed(1) : '—',
                name,
              ]}
            />
            {night.map((n) => (
              <ReferenceArea
                key={n.from}
                x1={n.from}
                x2={n.to}
                fill="var(--muted)"
                fillOpacity={0.06}
              />
            ))}
            {showNow && (
              <ReferenceLine
                x={now}
                stroke="var(--muted)"
                strokeDasharray="3 3"
                label={{ value: 'Now', fill: 'var(--muted)', fontSize: 10 }}
              />
            )}
            {series.map((s) =>
              s.type === 'bar' ? (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color ?? '#79b8ed'}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              ) : s.type === 'area' ? (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color ?? '#efba7a'}
                  fill={`url(#fill-${chartId}-${s.key})`}
                  strokeWidth={2.5}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ) : (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color ?? '#79b8ed'}
                  strokeWidth={series.length > 10 && s.key !== 'mean' ? 1 : 2}
                  strokeOpacity={series.length > 10 && s.key !== 'mean' ? 0.35 : 1}
                  dot={false}
                  strokeDasharray={s.dash}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
