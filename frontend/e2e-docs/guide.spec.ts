import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import AxeBuilder from '@axe-core/playwright';

const guide = pathToFileURL(resolve(process.cwd(), '../docs/feature-explorer.html')).href;

test('offline guide filters features and safely handles empty searches', async ({ page }) => {
  const errors: string[] = [];
  const remoteRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
  await page.goto(guide);
  await expect(page.getByRole('heading', { name: 'A storefront out front. A workspace behind it.' })).toBeVisible();
  await expect(page.locator('[data-feature]:visible')).toHaveCount(24);
  await page.getByRole('button', { name: 'Admin panel', exact: true }).click();
  await expect(page.locator('[data-feature]:visible')).toHaveCount(8);
  await page.getByRole('searchbox', { name: 'Search features' }).fill('inventory');
  await expect(page.getByRole('heading', { name: 'Versioned inventory', exact: true })).toBeVisible();
  await expect(page.locator('[data-feature]:visible')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search features' }).fill('<img src=x onerror=alert(1)>');
  await expect(page.getByText('No matching features.')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('[data-feature]:visible')).toHaveCount(24);
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test('stack tabs, project tree and command copying work', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { (window as unknown as { copied: string }).copied = value; } } });
  });
  await page.goto(guide);
  await page.getByRole('tab', { name: 'Backend', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Backend', exact: true })).toContainText('FastAPI');
  await page.getByRole('tab', { name: 'Backend', exact: true }).press('ArrowRight');
  await expect(page.getByRole('tabpanel', { name: 'Quality', exact: true })).toContainText('Playwright');
  await page.getByRole('button', { name: 'Expand all folders' }).click();
  await expect(page.locator('.project-tree details:not([open])')).toHaveCount(0);
  await page.getByRole('button', { name: 'Collapse all folders' }).click();
  await expect(page.locator('.project-tree details[open]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Copy demo API command' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Demo API command copied.' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toContain('demo/serve.py');
});

test('guide remains usable without scripts and at mobile widths', async ({ browser, page }, testInfo) => {
  await page.goto(guide);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: testInfo.outputPath('guide-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('guide-mobile.png'), fullPage: true });
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto(guide);
  await expect(staticPage.locator('[data-feature]:visible')).toHaveCount(24);
  await expect(staticPage.getByText('JavaScript is off.')).toBeVisible();
  await expect(staticPage.getByRole('tabpanel')).toHaveCount(4);
  await staticPage.getByRole('heading', { name: 'Versioned inventory', exact: true }).click();
  await expect(staticPage.locator('[data-feature]').filter({ has: staticPage.getByRole('heading', { name: 'Versioned inventory', exact: true }) })).toHaveAttribute('open', '');
  await context.close();
});

for (const state of ['unavailable', 'rejected'] as const) {
  test(`clipboard ${state} gives a manual-copy fallback`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: value === 'unavailable' ? undefined : { writeText: async () => { throw new Error('Permission denied'); } },
      });
    }, state);
    await page.goto(guide);
    await page.getByRole('button', { name: 'Copy demo API command' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Select and copy the command manually.' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
