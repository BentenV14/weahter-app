'use client';
import { useNow } from '@/hooks/use-now';
import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForecast } from '@/hooks/use-weather';
import { rows, type WeatherRow } from '@/lib/weather/types';
import { useAppStore } from '@/lib/store';
import {
  display,
  dateLabel,
  formatTime,
  compass,
  localDate,
  relativeDayLabel,
} from '@/lib/weather/format';
import { weatherCode } from '@/lib/weather/codes';
import { summarize } from '@/lib/weather/insights';
import { PageHeading, SectionHeader, LoadingState, ErrorState } from '../ui/states';
import { HourlyTimeline } from './hourly-timeline';
import { ForecastChart, type ChartSeries } from './forecast-chart';
import { WeatherIcon } from './weather-icon';
import { Button } from '../ui/button';
import { X, Wind, Droplets, Sunrise, Sunset } from 'lucide-react';
const variables: { title: string; series: ChartSeries[] }[] = [
  {
    title: 'Temperature',
    series: [
      {
        key: 'temperature_2m',
        label: 'Temperature',
        quantity: 'temperature',
        type: 'area',
        color: '#efba7a',
      },
      {
        key: 'apparent_temperature',
        label: 'Feels like',
        quantity: 'temperature',
        color: '#90a6cb',
        dash: '4 4',
      },
      { key: 'dew_point_2m', label: 'Dew point', quantity: 'temperature', color: '#8bc7b8' },
    ],
  },
  {
    title: 'Precipitation probability',
    series: [
      {
        key: 'precipitation_probability',
        label: 'Probability',
        unit: '%',
        type: 'area',
        color: '#79b8ed',
      },
    ],
  },
  {
    title: 'Precipitation amount',
    series: [
      {
        key: 'precipitation',
        label: 'Total precipitation',
        quantity: 'precipitation',
        type: 'bar',
        color: '#79b8ed',
      },
      { key: 'rain', label: 'Rain', quantity: 'precipitation', color: '#6e93d0' },
    ],
  },
  {
    title: 'Wind at 10 m',
    series: [
      { key: 'wind_speed_10m', label: 'Wind', quantity: 'wind', color: '#8bc7b8', type: 'area' },
      { key: 'wind_gusts_10m', label: 'Gusts', quantity: 'wind', color: '#b4a3df' },
    ],
  },
  {
    title: 'Sea-level pressure',
    series: [
      {
        key: 'pressure_msl',
        label: 'Pressure',
        quantity: 'pressure',
        color: '#b4a3df',
        type: 'area',
      },
    ],
  },
  {
    title: 'Humidity & cloud cover',
    series: [
      { key: 'relative_humidity_2m', label: 'Humidity', unit: '%', color: '#79b8ed' },
      { key: 'cloud_cover', label: 'Cloud cover', unit: '%', color: '#9cacc2' },
    ],
  },
  {
    title: 'Visibility',
    series: [
      {
        key: 'visibility_km',
        label: 'Visibility',
        quantity: 'distance',
        color: '#8bc7b8',
        type: 'area',
      },
    ],
  },
  {
    title: 'UV index',
    series: [{ key: 'uv_index', label: 'UV index', color: '#efba7a', type: 'area' }],
  },
  {
    title: 'Solar radiation',
    series: [
      { key: 'shortwave_radiation', label: 'GHI', unit: 'W/m²', color: '#efba7a', type: 'area' },
    ],
  },
];
export function HourlyView() {
  const now = useNow();
  const query = useForecast(),
    [range, setRange] = useState(24),
    [selected, setSelected] = useState<number | null>(null),
    [visible, setVisible] = useState('all'),
    settings = useAppStore((s) => s.settings);
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  const data = query.data.weather,
    timezone = data.timezone,
    hours = rows(data.hourly)
      .filter((h) => h.time >= now - 1800)
      .slice(0, range)
      .map((h): WeatherRow => ({
        ...h,
        visibility_km: h.visibility == null ? null : h.visibility / 1000,
      })),
    current = hours.find((h) => h.time === selected) ?? hours[0];
  return (
    <>
      <PageHeading
        title="Hour by hour"
        description={`The details that make the difference. Times in ${timezone}.`}
      >
        <div className="segmented">
          {[24, 48, 72, 168].map((r) => (
            <button
              key={r}
              aria-pressed={range === r}
              className={range === r ? 'active' : ''}
              onClick={() => {
                setRange(r);
                setSelected(null);
              }}
            >
              {r === 168 ? '7 days' : `${r} h`}
            </button>
          ))}
        </div>
      </PageHeading>
      <section className="panel hourly-panel">
        <HourlyTimeline
          hours={hours.slice(0, Math.min(range, 48))}
          timezone={timezone}
          selected={selected ?? undefined}
          onSelect={(hour) => setSelected(hour.time)}
        />
      </section>
      {current && (
        <div className="hour-detail panel">
          <strong>
            {dateLabel(current.time, timezone)} ·{' '}
            {formatTime(current.time, timezone, settings.time === '12h')}
          </strong>
          <span>{weatherCode(current.weather_code).label}</span>
          <span>{display(current.precipitation, 'precipitation', settings, 1)} accumulation</span>
          <span>
            {compass(current.wind_direction_10m)}{' '}
            {display(current.wind_speed_10m, 'wind', settings)}
          </span>
          <span>Humidity {current.relative_humidity_2m ?? '—'}%</span>
          <span>Cloud {current.cloud_cover ?? '—'}%</span>
          <span>Wet bulb {display(current.wet_bulb_temperature_2m, 'temperature', settings)}</span>
          <span>
            Snow depth{' '}
            {display(
              current.snow_depth == null ? null : current.snow_depth / 1000,
              'distance',
              settings,
              4,
            )}
          </span>
          <span>Soil surface {display(current.soil_temperature_0cm, 'temperature', settings)}</span>
          <span>
            Soil water{' '}
            {current.soil_moisture_0_to_1cm == null
              ? '—'
              : current.soil_moisture_0_to_1cm.toFixed(3)}{' '}
            m³/m³
          </span>
          <span>
            ET₀ {display(current.et0_fao_evapotranspiration, 'precipitation', settings, 2)} /h
          </span>
        </div>
      )}
      <div className="view-controls">
        <p>Hover a chart to synchronize the forecast crosshair. Nighttime is shaded.</p>
        <select
          aria-label="Filter hourly charts"
          value={visible}
          onChange={(e) => setVisible(e.target.value)}
        >
          <option value="all">All variables</option>
          {variables.map((v) => (
            <option key={v.title}>{v.title}</option>
          ))}
        </select>
      </div>
      <div className="charts-grid">
        {variables
          .filter((v) => visible === 'all' || visible === v.title)
          .map((v) => (
            <section className="panel chart-panel" key={v.title}>
              <SectionHeader title={v.title} />
              <ForecastChart
                data={hours}
                series={v.series}
                timezone={timezone}
                showNight
                showNow
                syncId="hourly"
              />
            </section>
          ))}
      </div>
    </>
  );
}
export function DailyView() {
  const now = useNow();
  const query = useForecast(),
    settings = useAppStore((s) => s.settings),
    [selectedDay, setDay] = useState<number | null>(null);
  useEffect(() => {
    const timestamp = Number(new URLSearchParams(window.location.search).get('date'));
    if (timestamp && query.data)
      setDay(rows(query.data.weather.daily).some((d) => d.time === timestamp) ? timestamp : null);
  }, [query.data]);
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  const data = query.data.weather,
    days = rows(data.daily),
    day = days.find((d) => d.time === selectedDay) ?? null,
    timezone = data.timezone,
    hours = rows(data.hourly),
    dayHours = day
      ? hours.filter((h) => localDate(h.time, timezone) === localDate(day.time, timezone))
      : [];
  return (
    <>
      <PageHeading
        title="A wider view"
        description={`${days.length} days of forecast. Select a day for its hourly detail.`}
      />
      <div className="daily-cards">
        {days.map((d) => (
          <button className="daily-detail-card panel" key={d.time} onClick={() => setDay(d.time)}>
            <div>
              <span>{relativeDayLabel(d.time, timezone, now)}</span>
              <small>{dateLabel(d.time, timezone, { month: 'short', day: 'numeric' })}</small>
            </div>
            <WeatherIcon code={d.weather_code} size={44} />
            <h2>
              {display(d.temperature_2m_max, 'temperature', settings, 0, false)}°{' '}
              <span>{display(d.temperature_2m_min, 'temperature', settings, 0, false)}°</span>
            </h2>
            <p>{weatherCode(d.weather_code).label}</p>
            <dl>
              <dt>
                <Droplets size={13} /> Rain chance
              </dt>
              <dd>{d.precipitation_probability_max ?? '—'}%</dd>
              <dt>Accumulation</dt>
              <dd>{display(d.precipitation_sum, 'precipitation', settings, 1)}</dd>
              <dt>Snow</dt>
              <dd>{d.snowfall_sum ?? '—'} cm</dd>
              <dt>
                <Wind size={13} /> Peak wind
              </dt>
              <dd>{display(d.wind_speed_10m_max, 'wind', settings)}</dd>
              <dt>Gusts</dt>
              <dd>{display(d.wind_gusts_10m_max, 'wind', settings)}</dd>
              <dt>Max UV</dt>
              <dd>{d.uv_index_max ?? '—'}</dd>
              <dt>
                <Sunrise size={13} /> Sunrise
              </dt>
              <dd>{d.sunrise ? formatTime(d.sunrise, timezone, settings.time === '12h') : '—'}</dd>
              <dt>
                <Sunset size={13} /> Sunset
              </dt>
              <dd>{d.sunset ? formatTime(d.sunset, timezone, settings.time === '12h') : '—'}</dd>
            </dl>
          </button>
        ))}
      </div>
      <Dialog.Root
        open={Boolean(day)}
        onOpenChange={(open) => {
          if (!open) setDay(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="daily-dialog">
            <div className="section-heading">
              <Dialog.Title>
                {day
                  ? dateLabel(day.time, timezone, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'Daily detail'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close daily detail">
                  <X size={18} />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description>{summarize(dayHours, timezone, settings).text}</Dialog.Description>
            <HourlyTimeline hours={dayHours} timezone={timezone} />
            <ForecastChart
              data={dayHours}
              series={variables[0].series}
              timezone={timezone}
              syncId="daily-detail"
              showNight
            />
            <div className="hour-detail">
              Feels like {display(day?.apparent_temperature_min, 'temperature', settings)} to{' '}
              {display(day?.apparent_temperature_max, 'temperature', settings)} ·{' '}
              {day?.daylight_duration
                ? `${(day.daylight_duration / 3600).toFixed(1)} h daylight`
                : 'Daylight unavailable'}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
