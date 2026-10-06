# Execution ledger — plan: docs/superpowers/plans/2026-10-06-atmos.md

Completed in the user-authorized empty local workspace on 6 October 2026. No public deployment or paid service was requested.

Pre-flight: source quantities flow through validated WeatherResponse; formatting handles preferred units and location timezone. All specialist views share the provider query layer and chart contracts. Radar is separate from model samples.

- Task 1: complete — strict setup, domain types, schemas, WMO codes, units, summaries, scores and statistics. Initial missing-module tests failed; implementations passed.
- Task 2: complete — twelve provider kinds, allowlisted server routes, bounded cache, geocoding, persistent preferences, forecast storage and cancellation. Provider/state tests pass.
- Task 3: complete — nineteen module routes, responsive navigation, location picker, command palette, core forecasts, synchronized charts, favorites and comparison. Browser tests reproduced the URL/preferences hydration race; restoration now finishes before shell mount.
- Task 4: complete — MapLibre, nineteen sampled layers, point selection, wind vectors, animation controls and radar adapter. Sources reused across frames; obsolete radar sources cleaned up. Map/radar browser journey passes.
- Task 5: complete — environmental, solar, model, ensemble, historical, climate, seasonal, lab, astronomy and activity views. Fifteen weather configurations plus geocoding, radar and map probes returned 200 with real data. Satellite endpoint corrected using current documentation.
- Task 6: complete — icons/manifest, service worker, offline shell, saved forecasts, attribution, README, error states, browser journeys and accessibility/layout review.

Ruling: OpenFreeMap replaces initially considered CARTO — current CARTO access requires credentials; OpenFreeMap supports the intended key-free local setup — cost if wrong: reliance on a different external basemap service.

Ruling: Forecast maps display actual bounded model points and radar displays observed past imagery — these public APIs do not provide licensed dense forecast tiles or future radar — cost if wrong: continuous forecast rasters require a future licensed adapter.

Ruling: English scientific copy with Dutch navigation is the initial localization scope — full translation was conditional in the brief — cost if wrong: Dutch users still need English for detailed module copy.

Final review: one fresh read-only reviewer (gpt-6-astra), no Critical findings. Four Important findings fixed: selections resolve from the active dataset, forecast refresh/date-aware saved-data labels, same-model climate matching, and map timezone resolution. Timestamp validation and climate-year labeling were regraded Important because malformed data can crash rendering and missing years make annual projections ambiguous; both fixed.

Final fixes verified: four new unit regressions initially failed, then passed. Browser regressions reproduced the incorrect future-day “Now” label and missing expired-cache age, then passed. The location-selection journey checks humidity against the active city's real response. No deferred review findings.

Declined-to-judge rulings: licensed optional feeds, dense weather tiles, full Dutch translation, public commercial deployment and calibrated skill claims remain documented extensions. Their cost is reduced scope compared with a licensed commercial service, without fabricated data or silent claims.

Final evidence:

- Typecheck: pass.
- Lint: pass, no errors or warnings.
- Unit tests: 26/26 in 5 files pass.
- Production build: pass; 27 generated routes/pages, all 19 modules and four dynamic APIs.
- Production Playwright: 7/7 journeys pass, including settings/URL persistence, Tokyo timezone, map/radar, mobile, permission denial, API failures, offline recovery and a real forecast advanced twenty days to expiry.
- Axe WCAG A/AA: no violations found in desktop dark/light, tablet, mobile or search dialog.
- Browser console: no errors in reviewed layouts or all-module navigation.
- Desktop/tablet/mobile and light/dark screenshots visually reviewed; no horizontal overflow; real OpenFreeMap tiles render.
- Production dependency audit: zero vulnerabilities.

Artifacts: ignored `artifacts/` contains screenshots and logs. Production preview: http://localhost:3100. Development: http://localhost:3000.

## Worldwide locations and automatic startup — follow-up

Completed the requested location expansion and consent flow. Open-Meteo / GeoNames search now requests the maximum 100 matches, supports a country filter, and retains direct-coordinate input. GeoNames supplies 250 current countries and territories through a daily-cached country endpoint and an attributed, downloaded fallback snapshot. No paid credentials are needed by these configured sources.

Startup and refresh load actual device coordinates when permission is accepted, with a locality name from BigDataCloud's browser reverse-geocoding endpoint. Automatic URLs carry `location=device`; shared links remove this marker and retain their intended coordinates. Denied or unavailable access opens country information, using only Country.is's approximate country code. Country detection never supplies a guessed nearest city. Manual selections made during detection remain active, and a renewed explicit device request supersedes an earlier manual selection. Offline startup restores a previously chosen place and its saved forecast.

Review findings resolved: old coordinates are removed immediately when denied startup enters country information, including while a network-country lookup is pending; device URLs re-detect on reload; repeated explicit GPS requests update intent; denial messages accurately describe available country information. The delayed-country reload, moved-device reload and manual-selection races have regressions. Direct-coordinate input resolves immediately rather than showing an old recent result during the text-search debounce.

Final follow-up evidence:

- Typecheck and lint: pass.
- Unit tests: 36/36 in 6 files pass, including ten location tests.
- Production build: pass; five dynamic API routes, including the new country catalog.
- Production Playwright: 12/12 journeys pass, including five new location journeys, offline navigation and expired real forecast data.
- Live API checks: country catalog returns 250 entries; a worldwide London query returns 100 matches across 23 countries.
- Axe WCAG A/AA: no violations in country desktop light/mobile dark, worldwide search, forecast desktop dark/light, tablet, mobile or the search dialog.
- Country desktop/mobile screenshots visually reviewed; no horizontal overflow. Existing forecast accessibility and browser review scripts now use explicit example coordinates.

Provider capabilities and usage terms are linked in README. Country population values are source estimates, with their limitations visible. Source failure falls back to the genuine bundled country snapshot; unavailable device/network detection leaves worldwide search usable. Precise browser position and country detection are client-side; returned IP addresses are not stored by the app.
