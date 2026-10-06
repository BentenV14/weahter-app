import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('accepted access automatically loads the actual nearby locality on each fresh visit', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 35.6762, longitude: 139.6503 });
  // Simulated browser coordinates require simulated reverse metadata. Weather stays real.
  await page.route('https://api.bigdatacloud.net/data/reverse-geocode-client?*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        locality: 'Tokyo',
        city: 'Tokyo',
        countryName: 'Japan',
        countryCode: 'JP',
        lookupSource: 'reverseGeocoding',
      }),
    }),
  );
  await page.goto('/weather');
  await expect(page.locator('.hero-top')).toContainText('Tokyo');
  await expect(page).toHaveURL(/lat=35.6762/);
  await expect(page.getByText(/Times shown in Asia\/Tokyo/)).toBeVisible();
  await context.setGeolocation({ latitude: 35.7, longitude: 139.7 });
  await page.reload();
  await expect(page).toHaveURL(/lat=35.7&/);
  await context.setGeolocation({ latitude: 35.6762, longitude: 139.6503 });
  await page.getByRole('button', { name: 'Search locations', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Search cities, postal codes or coordinates' })
    .fill('48.8566, 2.3522');
  await page.locator('#location-results').getByRole('option').first().click();
  await expect(page).toHaveURL(/lat=48.8566/);
  await page.reload();
  await expect(page).toHaveURL(/lat=48.8566/);
  await expect(page.locator('.hero-temperature')).toBeVisible();
  await page.goto('/weather');
  await expect(page.locator('.hero-top')).toContainText('Tokyo');
  await expect(page).toHaveURL(/lat=35.6762/);
});

test('declined access shows country facts, offers all countries and opens a real capital forecast', async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, failure) =>
      failure?.({ code: 1 } as GeolocationPositionError);
  });
  await page.route('https://api.country.is/', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ country: 'JP' }) }),
  );
  const reverseRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('bigdatacloud')) reverseRequests.push(request.url());
  });
  await page.goto('/weather');
  await expect(page.getByRole('heading', { name: 'Japan at a glance' })).toBeVisible();
  await expect(page.locator('.country-hero')).toContainText(
    'Approximate country from your network',
  );
  await expect(page.locator('.country-facts')).toContainText('Tokyo');
  await expect(page.locator('.country-facts')).toContainText('JPY');
  await expect(page.locator('.hero-temperature')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('lat')).toBe(false);
  expect(reverseRequests).toEqual([]);
  await expect(page.getByLabel('Explore a country').locator('option')).toHaveCount(251);
  for (const [width, scheme] of [
    [1512, 'light'],
    [390, 'dark'],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    await page.screenshot({ path: `artifacts/country-${width}-${scheme}.png`, fullPage: true });
  }
  await page.getByLabel('Explore a country').selectOption('BR');
  await expect(page.getByRole('heading', { name: 'Brazil at a glance' })).toBeVisible();
  await expect(page.locator('.country-facts')).toContainText('BRL');
  await page.getByLabel('Explore a country').selectOption('JP');
  await page.getByRole('button', { name: /Find the capital/ }).click();
  await expect(page.getByLabel('Filter locations by country')).toHaveValue('JP');
  await expect(page.locator('#location-results').getByRole('option').first()).toContainText(
    'Tokyo',
  );
  await page.locator('#location-results').getByRole('option').first().click();
  await expect(page.locator('.hero-top')).toContainText('Tokyo');
  await expect(page.locator('.hero-temperature')).toBeVisible();
  await page.goto('/weather');
  await expect(page.getByRole('heading', { name: 'Japan at a glance' })).toBeVisible();
  await expect(page.locator('.hero-temperature')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('lat')).toBe(false);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Japan at a glance' })).toBeVisible();
  await expect(page.locator('.hero-temperature')).toHaveCount(0);
});

test('worldwide search returns 100 matches and filters by country', async ({ page }) => {
  await page.goto('/weather?lat=51.2093&lon=3.2247&name=Bruges');
  await page.getByRole('button', { name: 'Search locations', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Search cities, postal codes or coordinates' })
    .fill('London');
  await expect(page.locator('#location-results').getByRole('option')).toHaveCount(100);
  await expect(page.getByLabel('Filter locations by country').locator('option')).toHaveCount(251);
  await page.getByLabel('Filter locations by country').selectOption('GB');
  await expect(page.locator('.search-label')).toContainText('United Kingdom');
  await expect(page.locator('#location-results').getByRole('option').first()).toContainText(
    'United Kingdom',
  );
  const response = await page.request.get('/api/search?q=London&country=GB');
  const matches = await response.json();
  expect(matches.length).toBeGreaterThan(0);
  expect(matches.every((place: { country_code: string }) => place.country_code === 'GB')).toBe(
    true,
  );
  const invalid = await page.request.get('/api/search?q=London&country=INVALID');
  expect(invalid.status()).toBe(400);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('denied access clears old coordinates before a slow country lookup, including reload', async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, failure) =>
      failure?.({ code: 1 } as GeolocationPositionError);
  });
  let release: () => void = () => {};
  const countryReady = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('https://api.country.is/', async (route) => {
    await countryReady;
    await route
      .fulfill({ contentType: 'application/json', body: JSON.stringify({ country: 'JP' }) })
      .catch(() => {});
  });
  await page.goto('/weather?lat=51.2093&lon=3.2247&name=Bruges');
  await expect(page.locator('.hero-temperature')).toBeVisible();
  await page.goto('/weather');
  await expect(page.getByRole('heading', { name: 'Find your place in the world' })).toBeVisible();
  await expect(page).toHaveURL(/\/weather$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Find your place in the world' })).toBeVisible();
  await expect(page.locator('.hero-temperature')).toHaveCount(0);
  await expect(page).toHaveURL(/\/weather$/);
  release();
  await expect(page.getByRole('heading', { name: 'Japan at a glance' })).toBeVisible();
});

test('unavailable device and network detection leave worldwide search usable', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true }),
  );
  await page.route('https://api.country.is/', (route) => route.abort());
  await page.route('**/api/countries', (route) => route.abort());
  await page.goto('/weather');
  await expect(page.getByRole('heading', { name: 'Find your place in the world' })).toBeVisible();
  await expect(page.getByLabel('Explore a country').locator('option')).toHaveCount(251);
  await expect(page.getByRole('button', { name: 'Use my location', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Find a city', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Search cities, postal codes or coordinates' })
    .fill('-33.8688, 151.2093');
  await page.locator('#location-results').getByRole('option').first().click();
  await expect(page.locator('.hero-temperature')).toBeVisible();
  await expect(page).toHaveURL(/lat=-33.8688/);
});
