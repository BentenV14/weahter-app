import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { WeatherResponse } from '../weather/types';
import type { WeatherMapLayer } from './layers';
export interface MapLayerPlugin {
  load: (map: Map) => void;
  render: (map: Map, data: WeatherResponse[], time: number, opacity: number) => void;
  cleanup: (map: Map) => void;
}
export function createSamplePlugin(layer: WeatherMapLayer): MapLayerPlugin {
  return {
    load(map) {
      if (!map.getSource('weather-samples'))
        map.addSource('weather-samples', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      if (!map.getLayer('weather-points'))
        map.addLayer({
          id: 'weather-points',
          type: 'circle',
          source: 'weather-samples',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 13, 8, 34],
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'value'],
              layer.range[0],
              layer.colors[0],
              layer.range[0] + (layer.range[1] - layer.range[0]) * 0.25,
              layer.colors[1],
              layer.range[0] + (layer.range[1] - layer.range[0]) * 0.5,
              layer.colors[2],
              layer.range[0] + (layer.range[1] - layer.range[0]) * 0.75,
              layer.colors[3],
              layer.range[1],
              layer.colors[4],
            ],
            'circle-opacity': 0.7,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 0.15,
            'circle-stroke-width': 1,
          },
        });
      if (!map.getLayer('weather-values'))
        map.addLayer({
          id: 'weather-values',
          type: 'symbol',
          source: 'weather-samples',
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 12,
            'text-font': ['Noto Sans Regular'],
            'text-allow-overlap': false,
          },
          paint: { 'text-color': '#101827', 'text-halo-color': '#ffffff', 'text-halo-width': 1 },
        });
    },
    render(map, data, time, opacity) {
      this.load(map);
      const features: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: data.flatMap((d) => {
          const series = d.hourly ?? d.daily;
          if (!series) return [];
          const index = series.time.reduce(
              (best, t, i) => (Math.abs(t - time) < Math.abs(series.time[best] - time) ? i : best),
              0,
            ),
            value = series[layer.variable]?.[index];
          if (value == null) return [];
          return [
            {
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [d.longitude, d.latitude] },
              properties: {
                value,
                label: value < 10 ? value.toFixed(1) : String(Math.round(value)),
              },
            },
          ];
        }),
      };
      (map.getSource('weather-samples') as GeoJSONSource).setData(features);
      map.setPaintProperty('weather-points', 'circle-opacity', opacity);
    },
    cleanup(map) {
      for (const id of ['weather-values', 'weather-points'])
        if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource('weather-samples')) map.removeSource('weather-samples');
    },
  };
}
