'use client';
import { FavoriteChip } from './weather/favorite-chip';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CloudSun,
  Map,
  Radio,
  Clock,
  CalendarDays,
  Layers,
  ChartNoAxesCombined,
  Wind,
  Waves,
  Droplets,
  Sun,
  History,
  Globe,
  FlaskConical,
  Settings,
  Search,
  MapPin,
  Star,
  Share2,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  Activity,
  Moon,
  GitCompareArrows,
  ChevronDown,
  Info,
  CloudOff,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { locationKey, coordinateSearch } from '@/lib/weather/format';
import { LocationPicker } from './location-picker';
import { CommandPalette } from './command-palette';
import { Button } from './ui/button';
import { AlertManager } from './alert-manager';
import { debugRequests } from '@/lib/api';
import { CountryNotice } from './country-overview';
const groups = [
  {
    label: 'Your forecast',
    items: [
      ['weather', 'Overview', CloudSun, 'Overzicht'],
      ['hourly', 'Hourly forecast', Clock, 'Per uur'],
      ['daily', '16-day forecast', CalendarDays, '16 dagen'],
      ['map', 'Weather map', Map, 'Weerkaart'],
      ['radar', 'Observed radar', Radio, 'Radar'],
    ],
  },
  {
    label: 'A closer look',
    items: [
      ['air-quality', 'Air quality', Wind, 'Luchtkwaliteit'],
      ['models', 'Model comparison', Layers, 'Modellen'],
      ['ensemble', 'Ensemble forecast', ChartNoAxesCombined, 'Ensemble'],
      ['solar', 'Sun & solar', Sun, 'Zonenergie'],
      ['marine', 'Marine weather', Waves, 'Zeeweer'],
      ['flood', 'River outlook', Droplets, 'Rivieren'],
    ],
  },
  {
    label: 'Explore',
    items: [
      ['history', 'Historical weather', History, 'Historisch weer'],
      ['climate', 'Climate explorer', Globe, 'Klimaat'],
      ['seasonal', 'Seasonal outlook', CalendarDays, 'Seizoenen'],
      ['lab', 'Weather lab', FlaskConical, 'Weerlab'],
      ['astronomy', 'Night sky', Moon, 'Nachtelijke hemel'],
      ['activities', 'Outdoor activities', Activity, 'Activiteiten'],
      ['compare', 'Compare places', GitCompareArrows, 'Vergelijk'],
    ],
  },
] as const;
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(),
    location = useAppStore((s) => s.location),
    favorites = useAppStore((s) => s.favorites),
    settings = useAppStore((s) => s.settings),
    hasSelectedLocation = useAppStore((s) => s.hasSelectedLocation),
    selectionOrigin = useAppStore((s) => s.selectionOrigin),
    selectionRevision = useAppStore((s) => s.selectionRevision),
    locationStatus = useAppStore((s) => s.locationAccess.status),
    [collapsed, setCollapsed] = useState(false),
    [online, setOnline] = useState(true),
    [info, setInfo] = useState(false),
    [debug, setDebug] = useState(false);
  const saved = favorites.some((f) => locationKey(f) === locationKey(location));
  useEffect(() => {
    const change = () => setOnline(navigator.onLine);
    change();
    window.addEventListener('online', change);
    window.addEventListener('offline', change);
    return () => {
      window.removeEventListener('online', change);
      window.removeEventListener('offline', change);
    };
  }, []);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (hasSelectedLocation) {
      if (locationStatus === 'locating' && selectionRevision === 0) return;
      p.set('lat', String(location.latitude));
      p.set('lon', String(location.longitude));
      p.set('name', location.name);
      if (selectionOrigin === 'device') p.set('location', 'device');
      else p.delete('location');
    } else {
      for (const key of ['lat', 'lon', 'name', 'location']) p.delete(key);
    }
    const search = p.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
    );
  }, [location, pathname, hasSelectedLocation, selectionOrigin, selectionRevision, locationStatus]);
  useEffect(() => {
    const restore = () => {
      const p = new URLSearchParams(window.location.search),
        l = coordinateSearch(`${p.get('lat')},${p.get('lon')}`);
      if (l)
        useAppStore
          .getState()
          .selectLocation(
            { ...l, name: p.get('name') || l.name },
            p.get('location') === 'device' ? 'device' : 'manual',
          );
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  const share = async () => {
    try {
      const link = new URL(window.location.href);
      link.searchParams.delete('location');
      if (navigator.share)
        await navigator.share({ title: `${location.name} · Atmos`, url: link.toString() });
      else {
        await navigator.clipboard.writeText(link.toString());
        useAppStore.getState().notify('Weather link copied.');
      }
    } catch {
      useAppStore.getState().notify('Sharing was canceled. You can copy the address bar link.');
    }
  };
  return (
    <div
      onClickCapture={(event) => {
        if (navigator.onLine) return;
        const anchor = (event.target as Element).closest('a');
        if (
          anchor &&
          anchor.origin === window.location.origin &&
          !anchor.hash &&
          anchor.target !== '_blank'
        ) {
          event.preventDefault();
          event.stopPropagation();
          window.location.assign(anchor.href);
        }
      }}
      className={`app ${collapsed ? 'sidebar-collapsed' : ''}`}
    >
      <a className="skip-link" href="#main">
        Skip to weather
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/weather" aria-label="Atmos home">
          <span className="brand-symbol">
            <Sun size={23} />
          </span>
          <strong>
            atmos<span>.</span>
          </strong>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="collapse-button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </Button>
        <nav aria-label="Main navigation">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(([route, label, Icon, nl]) => (
                <Link
                  title={label}
                  key={route}
                  href={`/${route}`}
                  className={`nav-item ${pathname === `/${route}` ? 'active' : ''}`}
                >
                  <Icon size={18} strokeWidth={1.6} />
                  <span>{settings.language === 'nl' ? nl : label}</span>
                  {route === 'radar' && <i className="nav-live" />}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}
            href="/settings"
            aria-label={settings.language === 'nl' ? 'Instellingen' : 'Settings'}
          >
            <Settings size={18} />
            <span>{settings.language === 'nl' ? 'Instellingen' : 'Settings'}</span>
          </Link>
          <div className="sidebar-note">
            <span className="status-dot" />A world of weather.<small>Powered by Open-Meteo</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Link className="mobile-brand" href="/weather">
            <Sun size={23} />
            atmos.
          </Link>
          <button
            className="location-control"
            onClick={() => useAppStore.getState().setSearchOpen(true)}
          >
            <MapPin size={17} />
            <strong>{hasSelectedLocation ? location.name : 'Choose a place'}</strong>
            <span>{hasSelectedLocation ? location.country : ''}</span>
            <ChevronDown size={14} />
          </button>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              aria-label={settings.language === 'nl' ? 'Zoek een locatie' : 'Search locations'}
              onClick={() => useAppStore.getState().setSearchOpen(true)}
            >
              <Search size={16} />
              <span>{settings.language === 'nl' ? 'Zoek een locatie' : 'Search locations'}</span>
            </button>
            <CommandPalette />
            <span className="topbar-divider" />
            <Button
              variant="ghost"
              size="icon"
              aria-label={saved ? 'Remove favorite' : 'Save favorite'}
              disabled={!hasSelectedLocation}
              onClick={() => useAppStore.getState().toggleFavorite(location)}
            >
              <Star
                size={19}
                fill={saved ? 'currentColor' : 'none'}
                className={saved ? 'accent' : ''}
              />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Share weather" onClick={share}>
              <Share2 size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Data sources"
              onClick={() => setInfo((v) => !v)}
            >
              <Info size={18} />
            </Button>
          </div>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            <CloudOff size={16} />
            You’re offline. Showing the last downloaded forecast where available.
          </div>
        )}
        {favorites.length > 0 && (
          <div className="favorite-strip">
            <Star size={13} />
            {favorites.map((f) => (
              <FavoriteChip
                key={locationKey(f)}
                place={f}
                selected={locationKey(f) === locationKey(location)}
              />
            ))}
            <Link href="/compare">
              Compare <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
        <CountryNotice />
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>Weather, with perspective.</span>
          <span>
            Weather data{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{' '}
            ·{' '}
            <a href="https://open-meteo.com/en/licence" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            {process.env.NODE_ENV === 'development' && (
              <button onClick={() => setDebug((v) => !v)}>API console</button>
            )}
          </span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[
          ['weather', 'Overview', CloudSun],
          ['hourly', 'Hourly', Clock],
          ['map', 'Map', Map],
          ['radar', 'Radar', Radio],
          ['settings', 'Settings', Settings],
        ].map(([path, label, Icon]) => (
          <Link
            key={String(path)}
            href={`/${path}`}
            className={pathname === `/${path}` ? 'active' : ''}
          >
            {typeof Icon !== 'string' && <Icon size={20} />}
            <span>{String(label)}</span>
          </Link>
        ))}
      </nav>
      <LocationPicker />
      {settings.alerts && hasSelectedLocation && <AlertManager />}
      {info && (
        <div className="provenance-panel panel">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Close source information"
            onClick={() => setInfo(false)}
          >
            ×
          </Button>
          <h3>Know your forecast</h3>
          <p>
            Current conditions and forecasts are weather model output from{' '}
            <a href="https://open-meteo.com/en/docs">Open-Meteo</a>, not a local weather station.
          </p>
          <dl>
            <dt>Location</dt>
            <dd>
              {hasSelectedLocation
                ? `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`
                : 'Choose a place or allow device location'}
            </dd>
            <dt>Location search</dt>
            <dd>Open-Meteo / GeoNames · up to 100 worldwide matches</dd>
            <dt>Device locality</dt>
            <dd>
              <a href="https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api">
                BigDataCloud
              </a>{' '}
              · actual device coordinates after consent
            </dd>
            <dt>Country information</dt>
            <dd>
              <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0); approximate network
              country by <a href="https://country.is/">Country.is</a>
            </dd>
            <dt>Default model</dt>
            <dd>Automatic best match; resolution varies locally</dd>
            <dt>Observed radar</dt>
            <dd>
              <a href="https://rainviewer.com/">RainViewer</a> (optional personal/educational
              provider)
            </dd>
            <dt>Basemap</dt>
            <dd>OpenFreeMap / OpenMapTiles / OpenStreetMap contributors</dd>
          </dl>
          <p>
            Insights, activity scores and confidence are app-derived guidance. They are not official
            warnings.
          </p>
        </div>
      )}
      {debug && (
        <div className="debug-panel panel">
          <Button variant="ghost" onClick={() => setDebug(false)}>
            Close console
          </Button>
          <h3>Provider requests</h3>
          {debugRequests().map((r, i) => (
            <div key={i}>
              <code>{r.url}</code>
              <small>
                {r.status} · {Math.round(r.duration)} ms · cache {r.cache} ·{' '}
                {new Date(r.timestamp).toISOString()}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
