'use client';
import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { getWeather } from '@/lib/api';
import { rows, type WeatherRow } from '@/lib/weather/types';
import { display, dateLabel, localDate } from '@/lib/weather/format';
import { aggregate, matchingClimateAnomaly } from '@/lib/weather/statistics';
import { periodStats, monthlyAggregation, shiftYear } from '@/lib/weather/aggregation';
import { climateModels } from '@/lib/weather/models';
import { PageHeading, LoadingState } from '../ui/states';
import { Button } from '../ui/button';
import { useDataset, DataStatus, MethodNote, Stat, ChartPanel } from './shared';
const colors = ['#efba7a', '#79b8ed', '#8bc7b8', '#b4a3df'];
const dateDaysAgo = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
export function HistoryView() {
  const [form, setForm] = useState({ start: dateDaysAgo(35), end: dateDaysAgo(5) }),
    [range, setRange] = useState(form),
    [compare, setCompare] = useState(false),
    [error, setError] = useState(''),
    settings = useAppStore((s) => s.settings),
    location = useAppStore((s) => s.location),
    query = useDataset('historical', range),
    year = Number(range.start.slice(0, 4)),
    years = [year - 2, year - 1];
  const comparison = useQueries({
    queries: years.map((y) => ({
      queryKey: ['archive-compare', location.latitude, location.longitude, range, y],
      enabled: compare,
      staleTime: 86400000,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getWeather(
          'historical',
          location,
          {
            start: shiftYear(range.start, y),
            end: shiftYear(range.end, y + Number(range.end.slice(0, 4)) - year),
          },
          signal,
        ),
      retry: 1,
    })),
  });
  const d = query.dataset,
    days = rows(d?.daily),
    stats = periodStats(days),
    monthly = monthlyAggregation(days, d?.timezone ?? 'UTC'),
    comp = comparison.flatMap((q, i) =>
      q.data ? [{ year: years[i], data: Array.isArray(q.data) ? q.data[0] : q.data }] : [],
    ),
    merged: WeatherRow[] = days.map((h) => {
      const key = localDate(h.time, d?.timezone ?? 'UTC').slice(5),
        row: WeatherRow = { time: h.time, [String(year)]: h.temperature_2m_mean };
      for (const c of comp) {
        const found = rows(c.data.daily).find(
          (r) => localDate(r.time, c.data.timezone).slice(5) === key,
        );
        row[String(c.year)] = found?.temperature_2m_mean ?? null;
      }
      return row;
    });
  return (
    <>
      <PageHeading
        title="Weather has a memory"
        description="Explore reanalysis data from 1940 onward. Compare the same dates across years."
      />
      <form
        className="panel controls-panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.start > form.end) {
            setError('End date must follow start date.');
            return;
          }
          setError('');
          setRange({ ...form });
        }}
      >
        <label>
          Start date
          <input
            aria-label="Historical start date"
            type="date"
            min="1940-01-01"
            max={dateDaysAgo(1)}
            value={form.start}
            onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
          />
        </label>
        <label>
          End date
          <input
            aria-label="Historical end date"
            type="date"
            min="1940-01-01"
            max={dateDaysAgo(1)}
            value={form.end}
            onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
          />
        </label>
        <Button variant="primary" type="submit">
          Explore dates
        </Button>
        <label className="checkbox-label">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
          Compare previous two years
        </label>
      </form>
      {error && (
        <div role="alert" className="page-error">
          {error}
        </div>
      )}
      {!d ? (
        <DataStatus
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : (
        <>
          <div className="specialist-grid four">
            <Stat
              label="Mean temperature"
              value={display(stats.mean, 'temperature', settings, 1, false)}
              detail={`${days.length} represented days`}
            />
            <Stat
              label="Temperature extremes"
              value={`${display(stats.min, 'temperature', settings, 1, false)} – ${display(stats.max, 'temperature', settings, 1, false)}`}
              detail="Lowest minimum and highest maximum"
            />
            <Stat
              label="Total precipitation"
              value={display(stats.rain, 'precipitation', settings, 1, false)}
              unit={settings.precipitation === 'mm' ? 'mm' : 'in'}
              detail={`${stats.rainDays} days with at least 0.1 mm`}
            />
            <Stat
              label="Heat / frost days"
              value={`${stats.heatDays} / ${stats.frostDays}`}
              detail="Heat: maximum ≥25 °C. Frost: minimum <0 °C."
            />
          </div>
          <div className="charts-grid">
            <ChartPanel
              title="Daily temperature"
              data={days}
              timezone={d.timezone}
              daily
              series={[
                {
                  key: 'temperature_2m_mean',
                  label: 'Mean',
                  quantity: 'temperature',
                  color: '#efba7a',
                  type: 'area',
                },
                {
                  key: 'temperature_2m_max',
                  label: 'Maximum',
                  quantity: 'temperature',
                  color: '#dda295',
                },
                {
                  key: 'temperature_2m_min',
                  label: 'Minimum',
                  quantity: 'temperature',
                  color: '#79b8ed',
                },
              ]}
            />
            <ChartPanel
              title="Daily precipitation"
              data={days}
              timezone={d.timezone}
              daily
              series={[
                {
                  key: 'precipitation_sum',
                  label: 'Precipitation',
                  quantity: 'precipitation',
                  type: 'bar',
                  color: '#79b8ed',
                },
              ]}
            />
            <ChartPanel
              title="Daily wind"
              data={days}
              timezone={d.timezone}
              daily
              series={[
                {
                  key: 'wind_speed_10m_max',
                  label: 'Maximum wind',
                  quantity: 'wind',
                  color: '#8bc7b8',
                },
              ]}
            />
            <ChartPanel
              title="Solar radiation"
              data={days}
              timezone={d.timezone}
              daily
              series={[
                {
                  key: 'shortwave_radiation_sum',
                  label: 'Daily solar energy',
                  unit: 'MJ/m²',
                  color: '#efba7a',
                },
              ]}
            />
          </div>
          {compare && (
            <div style={{ marginTop: 20 }}>
              <ChartPanel
                title="Same calendar dates, different years"
                data={merged}
                timezone={d.timezone}
                daily
                series={[year, ...comp.map((c) => c.year)].map((y, i) => ({
                  key: String(y),
                  label: String(y),
                  quantity: 'temperature',
                  color: colors[i],
                }))}
              />
              {comparison.map(
                (q, i) =>
                  q.isError && (
                    <p className="page-error" key={i}>
                      {years[i]}: {q.error.message}
                    </p>
                  ),
              )}
              <div className="panel data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Mean temperature</th>
                      <th>Total rain</th>
                      <th>Rain days</th>
                      <th>Sunshine</th>
                      <th>Wind (mean daily max)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[{ year, data: d }, ...comp].map((c) => {
                      const s = periodStats(rows(c.data.daily));
                      return (
                        <tr key={c.year}>
                          <td>{c.year}</td>
                          <td>{display(s.mean, 'temperature', settings, 1)}</td>
                          <td>{display(s.rain, 'precipitation', settings, 1)}</td>
                          <td>{s.rainDays}</td>
                          <td>
                            {s.sunshine == null ? '—' : `${(s.sunshine / 3600).toFixed(1)} h`}
                          </td>
                          <td>{display(s.wind, 'wind', settings, 1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="panel data-table-wrap">
            <table className="data-table">
              <caption className="sr-only">Monthly aggregated history</caption>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Days in selection</th>
                  <th>Mean temperature</th>
                  <th>Minimum</th>
                  <th>Maximum</th>
                  <th>Total rain</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.time}>
                    <td>{dateLabel(m.time, 'UTC', { month: 'long', year: 'numeric' })}</td>
                    <td>{m.days}</td>
                    <td>{display(m.temperature_2m_mean, 'temperature', settings, 1)}</td>
                    <td>{display(m.temperature_2m_min, 'temperature', settings, 1)}</td>
                    <td>{display(m.temperature_2m_max, 'temperature', settings, 1)}</td>
                    <td>{display(m.precipitation_sum, 'precipitation', settings, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <MethodNote>
        Historical weather is <strong>reanalysis</strong>: observations combined with a model, not a
        weather-station record. Partial months summarize only selected days. Year comparisons align
        calendar dates; leap days may be missing. Long-term studies should use consistent ERA5 data
        rather than seamless model changes.{' '}
        <a href="https://open-meteo.com/en/docs/historical-weather-api">Archive documentation</a>.
      </MethodNote>
    </>
  );
}
export function ClimateView() {
  const location = useAppStore((s) => s.location),
    settings = useAppStore((s) => s.settings),
    [form, setForm] = useState({ start: '2026-01-01', end: '2045-12-31' }),
    [range, setRange] = useState(form),
    [selected, setSelected] = useState(['MRI_AGCM3_2_S', 'EC_Earth3P_HR']),
    [annual, setAnnual] = useState(true),
    [baseline, setBaseline] = useState(false);
  const queries = useQueries({
    queries: selected.map((model) => ({
      queryKey: ['climate', location.latitude, location.longitude, range, model],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getWeather('climate', location, { ...range, model }, signal),
      staleTime: 604800000,
      retry: 1,
    })),
  });
  const base = useDataset(
      'climate',
      { start: '1991-01-01', end: '2020-12-31', model: selected[0] },
      baseline,
    ),
    datasets = queries.flatMap((q, i) =>
      q.data ? [{ id: selected[i], data: Array.isArray(q.data) ? q.data[0] : q.data }] : [],
    ),
    grouped = datasets.map((d) => ({
      id: d.id,
      rows: monthlyAggregation(rows(d.data.daily), 'UTC', annual),
    })),
    axis = grouped[0]?.rows ?? [],
    merged: WeatherRow[] = axis.map((r) => {
      const result: WeatherRow = { time: r.time };
      for (const d of grouped) {
        const h = d.rows.find((h) => h.time === r.time);
        result[`${d.id}_temperature`] = h?.temperature_2m_mean ?? null;
        result[`${d.id}_rain`] = h?.precipitation_sum ?? null;
      }
      return result;
    }),
    mean = aggregate(
      rows(datasets.find((d) => d.id === selected[0])?.data.daily).map(
        (r) => r.temperature_2m_mean,
      ),
      'mean',
    ),
    baseMean = aggregate(
      rows(base.dataset?.daily).map((r) => r.temperature_2m_mean),
      'mean',
    ),
    anomaly = matchingClimateAnomaly(datasets, base.dataset, selected[0]);
  return (
    <>
      <PageHeading
        title="A changing climate"
        description="Explore CMIP6 HighResMIP projections. Climate describes long-term patterns, not exact future weather."
      />
      <form
        className="panel controls-panel"
        onSubmit={(e) => {
          e.preventDefault();
          setRange({ ...form });
        }}
      >
        <label>
          Projection start
          <input
            type="date"
            min="1950-01-01"
            max="2050-01-01"
            value={form.start}
            onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
          />
        </label>
        <label>
          Projection end
          <input
            type="date"
            min="1950-01-01"
            max="2050-01-01"
            value={form.end}
            onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
          />
        </label>
        <Button variant="primary" type="submit">
          Explore projection
        </Button>
        <label>
          Aggregation
          <select
            value={annual ? 'annual' : 'monthly'}
            onChange={(e) => setAnnual(e.target.value === 'annual')}
          >
            <option value="annual">Annual</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={baseline}
            onChange={(e) => setBaseline(e.target.checked)}
          />
          Compare 1991–2020 model baseline
        </label>
      </form>
      <div className="model-toggles">
        {climateModels.map((m, i) => (
          <button
            key={m}
            className={selected.includes(m) ? 'active' : ''}
            aria-pressed={selected.includes(m)}
            onClick={() =>
              setSelected((s) =>
                s.includes(m)
                  ? s.length > 1
                    ? s.filter((v) => v !== m)
                    : s
                  : [...s, m].slice(0, 4),
              )
            }
          >
            <i style={{ background: colors[i % 4] }} />
            {m.replaceAll('_', ' ')}
          </button>
        ))}
      </div>
      {queries.some((q) => q.isPending) && <LoadingState compact />}
      {queries.map(
        (q, i) =>
          q.isError && (
            <div className="page-error" key={i}>
              {selected[i]}: {q.error.message}
              <button className="button" onClick={() => void q.refetch()}>
                Retry
              </button>
            </div>
          ),
      )}
      {merged.length > 0 && (
        <>
          <div className="specialist-grid">
            <Stat
              label="First model period mean"
              value={display(mean, 'temperature', settings, 1, false)}
              detail={`${range.start} to ${range.end}`}
            />
            <Stat
              label="1991–2020 model baseline"
              value={display(baseMean, 'temperature', settings, 1, false)}
              detail={
                baseline
                  ? 'Same model, annual-period mean.'
                  : 'Enable baseline comparison to retrieve it.'
              }
            />
            <Stat
              label="Temperature anomaly"
              value={
                anomaly == null
                  ? '—'
                  : `${anomaly > 0 ? '+' : ''}${(anomaly * (settings.temperature === 'fahrenheit' ? 1.8 : 1)).toFixed(1)}`
              }
              unit={settings.temperature === 'celsius' ? '°C' : '°F'}
              detail="Derived period mean minus model baseline; no exact future-weather claim."
            />
          </div>
          <div className="charts-grid">
            <ChartPanel
              title={`${annual ? 'Annual' : 'Monthly'} mean temperature`}
              dateMode={annual ? 'annual' : 'monthly'}
              data={merged}
              daily
              series={grouped.map((d, i) => ({
                key: `${d.id}_temperature`,
                label: d.id.replaceAll('_', ' '),
                quantity: 'temperature',
                color: colors[i],
              }))}
            />
            <ChartPanel
              title={`${annual ? 'Annual' : 'Monthly'} precipitation totals`}
              dateMode={annual ? 'annual' : 'monthly'}
              data={merged}
              daily
              series={grouped.map((d, i) => ({
                key: `${d.id}_rain`,
                label: d.id.replaceAll('_', ' '),
                quantity: 'precipitation',
                color: colors[i],
              }))}
            />
          </div>
        </>
      )}
      {base.isError && baseline && (
        <p className="page-error">Baseline unavailable: {base.error.message}</p>
      )}
      <MethodNote>
        <strong>Weather forecast</strong> predicts near-term conditions.{' '}
        <strong>Seasonal forecast</strong> describes probabilistic weeks/months ahead.{' '}
        <strong>Climate projection</strong> explores long-term model patterns. These bias-corrected,
        downscaled HighResMIP models use a high-emissions framework and have limited model/scenario
        coverage. Model differences are not the full range of climate uncertainty. Valid dates:
        1950–2050, maximum selected range 31 years.{' '}
        <a href="https://open-meteo.com/en/docs/climate-api">
          Climate methodology and scenario limitations
        </a>
        .
      </MethodNote>
    </>
  );
}
export function SeasonalView() {
  const query = useDataset('seasonal'),
    [view, setView] = useState<'weekly' | 'monthly'>('weekly'),
    settings = useAppStore((s) => s.settings);
  if (!query.dataset)
    return (
      <>
        <PageHeading
          title="Signals beyond the forecast"
          description="Probabilistic seasonal guidance from ECMWF EC46 and SEAS5."
        />
        <DataStatus
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      </>
    );
  const d = query.dataset,
    data = rows(d[view]),
    current = data[0];
  return (
    <>
      <PageHeading
        title="Signals beyond the forecast"
        description="ECMWF model-climate anomalies: a longer-range tendency, not a day-by-day prediction."
      >
        <div className="segmented">
          <button className={view === 'weekly' ? 'active' : ''} onClick={() => setView('weekly')}>
            Weekly
          </button>
          <button className={view === 'monthly' ? 'active' : ''} onClick={() => setView('monthly')}>
            Monthly
          </button>
        </div>
      </PageHeading>
      <div className="specialist-grid">
        <Stat
          label="Temperature signal"
          value={
            current?.temperature_2m_anomaly == null
              ? '—'
              : `${current.temperature_2m_anomaly > 0 ? '+' : ''}${(current.temperature_2m_anomaly * (settings.temperature === 'fahrenheit' ? 1.8 : 1)).toFixed(1)}`
          }
          unit={settings.temperature === 'celsius' ? '°C' : '°F'}
          detail={
            current?.temperature_2m_anomaly == null
              ? 'Unavailable'
              : current.temperature_2m_anomaly > 0.5
                ? 'Warmer than normal signal'
                : current.temperature_2m_anomaly < -0.5
                  ? 'Cooler than normal signal'
                  : 'Near-normal temperature signal'
          }
        />
        <Stat
          label="Precipitation anomaly"
          value={display(current?.precipitation_anomaly, 'precipitation', settings, 1, false)}
          unit={settings.precipitation === 'mm' ? 'mm' : 'in'}
          detail={
            current?.precipitation_anomaly == null
              ? 'Unavailable'
              : current.precipitation_anomaly > 5
                ? 'Wetter than normal signal'
                : current.precipitation_anomaly < -5
                  ? 'Drier than normal signal'
                  : 'Near-normal precipitation signal'
          }
        />
        <Stat
          label="Available periods"
          value={String(data.length)}
          detail={`${view === 'weekly' ? 'EC46 weekly' : 'SEAS5 monthly'} guidance relative to the model’s own climatology`}
        />
      </div>
      <div className="charts-grid">
        <ChartPanel
          title="Temperature anomaly"
          data={data.map((h) => ({
            ...h,
            temperature_anomaly_display:
              h.temperature_2m_anomaly == null
                ? null
                : h.temperature_2m_anomaly * (settings.temperature === 'fahrenheit' ? 1.8 : 1),
          }))}
          daily
          timezone={d.timezone}
          series={[
            {
              key: 'temperature_anomaly_display',
              label: 'Temperature anomaly',
              unit: settings.temperature === 'celsius' ? '°C' : '°F',
              type: 'bar',
              color: '#efba7a',
            },
          ]}
        />
        <ChartPanel
          title="Precipitation anomaly"
          data={data}
          daily
          timezone={d.timezone}
          series={[
            {
              key: 'precipitation_anomaly',
              label: 'Precipitation anomaly',
              quantity: 'precipitation',
              type: 'bar',
              color: '#79b8ed',
            },
          ]}
        />
      </div>
      <div className="panel data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Period starting</th>
              <th>Temperature anomaly</th>
              <th>Precipitation anomaly</th>
              <th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {data.map((h) => (
              <tr key={h.time}>
                <td>{dateLabel(h.time, d.timezone)}</td>
                <td>
                  {h.temperature_2m_anomaly == null
                    ? '—'
                    : `${(h.temperature_2m_anomaly * (settings.temperature === 'fahrenheit' ? 1.8 : 1)).toFixed(1)} ${settings.temperature === 'celsius' ? '°C' : '°F'}`}
                </td>
                <td>{display(h.precipitation_anomaly, 'precipitation', settings, 1)}</td>
                <td>
                  {h.temperature_2m_anomaly == null
                    ? 'Unavailable'
                    : h.temperature_2m_anomaly > 0.5
                      ? 'Warmer than normal'
                      : h.temperature_2m_anomaly < -0.5
                        ? 'Cooler than normal'
                        : 'Near normal'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MethodNote>
        Anomalies are supplied by ECMWF relative to its own long-term model climatology. EC46
        provides weekly guidance; SEAS5 monthly guidance. Seasonal values are unadjusted model
        signals with uncertain local skill; they do not predict the weather on a specific future
        day. <a href="https://open-meteo.com/en/docs/seasonal-forecast-api">Seasonal methodology</a>
        .
      </MethodNote>
    </>
  );
}
