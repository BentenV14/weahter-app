# Atmos

A complete weather workspace built with Next.js and real Open-Meteo data. The overview answers the everyday questions first, while nineteen views cover forecasts, observed radar, weather maps, air quality, marine conditions, rivers, solar energy, model uncertainty, historical weather, climate, seasonal signals, astronomy and forecast verification.

## Run locally

Requires Node.js 22.9 or newer and npm. Dependencies are locked in `package-lock.json`.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

```bash
npm run build
npm run start
```

The production build enables the service worker. Installation requires HTTPS or localhost. No API key is required by the configured public Open-Meteo endpoints. The only optional environment variable is `NEXT_PUBLIC_RADAR_ENABLED=false` to disable observed radar; the default is enabled. See [.env.example](.env.example).

## Features

- Current model conditions, sixteen daily forecasts, hourly detail, synchronized charts, fifteen-minute precipitation where the provider supports it, and summaries for today, tomorrow, the weekend and the next six hours.
- Worldwide city, town and postal-code search with up to 100 matches per request and a filter covering 250 countries and territories. Direct coordinates, consented automatic device location, country information when access is declined, saved and recent places, favorite forecasts, comparison of four places, a command palette and shareable location/layer/time URLs.
- Nineteen atmospheric, air-quality, ocean and river map layers. Forecast layers show **25 actual model sample points**, a numeric legend and selected-point forecasts. Wind particles follow those sampled vectors. The application does not invent radar, contour lines or a dense weather raster from a point API.
- Optional RainViewer observed past-frame radar, playback, stepping, speed, looping, opacity, coverage and local tile preloading. Forecast precipitation is a separate model layer.
- Independent pollutant/pollen, marine, river-discharge and solar modules; tilt/azimuth controls; satellite radiation history; a clearly labeled derived PV estimate.
- ECMWF, ICON, GFS and other model overlays; ensemble members, mean, percentiles, spread, threshold probabilities and a transparent heuristic confidence indicator.
- Date-range reanalysis, monthly aggregates and previous-year comparison; multiple climate projections with optional historical baseline; native weekly/monthly seasonal anomalies.
- Weather Lab compares historical forecasts, previous fixed-lead outputs and a selected model initialization against reanalysis, with aligned valid dates and error statistics.
- Sun path, Moon phase and rise/set, twilight and golden hour; transparent outdoor activity scores; optional browser notifications enabled only by a user action in Settings.
- Light, dark and system themes; responsive sidebar and mobile navigation; Celsius/Fahrenheit, four wind units, three pressure units, metric/imperial distance and precipitation, 12/24-hour clocks. English scientific copy with Dutch navigation labels and a persisted language preference.
- Installable PWA, an offline shell and up to twelve last successful, validated location forecasts. Saved forecasts display their download time; offline navigation uses normal document requests handled by the service worker.

## Architecture

```text
src/app/                         App Router pages, manifest and server API routes
src/components/weather/         Dashboard, charts, cards and forecast views
src/components/map/             MapLibre lifecycle, sampling and wind animation
src/components/specialist/      Lazy-loaded specialist modules
src/hooks/                      Shared queries, clock, connectivity and alerts
src/lib/weather/                Types, Zod schemas, units and derived calculations
src/lib/weather/providers/      Endpoint-owned Open-Meteo adapters and allowlists
src/lib/location/               Consented geolocation, country detection and country catalog
src/lib/map/                    Layer registry, bounded grid and plugin contract
src/lib/radar/                  Interchangeable provider contract and tile scheduler
src/lib/server/                 Bounded TTL cache and in-flight deduplication
public/                         Icons, offline page, worker assets and service worker
tests/                          Unit tests and real-data browser journeys
scripts/                        Asset setup, API probes and browser review helpers
docs/                           Design, implementation plan and verification ledger
```

Components request the local `/api/weather`, `/api/search`, `/api/map` and `/api/radar` routes. Those routes validate inputs, allowlist models and upstream hosts, add timeouts, validate upstream responses with Zod, and cache promises/results in a bounded in-memory cache. Concurrent equivalent server requests share work. TanStack Query caches client responses and cancels obsolete requests. Zustand persists validated locations and settings. The overview, hourly and daily views share the same forecast query.

On a fresh visit without explicit coordinates in the URL, the browser requests device-location access. Accepted access loads a forecast at the actual device coordinates and resolves the nearest locality name through BigDataCloud's free browser reverse-geocoding endpoint. Reverse-geocoding failure still leaves the precise coordinates usable. Automatically located URLs carry `location=device` so a reload obtains the current position again; sharing removes that marker to keep the shared forecast fixed. Shared coordinate links take priority, and a manual selection made while detection is pending is preserved. Each fresh visit attempts detection again, subject to the browser's stored permission decision.

When access is declined or unavailable, Country.is supplies only an approximate network country code. The country overview uses GeoNames' free country dataset for its capital, area, currency, languages, neighbours and source population estimate. Network country detection can be affected by VPNs and never supplies a guessed nearest city. Saved places remain available; an offline visit can keep its saved forecast. If country detection fails, users can explore any country or search worldwide. Country.is and consented reverse geocoding run directly in the browser; the application does not store the returned IP address.

`/api/countries` refreshes the GeoNames catalog daily and falls back to the bundled, attributed snapshot when the source is unavailable. Browser requests also fall back to that snapshot. Maintainers using Node.js 24 can refresh the snapshot with `node scripts/update-countries.mjs`. Population figures are source estimates, not current census statistics.

Source quantities remain Celsius, km/h, hPa, millimeters and Unix epoch seconds internally. Display conversion happens at the edge. Every forecast chart uses the location's IANA timezone; comparisons align by UTC timestamps. Nulls remain unavailable, and individual provider failures leave the other modules usable.

MapLibre and specialist views load on demand. Large chart datasets are bounded to 400 rendered points. The map plugin contract defines `load`, `render` and `cleanup`; layers reuse their sources during animation. Radar sources are retained for the active frame set and removed as metadata rolls forward. The tile scheduler caps requests to 75/minute per session and preloads only the next frame. This does not coordinate separate browser tabs or users behind one IP.

## Providers, attribution and usage limits

Documentation and live capabilities were checked on **6 October 2026**. Upstream availability and limits can change.

| Data                      | Provider / documentation                                                                                                                                                                                        | Interpretation                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Forecast and geocoding    | [Open-Meteo](https://open-meteo.com/en/docs)                                                                                                                                                                    | Model output, including current conditions; not a local station observation                                                     |
| Worldwide location search | [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api), GeoNames                                                                                                                              | Maximum 100 matches per query; optional ISO country filter; city, town and postal-code coverage depends on the source           |
| Device locality           | [BigDataCloud free client reverse geocoding](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api)                                                                                            | Browser-only lookup of actual device coordinates after consent; no API key                                                      |
| Approximate country       | [Country.is](https://country.is/)                                                                                                                                                                               | Network country code only; can be affected by VPNs; no API key                                                                  |
| Country information       | [GeoNames country dataset](https://download.geonames.org/export/dump/countryInfo.txt), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)                                                                | 250 current countries and territories; source estimates with a bundled fallback                                                 |
| Ensemble forecasts        | [Ensemble API](https://open-meteo.com/en/docs/ensemble-api)                                                                                                                                                     | Member distribution; displayed confidence is app-derived                                                                        |
| Air quality and pollen    | [Air Quality API](https://open-meteo.com/en/docs/air-quality-api)                                                                                                                                               | CAMS model output; pollen coverage varies by region and season                                                                  |
| Marine and rivers         | [Marine API](https://open-meteo.com/en/docs/marine-weather-api), [Flood API](https://open-meteo.com/en/docs/flood-api)                                                                                          | Ocean models and GloFAS modeled discharge; inland marine data may be unavailable; river output is not an official flood warning |
| Radiation                 | [Satellite Radiation API](https://open-meteo.com/en/docs/satellite-radiation-api)                                                                                                                               | Satellite-derived radiation history, distinct from the solar forecast                                                           |
| Historical data           | [Historical API](https://open-meteo.com/en/docs/historical-weather-api)                                                                                                                                         | Reanalysis estimates, with availability lag; not ground truth at a station                                                      |
| Climate                   | [Climate API](https://open-meteo.com/en/docs/climate-api)                                                                                                                                                       | High-emission climate-model projections through 2050; not predictions for individual future days                                |
| Seasonal                  | [Seasonal API](https://open-meteo.com/en/docs/seasonal-forecast-api)                                                                                                                                            | Weekly/monthly anomaly signals; not deterministic daily forecasts                                                               |
| Model verification        | [Historical Forecast](https://open-meteo.com/en/docs/historical-forecast-api), [Previous Runs](https://open-meteo.com/en/docs/previous-runs-api), [Single Runs](https://open-meteo.com/en/docs/single-runs-api) | Availability depends on model and initialization date; daily valid-time comparisons disclose their limitations                  |
| Observed radar            | [RainViewer API](https://www.rainviewer.com/api.html)                                                                                                                                                           | Optional observed **past frames only**                                                                                          |
| Basemap                   | [OpenFreeMap](https://openfreemap.org/), OpenMapTiles and OpenStreetMap contributors                                                                                                                            | Attribution stays visible on the map                                                                                            |

Open-Meteo data requires [CC BY 4.0 attribution](https://open-meteo.com/en/licence). Its free hosted API is intended for non-commercial use and has usage limits. A commercial deployment needs an appropriate Open-Meteo plan and customer endpoints; credentials must remain in the server adapters. The default adapters are for local/personal use, not a licensed commercial service.

RainViewer's 2026 API transition removes publicly exposed future/nowcast and satellite frames, restricts source zoom to 7, uses the universal blue color scheme, and documents an IP request limit. This app deliberately reads only `radar.past` metadata, overzooms existing imagery instead of requesting higher source zooms, and uses a conservative scheduler. Free usage is personal/educational, without an availability guarantee. For a commercial product, disable this provider or replace it with a properly licensed `RadarProvider` adapter. No future-frame radar, official warnings, fronts or lightning feed is fabricated.

Derived summaries, activity suitability, PV estimates and confidence are identified in the UI. Browser notifications only work while the application runs; there is no background push service. Scores describe comfort, not route or water safety. Astronomy comes from SunCalc and handles dates with no rise/set at polar latitudes.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
# or all four:
npm run validate
```

Unit coverage includes weather codes, conversions, DST, date validity, schemas, missing values, rain windows, activities, confidence, aggregation, polar astronomy, alerts, storage restoration, provider allowlists, bounded sampling, caching, radar metadata, worldwide geocoding, country parsing, permission handling and manual-selection races.

Start the development server, then run `npm run test:e2e` for the online journeys. Browser tests require installed Chrome. They use actual weather and search data; simulated permission/location tests mock only reverse-geocoding and country metadata, and deliberate error states are mocked. For the full suite, including offline reload/navigation, use the production server on port 3100:

```powershell
npm.cmd run build
npm.cmd run start -- --port 3100
# in another terminal:
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:3100'
npm.cmd run test:e2e
node scripts/accessibility-review.mjs
```

`scripts/probe-apis.mjs` verifies all configured endpoints against the running local server. `scripts/browser-review.mjs` captures layouts and visits every module. Screenshots and logs go in ignored `artifacts/`. API calls need internet access; tests may fail when an upstream provider is down or rate-limited. Development-only API diagnostics are available in the footer.

## Operating and extending

Deploy with a Node-compatible Next.js host and HTTPS. In-memory cache entries are per process; multiple replicas should use a shared bounded cache and a server rate limiter before public traffic. The service worker is versioned: change `VERSION` when changing the offline-shell caching policy. MapLibre worker assets are copied by `postinstall`, so deployment must run the normal install step. Fonts are bundled locally.

Useful next extensions are full English/Dutch translation, a licensed dense weather-tile adapter, official regional warning feeds, station observations and webcams, configurable historical reanalysis models, additional activity-specific factors, background push delivery, and production monitoring. These need suitable data/licensing or product decisions and are intentionally distinguished from the implemented model-data platform.
