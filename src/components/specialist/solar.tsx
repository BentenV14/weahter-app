'use client';
import { useNow } from '@/hooks/use-now';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { rows } from '@/lib/weather/types';
import { aggregate } from '@/lib/weather/statistics';
import { formatTime } from '@/lib/weather/format';
import { PageHeading } from '../ui/states';
import { useDataset, DataStatus, MethodNote, Stat, ChartPanel, val } from './shared';
export function SolarView() {
  const now = useNow();
  const [tilt, setTilt] = useState(35),
    [azimuth, setAzimuth] = useState(0),
    [capacity, setCapacity] = useState(4);
  const forecast = useDataset('forecast', { tilt, azimuth }),
    satellite = useDataset('radiation', { tilt, azimuth }),
    settings = useAppStore((s) => s.settings);
  if (!forecast.dataset)
    return (
      <DataStatus
        pending={forecast.isPending}
        error={forecast.error}
        retry={() => void forecast.refetch()}
      />
    );
  const d = forecast.dataset,
    hours = rows(d.hourly)
      .filter((h) => h.time >= now - 3600)
      .slice(0, 48),
    current = hours[0],
    day = rows(d.daily)[0],
    pv = hours.map((h) => ({
      ...h,
      estimated_kw:
        h.global_tilted_irradiance == null
          ? null
          : (h.global_tilted_irradiance / 1000) * capacity * 0.85,
    })),
    energy = aggregate(
      pv.slice(0, 24).map((h) => h.estimated_kw),
      'sum',
    ),
    sat = satellite.dataset;
  return (
    <>
      <PageHeading
        title="Make the most of the light"
        description="Solar irradiance, daylight and a transparent estimate for your solar panels."
      />
      <div className="panel controls-panel">
        <label>
          Panel tilt (°)
          <input
            type="number"
            aria-label="Panel tilt"
            min="0"
            max="90"
            value={tilt}
            onChange={(e) => setTilt(Math.max(0, Math.min(90, Number(e.target.value))))}
          />
        </label>
        <label>
          Azimuth (°; 0 = south)
          <input
            type="number"
            aria-label="Panel azimuth"
            min="-180"
            max="180"
            value={azimuth}
            onChange={(e) => setAzimuth(Math.max(-180, Math.min(180, Number(e.target.value))))}
          />
        </label>
        <label>
          Installed capacity (kWp)
          <input
            type="number"
            aria-label="Panel capacity"
            min=".1"
            max="100"
            step=".5"
            value={capacity}
            onChange={(e) => setCapacity(Math.max(0.1, Math.min(100, Number(e.target.value))))}
          />
        </label>
        <p>Changes update the model’s tilted irradiance request.</p>
      </div>
      <div className="specialist-grid four">
        <Stat
          label="Global horizontal irradiance"
          value={val(current?.shortwave_radiation, 0)}
          unit="W/m²"
          detail="GHI · preceding-hour average"
        />
        <Stat
          label="Direct normal irradiance"
          value={val(current?.direct_normal_irradiance, 0)}
          unit="W/m²"
          detail="DNI · direct beam on a normal plane"
        />
        <Stat
          label="Diffuse horizontal irradiance"
          value={val(current?.diffuse_radiation, 0)}
          unit="W/m²"
          detail="DHI · scattered incoming radiation"
        />
        <Stat
          label="Global tilted irradiance"
          value={val(current?.global_tilted_irradiance, 0)}
          unit="W/m²"
          detail={`${tilt}° tilt · ${azimuth}° azimuth`}
        />
      </div>
      <div className="specialist-grid">
        <Stat
          label="Next 24 h estimated production"
          value={val(energy)}
          unit="kWh"
          detail={`${capacity} kWp system, assumed 85% performance ratio. Derived estimate.`}
        />
        <Stat
          label="Sunrise / sunset"
          value={day?.sunrise ? formatTime(day.sunrise, d.timezone, settings.time === '12h') : '—'}
          detail={`Sunset ${day?.sunset ? formatTime(day.sunset, d.timezone, settings.time === '12h') : '—'} · ${val(day?.daylight_duration == null ? null : day.daylight_duration / 3600)} h daylight`}
        />
        <Stat
          label="Sunshine duration"
          value={val(day?.sunshine_duration == null ? null : day.sunshine_duration / 3600)}
          unit="h"
          detail={`${val(day?.shortwave_radiation_sum)} MJ/m² daily solar energy`}
        />
      </div>
      <div className="charts-grid">
        <ChartPanel
          title="Incoming solar radiation"
          data={hours}
          timezone={d.timezone}
          series={[
            {
              key: 'shortwave_radiation',
              label: 'GHI',
              unit: 'W/m²',
              color: '#efba7a',
              type: 'area',
            },
            { key: 'direct_normal_irradiance', label: 'DNI', color: '#d9a398' },
            { key: 'diffuse_radiation', label: 'DHI', color: '#79b8ed' },
            { key: 'global_tilted_irradiance', label: 'GTI', color: '#8bc7b8' },
          ]}
        />
        <ChartPanel
          title="Estimated PV production"
          data={pv}
          timezone={d.timezone}
          series={[
            {
              key: 'estimated_kw',
              label: 'Estimated production',
              unit: 'kW',
              color: '#8bc7b8',
              type: 'area',
            },
          ]}
        />
      </div>
      <div style={{ marginTop: 20 }}>
        {sat ? (
          <ChartPanel
            title="Satellite-derived recent irradiance"
            data={rows(sat.hourly).filter((h) => h.shortwave_radiation != null)}
            timezone={sat.timezone}
            syncId="satellite"
            series={[
              {
                key: 'shortwave_radiation',
                label: 'Satellite GHI',
                unit: 'W/m²',
                color: '#efba7a',
                type: 'area',
              },
              { key: 'global_tilted_irradiance', label: 'Satellite GTI', color: '#8bc7b8' },
            ]}
          />
        ) : (
          <MethodNote>
            {satellite.isPending
              ? 'Retrieving satellite radiation…'
              : `Satellite radiation unavailable for this region: ${satellite.error?.message ?? 'no coverage'}.`}{' '}
            Forecast radiation remains available.
          </MethodNote>
        )}
      </div>
      <MethodNote>
        <strong>PV estimate = GTI / 1000 × installed kWp × 0.85.</strong> Hourly energy is
        integrated assuming one-hour timesteps. This estimate omits shading, snow, inverter
        clipping, temperature losses, panel-specific behavior and system orientation errors.
        Satellite estimates and future model forecasts are separate datasets.{' '}
        <a href="https://open-meteo.com/en/docs/satellite-radiation-api">Radiation methodology</a>.
      </MethodNote>
    </>
  );
}
