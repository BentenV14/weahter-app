'use client';
import { useNow } from '@/hooks/use-now';
import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { getWeather } from '@/lib/api';
import { locationKey, display, formatTime, dateLabel } from '@/lib/weather/format';
import { rows, type Location, type WeatherRow } from '@/lib/weather/types';
import { PageHeading } from '../ui/states';
import { Button } from '../ui/button';
import { ChartPanel, MethodNote } from './shared';
import { WeatherIcon } from '../weather/weather-icon';
import { weatherCode } from '@/lib/weather/codes';
import { X, Plus } from 'lucide-react';
const colors = ['#efba7a', '#79b8ed', '#8bc7b8', '#b4a3df'];
export function CompareView() {
  const now = useNow();
  const location = useAppStore((s) => s.location),
    favorites = useAppStore((s) => s.favorites),
    settings = useAppStore((s) => s.settings),
    [places, setPlaces] = useState<Location[]>(() =>
      favorites.length ? favorites.slice(0, 4) : [location],
    ),
    [variable, setVariable] = useState('temperature_2m');
  const queries = useQueries({
      queries: places.map((p) => ({
        queryKey: ['compare', locationKey(p)],
        queryFn: ({ signal }: { signal: AbortSignal }) => getWeather('forecast', p, {}, signal),
        staleTime: 600000,
        retry: 1,
      })),
    }),
    air = useQueries({
      queries: places.map((p) => ({
        queryKey: ['compare-air', locationKey(p)],
        queryFn: ({ signal }: { signal: AbortSignal }) => getWeather('airQuality', p, {}, signal),
        staleTime: 1800000,
        retry: 1,
      })),
    }),
    data = queries.map((q) => (Array.isArray(q.data) ? q.data[0] : q.data)),
    axis =
      data
        .find(Boolean)
        ?.hourly?.time.filter((t) => t >= now - 1800)
        .slice(0, 72) ?? [],
    merged: WeatherRow[] = axis.map((time) => {
      const r: WeatherRow = { time };
      data.forEach((d, i) => {
        const index = d?.hourly?.time.indexOf(time) ?? -1;
        r[`place${i}`] = index >= 0 ? (d?.hourly?.[variable]?.[index] ?? null) : null;
      });
      return r;
    }),
    quantity =
      variable === 'temperature_2m'
        ? ('temperature' as const)
        : variable === 'precipitation'
          ? ('precipitation' as const)
          : variable === 'wind_speed_10m'
            ? ('wind' as const)
            : ('raw' as const);
  const add = (p: Location) => {
    if (places.length >= 4) {
      useAppStore.getState().notify('You can compare up to four places.');
      return;
    }
    setPlaces((s) => (s.some((v) => locationKey(v) === locationKey(p)) ? s : [...s, p]));
  };
  return (
    <>
      <PageHeading
        title="Find your change of scenery"
        description="Compare up to four places at the same UTC instants, with each local time shown."
      >
        <Button onClick={() => useAppStore.getState().setSearchOpen(true)}>
          Search another place
        </Button>
      </PageHeading>
      <div className="model-toggles">
        {favorites.map((p) => (
          <button key={locationKey(p)} onClick={() => add(p)}>
            <Plus size={13} />
            {p.name}
          </button>
        ))}
        <button onClick={() => add(location)}>
          <Plus size={13} />
          Add {location.name}
        </button>
      </div>
      <div className="specialist-grid four">
        {places.map((p, i) => {
          const d = data[i],
            cur = d?.current,
            day = rows(d?.daily)[0],
            a = Array.isArray(air[i].data) ? air[i].data[0] : air[i].data,
            aq = rows(a?.hourly).find((h) => h.time >= now - 3600);
          return (
            <section className="stat-panel panel" key={locationKey(p)}>
              <div className="section-heading">
                <h2 style={{ fontSize: 16, margin: 0 }}>{p.name}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${p.name} from comparison`}
                  onClick={() =>
                    setPlaces((s) => s.filter((v) => locationKey(v) !== locationKey(p)))
                  }
                >
                  <X size={15} />
                </Button>
              </div>
              {queries[i].isError ? (
                <p role="alert">
                  {queries[i].error.message}
                  <Button onClick={() => void queries[i].refetch()}>Retry</Button>
                </p>
              ) : queries[i].isPending ? (
                <div className="skeleton" style={{ height: 160 }} />
              ) : (
                <>
                  <WeatherIcon code={cur?.weather_code} day={cur?.is_day !== 0} size={37} />
                  <h2>{display(cur?.temperature_2m, 'temperature', settings, 0, false)}°</h2>
                  <p>{weatherCode(cur?.weather_code).label}</p>
                  <p>
                    {display(day?.temperature_2m_min, 'temperature', settings, 0, false)}° /{' '}
                    {display(day?.temperature_2m_max, 'temperature', settings, 0, false)}° ·{' '}
                    {day?.precipitation_probability_max ?? '—'}% rain
                  </p>
                  <p>
                    Wind {display(cur?.wind_speed_10m, 'wind', settings)}
                    <br />
                    Humidity {cur?.relative_humidity_2m ?? '—'}% · UV {day?.uv_index_max ?? '—'}
                    <br />
                    Air quality {aq?.european_aqi ?? '—'} EAQI
                  </p>
                  <span className="quality-badge" style={{ color: colors[i] }}>
                    {formatTime(now, d!.timezone, settings.time === '12h')} local · {d!.timezone}
                  </span>
                </>
              )}
            </section>
          );
        })}
      </div>
      {!places.length && (
        <MethodNote>Add your selected place or a saved location to begin comparing.</MethodNote>
      )}
      <ChartPanel
        title="A shared timeline"
        data={merged}
        timezone={data.find(Boolean)?.timezone ?? 'UTC'}
        series={places.map((p, i) => ({
          key: `place${i}`,
          label: p.name,
          quantity,
          color: colors[i],
        }))}
      >
        <select
          aria-label="Location comparison variable"
          value={variable}
          onChange={(e) => setVariable(e.target.value)}
        >
          <option value="temperature_2m">Temperature</option>
          <option value="precipitation">Rain amount</option>
          <option value="wind_speed_10m">Wind</option>
          <option value="relative_humidity_2m">Humidity</option>
          <option value="uv_index">UV</option>
        </select>
      </ChartPanel>
      <div className="panel data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Day (first location)</th>
              {places.map((p) => (
                <th key={locationKey(p)}>{p.name} · high / low</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows(data.find(Boolean)?.daily)
              .slice(0, 7)
              .map((d, idx) => (
                <tr key={d.time}>
                  <td>{dateLabel(d.time, data.find(Boolean)!.timezone)}</td>
                  {places.map((p, i) => {
                    const day = rows(data[i]?.daily)[idx];
                    return (
                      <td key={locationKey(p)}>
                        {display(day?.temperature_2m_max, 'temperature', settings, 0, false)}° /{' '}
                        {display(day?.temperature_2m_min, 'temperature', settings, 0, false)}°
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <MethodNote>
        Hourly comparisons align by the same UTC timestamp, even across timezones. Chart labels use
        the first available place’s timezone. Daily summaries refer to each location’s local
        calendar days, which may differ internationally.
      </MethodNote>
    </>
  );
}
