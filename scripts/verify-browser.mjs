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
const url = process.argv[2] ?? 'http://127.0.0.1:4173/array-pipeline/';
const output = resolve('.local/qa'); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errors = [];
async function open(options) {
  const page = await browser.newPage(options);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(url); await page.waitForFunction(() => window.factoryDemo);
  return page;
}
const state = page => page.evaluate(() => window.factoryDemo.state);
const fit = async page => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal page overflow');
try {
  const desktop = await open({ viewport: { width: 1440, height: 1200 } });
  await fit(desktop);
  assert.equal((await state(desktop)).playing, false);
  await desktop.locator('#step').click();
  await desktop.locator('#speed').selectOption('0.5');
  await desktop.locator('#play').click();
  await desktop.waitForFunction(() => window.factoryDemo.state.event.stage === 'out' && window.factoryDemo.state.progress > .3);
  await desktop.locator('#play').click();
  const paused = await state(desktop), pixels = await desktop.locator('#scene').screenshot();
  await desktop.locator('.factory-floor').screenshot({ path: resolve(output, 'inserter.png') });
  assert.equal(paused.state.transit.holder, 'out');
  assert.equal(paused.state.stock.input, 7);
  assert.equal(paused.state.stock.filter, 0);
  assert.equal(await desktop.evaluate(() => window.factoryDemo.view.arms.filter(a => a.closed).length), 1);
  await desktop.waitForTimeout(200);
  assert.deepEqual(await state(desktop), paused, 'Pause freezes playback');
  assert.deepEqual(await desktop.locator('#scene').screenshot(), pixels, 'Pause freezes sprite pixels');
  await desktop.locator('#step').click();
  assert.equal((await state(desktop)).index, paused.index + 1);
  await desktop.locator('#factory').focus();
  await desktop.keyboard.press('ArrowRight');
  assert.equal((await state(desktop)).index, paused.index + 2);
  await desktop.screenshot({ path: resolve(output, 'desktop.png'), fullPage: true });

  // Exercise each event through the same public controls as the reader.
  while (!(await state(desktop)).done) await desktop.locator('#step').click();
  assert.equal(await desktop.locator('#sum').textContent(), '60');
  assert.equal(await desktop.locator('#filtered').textContent(), '[2, 4, 6, 8]');
  assert.equal(await desktop.locator('#mapped').textContent(), '[6, 12, 18, 24]');
  assert.equal(await desktop.locator('#rejected').textContent(), '[5, 7, 3, 1]');
  await desktop.screenshot({ path: resolve(output, 'complete.png'), fullPage: true });
  await desktop.locator('#reset').click();
  assert.equal(await desktop.locator('#sum').textContent(), '0');
  assert.equal(await desktop.locator('#mapped').textContent(), '[]');

  await desktop.locator('#input-values').fill('1, 2, 3');
  await desktop.locator('#input-form button').click();
  assert.deepEqual((await state(desktop)).state.input, [1, 2, 3]);
  await desktop.locator('#input-values').fill('2,,4');
  await desktop.locator('#input-form button').click();
  assert.ok(await desktop.locator('#input-error').textContent());
  assert.deepEqual((await state(desktop)).state.input, [1, 2, 3], 'Invalid input preserves the previous model');
  await desktop.locator('#input-values').fill('1, 2, 3');
  await desktop.locator('#input-form button').click();
  await desktop.locator('#speed').selectOption('4');
  await desktop.locator('#scene').scrollIntoViewIfNeeded();
  await desktop.locator('#play').click();
  await desktop.waitForFunction(() => window.factoryDemo.state.done, { timeout: 15000 });
  assert.equal(await desktop.locator('#sum').textContent(), '6');
  await desktop.locator('#input-values').fill('');
  await desktop.locator('#input-form button').click();
  while (!(await state(desktop)).done) await desktop.locator('#step').click();
  assert.equal(await desktop.locator('#sum').textContent(), '0');

  const mobile = await open({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });
  await fit(mobile);
  for (let i = 0; i < 3; i++) await mobile.locator('#step').click();
  await mobile.screenshot({ path: resolve(output, 'mobile.png'), fullPage: true });
  await mobile.locator('#play').click();
  await mobile.locator('footer').scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(100);
  const offscreen = await state(mobile);
  await mobile.waitForTimeout(250);
  assert.deepEqual(await state(mobile), offscreen, 'Offscreen playback suspends');
  await mobile.locator('#scene').scrollIntoViewIfNeeded();
  await mobile.waitForFunction(index => window.factoryDemo.state.index > index, offscreen.index);
  await mobile.locator('#play').click();

  const reduced = await open({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  assert.equal((await state(reduced)).playing, false);
  await reduced.locator('#step').click();
  await reduced.locator('#speed').selectOption('0.5');
  await reduced.locator('#play').click();
  await reduced.waitForFunction(() => window.factoryDemo.state.progress > .1);
  const still = await reduced.locator('#scene').screenshot();
  await reduced.waitForTimeout(100);
  assert.deepEqual(await reduced.locator('#scene').screenshot(), still, 'Reduced motion has no interpolated movement');
  await reduced.locator('#play').click();
  await reduced.screenshot({ path: resolve(output, 'reduced-motion.png'), fullPage: true });
  assert.deepEqual(errors, [], 'No browser errors');
  console.log(`Browser checks passed. Desktop, phone, completion, and reduced-motion screenshots: ${output}`);
} finally { await browser.close(); }
