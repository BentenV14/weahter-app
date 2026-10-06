import type { ApiKind, Location } from '../weather/types';
export interface WeatherMapLayer {
  id: string;
  title: string;
  category: 'Atmosphere' | 'Air quality' | 'Ocean' | 'Rivers';
  variable: string;
  provider: ApiKind;
  unit: string;
  supportsTime: boolean;
  colors: string[];
  range: [number, number];
}
const layer = (
  id: string,
  title: string,
  variable: string,
  unit: string,
  range: [number, number],
  provider: ApiKind = 'forecast',
  category: WeatherMapLayer['category'] = 'Atmosphere',
): WeatherMapLayer => ({
  id,
  title,
  variable,
  unit,
  range,
  provider,
  category,
  supportsTime: true,
  colors: ['#72bced', '#6cbbb5', '#edd995', '#eea676', '#cd779d'],
});
export const mapLayers: WeatherMapLayer[] = [
  layer('temperature', 'Temperature', 'temperature_2m', '°C', [-10, 35]),
  layer('rain', 'Forecast precipitation', 'precipitation', 'mm', [0, 8]),
  layer('wind', 'Wind at 10 m', 'wind_speed_10m', 'km/h', [0, 65]),
  layer('gusts', 'Wind gusts', 'wind_gusts_10m', 'km/h', [0, 90]),
  layer('feels', 'Feels like', 'apparent_temperature', '°C', [-10, 35]),
  layer('cloud', 'Cloud cover', 'cloud_cover', '%', [0, 100]),
  layer('pressure', 'Sea-level pressure', 'pressure_msl', 'hPa', [980, 1040]),
  layer('humidity', 'Humidity', 'relative_humidity_2m', '%', [0, 100]),
  layer('snow', 'Snowfall', 'snowfall', 'cm', [0, 5]),
  layer('snow-depth', 'Snow depth', 'snow_depth', 'm', [0, 1]),
  layer('visibility', 'Visibility', 'visibility', 'm', [0, 25000]),
  layer('uv', 'UV index', 'uv_index', '', [0, 11]),
  layer('solar', 'Solar radiation', 'shortwave_radiation', 'W/m²', [0, 1000]),
  layer('aqi', 'European AQI', 'european_aqi', '', [0, 100], 'airQuality', 'Air quality'),
  layer('pm', 'PM2.5', 'pm2_5', 'µg/m³', [0, 60], 'airQuality', 'Air quality'),
  layer(
    'pollen',
    'Grass pollen',
    'grass_pollen',
    'grains/m³',
    [0, 100],
    'airQuality',
    'Air quality',
  ),
  layer('sea', 'Sea temperature', 'sea_surface_temperature', '°C', [0, 30], 'marine', 'Ocean'),
  layer('waves', 'Wave height', 'wave_height', 'm', [0, 6], 'marine', 'Ocean'),
  layer('river', 'River discharge', 'river_discharge', 'm³/s', [0, 300], 'flood', 'Rivers'),
];
export function sampleGrid(center: Location, span = 3): Location[] {
  return Array.from({ length: 25 }, (_, i) => {
    const latitude = Math.max(
        -85,
        Math.min(85, center.latitude + ((Math.floor(i / 5) - 2) * span) / 2),
      ),
      longitude = ((center.longitude + (((i % 5) - 2) * span) / 2 + 540) % 360) - 180;
    return { name: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, latitude, longitude };
  });
}
