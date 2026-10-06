'use client';
import { useNow } from '@/hooks/use-now';
import { useState } from 'react';
import { useForecast } from '@/hooks/use-weather';
import { useAppStore } from '@/lib/store';
import { astronomy } from '@/lib/weather/astronomy';
import { rows } from '@/lib/weather/types';
import { formatTime, dateLabel, display } from '@/lib/weather/format';
import { activityScore, type Activity } from '@/lib/weather/insights';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { PageHeading, LoadingState, ErrorState } from '../ui/states';
import { MethodNote, Stat, ChartPanel } from './shared';
export function AstronomyView() {
  const now = useNow();
  const location = useAppStore((s) => s.location),
    settings = useAppStore((s) => s.settings),
    query = useForecast();
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  const timezone = query.data.weather.timezone,
    events = astronomy(location, timezone, query.data.weather.current?.time ?? now),
    time = (date: Date | null | undefined) =>
      date && Number.isFinite(date.getTime())
        ? formatTime(date.getTime() / 1000, timezone, settings.time === '12h')
        : 'No event today',
    tonight = rows(query.data.weather.hourly)
      .filter((h) => h.time >= now && h.is_day === 0)
      .slice(0, 12),
    cloud = tonight.map((h) => ({ ...h, cloud_cover: h.cloud_cover }));
  return (
    <>
      <PageHeading
        title="Under the same sky"
        description={`Astronomical events calculated for ${location.name}. Times in ${timezone}.`}
      />
      <section className="astronomy-hero panel">
        <div>
          <h2>{events.phase}</h2>
          <p>
            {Math.round(events.moon.fraction * 100)}% illuminated ·{' '}
            {events.moon.waxing ? 'Waxing' : 'Waning'}. Moonlight and cloud cover both shape the
            night’s visibility.
          </p>
        </div>
        <div
          className="moon-visual"
          aria-label={`${Math.round(events.moon.fraction * 100)}% lunar illumination`}
          style={{
            boxShadow: `inset ${events.moon.waxing ? -1 : 1} ${Math.round((1 - events.moon.fraction) * 70)}px 0 20px #182233`,
          }}
        />
      </section>
      <div className="specialist-grid four">
        <Stat
          label="Solar noon"
          value={time(events.sun.solarNoon)}
          detail="Sun’s highest point on the local day"
        />
        <Stat
          label="Golden hour"
          value={time(events.sun.goldenHour)}
          detail={`Morning golden hour ends ${time(events.sun.goldenHourEnd)}`}
        />
        <Stat
          label="Moonrise"
          value={time(events.moonTimes.rise)}
          detail={
            events.moonTimes.alwaysUp
              ? 'Moon remains above horizon all day'
              : events.moonTimes.alwaysDown
                ? 'Moon remains below horizon all day'
                : `Moonset ${time(events.moonTimes.set)}`
          }
        />
        <Stat
          label="Astronomical darkness"
          value={time(events.sun.night)}
          detail={`Ends ${time(events.sun.nightEnd)} · Sun below −18°`}
        />
      </div>
      <div className="charts-grid">
        <ChartPanel
          title="Sun path · altitude above the horizon"
          data={events.path}
          timezone={timezone}
          series={[
            { key: 'altitude', label: 'Sun altitude', unit: '°', type: 'area', color: '#efba7a' },
          ]}
        />
        <ChartPanel
          title="Tonight’s cloud cover"
          data={cloud}
          timezone={timezone}
          series={[
            { key: 'cloud_cover', label: 'Cloud cover', unit: '%', type: 'area', color: '#90a6cb' },
          ]}
        />
      </div>
      <div className="specialist-grid">
        <Stat
          label="Civil twilight"
          value={time(events.sun.dawn)}
          detail={`Dusk ${time(events.sun.dusk)} · blue-hour approximation, Sun −6° to horizon`}
        />
        <Stat
          label="Sunrise"
          value={time(events.sun.sunrise)}
          detail={
            events.sun.alwaysUp
              ? 'Polar day'
              : events.sun.alwaysDown
                ? 'Polar night'
                : `Sunset ${time(events.sun.sunset)}`
          }
        />
        <Stat
          label="Nautical twilight"
          value={time(events.sun.nauticalDusk)}
          detail={`Dawn ${time(events.sun.nauticalDawn)} · Sun −12°`}
        />
      </div>
      <MethodNote>
        Sun and Moon events are derived using SunCalc, independent of the forecast provider. Terrain
        and atmospheric refraction can shift observed times; polar dates may have no rise or set.
        Golden and blue hours are approximate light windows. Cloud cover is an Open-Meteo model
        forecast.
      </MethodNote>
    </>
  );
}
export function ActivitiesView() {
  const now = useNow();
  const query = useForecast(),
    settings = useAppStore((s) => s.settings),
    [index, setIndex] = useState(0);
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  const d = query.data.weather,
    hours = rows(d.hourly)
      .filter((h) => h.time >= now - 1800)
      .slice(0, 72),
    current = hours[Math.min(index, hours.length - 1)],
    activities: Activity[] = [
      'running',
      'cycling',
      'walking',
      'bbq',
      'football',
      'photography',
      'stargazing',
      'beach',
      'sailing',
      'skiing',
    ];
  return (
    <>
      <PageHeading
        title="Good weather for your kind of day"
        description="Transparent weather-comfort scores for outdoor plans. Every deduction is visible."
      />
      <div className="panel controls-panel">
        <label style={{ flex: 1 }}>
          Choose a forecast hour
          <input
            aria-label="Activity forecast hour"
            type="range"
            min="0"
            max={Math.max(0, hours.length - 1)}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
          />
        </label>
        <p>
          {current
            ? `${dateLabel(current.time, d.timezone)} · ${formatTime(current.time, d.timezone, settings.time === '12h')} · ${display(current.temperature_2m, 'temperature', settings)}`
            : 'Forecast unavailable'}
        </p>
      </div>
      <div className="specialist-grid">
        {activities.map((activity) => {
          const rating = activityScore(activity, current ?? { time: 0 });
          return (
            <section className="activity-card panel" key={activity}>
              <div>
                <h3>{activity === 'bbq' ? 'BBQ' : activity}</h3>
                <strong>
                  {rating.score ?? '—'}
                  <small>/100</small>
                </strong>
              </div>
              <div className="metric-progress">
                <i
                  style={{
                    width: `${rating.score ?? 0}%`,
                    background:
                      rating.score != null && rating.score >= 70 ? 'var(--green)' : 'var(--accent)',
                  }}
                />
              </div>
              <p>{rating.label}</p>
              {rating.factors.map((f) => (
                <div className="activity-factor" key={f.label}>
                  {f.penalty > 0 ? <TriangleAlert size={13} /> : <CheckCircle2 size={13} />}
                  <div>{f.label}</div>
                  <span>{f.penalty > 0 ? `−${f.penalty.toFixed(0)}` : 'No deduction'}</span>
                </div>
              ))}
            </section>
          );
        })}
      </div>
      <MethodNote>
        <strong>Score = 100 minus the displayed deductions, bounded to 0–100.</strong> Rain penalty:
        12 points/mm (max 40). Temperature: 2 points/degree outside 8–24 °C (max 25), or 22–32 °C
        for beach and −10–1 °C for skiing. Gusts: 0.6 points/km/h above 25 (max 30). Visibility: 10
        points below 5 km, 20 below 1 km. Stargazing additionally deducts half the cloud percentage
        and 100 points during daytime. Threshold factors use SI source units. Scores describe
        comfort, not safety, snow/surf quality, light pollution, route conditions or fitness.
        Missing required data produces no score.
      </MethodNote>
    </>
  );
}
