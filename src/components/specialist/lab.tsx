'use client';
import { useState } from 'react';
import { models } from '@/lib/weather/models';
import { useAppStore } from '@/lib/store';
import { rows, type WeatherRow } from '@/lib/weather/types';
import { aggregate } from '@/lib/weather/statistics';
import { localDate } from '@/lib/weather/format';
import { PageHeading } from '../ui/states';
import { Button } from '../ui/button';
import { useDataset, DataStatus, MethodNote, Stat, ChartPanel, val } from './shared';
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
export function LabView() {
  const [mode, setMode] = useState<'previousRuns' | 'singleRuns' | 'historicalForecast'>(
      'previousRuns',
    ),
    [model, setModel] = useState('ecmwf_ifs025'),
    [form, setForm] = useState({ start: daysAgo(14), end: daysAgo(7), run: `${daysAgo(1)}T00:00` }),
    [dates, setDates] = useState(form),
    settings = useAppStore((s) => s.settings);
  const options = {
      model,
      ...(mode === 'singleRuns'
        ? { run: dates.run }
        : mode === 'historicalForecast'
          ? { start: dates.start, end: dates.end }
          : {}),
    },
    query = useDataset(mode, options),
    archive = useDataset(
      'historical',
      { start: dates.start, end: dates.end },
      mode === 'historicalForecast',
    ),
    d = query.dataset,
    data = rows(d?.hourly),
    timezone = d?.timezone ?? 'UTC';
  const verification: WeatherRow[] = rows(archive.dataset?.daily).map((day) => {
      const date = localDate(day.time, archive.dataset!.timezone),
        h = data.filter((h) => localDate(h.time, timezone) === date),
        predicted = aggregate(
          h.map((h) => h.temperature_2m),
          'mean',
        ),
        reanalysis = day.temperature_2m_mean;
      return {
        time: day.time,
        forecast: predicted,
        reanalysis,
        error: predicted != null && reanalysis != null ? predicted - reanalysis : null,
      };
    }),
    mae = aggregate(
      verification.map((h) => (h.error == null ? null : Math.abs(h.error))),
      'mean',
    );
  return (
    <>
      <PageHeading
        title="Inside the forecast"
        description="Inspect previous lead-time predictions, individual model runs and archived forecast error."
      />
      <div className="panel controls-panel">
        <label>
          Experiment
          <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="previousRuns">Previous lead-time predictions</option>
            <option value="singleRuns">Single initialization run</option>
            <option value="historicalForecast">Archived forecast vs reanalysis</option>
          </select>
        </label>
        <label>
          Weather model
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {models
              .filter((m) => m.id !== 'best_match')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      {mode !== 'previousRuns' && (
        <form
          className="panel controls-panel"
          onSubmit={(e) => {
            e.preventDefault();
            setDates({ ...form });
          }}
        >
          {mode === 'singleRuns' ? (
            <label>
              Initialization time (UTC)
              <input
                aria-label="Model run initialization"
                type="datetime-local"
                step="21600"
                value={form.run}
                onChange={(e) => setForm((f) => ({ ...f, run: e.target.value }))}
              />
            </label>
          ) : (
            <>
              <label>
                Archive start
                <input
                  type="date"
                  value={form.start}
                  max={daysAgo(1)}
                  onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                />
              </label>
              <label>
                Archive end
                <input
                  type="date"
                  value={form.end}
                  max={daysAgo(1)}
                  onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                />
              </label>
            </>
          )}
          <Button variant="primary" type="submit">
            Run experiment
          </Button>
        </form>
      )}
      {!d ? (
        <DataStatus
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : (
        <>
          <ChartPanel
            title={
              mode === 'previousRuns'
                ? 'What changed with lead time?'
                : mode === 'singleRuns'
                  ? `Model run initialized ${dates.run} UTC`
                  : 'Archived seamless forecast'
            }
            data={data}
            timezone={timezone}
            series={
              mode === 'previousRuns'
                ? [
                    {
                      key: 'temperature_2m',
                      label: 'Latest / T−0',
                      quantity: 'temperature',
                      color: '#efba7a',
                    },
                    {
                      key: 'temperature_2m_previous_day1',
                      label: 'T−24 h',
                      quantity: 'temperature',
                      color: '#79b8ed',
                    },
                    {
                      key: 'temperature_2m_previous_day2',
                      label: 'T−48 h',
                      quantity: 'temperature',
                      color: '#8bc7b8',
                    },
                    {
                      key: 'temperature_2m_previous_day3',
                      label: 'T−72 h',
                      quantity: 'temperature',
                      color: '#b4a3df',
                    },
                  ]
                : [
                    {
                      key: 'temperature_2m',
                      label: 'Forecast temperature',
                      quantity: 'temperature',
                      color: '#efba7a',
                      type: 'area',
                    },
                  ]
            }
          />
          {mode === 'previousRuns' && (
            <div style={{ marginTop: 20 }}>
              <ChartPanel
                title="Precipitation forecast revisions"
                data={data}
                timezone={timezone}
                series={[
                  {
                    key: 'precipitation',
                    label: 'Latest',
                    quantity: 'precipitation',
                    color: '#79b8ed',
                  },
                  {
                    key: 'precipitation_previous_day1',
                    label: 'T−24 h',
                    quantity: 'precipitation',
                    color: '#8bc7b8',
                  },
                  {
                    key: 'precipitation_previous_day2',
                    label: 'T−48 h',
                    quantity: 'precipitation',
                    color: '#b4a3df',
                  },
                  {
                    key: 'precipitation_previous_day3',
                    label: 'T−72 h',
                    quantity: 'precipitation',
                    color: '#efba7a',
                  },
                ]}
              />
            </div>
          )}
          {mode === 'historicalForecast' && (
            <>
              <div className="specialist-grid">
                <Stat
                  label="Mean absolute temperature error"
                  value={val(
                    mae == null ? null : mae * (settings.temperature === 'fahrenheit' ? 1.8 : 1),
                  )}
                  unit={settings.temperature === 'celsius' ? '°C' : '°F'}
                  detail="Daily mean archived seamless forecast versus reanalysis"
                />
                <Stat
                  label="Comparable days"
                  value={String(verification.filter((h) => h.error != null).length)}
                  detail="Only days where both datasets have available temperature values"
                />
                <Stat
                  label="Reference dataset"
                  value="Reanalysis"
                  detail="A model assimilating observations; not an independent station observation."
                />
              </div>
              <div className="charts-grid">
                <ChartPanel
                  title="Daily mean comparison"
                  data={verification}
                  daily
                  timezone={timezone}
                  series={[
                    {
                      key: 'forecast',
                      label: 'Archived forecast',
                      quantity: 'temperature',
                      color: '#efba7a',
                    },
                    {
                      key: 'reanalysis',
                      label: 'Reanalysis',
                      quantity: 'temperature',
                      color: '#79b8ed',
                    },
                  ]}
                />
                <ChartPanel
                  title="Signed daily temperature error"
                  data={verification.map((h) => ({
                    ...h,
                    error:
                      h.error == null
                        ? null
                        : h.error * (settings.temperature === 'fahrenheit' ? 1.8 : 1),
                  }))}
                  daily
                  timezone={timezone}
                  series={[
                    {
                      key: 'error',
                      label: 'Forecast minus reanalysis',
                      unit: settings.temperature === 'celsius' ? '°C' : '°F',
                      color: '#b4a3df',
                      type: 'bar',
                    },
                  ]}
                />
              </div>
              {archive.isError && (
                <p className="page-error">Reanalysis unavailable: {archive.error.message}</p>
              )}
            </>
          )}
        </>
      )}
      <MethodNote>
        {mode === 'previousRuns' ? (
          <>
            T−24/48/72 h are forecasts made at fixed offsets before their valid time; each curve is
            not one fixed initialization run. Missing values reflect limited regional-model
            horizons.
          </>
        ) : mode === 'singleRuns' ? (
          <>
            The initialization date is UTC; output labels use the selected location timezone. Choose
            a valid 00/06/12/18 UTC cycle. Availability and retention differ by model. New runs can
            take several hours to become available.
          </>
        ) : (
          <>
            This is a limited comparison of archived seamless forecast daily means to reanalysis,
            not a calibrated lead-time skill assessment. Shared model influences may reduce apparent
            error; unequal partial-day sampling can affect the result.
          </>
        )}{' '}
        <a href="https://open-meteo.com/en/docs/previous-runs-api">Previous runs</a> ·{' '}
        <a href="https://open-meteo.com/en/docs/single-runs-api">Single runs</a> ·{' '}
        <a href="https://open-meteo.com/en/docs/historical-forecast-api">Historical forecasts</a>.
      </MethodNote>
    </>
  );
}
