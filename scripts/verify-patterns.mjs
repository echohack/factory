import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PLAYWRIGHT_MODULE;
let chromium;
try {
  ({ chromium } = await import(modulePath ? pathToFileURL(resolve(modulePath)).href : 'playwright'));
} catch {
  console.error('Browser QA needs an existing Playwright installation. Set PLAYWRIGHT_MODULE to its index.mjs; see references/verification.md.');
  process.exit(1);
}
const url = process.argv[2] ?? 'http://127.0.0.1:4173/patterns/';
const only = process.argv[3]?.split(',');
const output = resolve('.local/qa/patterns'); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errors = [];
async function open(options) {
  const page = await browser.newPage({ ignoreHTTPSErrors: true, ...options });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(url); await page.waitForFunction(() => window.patternsDemo);
  return page;
}
try {
  const desktop = await open({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
  const { ids, violations } = await desktop.evaluate(() => ({ ids: window.patternsDemo.ids, violations: window.patternsDemo.violations }));
  for (const id of ids) assert.deepEqual(violations[id], [], `${id} breaks no ground rule`);
  assert.equal(await desktop.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal page overflow');
  for (const id of ids.filter(id => !only || only.includes(id))) {
    for (const ms of [2600, 4100]) {
      await desktop.evaluate(ms => window.patternsDemo.seek(ms), ms);
      const floor = desktop.locator(`#${id} .factory-floor`);
      await floor.scrollIntoViewIfNeeded();
      await floor.screenshot({ path: resolve(output, `${id}-${ms}.png`) });
    }
  }
  await desktop.evaluate(() => window.patternsDemo.seek(3000));
  const first = desktop.locator(`#${ids[0]} canvas`), still = await first.screenshot();
  await desktop.waitForTimeout(250);
  assert.ok((await first.screenshot()).equals(still), 'Pause freezes the examples');
  await desktop.evaluate(() => window.patternsDemo.play());
  await desktop.waitForTimeout(250);
  assert.ok(await desktop.evaluate(() => window.patternsDemo.clock > 3000), 'Run advances the examples');
  await desktop.locator('#search').fill('load balancer');
  assert.ok(await desktop.locator('#cards > article:not([hidden])').count() >= 1, 'Search finds patterns by term');
  await desktop.locator('#search').fill('');
  await desktop.screenshot({ path: resolve(output, 'desktop.png') });

  const mobile = await open({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow on a phone');
  await mobile.screenshot({ path: resolve(output, 'mobile.png') });

  const reduced = await open({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  assert.equal(await reduced.evaluate(() => window.patternsDemo.playing), false, 'Reduced motion starts paused');
  assert.deepEqual(errors, [], 'No browser errors');
  console.log(`Pattern checks passed for ${ids.length} patterns. Screenshots: ${output}`);
} finally { await browser.close(); }
