import type { Settings, WeatherRow } from './types';
export interface AlertRule {
  id: string;
  title: string;
  message: string;
}
export function evaluateAlerts(hours: WeatherRow[], settings: Settings): AlertRule[] {
  const result: AlertRule[] = [];
  if (hours.slice(0, 2).some((h) => (h.precipitation ?? 0) >= 0.1))
    result.push({
      id: 'rain',
      title: 'Rain in the near-term forecast',
      message: 'Model precipitation is forecast in the next two hours.',
    });
  if (hours.slice(0, 24).some((h) => h.temperature_2m != null && h.temperature_2m < 0))
    result.push({
      id: 'frost',
      title: 'Freezing air forecast',
      message: 'Sub-zero air temperatures appear in the next 24 hours.',
    });
  if (hours.slice(0, 24).some((h) => (h.wind_gusts_10m ?? 0) > settings.gustThreshold))
    result.push({
      id: 'gust',
      title: 'Strong gusts forecast',
      message: `Model gusts exceed your ${settings.gustThreshold} km/h source threshold.`,
    });
  if (hours.slice(0, 24).some((h) => (h.temperature_2m ?? -Infinity) > settings.heatThreshold))
    result.push({
      id: 'heat',
      title: 'Hot conditions forecast',
      message: `Model temperature exceeds your ${settings.heatThreshold} °C source threshold.`,
    });
  return result;
}
