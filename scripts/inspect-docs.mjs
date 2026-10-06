for (const page of ['seasonal-forecast-api', 'ensemble-api', 'marine-weather-api', 'flood-api']) {
  const html = await (await fetch(`https://open-meteo.com/en/docs/${page}`)).text();
  const values =
    html.match(/\w*(?:anomaly|ecmwf|river_discharge|swell|sea_surface|wave_peak|spread)\w*/g) ?? [];
  console.log(
    page,
    [...new Set(values)]
      .filter((v) => page !== 'seasonal-forecast-api' || /anomaly|ecmwf/.test(v))
      .slice(0, 100),
  );
}
