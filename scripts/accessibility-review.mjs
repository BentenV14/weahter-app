import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-webgl', '--use-angle=swiftshader'],
});
const context = await browser.newContext({
    viewport: { width: 1512, height: 1100 },
    colorScheme: 'dark',
  }),
  page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push({ message: m.text(), location: m.location() });
});
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
await page.goto(`${base}/weather?lat=51.2093&lon=3.2247&name=Bruges`);
await page.getByText('The next few hours', { exact: true }).waitFor();
await page.waitForTimeout(4000);
for (const [name, width, scheme] of [
  ['desktop-dark', 1512, 'dark'],
  ['desktop-light', 1512, 'light'],
  ['tablet', 834, 'dark'],
  ['mobile', 390, 'dark'],
]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
  await page.emulateMedia({ colorScheme: scheme });
  await page.screenshot({ path: `artifacts/final-${name}.png`, fullPage: true });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  console.log(
    name,
    JSON.stringify(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    ),
  );
}
await page.getByRole('button', { name: 'Search locations', exact: true }).click();
const dialog = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
console.log(
  'dialog',
  JSON.stringify(dialog.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))),
);
await writeFile('artifacts/final-console-errors.json', JSON.stringify(errors, null, 2));
console.log('Console', JSON.stringify(errors));
await browser.close();
