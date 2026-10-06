import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-webgl', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
page.on('requestfailed', (r) => console.log('FAILED', r.url(), r.failure()?.errorText));
page.on('response', (r) => {
  if (r.status() >= 400) console.log(r.status(), r.url());
});
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200));
});
await page.goto(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/map`);
await page.waitForTimeout(15000);
console.log(
  'Page',
  await page.locator('h1').allTextContents(),
  await page.locator('.map-error').allTextContents(),
);
await page.screenshot({ path: 'artifacts/map-diagnostic.png', fullPage: true });
await browser.close();
