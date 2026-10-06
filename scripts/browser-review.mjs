import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-webgl', '--use-angle=swiftshader'],
});
const context = await browser.newContext({
    viewport: { width: 1512, height: 1100 },
    colorScheme: 'dark',
  }),
  page = await context.newPage(),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto(
  `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/weather?lat=51.2093&lon=3.2247&name=Bruges`,
  {
    waitUntil: 'networkidle',
  },
);
await page.getByText('The next few hours', { exact: true }).waitFor({ timeout: 45000 });
await page.screenshot({ path: 'artifacts/desktop-dark.png', fullPage: true });
console.log(
  'Dashboard',
  await page.locator('h1').innerText(),
  await page.locator('.hero-temperature').innerText(),
);
console.log(
  'Overflow',
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'artifacts/mobile-dark.png', fullPage: true });
console.log(
  'Mobile overflow',
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
await page.setViewportSize({ width: 834, height: 1112 });
await page.screenshot({ path: 'artifacts/tablet-dark.png', fullPage: true });
await page.setViewportSize({ width: 1512, height: 1100 });
await page.emulateMedia({ colorScheme: 'light' });
await page.screenshot({ path: 'artifacts/desktop-light.png', fullPage: true });
for (const route of [
  'hourly',
  'daily',
  'air-quality',
  'marine',
  'flood',
  'solar',
  'models',
  'ensemble',
  'history',
  'climate',
  'seasonal',
  'lab',
  'astronomy',
  'activities',
  'compare',
  'settings',
  'map',
  'radar',
]) {
  await page.goto(
    `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/${route}?lat=51.2093&lon=3.2247&name=Bruges`,
    {
      waitUntil: 'domcontentloaded',
    },
  );
  await page.waitForTimeout(1500);
  console.log(
    route,
    (await page.locator('h1').allTextContents()).join(' | '),
    (await page.locator('[role=alert]').allTextContents()).join(' | '),
  );
}
await page.screenshot({ path: 'artifacts/radar.png', fullPage: true });
await writeFile('artifacts/browser-errors.json', JSON.stringify(errors, null, 2));
console.log('Errors', errors.length);
await browser.close();
