export const flood = {
  endpoint: 'https://flood-api.open-meteo.com/v1/flood',
  ttl: 21600,
  daily: [
    'river_discharge',
    'river_discharge_mean',
    'river_discharge_median',
    'river_discharge_min',
    'river_discharge_max',
  ],
};
