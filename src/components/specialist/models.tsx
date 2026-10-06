'use client';
import { useNow } from '@/hooks/use-now';
import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { getWeather } from '@/lib/api';
import { models, ensembleModels } from '@/lib/weather/models';
import { rows, type WeatherRow } from '@/lib/weather/types';
import { confidence, ensembleStats, present, aggregate } from '@/lib/weather/statistics';
import { display, dateLabel, formatTime } from '@/lib/weather/format';
import { PageHeading } from '../ui/states';
import { useDataset, DataStatus, MethodNote, Stat, ChartPanel } from './shared';
const colors = ['#efba7a', '#79b8ed', '#8bc7b8', '#b4a3df', '#dda295', '#93a8cd'];
const variables = [
  { key: 'temperature_2m', label: 'Temperature', quantity: 'temperature' as const },
  { key: 'precipitation', label: 'Precipitation', quantity: 'precipitation' as const },
  { key: 'wind_speed_10m', label: 'Wind', quantity: 'wind' as const },
  { key: 'pressure_msl', label: 'Pressure', quantity: 'pressure' as const },
  { key: 'cloud_cover', label: 'Cloud cover', quantity: 'raw' as const },
  { key: 'snowfall', label: 'Snowfall', quantity: 'raw' as const },
];
export function ModelsView() {
  const now = useNow();
  const location = useAppStore((s) => s.location),
    settings = useAppStore((s) => s.settings),
    [selected, setSelected] = useState(['ecmwf_ifs025', 'icon_seamless', 'gfs_seamless']),
    [variable, setVariable] = useState('temperature_2m'),
    [timeIndex, setTimeIndex] = useState(24);
  const queries = useQueries({
    queries: selected.map((model) => ({
      queryKey: ['comparison-model', location.latitude, location.longitude, model],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getWeather('forecast', location, { model }, signal),
      staleTime: 900000,
      retry: 1,
    })),
  });
  const datasets = queries.flatMap((q, i) =>
      q.data ? [{ model: selected[i], data: Array.isArray(q.data) ? q.data[0] : q.data }] : [],
    ),
    axis = datasets[0]?.data.hourly?.time.filter((t) => t >= now - 3600).slice(0, 168) ?? [],
    merged: WeatherRow[] = axis.map((time) => {
      const row: WeatherRow = { time };
      for (const d of datasets) {
        const i = d.data.hourly?.time.indexOf(time) ?? -1;
        row[d.model] = i >= 0 ? (d.data.hourly?.[variable]?.[i] ?? null) : null;
        const temp = d.data.hourly?.temperature_2m?.[i];
        row[`${d.model}_temperature`] = temp ?? null;
      }
      return row;
    }),
    point = merged[Math.min(timeIndex, merged.length - 1)],
    agreement = confidence(
      datasets.map((d) => point?.[`${d.model}_temperature`] ?? null),
      point ? Math.max(0, (point.time - now) / 3600) : 24,
    ),
    v = variables.find((v) => v.key === variable)!;
  return (
    <>
      <PageHeading
        title="Different models. A clearer picture."
        description="Compare independent predictions. Agreement helps put the forecast in context."
      />
      <div className="model-toggles">
        {models
          .filter((m) => m.id !== 'best_match')
          .map((m, i) => (
            <button
              key={m.id}
              className={selected.includes(m.id) ? 'active' : ''}
              aria-pressed={selected.includes(m.id)}
              onClick={() =>
                setSelected((s) =>
                  s.includes(m.id)
                    ? s.length > 1
                      ? s.filter((v) => v !== m.id)
                      : s
                    : [...s, m.id].slice(0, 6),
                )
              }
            >
              <i style={{ background: colors[i % colors.length] }} />
              {m.name}
            </button>
          ))}
      </div>
      <div className="panel controls-panel">
        <label>
          Compare variable
          <select value={variable} onChange={(e) => setVariable(e.target.value)}>
            {variables.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1 }}>
          Inspect timestamp
          <input
            aria-label="Model comparison timestamp"
            type="range"
            min="0"
            max={Math.max(0, merged.length - 1)}
            value={Math.min(timeIndex, Math.max(0, merged.length - 1))}
            onChange={(e) => setTimeIndex(Number(e.target.value))}
          />
        </label>
        <p>
          {point
            ? `${dateLabel(point.time, datasets[0]?.data.timezone ?? 'UTC')} ${formatTime(point.time, datasets[0]?.data.timezone ?? 'UTC', settings.time === '12h')}`
            : 'Waiting for model predictions'}
        </p>
      </div>
      {queries.some((q) => q.isPending) && <p className="muted">Retrieving model predictions…</p>}
      {queries.map(
        (q, i) =>
          q.isError && (
            <div className="page-error" key={selected[i]}>
              {models.find((m) => m.id === selected[i])?.name}: {q.error.message}{' '}
              <button className="button" onClick={() => void q.refetch()}>
                Retry model
              </button>
            </div>
          ),
      )}
      <ChartPanel
        title={`${v.label} · model comparison`}
        data={merged}
        timezone={datasets[0]?.data.timezone ?? 'UTC'}
        series={datasets.map((d, i) => ({
          key: d.model,
          label: models.find((m) => m.id === d.model)?.name ?? d.model,
          quantity: v.quantity,
          color: colors[i],
        }))}
      />
      <div className="confidence-banner panel">
        <div className="confidence-reading">{agreement.label}</div>
        <div>
          <h3>Model confidence · app-derived agreement</h3>
          <p>
            {agreement.explanation} The score always uses temperature, even when another variable is
            plotted.
          </p>
        </div>
      </div>
      <div className="specialist-grid">
        {datasets.map((d, i) => (
          <Stat
            key={d.model}
            label={models.find((m) => m.id === d.model)?.name ?? d.model}
            value={display(point?.[d.model], v.quantity, settings, 1, false)}
            detail={`${models.find((m) => m.id === d.model)?.resolution} · ${models.find((m) => m.id === d.model)?.region}`}
          >
            <span className="quality-badge" style={{ color: colors[i] }}>
              Model output
            </span>
          </Stat>
        ))}
      </div>
      <MethodNote>
        Models differ in resolution, physics, update times and geographic coverage. Seamless
        variants combine regional and global models. Blank values mean the variable or forecast lead
        time is unsupported. Spread is not a scientifically calibrated confidence score.{' '}
        <a href="https://open-meteo.com/en/docs">Model metadata</a>.
      </MethodNote>
    </>
  );
}
export function EnsembleView() {
  const now = useNow();
  const settings = useAppStore((s) => s.settings),
    [model, setModel] = useState('ecmwf_ifs025'),
    [variable, setVariable] = useState('temperature_2m'),
    [threshold, setThreshold] = useState(25),
    [index, setIndex] = useState(24),
    query = useDataset('ensemble', { model });
  if (!query.dataset)
    return (
      <>
        <PageHeading
          title="Many possible futures"
          description="Ensemble forecasts reveal how uncertainty evolves."
        />
        <DataStatus
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      </>
    );
  const d = query.dataset,
    keys = Object.keys(d.hourly ?? {}).filter(
      (k) => k === variable || new RegExp(`^${variable}_member\\d+$`).test(k),
    ),
    data: WeatherRow[] = rows(d.hourly)
      .filter((h) => h.time >= now - 3600)
      .map((h) => ({
        ...h,
        mean: aggregate(
          keys.map((k) => h[k]),
          'mean',
        ),
        p10: ensembleStats(keys.map((k) => h[k] ?? null)).p10,
        p90: ensembleStats(keys.map((k) => h[k] ?? null)).p90,
      })),
    point = data[Math.min(index, data.length - 1)],
    values = keys.map((k) => point?.[k] ?? null),
    sourceThreshold =
      variable === 'temperature_2m' && settings.temperature === 'fahrenheit'
        ? ((threshold - 32) * 5) / 9
        : variable === 'wind_speed_10m'
          ? threshold / { kmh: 1, ms: 1 / 3.6, mph: 0.621371, kn: 0.539957 }[settings.wind]
          : variable === 'precipitation' && settings.precipitation === 'inch'
            ? threshold * 25.4
            : threshold,
    stats = ensembleStats(values, sourceThreshold),
    quantity =
      variable === 'temperature_2m'
        ? ('temperature' as const)
        : variable === 'precipitation'
          ? ('precipitation' as const)
          : ('wind' as const),
    agreement = confidence(
      variable === 'temperature_2m' ? values : [],
      point ? (point.time - now) / 3600 : 24,
    );
  return (
    <>
      <PageHeading
        title="Many possible futures"
        description="Individual ensemble members, their mean and a 10th–90th percentile range."
      />
      <div className="panel controls-panel">
        <label>
          Ensemble model
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {ensembleModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Variable
          <select
            value={variable}
            onChange={(e) => {
              setVariable(e.target.value);
              setThreshold(
                e.target.value === 'temperature_2m'
                  ? 25
                  : e.target.value === 'precipitation'
                    ? 0.1
                    : 40,
              );
            }}
          >
            <option value="temperature_2m">Temperature</option>
            <option value="precipitation">Precipitation</option>
            <option value="wind_speed_10m">Wind speed</option>
          </select>
        </label>
        <label>
          Exceedance threshold (display units)
          <input
            type="number"
            step=".1"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </label>
        <label style={{ flex: 1 }}>
          Inspect lead time
          <input
            aria-label="Ensemble timestamp"
            type="range"
            min="0"
            max={Math.max(0, data.length - 1)}
            value={Math.min(index, Math.max(0, data.length - 1))}
            onChange={(e) => setIndex(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="specialist-grid four">
        <Stat
          label="Ensemble mean"
          value={display(stats.mean, quantity, settings, 1, false)}
          detail={
            point
              ? `${dateLabel(point.time, d.timezone)} · ${formatTime(point.time, d.timezone, settings.time === '12h')}`
              : 'No values'
          }
        />
        <Stat
          label="10th–90th percentile"
          value={`${display(stats.p10, quantity, settings, 1, false)} – ${display(stats.p90, quantity, settings, 1, false)}`}
          detail="Central 80% of available members, not an official confidence interval"
        />
        <Stat
          label="Chance above threshold"
          value={stats.probability == null ? '—' : `${Math.round(stats.probability * 100)}%`}
          detail={`${stats.count} available members · above ${threshold} in your selected units`}
        />
        <Stat
          label="Member spread"
          value={display(
            stats.min == null || stats.max == null ? null : stats.max - stats.min,
            quantity === 'temperature' ? 'raw' : quantity,
            settings,
            1,
            false,
          )}
          detail={`${stats.count} members · maximum minus minimum in source units for temperature`}
        />
      </div>
      <ChartPanel
        title="Ensemble trajectories"
        data={data}
        timezone={d.timezone}
        series={[
          ...keys.map((k) => ({
            key: k,
            label: k.replace(`${variable}_`, '').replace(variable, 'Control'),
            quantity,
            color: '#91a6c5',
          })),
          { key: 'mean', label: 'Ensemble mean', quantity, color: '#efba7a' },
        ]}
      />
      <div className="charts-grid" style={{ marginTop: 20 }}>
        <ChartPanel
          title="Expected range over time"
          data={data}
          timezone={d.timezone}
          series={[
            { key: 'p10', label: '10th percentile', quantity, color: '#79b8ed', dash: '4 4' },
            { key: 'mean', label: 'Mean', quantity, color: '#efba7a', type: 'area' },
            { key: 'p90', label: '90th percentile', quantity, color: '#b4a3df', dash: '4 4' },
          ]}
        />
        <section className="panel stat-panel">
          <h3>Probability at this hour</h3>
          <div className="data-table-wrap">
            <table className="data-table">
              <tbody>
                {[
                  ['Freezing air', 'temperature_2m', 0, 'below'],
                  ['Temperature above 25 °C', 'temperature_2m', 25, 'above'],
                  ['Measurable precipitation', 'precipitation', 0.1, 'above'],
                  ['Wind above 40 km/h', 'wind_speed_10m', 40, 'above'],
                ].map(([label, v, t, dir]) => {
                  const k = Object.keys(d.hourly ?? {}).filter(
                      (k) => k === v || k.startsWith(`${v}_member`),
                    ),
                    s = present(k.map((key) => point?.[key]));
                  return (
                    <tr key={String(label)}>
                      <td>{label}</td>
                      <td>
                        {s.length
                          ? `${Math.round((s.filter((n) => (dir === 'below' ? n < Number(t) : n > Number(t))).length / s.length) * 100)}%`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p>
            Thresholds above use Celsius, millimetres and km/h. Probability is the fraction of
            available members at one hour.
          </p>
        </section>
      </div>
      <div className="confidence-banner panel">
        <div className="confidence-reading">{agreement.label}</div>
        <div>
          <h3>Model confidence</h3>
          <p>{agreement.explanation}</p>
        </div>
      </div>
      <MethodNote>
        Ensembles sample plausible initial conditions and model outcomes. Members are related and
        their frequencies are not calibrated event probabilities. Uncertainty usually grows with
        lead time. Missing members are excluded from all calculations. Data:{' '}
        <a href="https://open-meteo.com/en/docs/ensemble-api">Open-Meteo Ensemble API</a>.
      </MethodNote>
    </>
  );
}
