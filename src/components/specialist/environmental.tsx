'use client';
import { useNow } from '@/hooks/use-now';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { rows } from '@/lib/weather/types';
import { aggregate } from '@/lib/weather/statistics';
import { display, compass, dateLabel, formatTime } from '@/lib/weather/format';
import { useDataset, DataStatus, MethodNote, Stat, ChartPanel, val } from './shared';
import { PageHeading, SectionHeader } from '../ui/states';
import { WindCompass } from '../weather/metric-card';
import { Button } from '../ui/button';
const pollutants = [
  ['pm2_5', 'PM2.5', 'µg/m³'],
  ['pm10', 'PM10', 'µg/m³'],
  ['nitrogen_dioxide', 'Nitrogen dioxide', 'µg/m³'],
  ['ozone', 'Ozone', 'µg/m³'],
  ['carbon_monoxide', 'Carbon monoxide', 'µg/m³'],
  ['sulphur_dioxide', 'Sulphur dioxide', 'µg/m³'],
  ['dust', 'Dust', 'µg/m³'],
  ['aerosol_optical_depth', 'Aerosol optical depth', ''],
] as const;
const pollen = ['alder', 'birch', 'grass', 'mugwort', 'olive', 'ragweed'];
function aqiCategory(v: number | null | undefined, us = false) {
  if (v == null) return 'Unavailable';
  return us
    ? v <= 50
      ? 'Good'
      : v <= 100
        ? 'Moderate'
        : v <= 150
          ? 'Unhealthy for sensitive groups'
          : v <= 200
            ? 'Unhealthy'
            : v <= 300
              ? 'Very unhealthy'
              : 'Hazardous'
    : v <= 20
      ? 'Good'
      : v <= 40
        ? 'Fair'
        : v <= 60
          ? 'Moderate'
          : v <= 80
            ? 'Poor'
            : v <= 100
              ? 'Very poor'
              : 'Extremely poor';
}
export function AirQualityView() {
  const now = useNow();
  const query = useDataset('airQuality'),
    [variable, setVariable] = useState('european_aqi');
  if (!query.dataset)
    return (
      <DataStatus
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const d = query.dataset,
    hours = rows(d.hourly),
    current = hours.find((h) => h.time >= now - 3600) ?? hours[0],
    days = Array.from(
      new Set(
        hours.map((h) =>
          dateLabel(h.time, d.timezone, { year: 'numeric', month: '2-digit', day: '2-digit' }),
        ),
      ),
    );
  const components = [
    ['PM2.5', 'european_aqi_pm2_5'],
    ['PM10', 'european_aqi_pm10'],
    ['Ozone', 'european_aqi_ozone'],
    ['Nitrogen dioxide', 'european_aqi_nitrogen_dioxide'],
    ['Sulphur dioxide', 'european_aqi_sulphur_dioxide'],
  ]
    .filter(([, key]) => current?.[key] != null)
    .sort((a, b) => current[b[1]]! - current[a[1]]!);
  return (
    <>
      <PageHeading
        title="A breath of perspective"
        description="Pollutants, pollen and air-quality forecasts from CAMS through Open-Meteo."
      />
      <div className="specialist-grid">
        <Stat
          label="European air quality index"
          value={val(current?.european_aqi, 0)}
          detail={aqiCategory(current?.european_aqi)}
        >
          <span className="quality-badge">European AQI scale</span>
        </Stat>
        <Stat
          label="US air quality index"
          value={val(current?.us_aqi, 0)}
          detail={aqiCategory(current?.us_aqi, true)}
        />
        <Stat
          label="Dominant EAQI component"
          value={components[0]?.[0] ?? '—'}
          detail="Highest available pollutant-specific European AQI component."
        />
      </div>
      <div className="specialist-grid four">
        {pollutants.map(([key, label, unit]) => (
          <Stat
            key={key}
            label={label}
            value={val(current?.[key])}
            unit={unit}
            detail="Hourly model concentration"
          />
        ))}
      </div>
      <ChartPanel
        title="Air quality through the week"
        data={hours.filter((h) => h.time >= now - 3600)}
        timezone={d.timezone}
        series={[
          {
            key: variable,
            label:
              variable === 'european_aqi'
                ? 'European AQI'
                : variable === 'us_aqi'
                  ? 'US AQI'
                  : (pollutants.find((p) => p[0] === variable)?.[1] ?? variable),
            type: 'area',
            color: '#8bc7b8',
          },
        ]}
      >
        <select
          aria-label="Air quality chart variable"
          value={variable}
          onChange={(e) => setVariable(e.target.value)}
        >
          <option value="european_aqi">European AQI</option>
          <option value="us_aqi">US AQI</option>
          {pollutants.map(([key, label]) => (
            <option value={key} key={key}>
              {label}
            </option>
          ))}
        </select>
      </ChartPanel>
      <div className="charts-grid" style={{ marginTop: 20 }}>
        <section className="panel chart-panel">
          <SectionHeader
            title="Pollen right now"
            subtitle="Regional availability and season determine coverage"
          />
          {pollen.map((p) => (
            <div className="pollen-row" key={p}>
              <span>{p}</span>
              <div className="metric-progress">
                <i
                  style={{
                    background: '#8bc7b8',
                    width: `${Math.min(100, current?.[`${p}_pollen`] ?? 0)}%`,
                  }}
                />
              </div>
              <strong>
                {val(current?.[`${p}_pollen`], 0)} <small>grains/m³</small>
              </strong>
            </div>
          ))}
        </section>
        <ChartPanel
          title="Pollen timeline"
          data={hours.filter((h) => h.time >= now - 3600)}
          timezone={d.timezone}
          series={pollen.map((p, i) => ({
            key: `${p}_pollen`,
            label: p,
            color: ['#8bc7b8', '#efba7a', '#79b8ed', '#b4a3df', '#dda295', '#93a8cd'][i],
          }))}
        />
      </div>
      <div className="panel data-table-wrap">
        <table className="data-table">
          <caption className="sr-only">Daily peak air quality and pollen concentrations</caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Peak European AQI</th>
              <th>Category</th>
              <th>Peak PM2.5</th>
              <th>Peak grass pollen</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const h = hours.filter(
                  (v) =>
                    dateLabel(v.time, d.timezone, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    }) === day,
                ),
                aq = aggregate(
                  h.map((v) => v.european_aqi),
                  'max',
                );
              return (
                <tr key={day}>
                  <td>{day}</td>
                  <td>{val(aq, 0)}</td>
                  <td>{aqiCategory(aq)}</td>
                  <td>
                    {val(
                      aggregate(
                        h.map((v) => v.pm2_5),
                        'max',
                      ),
                    )}{' '}
                    µg/m³
                  </td>
                  <td>
                    {val(
                      aggregate(
                        h.map((v) => v.grass_pollen),
                        'max',
                      ),
                      0,
                    )}{' '}
                    grains/m³
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <MethodNote>
        Air-quality forecasts are regional estimates, not personal exposure measurements or medical
        advice. European AQI and US AQI use different scales. Pollen may be unavailable outside
        supported regions. Source:{' '}
        <a href="https://open-meteo.com/en/docs/air-quality-api">Open-Meteo / CAMS</a>.
      </MethodNote>
    </>
  );
}
export function MarineView() {
  const now = useNow();
  const query = useDataset('marine'),
    location = useAppStore((s) => s.location),
    settings = useAppStore((s) => s.settings);
  if (!query.dataset)
    return (
      <DataStatus
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const d = query.dataset,
    hours = rows(d.hourly).filter((h) => h.time >= now - 3600),
    current = hours[0],
    distance = Math.hypot(
      (location.latitude - d.latitude) * 111,
      (location.longitude - d.longitude) * 111 * Math.cos((location.latitude * Math.PI) / 180),
    );
  return (
    <>
      <PageHeading
        title="Beyond the shoreline"
        description="Wave systems, swell and ocean conditions at the nearest represented marine grid cell."
      />
      {!current || current.wave_height == null || distance > 50 ? (
        <>
          <MethodNote>
            Marine weather is unavailable at this inland point, or the represented sea grid cell is
            more than 50 km away. Select a coastal or ocean point on the map.
          </MethodNote>
          <div className="map-suggest">
            <p>Explore marine conditions at an ocean location.</p>
            <Button variant="primary" onClick={() => useAppStore.getState().setSearchOpen(true)}>
              Choose a place
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="specialist-grid four">
            <Stat
              label="Significant wave height"
              value={val(current.wave_height)}
              unit="m"
              detail={`${compass(current.wave_direction)} · ${val(current.wave_period)} s mean period`}
            >
              <WindCompass direction={current.wave_direction} />
            </Stat>
            <Stat
              label="Primary swell"
              value={val(current.swell_wave_height)}
              unit="m"
              detail={`${compass(current.swell_wave_direction)} · ${val(current.swell_wave_period)} s`}
            >
              <WindCompass direction={current.swell_wave_direction} />
            </Stat>
            <Stat
              label="Wind waves"
              value={val(current.wind_wave_height)}
              unit="m"
              detail={`${compass(current.wind_wave_direction)} · ${val(current.wind_wave_period)} s`}
            />
            <Stat
              label="Sea surface temperature"
              value={display(current.sea_surface_temperature, 'temperature', settings, 1, false)}
              unit={settings.temperature === 'celsius' ? '°C' : '°F'}
              detail={`Peak wave period ${val(current.wave_peak_period)} s`}
            />
          </div>
          <div className="charts-grid">
            <ChartPanel
              title="Wave systems"
              data={hours}
              timezone={d.timezone}
              series={[
                {
                  key: 'wave_height',
                  label: 'Total waves',
                  unit: 'm',
                  type: 'area',
                  color: '#79b8ed',
                },
                { key: 'swell_wave_height', label: 'Swell', unit: 'm', color: '#8bc7b8' },
                { key: 'wind_wave_height', label: 'Wind waves', unit: 'm', color: '#b4a3df' },
              ]}
            />
            <ChartPanel
              title="Wave period"
              data={hours}
              timezone={d.timezone}
              series={[
                { key: 'wave_period', label: 'Mean period', unit: 's', color: '#79b8ed' },
                { key: 'swell_wave_period', label: 'Swell period', unit: 's', color: '#8bc7b8' },
              ]}
            />
          </div>
          <div className="panel data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Wave height</th>
                  <th>Direction</th>
                  <th>Period</th>
                  <th>Primary swell</th>
                </tr>
              </thead>
              <tbody>
                {hours
                  .slice(0, 48)
                  .filter((_, i) => i % 3 === 0)
                  .map((h) => (
                    <tr key={h.time}>
                      <td>
                        {dateLabel(h.time, d.timezone)}{' '}
                        {formatTime(h.time, d.timezone, settings.time === '12h')}
                      </td>
                      <td>{val(h.wave_height)} m</td>
                      <td>{compass(h.wave_direction)}</td>
                      <td>{val(h.wave_period)} s</td>
                      <td>{val(h.swell_wave_height)} m</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <MethodNote>
        Significant wave height describes the average of the highest third of waves; individual
        waves can be larger. Direction is where waves come from. Model guidance is not a navigation
        or safety bulletin.{' '}
        <a href="https://open-meteo.com/en/docs/marine-weather-api">Open-Meteo Marine API</a>.
      </MethodNote>
    </>
  );
}
export function FloodView() {
  const now = useNow();
  const query = useDataset('flood');
  if (!query.dataset)
    return (
      <DataStatus
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const d = query.dataset,
    days = rows(d.daily),
    today = days.find((v) => v.time >= now - 86400) ?? days[0],
    past = days.filter((v) => v.time < now),
    future = days.filter((v) => v.time >= now);
  return (
    <>
      <PageHeading
        title="Following the rivers"
        description="GloFAS river-discharge guidance from Open-Meteo. A 30-day outlook and recent comparison."
      />
      <MethodNote>
        <strong>This is not an emergency-warning system.</strong> The nearest represented river in
        the model grid may not be the river at your selected point. Grid resolution and catchment
        size limit local interpretation. Check official authorities for flood information.
      </MethodNote>
      <div className="specialist-grid four">
        <Stat
          label="Represented river discharge"
          value={val(today?.river_discharge)}
          unit="m³/s"
          detail="Model value for the nearest represented river"
        />
        <Stat
          label="Ensemble mean"
          value={val(today?.river_discharge_mean)}
          unit="m³/s"
          detail={`Median ${val(today?.river_discharge_median)} m³/s`}
        />
        <Stat
          label="Upcoming maximum"
          value={val(
            aggregate(
              future.map((h) => h.river_discharge_max),
              'max',
            ),
          )}
          unit="m³/s"
          detail="Maximum across available ensemble guidance"
        />
        <Stat
          label="Recent 30-day mean"
          value={val(
            aggregate(
              past.map((h) => h.river_discharge),
              'mean',
            ),
          )}
          unit="m³/s"
          detail="Recent model data; not a long-term flood threshold"
        />
      </div>
      <ChartPanel
        title="River discharge & ensemble envelope"
        data={days}
        timezone={d.timezone}
        daily
        series={[
          {
            key: 'river_discharge',
            label: 'Discharge',
            unit: 'm³/s',
            type: 'area',
            color: '#79b8ed',
          },
          { key: 'river_discharge_mean', label: 'Mean', color: '#8bc7b8' },
          { key: 'river_discharge_min', label: 'Ensemble minimum', color: '#90a6cb', dash: '3 4' },
          { key: 'river_discharge_max', label: 'Ensemble maximum', color: '#b4a3df', dash: '3 4' },
        ]}
      />
      <MethodNote>
        The ensemble minimum/maximum are model-member ranges, not calibrated confidence intervals.
        Missing values remain unavailable. Data:{' '}
        <a href="https://open-meteo.com/en/docs/flood-api">Open-Meteo / GloFAS</a>.
      </MethodNote>
    </>
  );
}
