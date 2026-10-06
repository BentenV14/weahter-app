export type WeatherIconName =
  | 'sun'
  | 'moon'
  | 'cloud-sun'
  | 'cloud-moon'
  | 'cloud'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'unknown';
interface CodeInfo {
  label: string;
  shortLabel: string;
  icon: WeatherIconName;
  severity: 0 | 1 | 2 | 3;
  background: string;
  accessibility: string;
}
const groups: [number[], string, string, WeatherIconName, 0 | 1 | 2 | 3][] = [
  [[0], 'Clear sky', 'Clear', 'sun', 0],
  [[1], 'Mainly clear', 'Mostly clear', 'cloud-sun', 0],
  [[2], 'Partly cloudy', 'Partly cloudy', 'cloud-sun', 0],
  [[3], 'Overcast', 'Overcast', 'cloud', 0],
  [[45, 48], 'Fog', 'Fog', 'fog', 1],
  [[51], 'Light drizzle', 'Drizzle', 'drizzle', 0],
  [[53], 'Moderate drizzle', 'Drizzle', 'drizzle', 1],
  [[55], 'Dense drizzle', 'Drizzle', 'drizzle', 1],
  [[56, 57], 'Freezing drizzle', 'Freezing drizzle', 'drizzle', 2],
  [[61], 'Light rain', 'Light rain', 'rain', 0],
  [[63], 'Moderate rain', 'Rain', 'rain', 1],
  [[65], 'Heavy rain', 'Heavy rain', 'rain', 2],
  [[66, 67], 'Freezing rain', 'Freezing rain', 'rain', 2],
  [[71], 'Light snow', 'Light snow', 'snow', 1],
  [[73], 'Moderate snow', 'Snow', 'snow', 1],
  [[75], 'Heavy snow', 'Heavy snow', 'snow', 2],
  [[77], 'Snow grains', 'Snow grains', 'snow', 1],
  [[80], 'Light rain showers', 'Showers', 'rain', 1],
  [[81], 'Moderate rain showers', 'Showers', 'rain', 1],
  [[82], 'Violent rain showers', 'Heavy showers', 'rain', 2],
  [[85, 86], 'Snow showers', 'Snow showers', 'snow', 2],
  [[95], 'Thunderstorm', 'Thunderstorm', 'storm', 2],
  [[96, 99], 'Thunderstorm with hail', 'Thunderstorm', 'storm', 3],
];
export function weatherCode(code: number | null | undefined, day = true): CodeInfo {
  const group = groups.find((g) => g[0].includes(code ?? -1));
  if (!group)
    return {
      label: 'Unknown conditions',
      shortLabel: 'Unavailable',
      icon: 'unknown',
      severity: 0,
      background: 'cloudy',
      accessibility: 'Weather conditions unavailable',
    };
  const [, label, shortLabel, baseIcon, severity] = group;
  const icon = (
    !day && baseIcon === 'sun' ? 'moon' : !day && baseIcon === 'cloud-sun' ? 'cloud-moon' : baseIcon
  ) as WeatherIconName;
  return {
    label,
    shortLabel,
    icon,
    severity,
    background:
      baseIcon === 'sun'
        ? 'clear'
        : baseIcon === 'storm'
          ? 'storm'
          : baseIcon === 'snow'
            ? 'snow'
            : 'cloudy',
    accessibility: `${label}, ${day ? 'daytime' : 'nighttime'}`,
  };
}
