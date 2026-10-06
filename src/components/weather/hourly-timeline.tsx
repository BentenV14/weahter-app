'use client';
import { useNow } from '@/hooks/use-now';
import { useAppStore } from '@/lib/store';
import { formatTime, display, isCurrentHour } from '@/lib/weather/format';
import type { WeatherRow } from '@/lib/weather/types';
import { WeatherIcon } from './weather-icon';
import { Droplets } from 'lucide-react';
export function HourlyTimeline({
  hours,
  timezone,
  onSelect,
  selected,
}: {
  hours: WeatherRow[];
  timezone: string;
  onSelect?: (hour: WeatherRow) => void;
  selected?: number;
}) {
  const now = useNow();
  const settings = useAppStore((s) => s.settings);
  return (
    <div className="hourly-timeline">
      {hours.map((h) => (
        <button
          className={`hour-column ${selected === h.time ? 'selected' : ''}`}
          key={h.time}
          onClick={() => onSelect?.(h)}
          aria-label={`${formatTime(h.time, timezone)}: ${display(h.temperature_2m, 'temperature', settings)}, rain chance ${h.precipitation_probability ?? 'unavailable'} percent`}
        >
          <span className="hour-time">
            {isCurrentHour(h.time, now)
              ? 'Now'
              : formatTime(h.time, timezone, settings.time === '12h')}
          </span>
          <WeatherIcon code={h.weather_code} day={h.is_day !== 0} size={29} />
          <strong>{display(h.temperature_2m, 'temperature', settings, 0, false)}°</strong>
          <span
            className={`rain-chance ${(h.precipitation_probability ?? 0) >= 40 ? 'likely' : ''}`}
          >
            <Droplets size={11} />
            {h.precipitation_probability ?? '—'}%
          </span>
          {h.precipitation !== null && h.precipitation > 0 && (
            <small>{display(h.precipitation, 'precipitation', settings, 1)}</small>
          )}
        </button>
      ))}
    </div>
  );
}
