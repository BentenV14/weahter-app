'use client';
import { useAppStore, defaultSettings } from '@/lib/store';
import { locationKey } from '@/lib/weather/format';
import type { Settings } from '@/lib/weather/types';
import { PageHeading } from '../ui/states';
import { Button } from '../ui/button';
import { ArrowUp, ArrowDown, X, MapPin, Sun, Moon, Laptop } from 'lucide-react';
const preferences: {
  key: keyof Settings;
  title: string;
  description: string;
  options: [string, string][];
}[] = [
  {
    key: 'temperature',
    title: 'Temperature',
    description: 'Forecasts, charts and metric cards',
    options: [
      ['celsius', 'Celsius (°C)'],
      ['fahrenheit', 'Fahrenheit (°F)'],
    ],
  },
  {
    key: 'wind',
    title: 'Wind speed',
    description: 'Wind and gusts',
    options: [
      ['kmh', 'km/h'],
      ['ms', 'm/s'],
      ['mph', 'mph'],
      ['kn', 'knots'],
    ],
  },
  {
    key: 'pressure',
    title: 'Pressure',
    description: 'Sea-level and surface pressure',
    options: [
      ['hPa', 'hPa'],
      ['mmHg', 'mmHg'],
      ['inHg', 'inHg'],
    ],
  },
  {
    key: 'precipitation',
    title: 'Precipitation',
    description: 'Accumulated rain and model amounts',
    options: [
      ['mm', 'Millimetres'],
      ['inch', 'Inches'],
    ],
  },
  {
    key: 'distance',
    title: 'Distance',
    description: 'Visibility and distance displays',
    options: [
      ['km', 'Kilometres'],
      ['mi', 'Miles'],
    ],
  },
  {
    key: 'time',
    title: 'Time format',
    description: 'Always in the forecast location’s timezone',
    options: [
      ['24h', '24-hour'],
      ['12h', '12-hour'],
    ],
  },
  {
    key: 'language',
    title: 'Navigation language',
    description: 'Scientific descriptions are currently in English',
    options: [
      ['en', 'English'],
      ['nl', 'Nederlands'],
    ],
  },
];
export function SettingsView() {
  const settings = useAppStore((s) => s.settings),
    favorites = useAppStore((s) => s.favorites),
    location = useAppStore((s) => s.location),
    update = useAppStore((s) => s.updateSettings);
  const notifications = async () => {
    if (!('Notification' in window)) {
      useAppStore.getState().notify('Browser notifications aren’t supported on this device.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      update({ alerts: true });
      useAppStore.getState().notify('Weather insights enabled while Atmos is open.');
    } else {
      update({ alerts: false });
      useAppStore
        .getState()
        .notify('Notification permission was not granted. Preferences remain saved.');
    }
  };
  return (
    <>
      <PageHeading
        title="Weather, your way"
        description="Your preferences save automatically on this device."
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>Units & display</h2>
          {preferences.map((p) => (
            <label className="setting-row" key={p.key}>
              <div>
                <strong>{p.title}</strong>
                <small>{p.description}</small>
              </div>
              <select
                aria-label={p.title}
                value={String(settings[p.key])}
                onChange={(e) => update({ [p.key]: e.target.value } as Partial<Settings>)}
              >
                {p.options.map(([v, label]) => (
                  <option value={v} key={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </section>
        <div>
          <section className="panel settings-panel">
            <h2>Appearance</h2>
            <div className="model-toggles">
              {(
                [
                  ['light', 'Light', Sun],
                  ['dark', 'Dark', Moon],
                  ['system', 'System', Laptop],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  className={settings.theme === value ? 'active' : ''}
                  aria-pressed={settings.theme === value}
                  onClick={() => update({ theme: value })}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            <p className="settings-note">
              System follows your device’s appearance. Motion respects your device’s reduced-motion
              preference.
            </p>
          </section>
          <section className="panel settings-panel" style={{ marginTop: 20 }}>
            <h2>Saved places</h2>
            {favorites.map((f, i) => (
              <div className="favorite-setting" key={locationKey(f)}>
                <span>
                  <button
                    style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }}
                    onClick={() => useAppStore.getState().selectLocation(f)}
                  >
                    {f.name}
                  </button>
                  <small>
                    {f.latitude.toFixed(3)}, {f.longitude.toFixed(3)} · {f.country}
                  </small>
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Move ${f.name} up`}
                  disabled={i === 0}
                  onClick={() => useAppStore.getState().moveFavorite(i, -1)}
                >
                  <ArrowUp size={13} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Move ${f.name} down`}
                  disabled={i === favorites.length - 1}
                  onClick={() => useAppStore.getState().moveFavorite(i, 1)}
                >
                  <ArrowDown size={13} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove favorite ${f.name}`}
                  onClick={() => useAppStore.getState().toggleFavorite(f)}
                >
                  <X size={13} />
                </Button>
              </div>
            ))}
            {!favorites.length && (
              <p className="settings-empty">
                Save a place with the star in the header. Switch between your favorites from any
                view.
              </p>
            )}
            <Button
              onClick={() => {
                if (!favorites.some((f) => locationKey(f) === locationKey(location)))
                  useAppStore.getState().toggleFavorite(location);
                else useAppStore.getState().setSearchOpen(true);
              }}
            >
              <MapPin size={14} />
              Save {location.name}
            </Button>
          </section>
        </div>
        <section className="panel settings-panel">
          <h2>Weather insights & notifications</h2>
          <label className="setting-row">
            <div>
              <strong>Gust threshold</strong>
              <small>Source value in km/h</small>
            </div>
            <input
              aria-label="Gust notification threshold"
              type="number"
              min="20"
              max="200"
              value={settings.gustThreshold}
              onChange={(e) =>
                update({ gustThreshold: Math.max(20, Math.min(200, Number(e.target.value))) })
              }
            />
          </label>
          <label className="setting-row">
            <div>
              <strong>Heat threshold</strong>
              <small>Source value in °C</small>
            </div>
            <input
              aria-label="Heat notification threshold"
              type="number"
              min="20"
              max="50"
              value={settings.heatThreshold}
              onChange={(e) =>
                update({ heatThreshold: Math.max(20, Math.min(50, Number(e.target.value))) })
              }
            />
          </label>
          <p className="settings-note">
            Optional app-generated advisories for near-term rain, frost, strong gusts and heat.
            Browser notifications operate while the app is open; there is no background push
            service. Each type is sent at most once per local day and place.
          </p>
          <div className="settings-actions">
            <Button
              variant="primary"
              onClick={
                settings.alerts ? () => update({ alerts: false }) : () => void notifications()
              }
            >
              {settings.alerts ? 'Disable browser notifications' : 'Enable browser notifications'}
            </Button>
          </div>
        </section>
        <section className="panel settings-panel">
          <h2>On this device</h2>
          <p className="settings-note">
            Favorites, recent searches, units and the last downloaded forecasts stay in local
            storage. There’s no account or cloud synchronization. The offline shell and forecasts
            are saved after a successful visit in a production build.
          </p>
          <div className="settings-actions">
            <Button
              onClick={() => {
                update(defaultSettings);
                useAppStore.getState().notify('Display preferences restored to defaults.');
              }}
            >
              Restore display defaults
            </Button>
            <Button
              onClick={() => {
                for (const key of Object.keys(localStorage))
                  if (key.startsWith('atmos-forecast:')) localStorage.removeItem(key);
                useAppStore.getState().notify('Downloaded forecast copies cleared.');
              }}
            >
              Clear saved forecasts
            </Button>
          </div>
          <p className="settings-note">
            <a href="https://open-meteo.com/en/terms">Open-Meteo usage terms</a> ·{' '}
            <a href="https://www.rainviewer.com/api.html">Radar provider terms</a> ·{' '}
            <a href="https://openfreemap.org/">Basemap attribution</a>
          </p>
        </section>
      </div>
    </>
  );
}
