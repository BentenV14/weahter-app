import { test, expect } from '@playwright/test';
import { weatherSchema } from '@/lib/weather/schema';
test('real forecast, international search, favorites and unit persistence', async ({ page }) => {
  await page.goto('/weather?lat=51.2093&lon=3.2247&name=Bruges');
  await expect(page.getByText('The next few hours', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save favorite', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove favorite', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Search locations', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Search cities, postal codes or coordinates' })
    .fill('London');
  await expect(page.locator('#location-results').getByRole('option').first()).toContainText(
    'London',
  );
  await page.locator('#location-results').getByRole('option').first().click();
  await expect(page.locator('.hero-top')).toContainText('London');
  const selectedUrl = page.url();
  await page.goto('/settings');
  await page.getByLabel('Temperature', { exact: true }).selectOption('fahrenheit');
  await page.getByLabel('Wind speed', { exact: true }).selectOption('mph');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.goto(selectedUrl);
  await expect(page.locator('.hero-temperature')).toContainText('F');
  await expect(page.locator('.hero-bottom')).toContainText('mph');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('.hero-top')).toContainText('London');
  await expect(page.locator('.hero-temperature')).toContainText('F');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Filter commands').fill('Compare forecast');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/models/);
  await expect(
    page.getByRole('heading', { name: 'Different models. A clearer picture.' }),
  ).toBeVisible();
});
test('daily breakdown, chart controls and location timezone', async ({ page }) => {
  await page.goto('/hourly?lat=35.6762&lon=139.6503&name=Tokyo');
  await expect(page.getByText(/Times in Asia\/Tokyo/)).toBeVisible();
  await page.getByRole('button', { name: '72 h', exact: true }).click();
  await page.getByLabel('Filter hourly charts').selectOption('Wind at 10 m');
  await expect(page.locator('.charts-grid .chart-panel')).toHaveCount(1);
  await page.goto(`/daily${new URL(page.url()).search}`);
  await expect(page.locator('.daily-detail-card')).toHaveCount(16);
  await page.locator('.daily-detail-card').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close daily detail' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('map point selection, layers and radar controls', async ({ page }) => {
  await page.goto('/map?lat=51.2093&lon=3.2247&name=Bruges');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await page.locator('.maplibregl-canvas').click({ position: { x: 650, y: 250 } });
  await expect(page.locator('.map-popup h2')).toBeVisible();
  await page.getByRole('button', { name: 'Set as my location' }).click();
  await expect(page).toHaveURL(/lat=/);
  await page.getByRole('button', { name: 'Forecast precipitation', exact: false }).click();
  await expect(page.locator('.map-mode-label')).toHaveText('Model forecast');
  await expect(page).toHaveURL(/layer=rain/);
  const radarParameters = new URL(page.url()).searchParams;
  radarParameters.delete('layer');
  radarParameters.delete('time');
  await page.goto(`/radar?${radarParameters}`);
  await expect(page.getByRole('heading', { name: 'Rain, in motion' })).toBeVisible();
  await expect(page.getByLabel('Play animation')).toBeEnabled();
  await page.getByLabel('Play animation').click();
  await expect(page.getByLabel('Pause animation')).toBeVisible();
  await page.getByLabel('Pause animation').click();
  await page.getByLabel('Layer opacity').press('Home');
  await expect(page.getByLabel('Layer opacity')).toHaveValue('0');
  await page.getByLabel('Next frame').click();
});
test('mobile layout, denial, provider failure and radar unavailable', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/weather?lat=51.2093&lon=3.2247&name=Bruges');
  await expect(page.getByText('The next few hours', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await context.clearPermissions();
  await page.getByRole('button', { name: 'Search locations', exact: true }).click();
  await page.getByRole('button', { name: /Use my current location/ }).click();
  await expect(
    page.locator('.toast').filter({ hasText: /Location access denied|could not be determined/ }),
  ).toBeVisible();
  await page.route('**/api/weather?*kind=forecast*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Provider temporarily unavailable.' }),
    }),
  );
  await page.goto('/weather?lat=-30.1&lon=25.2&name=Uncached');
  await expect(page.locator('.error-state')).toContainText('Provider temporarily unavailable');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.route('**/api/radar', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Radar unavailable.' }),
    }),
  );
  await page.goto(`/radar${new URL(page.url()).search}`);
  await expect(page.locator('.map-error')).toContainText('Observed radar unavailable');
});
test('offline uses the last real downloaded forecast', async ({ page, context }) => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL?.includes('3100'),
    'Service worker runs in production. Run against port 3100.',
  );
  await page.goto('/weather?lat=51.2093&lon=3.2247&name=Bruges');
  await expect(page.getByText('The next few hours', { exact: true })).toBeVisible();
  const value = (await page.locator('.hero-temperature').textContent()) ?? '';
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByText('The next few hours', { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.goto('/settings');
  await context.setOffline(true);
  await page.getByRole('link', { name: 'Overview', exact: true }).first().click();
  await expect(page.locator('.hero-temperature')).toHaveText(value);
  await expect(page.locator('.freshness')).toContainText('Saved forecast');
  await expect(page.locator('.offline-banner')).toBeVisible();
  await context.setOffline(false);
});
test('hourly selection and map timeline follow the active city', async ({ page }) => {
  await page.goto('/hourly?lat=51.2093&lon=3.2247&name=Bruges');
  await expect(page.locator('.hour-column')).toHaveCount(24);
  const original = weatherSchema.parse(
    await (await page.request.get('/api/weather?kind=forecast&lat=51.2093&lon=3.2247')).json(),
  );
  const timestamp = original.hourly!.time.filter((t) => t >= Date.now() / 1000 - 1800)[8];
  await page.locator('.hour-column').nth(8).click();
  const old = await page.locator('.hour-detail').innerText();
  await page.getByRole('button', { name: 'Search locations', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Search cities, postal codes or coordinates' })
    .fill('35.6762, 139.6503');
  await page.locator('#location-results').getByRole('option').first().click();
  await expect(page.getByText(/Times in Asia\/Tokyo/)).toBeVisible();
  await expect(page.locator('.hour-detail')).not.toHaveText(old);
  const active = weatherSchema.parse(
      await (await page.request.get('/api/weather?kind=forecast&lat=35.6762&lon=139.6503')).json(),
    ),
    index = active.hourly!.time.indexOf(timestamp);
  await expect(page.locator('.hour-detail')).toContainText(
    `Humidity ${active.hourly!.relative_humidity_2m[index]}%`,
  );
  await page.goto(`/daily${new URL(page.url()).search}`);
  await expect(page.locator('.daily-detail-card')).toHaveCount(16);
  await page.locator('.daily-detail-card').nth(1).click();
  await expect(page.locator('.daily-dialog .hour-time').first()).not.toHaveText('Now');
  await page.goto('/map?lat=35.6762&lon=139.6503&name=Tokyo');
  await expect(page.locator('.timeline-slider')).toContainText('Asia/Tokyo');
});
test('expired real offline data discloses its age and calendar dates', async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL?.includes('3100'),
    'Requires production service worker',
  );
  await page.goto('/weather?lat=51.2093&lon=3.2247&name=Bruges');
  await expect(page.getByText('The next few hours', { exact: true })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByText('The next few hours', { exact: true })).toBeVisible();
  const now = Date.now();
  await page.clock.install({ time: new Date(now + 20 * 86400000) });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.freshness')).toContainText('20 d old');
  await expect(page.locator('.hero-badge')).toContainText('Saved model conditions');
  await expect(page.locator('.daily-day').first()).not.toHaveText('Today');
  await expect(page.getByText(/forecast period has ended/i)).toBeVisible();
  await context.setOffline(false);
});
