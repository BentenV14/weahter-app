const cases = [
  ['forecast', {}],
  ['airQuality', {}],
  ['marine', {}],
  ['flood', {}],
  ['ensemble', {}],
  ['seasonal', {}],
  ['radiation', {}],
  ['historical', { start: '2025-09-01', end: '2025-09-07' }],
  ['historicalForecast', { start: '2025-09-01', end: '2025-09-07' }],
  ['previousRuns', { model: 'ecmwf_ifs025' }],
  ['singleRuns', { model: 'ecmwf_ifs025', run: '2026-10-01T00:00' }],
  ['climate', { model: 'MRI_AGCM3_2_S', start: '2030-01-01', end: '2030-12-31' }],
  ['forecast', { model: 'ecmwf_ifs025' }],
  ['forecast', { model: 'icon_seamless' }],
  ['forecast', { model: 'gfs_seamless' }],
];
let cursor = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (cursor < cases.length) {
      const [kind, options] = cases[cursor++],
        params = new URLSearchParams({ kind, lat: '51.2093', lon: '3.2247', ...options }),
        start = Date.now();
      try {
        const r = await fetch(
            `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/weather?${params}`,
            {
              signal: AbortSignal.timeout(45000),
            },
          ),
          d = await r.json();
        console.log(
          JSON.stringify({
            kind,
            options,
            status: r.status,
            ms: Date.now() - start,
            error: d.error,
            timezone: d.timezone,
            series: Object.keys(d)
              .filter((k) =>
                ['current', 'hourly', 'daily', 'weekly', 'monthly', 'minutely_15'].includes(k),
              )
              .map((k) => ({
                key: k,
                count: d[k].time?.length,
                variables: Object.keys(d[k]).slice(0, 7),
              })),
          }),
        );
      } catch (e) {
        console.log(JSON.stringify({ kind, error: e.message }));
      }
    }
  }),
);
for (const url of [
  '/api/search?q=Tokyo',
  '/api/radar',
  '/api/map?lat=51.2&lon=3.2&span=1&layer=temperature',
]) {
  const r = await fetch(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}${url}`),
    d = await r.json();
  console.log(
    JSON.stringify({
      url,
      status: r.status,
      count: Array.isArray(d) ? d.length : 0,
      error: d.error,
    }),
  );
}
