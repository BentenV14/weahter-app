# Atmos weather platform

The user's pasted brief is the full specification. This design records implementation decisions within its authorized scope.

## Purpose and product

Serve people deciding whether to go outside and enthusiasts investigating uncertainty. Real data and honest provenance are mandatory. Atmos is a modular Next.js application with current, hourly, daily, map, radar, models, ensemble, air quality, marine, flood, solar, history, climate, seasonal, astronomy, activities, comparison, lab, and settings routes.

## Visual design

Base colors: midnight #101827, slate #182233, border #29364b, mist #9cacc2, cream #f3f6fa, apricot #efba7a, rain blue #79b8ed. Manrope headlines and DM Sans body text are locally bundled. Left-aligned information, a persistent desktop sidebar, a compact mobile header and bottom navigation. Current conditions use expansive temperature typography and a designed sun/cloud illustration. Compact forecasts and synchronized charts support an asymmetric overview. Cards use subdued borders and restrained corner radii. Light mode uses the same hierarchy on cool white surfaces.

## Architecture

App Router hosts the shell and API proxy. Provider modules own request definitions; Zod validates external responses. Unix timestamps avoid ambiguous local strings and Intl formats every value in the selected location's timezone. Daily date labels remain calendar labels for climate datasets. SI source values are preserved; settings convert only display values. TanStack Query deduplicates and aborts requests. Successful forecasts persist to a bounded browser cache. Zustand persists locations/settings independently.

## Maps and radar

MapLibre uses an attributed OpenFreeMap/OpenMapTiles/OSM basemap. Forecast layers are a clearly labeled 5×5 sample grid, not invented raster data. The layer registry supports atmospheric, air, marine, and river variables. Map click fetches a point forecast and lets the user select it. A canvas draws wind particles from sampled speed/direction. RainViewer is a separate optional personal/educational adapter using only available past frames; metadata is cached and reusable raster sources preload adjacent frames. No nowcast assumption. Availability, coverage, legends, opacity, timestamps, animation controls, and attribution remain visible.

## Scientific integrity

App advisories, model agreement, activity suitability, PV estimates, and astronomy are marked as derived. Model confidence describes spread/lead time without claiming calibrated accuracy. Climate uses annual/monthly aggregation and separates projections from forecasts. Seasonal signals use documented model anomalies. Flood data explicitly refers to the nearest represented river. Missing/null source values never silently become zero.

## Verification

Unit tests cover WMO, conversions, time/DST, summaries, ensemble percentiles, confidence, activity penalties, validation, date bounds, and radar constraints. Integration tests cover proxy allowlists/caching, geocoding, query cancellation, persistence, and map samples. Browser journeys cover real navigation, favorites, settings, search, theme, URLs, mobile sizing, API failures and offline fallback. Typecheck, lint, tests, and production build run after meaningful phases. Third-party regional/access failures are honest isolated states.

## Deployment

Build in the user-specified local workspace. No hosting account, paid service, or public deployment is required by the request. Public API terms are documented; a commercial launch must use appropriately licensed provider access. No API key is invented.
