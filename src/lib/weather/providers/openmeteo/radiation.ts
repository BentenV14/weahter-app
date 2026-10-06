export const radiation = {
  endpoint: 'https://satellite-api.open-meteo.com/v1/archive',
  ttl: 1800,
  hourly: [
    'shortwave_radiation',
    'direct_normal_irradiance',
    'diffuse_radiation',
    'global_tilted_irradiance',
  ],
};
