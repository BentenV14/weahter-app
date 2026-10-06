'use client';
import { useNow } from '@/hooks/use-now';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Map as MapLibre,
  Marker,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  setWorkerUrl,
  setMaxParallelImageRequests,
} from 'maplibre-gl';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  LocateFixed,
  Layers,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RefreshCw,
  X,
  MapPin,
  Radio,
  Compass,
  Info,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { mapLayers, type WeatherMapLayer } from '@/lib/map/layers';
import { createSamplePlugin } from '@/lib/map/sample-plugin';
import { apiFetch } from '@/lib/api';
import { weatherSchema } from '@/lib/weather/schema';
import type { Location, WeatherResponse } from '@/lib/weather/types';
import { useForecast, useWeather } from '@/hooks/use-weather';
import { display, formatTime, dateLabel } from '@/lib/weather/format';
import { rainViewer } from '@/lib/radar/rainviewer';
import type { RadarFrame } from '@/lib/radar/types';
import { registerRadarProtocol } from '@/lib/radar/tile-loader';
import { WeatherIcon } from '../weather/weather-icon';
import { Button } from '../ui/button';
import { PageHeading } from '../ui/states';
import { locate } from '../location-picker';
import { WindParticles } from './wind-particles';
const EMPTY: WeatherResponse[] = [];
const EMPTY_FRAMES: RadarFrame[] = [];
const EMPTY_TIMES: number[] = [];
export function WeatherMap({
  radar = false,
  compact = false,
}: {
  radar?: boolean;
  compact?: boolean;
}) {
  const now = useNow();
  const selectedForecast = useForecast();
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<MapLibre | null>(null),
    markerRef = useRef<Marker | null>(null),
    location = useAppStore((s) => s.location),
    settings = useAppStore((s) => s.settings);
  const [map, setMap] = useState<MapLibre | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState<string | null>(null),
    [layerId, setLayerId] = useState(radar ? 'radar' : 'temperature'),
    [panel, setPanel] = useState(!compact),
    [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1500),
    [opacity, setOpacity] = useState(0.75),
    [loop, setLoop] = useState(true),
    [density, setDensity] = useState(160),
    [point, setPoint] = useState<Location | null>(null),
    [coverage, setCoverage] = useState(false),
    [style, setStyle] = useState('dark'),
    [area, setArea] = useState({
      lat: location.latitude,
      lon: location.longitude,
      span: 3,
    });
  const isRadar = layerId === 'radar',
    layer: WeatherMapLayer = mapLayers.find((l) => l.id === layerId) ?? mapLayers[0];
  const plugin = useMemo(() => createSamplePlugin(layer), [layer]);
  const restoredTime = useRef<number | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search),
      l = q.get('layer');
    if (!compact && l && (l === 'radar' || mapLayers.some((v) => v.id === l))) setLayerId(l);
    if (q.has('time')) restoredTime.current = Number(q.get('time'));
  }, [compact]);
  useEffect(() => {
    if (!container.current) return;
    setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
    setMaxParallelImageRequests(4);
    registerRadarProtocol();
    let instance: MapLibre;
    try {
      const initial = useAppStore.getState().location;
      instance = new MapLibre({
        container: container.current,
        style: 'https://tiles.openfreemap.org/styles/dark',
        center: [initial.longitude, initial.latitude],
        zoom: compact ? 7 : 6,
        maxZoom: 14,
        attributionControl: { compact: true },
      });
      mapRef.current = instance;
      setMap(instance);
      instance.addControl(new NavigationControl(), 'top-right');
      if (!compact) {
        instance.addControl(new FullscreenControl(), 'top-right');
        instance.addControl(new ScaleControl(), 'bottom-left');
      }
      instance.on('load', () => setReady(true));
      instance.on('style.load', () => setReady(true));
      instance.on('error', (e) => {
        const message = e.error?.message ?? '';
        if (/radar|429|tile limit/i.test(message))
          setError('Some radar tiles are unavailable. Pause or retry shortly.');
      });
      instance.on('click', (e) =>
        setPoint({
          name: `${e.lngLat.lat.toFixed(3)}, ${e.lngLat.lng.toFixed(3)}`,
          latitude: e.lngLat.lat,
          longitude: ((e.lngLat.lng + 540) % 360) - 180,
        }),
      );
      instance.on('moveend', () => {
        const c = instance.getCenter();
        setArea({
          lat: Math.max(-85, Math.min(85, c.lat)),
          lon: ((c.lng + 540) % 360) - 180,
          span: Math.max(0.2, Math.min(20, 360 / 2 ** instance.getZoom() / 2)),
        });
      });
      const observer = new ResizeObserver(() => instance.resize());
      observer.observe(container.current);
      return () => {
        observer.disconnect();
        instance.remove();
        mapRef.current = null;
      };
    } catch {
      setError(
        'This device could not initialize the interactive map. The forecast pages are still available.',
      );
    }
  }, [compact]);
  useEffect(() => {
    if (!map) return;
    map.flyTo({
      center: [location.longitude, location.latitude],
      duration: 700,
    });
    markerRef.current?.remove();
    const el = document.createElement('div');
    el.className = 'map-marker';
    const label = document.createElement('span');
    label.textContent = location.name;
    el.append(label);
    markerRef.current = new Marker({ element: el })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map);
    setPoint(null);
    setArea((a) => ({ ...a, lat: location.latitude, lon: location.longitude }));
  }, [location, map]);
  const radarQuery = useQuery({
    queryKey: ['radar-frames'],
    queryFn: ({ signal }) => rainViewer.getFrames(signal),
    enabled: isRadar && !compact,
    staleTime: 300000,
    refetchInterval: 300000,
    retry: 1,
  });
  const frames = radarQuery.data ?? EMPTY_FRAMES,
    lastFrameCount = useRef(0);
  useEffect(() => {
    if (frames.length && lastFrameCount.current !== frames.length) {
      lastFrameCount.current = frames.length;
      setIndex(frames.length - 1);
    }
  }, [frames]);
  const samples = useQuery({
    queryKey: ['map-samples', layer.id, area],
    enabled: !isRadar && !compact && ready,
    staleTime: 600000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const p = new URLSearchParams({
        lat: String(area.lat),
        lon: String(area.lon),
        span: String(area.span),
        layer: layer.id,
      });
      const d = await apiFetch<unknown[]>(`/api/map?${p}`, signal);
      return d.map((v) => weatherSchema.parse(v));
    },
  });
  const sampleData = samples.data ?? EMPTY,
    times = sampleData[0]?.hourly?.time ?? sampleData[0]?.daily?.time ?? EMPTY_TIMES;
  const allTimes = useMemo(
      () => (isRadar ? frames.map((f) => f.time) : times),
      [isRadar, frames, times],
    ),
    selectedIndex = Math.min(index, Math.max(0, allTimes.length - 1)),
    time = allTimes[selectedIndex] ?? now;
  useEffect(() => {
    if (!allTimes.length) return;
    const wanted = restoredTime.current;
    if (wanted !== null) {
      setIndex(
        wanted > 1000000000
          ? allTimes.reduce(
              (best, t, i) => (Math.abs(t - wanted) < Math.abs(allTimes[best] - wanted) ? i : best),
              0,
            )
          : Math.min(wanted, allTimes.length - 1),
      );
      restoredTime.current = null;
    } else if (!isRadar) {
      const next = allTimes.findIndex((t) => t >= Date.now() / 1000);
      setIndex(next < 0 ? allTimes.length - 1 : next);
    }
  }, [allTimes, isRadar]);
  useEffect(() => {
    if (!compact) {
      const q = new URLSearchParams(window.location.search);
      q.set('layer', layerId);
      if (allTimes.length) q.set('time', String(time));
      window.history.replaceState(null, '', `${window.location.pathname}?${q}`);
    }
  }, [layerId, time, compact, allTimes.length]);
  useEffect(() => {
    if (!map || !ready) return;
    if (isRadar) return;
    plugin.load(map);
    return () => {
      if (map.getStyle()) plugin.cleanup(map);
    };
  }, [map, ready, isRadar, plugin]);
  useEffect(() => {
    if (!map || !ready || isRadar) return;
    try {
      if (sampleData.length) plugin.render(map, sampleData, time, opacity);
    } catch {
      setError('The weather layer could not be displayed.');
    }
  }, [map, ready, isRadar, plugin, sampleData, time, opacity]);
  useEffect(() => {
    if (!map || !ready || !isRadar || !frames.length) return;
    const active = new Set(frames.map((frame) => `radar-${frame.time}`));
    for (const existing of map.getStyle()?.layers ?? [])
      if (/^radar-\d+$/.test(existing.id) && !active.has(existing.id)) {
        map.removeLayer(existing.id);
        if (map.getSource(existing.id)) map.removeSource(existing.id);
      }
    for (const [i, frame] of frames.entries()) {
      const id = `radar-${frame.time}`;
      if (!map.getSource(id))
        map.addSource(id, {
          type: 'raster',
          tiles: [rainViewer.getTileUrl(frame).replace('https://', 'radartile://')],
          tileSize: 256,
          maxzoom: 7,
          attribution: '<a href="https://www.rainviewer.com/">Weather data by RainViewer</a>',
        });
      if (!map.getLayer(id))
        map.addLayer({
          id,
          type: 'raster',
          source: id,
          paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 },
        });
      map.setLayoutProperty(
        id,
        'visibility',
        i === selectedIndex || i === (selectedIndex + 1) % frames.length ? 'visible' : 'none',
      );
      map.setPaintProperty(id, 'raster-opacity', i === selectedIndex ? opacity : 0);
    }
    return () => {
      for (const frame of frames) {
        const id = `radar-${frame.time}`;
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
      }
    };
  }, [map, ready, isRadar, frames, selectedIndex, opacity]);
  useEffect(() => {
    if (!map || !ready) return;
    const id = 'radar-coverage';
    if (coverage && isRadar) {
      if (!map.getSource(id))
        map.addSource(id, {
          type: 'raster',
          tiles: ['radartile://tilecache.rainviewer.com/v2/coverage/0/256/{z}/{x}/{y}/0/0_0.png'],
          tileSize: 256,
          maxzoom: 7,
        });
      if (!map.getLayer(id))
        map.addLayer({
          id,
          type: 'raster',
          source: id,
          paint: { 'raster-opacity': 0.35 },
        });
      map.setLayoutProperty(id, 'visibility', 'visible');
    } else if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
  }, [coverage, isRadar, map, ready]);
  useEffect(() => {
    if (!playing || allTimes.length < 2) return;
    const timer = setInterval(
      () =>
        setIndex((i) => {
          if (i >= allTimes.length - 1) {
            if (!loop) {
              setPlaying(false);
              return i;
            }
            return 0;
          }
          const next = i + 1;
          if (isRadar && map) {
            const id = `radar-${frames[next]?.time}`;
            if (map.getSource(id) && !map.isSourceLoaded(id)) return i;
          }
          return next;
        }),
      speed,
    );
    return () => clearInterval(timer);
  }, [playing, allTimes.length, speed, loop, isRadar, map, frames]);
  const pointQuery = useWeather('forecast', {}, Boolean(point), point ?? location),
    pointData = Array.isArray(pointQuery.data) ? pointQuery.data[0] : pointQuery.data;
  const timezone = selectedForecast.data?.weather.timezone ?? location.timezone ?? 'UTC';
  const changeLayer = (id: string) => {
    setLayerId(id);
    setIndex(0);
    setPlaying(false);
    setError(null);
  };
  const changeStyle = (id: string) => {
    setStyle(id);
    if (map) {
      setReady(false);
      map.setStyle(`https://tiles.openfreemap.org/styles/${id}`);
    }
  };
  return (
    <div className={compact ? 'compact-map' : 'map-view'}>
      {!compact && (
        <PageHeading
          title={isRadar ? 'Rain, in motion' : 'The atmosphere, mapped'}
          description={
            isRadar
              ? 'Observed precipitation radar · Past frames only'
              : 'Open-Meteo model forecasts · A transparent view of sampled grid points'
          }
        >
          <Button onClick={() => useAppStore.getState().setSearchOpen(true)}>
            <Search size={15} />
            Find a place
          </Button>
        </PageHeading>
      )}
      <div className={`map-stage ${compact ? 'compact' : ''}`}>
        <div
          ref={container}
          className="map-container"
          aria-label="Interactive weather map. Click a point to retrieve its forecast."
          role="region"
        />
        {layerId === 'wind' && !compact && (
          <WindParticles
            map={map}
            data={sampleData}
            time={time}
            density={density}
            speed={1500 / speed}
            opacity={opacity}
          />
        )}
        <div className="map-top-left">
          <span className="map-mode-label">
            <span className="status-dot" />
            {compact ? 'Your surroundings' : isRadar ? 'Observed radar' : 'Model forecast'}
          </span>
          {!compact && (
            <Button className="map-control" onClick={() => setPanel(!panel)}>
              <Layers size={16} />
              {isRadar ? 'Radar' : layer.title}
            </Button>
          )}
        </div>
        <div className="map-location-tools">
          <Button
            size="icon"
            className="map-control"
            aria-label="Use my location on map"
            onClick={() => void locate()}
          >
            <LocateFixed size={18} />
          </Button>
          <Button
            size="icon"
            className="map-control"
            aria-label="Reset map orientation and location"
            onClick={() =>
              map?.flyTo({
                center: [location.longitude, location.latitude],
                bearing: 0,
                pitch: 0,
                zoom: 6,
              })
            }
          >
            <Compass size={18} />
          </Button>
        </div>
        {!compact && panel && (
          <div className="map-layer-panel">
            <div>
              <h3>Weather layers</h3>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close layers"
                onClick={() => setPanel(false)}
              >
                <X size={16} />
              </Button>
            </div>
            <button
              className={`layer-option ${isRadar ? 'selected' : ''}`}
              onClick={() => changeLayer('radar')}
            >
              <Radio size={16} />
              Observed radar<small>RainViewer · past 2 h</small>
            </button>
            {(['Atmosphere', 'Air quality', 'Ocean', 'Rivers'] as const).map((category) => (
              <div className="layer-category" key={category}>
                <p>{category}</p>
                {mapLayers
                  .filter((l) => l.category === category)
                  .map((l) => (
                    <button
                      key={l.id}
                      className={`layer-option ${layerId === l.id ? 'selected' : ''}`}
                      onClick={() => changeLayer(l.id)}
                    >
                      {l.title}
                      <span>{l.unit}</span>
                    </button>
                  ))}
              </div>
            ))}
            <label>
              Basemap
              <select value={style} onChange={(e) => changeStyle(e.target.value)}>
                <option value="dark">Dark</option>
                <option value="positron">Light</option>
                <option value="liberty">Detailed</option>
              </select>
            </label>
            <label>
              Layer opacity <span>{Math.round(opacity * 100)}%</span>
              <input
                aria-label="Layer opacity"
                type="range"
                min="0"
                max="1"
                step=".05"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
              />
            </label>
            {isRadar && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={coverage}
                  onChange={(e) => setCoverage(e.target.checked)}
                />
                Show radar coverage mask
              </label>
            )}
            {layerId === 'wind' && (
              <label>
                Particle density
                <input
                  aria-label="Wind particle density"
                  type="range"
                  min="40"
                  max="400"
                  step="20"
                  value={density}
                  onChange={(e) => setDensity(Number(e.target.value))}
                />
                <small>10 m wind · animation follows sampled model direction</small>
              </label>
            )}
          </div>
        )}
        {point && (
          <div className="map-popup panel">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Close point forecast"
              onClick={() => setPoint(null)}
            >
              <X size={16} />
            </Button>
            <p>
              <MapPin size={13} />
              {point.name}
            </p>
            {pointQuery.isPending ? (
              <div className="skeleton" style={{ height: 80 }} />
            ) : pointQuery.isError ? (
              <p role="alert">{pointQuery.error.message}</p>
            ) : (
              <>
                <WeatherIcon code={pointData?.current?.weather_code} size={34} />
                <h2>{display(pointData?.current?.temperature_2m, 'temperature', settings)}</h2>
                <p>{display(pointData?.current?.wind_speed_10m, 'wind', settings)} wind</p>
                <small>Model estimate · Elevation {pointData?.elevation ?? '—'} m</small>
              </>
            )}
            <Button
              variant="primary"
              onClick={() => {
                useAppStore.getState().selectLocation({
                  ...point,
                  timezone: pointData?.timezone,
                  elevation: pointData?.elevation,
                });
                setPoint(null);
              }}
            >
              Set as my location
            </Button>
          </div>
        )}
        {!compact &&
          (error || (radarQuery.isError && isRadar) || (samples.isError && !isRadar)) && (
            <div className="map-error" role="alert">
              <Info size={17} />
              <span>
                {error ??
                  (isRadar
                    ? 'Observed radar unavailable. Try forecast precipitation.'
                    : samples.error?.message)}
              </span>
              <Button
                onClick={() => {
                  setError(null);
                  void (isRadar ? radarQuery.refetch() : samples.refetch());
                }}
              >
                <RefreshCw size={14} />
                Retry
              </Button>
            </div>
          )}
        {!compact && (isRadar ? radarQuery.isFetching : samples.isFetching) && (
          <div className="map-fetching" role="status">
            <span className="spinner" />
            {isRadar ? 'Fetching available radar frames' : 'Sampling 25 forecast points'}
          </div>
        )}
        {!compact && isRadar && !radarQuery.isFetching && !frames.length && !radarQuery.isError && (
          <div className="map-error">
            No observed radar frames are available. Select forecast precipitation instead.
          </div>
        )}
        <div className="map-legend">
          <strong>
            {compact
              ? 'Click the map to explore'
              : isRadar
                ? 'Radar reflectivity'
                : `${layer.title} · ${layer.unit}`}
          </strong>
          {!compact && (
            <>
              <div className={`legend-gradient ${isRadar ? 'radar' : ''}`} />
              <div>
                <span>{isRadar ? 'Light' : layer.range[0]}</span>
                <span>{isRadar ? 'Moderate' : 'Model samples'}</span>
                <span>{isRadar ? 'Heavy' : layer.range[1]}</span>
              </div>
            </>
          )}
        </div>
      </div>
      {!compact && (
        <>
          <div className="radar-timeline panel">
            <Button
              size="icon"
              aria-label="Previous frame"
              disabled={!allTimes.length}
              onClick={() => {
                setPlaying(false);
                setIndex((i) => Math.max(0, i - 1));
              }}
            >
              <SkipBack size={17} />
            </Button>
            <Button
              variant="primary"
              size="icon"
              aria-label={playing ? 'Pause animation' : 'Play animation'}
              disabled={allTimes.length < 2}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? <Pause size={19} /> : <Play size={19} />}
            </Button>
            <Button
              size="icon"
              aria-label="Next frame"
              disabled={!allTimes.length}
              onClick={() => {
                setPlaying(false);
                setIndex((i) => Math.min(allTimes.length - 1, i + 1));
              }}
            >
              <SkipForward size={17} />
            </Button>
            <div className="timeline-slider">
              <input
                aria-label="Weather map timestamp"
                type="range"
                min="0"
                max={Math.max(0, allTimes.length - 1)}
                value={selectedIndex}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setPlaying(false);
                }}
              />
              <div>
                <span>
                  {allTimes[0] ? formatTime(allTimes[0], timezone, settings.time === '12h') : '—'}
                </span>
                <strong>
                  {dateLabel(time, timezone)} ·{' '}
                  {formatTime(time, timezone, settings.time === '12h')} · {timezone}
                  {!selectedForecast.data && !location.timezone ? ' (resolving location time)' : ''}
                </strong>
                <span>
                  {allTimes.length
                    ? formatTime(allTimes[allTimes.length - 1], timezone, settings.time === '12h')
                    : '—'}
                </span>
              </div>
            </div>
            <select
              aria-label="Animation speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value={3000}>0.5×</option>
              <option value={1500}>1×</option>
              <option value={750}>2×</option>
            </select>
            <label className="checkbox-label">
              <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
              Loop
            </label>
          </div>
          <div className="map-method-note">
            <Info size={16} />
            <p>
              {isRadar
                ? 'RainViewer past radar imagery, not a forecast. Frame times describe composite generation. Coverage gaps do not mean dry weather. Universal Blue; source zoom capped at 7. Tiles are rate-limited to 75/minute in this session, below the provider’s 100/IP/minute limit.'
                : 'Values at 25 sampled model grid points; no raster weather field or values between points are invented. Move the map to resample. Displayed layer units are source units.'}{' '}
              <a href={isRadar ? 'https://www.rainviewer.com/' : 'https://open-meteo.com/'}>
                {isRadar ? 'Weather data by RainViewer' : 'Weather data by Open-Meteo'}
              </a>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
