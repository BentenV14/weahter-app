'use client';
import { ForecastBrief } from './forecast-brief';
import { useNow } from '@/hooks/use-now';
import { useOnline } from '@/hooks/use-online';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Wind,
  Droplets,
  Sun,
  Eye,
  Gauge,
  CloudSun,
  MapPin,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  TriangleAlert,
  CloudRain,
  Sunrise,
  Sunset,
  Leaf,
} from 'lucide-react';
import { useForecast, useWeather } from '@/hooks/use-weather';
import { useAppStore } from '@/lib/store';
import { display, formatTime, dateLabel, compass, unitFor, localDate } from '@/lib/weather/format';
import { rows } from '@/lib/weather/types';
import { weatherCode } from '@/lib/weather/codes';
import { summarize, advisories } from '@/lib/weather/insights';
import { LoadingState, ErrorState, SectionHeader } from '../ui/states';
import { WeatherArt } from './weather-icon';
import { HourlyTimeline } from './hourly-timeline';
import { DailyForecast } from './daily-forecast';
import { ForecastChart } from './forecast-chart';
import { WeatherMetricCard, WindCompass } from './metric-card';
const WeatherMap = dynamic(() => import('../map/weather-map').then((m) => m.WeatherMap), {
  ssr: false,
  loading: () => <div className="map-loading skeleton" aria-label="Preparing weather map" />,
});
export function Dashboard() {
  const now = useNow();
  const online = useOnline();
  const query = useForecast(),
    location = useAppStore((s) => s.location),
    settings = useAppStore((s) => s.settings),
    [chart, setChart] = useState<'temperature' | 'rain' | 'wind'>('temperature');
  const aq = useWeather('airQuality');
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  const { weather: data } = query.data,
    offline = query.data.offline || !online,
    current = data.current ?? {},
    timezone = data.timezone,
    hours = rows(data.hourly).filter((h) => h.time >= now - 1800),
    ageHours = Math.max(
      0,
      (now - (data.fetchedAt ? data.fetchedAt / 1000 : (current.time ?? now))) / 3600,
    ),
    expired = hours.length === 0,
    days = rows(data.daily),
    today = days.find((d) => localDate(d.time, timezone) === localDate(now, timezone)) ?? days[0],
    summary = summarize(hours.slice(0, 12), timezone, settings),
    insights = advisories(hours.slice(0, 24)),
    hour = hours[0] ?? { time: 0 },
    condition = weatherCode(current.weather_code, current.is_day !== 0);
  const aqData = Array.isArray(aq.data) ? aq.data[0] : aq.data,
    aqHour = rows(aqData?.hourly).find((h) => h.time >= hour.time),
    rainQuarters = rows(data.minutely_15).filter((h) => h.time >= now),
    rain = rainQuarters.find((h) => (h.precipitation ?? 0) >= 0.1),
    air = aqHour?.european_aqi;
  return (
    <div className="dashboard">
      <div className="dashboard-intro">
        <div>
          <p className="date-line">
            {dateLabel(current.time ?? now, timezone, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}{' '}
            <span>•</span> {formatTime(current.time ?? now, timezone, settings.time === '12h')}{' '}
            local time
          </p>
          <h1>
            Your day, in focus<span>.</span>
          </h1>
        </div>
        <div className="freshness">
          <span className={offline ? 'status-dot stale' : 'status-dot'} />
          {offline || ageHours >= 1 ? 'Saved forecast' : 'Forecast updated'}{' '}
          {data.fetchedAt
            ? `${dateLabel(data.fetchedAt / 1000, timezone, { day: 'numeric', month: 'short' })} ${formatTime(data.fetchedAt / 1000, timezone, settings.time === '12h')}`
            : '—'}
          {ageHours >= 1 &&
            ` · ${ageHours >= 24 ? `${Math.floor(ageHours / 24)} d` : `${Math.floor(ageHours)} h`} old`}
          <button aria-label="Refresh forecast" onClick={() => void query.refetch()}>
            <RefreshCw size={13} className={query.isFetching ? 'spin' : ''} />
          </button>
        </div>
      </div>
      {expired && (
        <div className="offline-banner" role="status">
          This downloaded forecast period has ended. The saved values below refer to their original
          dates; reconnect for a current forecast.
        </div>
      )}
      <div className="hero-grid">
        <section className={`current-hero ${condition.background}`}>
          <div className="hero-top">
            <span>
              <MapPin size={15} />
              {location.name}
              {location.country && <small>{location.country}</small>}
            </span>
            <span className="hero-badge">
              {ageHours >= 1 ? 'Saved model conditions' : 'Current model conditions'}
            </span>
          </div>
          <div className="hero-content">
            <div>
              <div className="hero-temperature">
                {display(current.temperature_2m, 'temperature', settings, 0, false)}
                <sup>°</sup>
                <span>{settings.temperature === 'celsius' ? 'C' : 'F'}</span>
              </div>
              <h2>{condition.label}</h2>
              <p>
                Feels like {display(current.apparent_temperature, 'temperature', settings)}
                <span className="hero-high-low">
                  <ArrowUp size={13} />
                  {display(today?.temperature_2m_max, 'temperature', settings, 0, false)}°{' '}
                  <ArrowDown size={13} />
                  {display(today?.temperature_2m_min, 'temperature', settings, 0, false)}°
                </span>
              </p>
            </div>
            <WeatherArt code={current.weather_code} day={current.is_day !== 0} />
          </div>
          <div className="hero-bottom">
            <span>
              <Wind size={16} />
              {compass(current.wind_direction_10m)}{' '}
              {display(current.wind_speed_10m, 'wind', settings)}
            </span>
            <span>
              <Droplets size={15} />
              {display(current.relative_humidity_2m, 'raw', settings)}% humidity
            </span>
            <span>
              <Sun size={16} />
              UV {hour.uv_index ?? '—'}
            </span>
          </div>
        </section>
        <section className="rain-outlook panel">
          <div className="rain-card-header">
            <span className="rain-icon">
              <CloudRain size={23} />
            </span>
            <span>Precipitation outlook</span>
            <Link href="/radar" aria-label="Open radar">
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <h2>
            {rain
              ? `Rain possible at ${formatTime(rain.time, timezone, settings.time === '12h')}`
              : summary.rainTime
                ? `Rain possible at ${formatTime(summary.rainTime, timezone, settings.time === '12h')}`
                : summary.dryHours
                  ? `A dry stretch ahead`
                  : `Precipitation data unavailable`}
          </h2>
          <p>
            {rain
              ? '15-minute model precipitation, where supported.'
              : summary.rainTime
                ? 'Hourly probability or amount indicates possible rain.'
                : summary.dryHours
                  ? `Mostly dry conditions in the next ${summary.dryHours} hours.`
                  : `Missing precipitation values; check the hourly forecast.`}
          </p>
          <div className="rain-bars" aria-label="Next 12 hours of precipitation probability">
            {hours.slice(0, 12).map((h) => (
              <div
                key={h.time}
                title={`${formatTime(h.time, timezone)}: ${h.precipitation_probability ?? '—'}% chance, ${display(h.precipitation, 'precipitation', settings, 1)}`}
              >
                <span style={{ height: `${Math.max(3, h.precipitation_probability ?? 0)}%` }} />
              </div>
            ))}
          </div>
          <div className="rain-scale">
            <span>Now</span>
            <span>+6 h</span>
            <span>+12 h</span>
          </div>
          <div className="rain-card-bottom">
            <span>
              <i />
              Probability (%)
            </span>
            <Link href="/hourly">
              See amounts <ArrowUpRight size={13} />
            </Link>
          </div>
        </section>
      </div>
      <section className="hourly-panel panel">
        <SectionHeader
          title={
            expired ? 'Downloaded hourly forecast unavailable for today' : 'The next few hours'
          }
          subtitle="A little perspective for the rest of your day"
        >
          <Link href="/hourly" className="text-link">
            Hourly details <ArrowUpRight size={14} />
          </Link>
        </SectionHeader>
        <HourlyTimeline hours={hours.slice(0, 12)} timezone={timezone} />
      </section>
      <div className="forecast-grid">
        <section className="chart-panel panel">
          <SectionHeader
            title="Today’s outlook"
            subtitle={
              chart === 'temperature'
                ? 'Temperature and feels-like, in your local time'
                : chart === 'rain'
                  ? 'Forecast accumulation per hour'
                  : 'Sustained wind and gusts at 10 m'
            }
          >
            <div className="segmented" aria-label="Chart variable">
              {(['temperature', 'rain', 'wind'] as const).map((v) => (
                <button
                  key={v}
                  aria-pressed={chart === v}
                  className={chart === v ? 'active' : ''}
                  onClick={() => setChart(v)}
                >
                  {v === 'temperature' ? 'Temperature' : v === 'rain' ? 'Rain' : 'Wind'}
                </button>
              ))}
            </div>
          </SectionHeader>
          <ForecastChart
            data={hours.slice(0, 24)}
            timezone={timezone}
            height={222}
            showNight
            showNow
            series={
              chart === 'temperature'
                ? [
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
                      color: '#8ba4c8',
                      dash: '4 4',
                    },
                  ]
                : chart === 'rain'
                  ? [
                      {
                        key: 'precipitation',
                        label: 'Precipitation',
                        quantity: 'precipitation',
                        type: 'bar',
                        color: '#79b8ed',
                      },
                    ]
                  : [
                      {
                        key: 'wind_speed_10m',
                        label: 'Wind',
                        quantity: 'wind',
                        type: 'area',
                        color: '#8fc8c5',
                      },
                      {
                        key: 'wind_gusts_10m',
                        label: 'Gusts',
                        quantity: 'wind',
                        color: '#a99ad6',
                        dash: '4 4',
                      },
                    ]
            }
          />
          <div className="chart-footnote">
            <span className="status-dot" />
            Shaded areas mark nighttime. Forecast by Open-Meteo.
          </div>
        </section>
        <section className="daily-panel panel">
          <SectionHeader title="Looking ahead">
            <Link href="/daily" className="text-link">
              16 days <ArrowUpRight size={14} />
            </Link>
          </SectionHeader>
          <DailyForecast
            days={days.slice(0, 7)}
            timezone={timezone}
            onSelect={(day) => {
              window.location.href = `/daily?lat=${location.latitude}&lon=${location.longitude}&name=${encodeURIComponent(location.name)}&date=${day.time}`;
            }}
          />
        </section>
      </div>
      {!expired && (
        <ForecastBrief
          hours={hours}
          days={days.filter((d) => localDate(d.time, timezone) >= localDate(now, timezone))}
          timezone={timezone}
        />
      )}
      <div className="metrics-grid">
        <WeatherMetricCard
          title="Wind"
          icon={Wind}
          value={display(current.wind_speed_10m, 'wind', settings, 0, false)}
          unit={unitFor('wind', settings)}
          detail={`${compass(current.wind_direction_10m)} · Gusts ${display(current.wind_gusts_10m, 'wind', settings)}`}
        >
          <WindCompass direction={current.wind_direction_10m} />
        </WeatherMetricCard>
        <WeatherMetricCard
          title="Humidity"
          icon={Droplets}
          value={display(current.relative_humidity_2m, 'raw', settings)}
          unit="%"
          detail={`Dew point ${display(hour.dew_point_2m, 'temperature', settings)}`}
        >
          <div className="metric-progress">
            <i style={{ width: `${current.relative_humidity_2m ?? 0}%`, background: '#79b8ed' }} />
          </div>
        </WeatherMetricCard>
        <WeatherMetricCard
          title="UV index"
          icon={Sun}
          value={display(hour.uv_index, 'raw', settings, 1)}
          detail={
            hour.uv_index == null
              ? 'Unavailable'
              : hour.uv_index < 3
                ? 'Low exposure'
                : hour.uv_index < 6
                  ? 'Moderate exposure'
                  : 'High exposure'
          }
        >
          <div className="uv-scale">
            <i style={{ left: `${Math.min(100, ((hour.uv_index ?? 0) / 11) * 100)}%` }} />
          </div>
        </WeatherMetricCard>
        <WeatherMetricCard
          title="Visibility"
          icon={Eye}
          value={display(
            hour.visibility == null ? null : hour.visibility / 1000,
            'distance',
            settings,
            1,
            false,
          )}
          unit={unitFor('distance', settings)}
          detail={
            hour.visibility == null
              ? 'Unavailable'
              : hour.visibility >= 10000
                ? 'A clear view ahead'
                : 'Reduced visibility forecast'
          }
        />
        <WeatherMetricCard
          title="Pressure"
          icon={Gauge}
          value={display(
            current.pressure_msl,
            'pressure',
            settings,
            settings.pressure === 'inHg' ? 2 : 0,
            false,
          )}
          unit={unitFor('pressure', settings)}
          detail={`Surface ${display(current.surface_pressure, 'pressure', settings)}`}
        />
        <WeatherMetricCard
          title="Air quality"
          icon={Leaf}
          value={air == null ? '—' : String(Math.round(air))}
          unit="EAQI"
          detail={
            aq.isError
              ? 'Air-quality data unavailable'
              : air == null
                ? 'Fetching air-quality forecast'
                : air <= 20
                  ? 'Good'
                  : air <= 40
                    ? 'Fair'
                    : air <= 60
                      ? 'Moderate'
                      : air <= 80
                        ? 'Poor'
                        : 'Very poor'
          }
        >
          <Link href="/air-quality" className="metric-link">
            Explore pollutants <ArrowUpRight size={12} />
          </Link>
        </WeatherMetricCard>
      </div>
      <div className="bottom-grid">
        <section className="map-preview panel">
          <SectionHeader title="Weather in motion" subtitle="Explore the atmosphere around you">
            <Link href="/map" className="text-link">
              Open map <ArrowUpRight size={14} />
            </Link>
          </SectionHeader>
          <WeatherMap compact />
        </section>
        <div className="right-stack">
          <section className="insights-panel panel">
            <SectionHeader title="Weather insights">
              <Sparkles size={17} className="accent" />
            </SectionHeader>
            {insights.slice(0, 3).map((insight) => (
              <div className="insight-row" key={insight.title}>
                {insight.level === 'caution' ? (
                  <TriangleAlert size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                <div>
                  <h3>{insight.title}</h3>
                  <p>{insight.detail}</p>
                </div>
              </div>
            ))}
            <div className="insight-label">App-generated guidance · Not official warnings</div>
          </section>
          <section className="sun-card panel">
            <div>
              <Sun size={18} className="accent" />
              <h2>From dawn to dusk</h2>
              <span>
                {today?.daylight_duration
                  ? `${Math.floor(today.daylight_duration / 3600)} h ${Math.round((today.daylight_duration % 3600) / 60)} m daylight`
                  : 'Daylight unavailable'}
              </span>
            </div>
            <div className="sun-arc">
              <svg viewBox="0 0 230 75" aria-hidden="true">
                <path
                  d="M10 65Q115-55 220 65"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <path
                  d="M10 65Q115-55 220 65"
                  fill="none"
                  stroke="#efba7a"
                  strokeWidth="2"
                  pathLength="100"
                  strokeDasharray="55 100"
                />
                <circle cx="126" cy="8" r="7" fill="#efba7a" />
              </svg>
            </div>
            <div className="sun-times">
              <span>
                <Sunrise size={15} />
                {today?.sunrise
                  ? formatTime(today.sunrise, timezone, settings.time === '12h')
                  : '—'}
                <small>Sunrise</small>
              </span>
              <span>
                <Sunset size={15} />
                {today?.sunset ? formatTime(today.sunset, timezone, settings.time === '12h') : '—'}
                <small>Sunset</small>
              </span>
            </div>
          </section>
        </div>
      </div>
      <div className="data-note">
        <CloudSun size={15} />
        <span>
          Current conditions are model estimates. Times shown in {timezone}. Source values and
          derived insights are kept separate.
        </span>
        <Link href="/models">
          Explore models <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
