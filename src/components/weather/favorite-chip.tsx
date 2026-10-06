'use client';
import { useForecast } from '@/hooks/use-weather';
import { useNow } from '@/hooks/use-now';
import { useAppStore } from '@/lib/store';
import { display, formatTime } from '@/lib/weather/format';
import type { Location } from '@/lib/weather/types';
import { weatherCode } from '@/lib/weather/codes';
import { WeatherIcon } from './weather-icon';
export function FavoriteChip({ place, selected }: { place: Location; selected: boolean }) {
  const query = useForecast(place),
    settings = useAppStore((s) => s.settings),
    now = useNow(),
    data = query.data?.weather,
    day = data?.daily;
  const detail = data
    ? `${weatherCode(data.current?.weather_code, data.current?.is_day !== 0).label}. High ${display(day?.temperature_2m_max?.[0], 'temperature', settings)}, low ${display(day?.temperature_2m_min?.[0], 'temperature', settings)}. ${day?.precipitation_probability_max?.[0] ?? 'Unavailable'}% rain chance. ${formatTime(now, data.timezone, settings.time === '12h')} local time.`
    : query.isError
      ? 'Forecast unavailable'
      : 'Fetching forecast';
  return (
    <button
      className={selected ? 'selected' : ''}
      title={detail}
      aria-pressed={selected}
      onClick={() => useAppStore.getState().selectLocation(place)}
    >
      <span>{place.name}</span>
      {data && (
        <>
          <WeatherIcon
            code={data.current?.weather_code}
            day={data.current?.is_day !== 0}
            size={19}
          />
          <strong>{display(data.current?.temperature_2m, 'temperature', settings)}</strong>
        </>
      )}
      <span className="sr-only">{detail}</span>
    </button>
  );
}
