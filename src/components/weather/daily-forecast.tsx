'use client';
import { useNow } from '@/hooks/use-now';
import { useAppStore } from '@/lib/store';
import { relativeDayLabel, display } from '@/lib/weather/format';
import type { WeatherRow } from '@/lib/weather/types';
import { WeatherIcon } from './weather-icon';
import { Droplets } from 'lucide-react';
export function DailyForecast({
  days,
  timezone,
  onSelect,
}: {
  days: WeatherRow[];
  timezone: string;
  onSelect?: (day: WeatherRow) => void;
}) {
  const now = useNow();
  const settings = useAppStore((s) => s.settings),
    min = Math.min(...days.map((d) => d.temperature_2m_min ?? 0)),
    max = Math.max(...days.map((d) => d.temperature_2m_max ?? 1)),
    range = Math.max(1, max - min);
  return (
    <div className="daily-list">
      {days.map((day) => (
        <button className="daily-row" key={day.time} onClick={() => onSelect?.(day)}>
          <span className="daily-day">{relativeDayLabel(day.time, timezone, now)}</span>
          <WeatherIcon code={day.weather_code} size={24} />
          <span className="daily-rain">
            <Droplets size={11} />
            {day.precipitation_probability_max ?? '—'}%
          </span>
          <span className="daily-low">
            {display(day.temperature_2m_min, 'temperature', settings, 0, false)}°
          </span>
          <span className="temperature-track">
            <i
              style={{
                left: `${(((day.temperature_2m_min ?? min) - min) / range) * 100}%`,
                width: `${Math.max(3, (((day.temperature_2m_max ?? max) - (day.temperature_2m_min ?? min)) / range) * 100)}%`,
              }}
            />
          </span>
          <strong>{display(day.temperature_2m_max, 'temperature', settings, 0, false)}°</strong>
        </button>
      ))}
    </div>
  );
}
