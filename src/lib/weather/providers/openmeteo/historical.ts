export const historical = {
  endpoint: 'https://archive-api.open-meteo.com/v1/archive',
  ttl: 86400,
  daily: [
    'temperature_2m_max',
    'temperature_2m_min',
    'temperature_2m_mean',
    'precipitation_sum',
    'snowfall_sum',
    'wind_speed_10m_max',
    'sunshine_duration',
    'shortwave_radiation_sum',
  ],
};
export const historicalForecast = {
  endpoint: 'https://historical-forecast-api.open-meteo.com/v1/forecast',
  ttl: 86400,
  hourly: ['temperature_2m', 'precipitation', 'wind_speed_10m'],
};
export const previousRuns = {
  endpoint: 'https://previous-runs-api.open-meteo.com/v1/forecast',
  ttl: 3600,
  hourly: [
    'temperature_2m',
    'temperature_2m_previous_day1',
    'temperature_2m_previous_day2',
    'temperature_2m_previous_day3',
    'precipitation',
    'precipitation_previous_day1',
    'precipitation_previous_day2',
    'precipitation_previous_day3',
  ],
};
export const singleRuns = {
  endpoint: 'https://single-runs-api.open-meteo.com/v1/forecast',
  ttl: 86400,
  hourly: ['temperature_2m', 'precipitation', 'wind_speed_10m'],
};
