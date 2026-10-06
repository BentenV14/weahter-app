'use client';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { localDate, dateLabel } from '@/lib/weather/format';
import { summarize } from '@/lib/weather/insights';
import type { WeatherRow } from '@/lib/weather/types';
import { SectionHeader } from '../ui/states';
export function ForecastBrief({
  hours,
  days,
  timezone,
}: {
  hours: WeatherRow[];
  days: WeatherRow[];
  timezone: string;
}) {
  const [period, setPeriod] = useState('today'),
    settings = useAppStore((s) => s.settings);
  const weekend = days.findIndex(
    (d) => dateLabel(d.time, timezone, { weekday: 'long' }) === 'Saturday',
  );
  const dates =
    period === 'today'
      ? [days[0]]
      : period === 'tomorrow'
        ? [days[1]]
        : weekend < 0
          ? []
          : days.slice(weekend, weekend + 2);
  const selected =
    period === 'six'
      ? hours.slice(0, 6)
      : hours.filter((h) =>
          dates.some((d) => d && localDate(h.time, timezone) === localDate(d.time, timezone)),
        );
  return (
    <section className="panel forecast-brief">
      <SectionHeader
        title="Your forecast, in plain language"
        subtitle="Derived from the forecast values"
      >
        <div className="segmented">
          {[
            ['today', 'Today'],
            ['tomorrow', 'Tomorrow'],
            ['weekend', 'Weekend'],
            ['six', 'Next 6 h'],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={period === key}
              className={period === key ? 'active' : ''}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </SectionHeader>
      <p>{summarize(selected, timezone, settings).text}</p>
    </section>
  );
}
