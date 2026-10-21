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
const floor = async page => (await state(page)).state;
const fit = async page => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal page overflow');
try {
  const desktop = await open({ viewport: { width: 1440, height: 1200 } });
  await fit(desktop);
  assert.equal(await desktop.locator('.transport, button:not(.process-head), select').count(), 0, 'Nothing starts or stops the loop');
  assert.equal((await state(desktop)).playing, true, 'The factory runs on load');
  await desktop.waitForFunction(() => window.factoryDemo.state.event?.stage === 'out' && window.factoryDemo.state.progress > .3);
  await desktop.evaluate(() => window.factoryDemo.pause());
  const paused = await state(desktop), pixels = await desktop.locator('#scene').screenshot();
  await desktop.locator('.factory-floor').screenshot({ path: resolve(output, 'inserter.png') });
  assert.equal(paused.state.transit.holder, 'out');
  assert.equal(paused.state.stock.input, 7);
  assert.equal(paused.state.stock.filter, 0);
  assert.equal(await desktop.evaluate(() => window.factoryDemo.view.arms.filter(a => a.closed).length), 1);
  await desktop.waitForTimeout(200);
  assert.deepEqual(await state(desktop), paused, 'A stopped factory stays still');
  assert.ok((await desktop.locator('#scene').screenshot()).equals(pixels), 'A stopped factory freezes sprite pixels');
  await desktop.evaluate(() => window.factoryDemo.play());
  await desktop.waitForFunction(index => window.factoryDemo.state.index > index, paused.index);
  await desktop.screenshot({ path: resolve(output, 'desktop.png'), fullPage: true });

  await desktop.locator('#process button', { hasText: 'Map' }).click();
  const jumped = await state(desktop);
  assert.equal(jumped.event.phase, 'map');
  assert.equal(jumped.playing, true, 'A phase jump keeps the loop running');
  assert.match(await desktop.locator('#process [aria-current="step"]').textContent(), /Map/);
  assert.equal(await desktop.locator('#process .process-step.done').count(), 1);
  await desktop.evaluate(() => window.factoryDemo.finish());
  assert.equal((await floor(desktop)).sum, 60);
  assert.deepEqual(await desktop.locator('#ops-body td:last-child').allTextContents(), ['[2, 4, 6, 8]', '[6, 12, 18, 24]', '60']);
  assert.match(await desktop.locator('#scene').getAttribute('aria-label'), /Accumulator 60\./);
  assert.equal(await desktop.locator('#process .process-step.done').count(), 3);
  assert.deepEqual((await floor(desktop)).filtered, [2, 4, 6, 8]);
  assert.deepEqual((await floor(desktop)).mapped, [6, 12, 18, 24]);
  assert.deepEqual((await floor(desktop)).rejected, [5, 7, 3, 1]);
  await desktop.screenshot({ path: resolve(output, 'complete.png'), fullPage: true });

  await desktop.locator('#scene').scrollIntoViewIfNeeded();
  await desktop.evaluate(() => window.factoryDemo.play());
  await desktop.waitForFunction(() => !window.factoryDemo.state.done);
  assert.equal((await floor(desktop)).sum, 0, 'A new pass clears the accumulator');
  assert.deepEqual((await floor(desktop)).mapped, [], 'A new pass clears the buffers');
  await desktop.waitForFunction(() => window.factoryDemo.state.event?.phase === 'done', null, { timeout: 60000 });
  assert.equal((await floor(desktop)).sum, 60);
  assert.equal(await desktop.locator('#ops-body tr:last-child td:last-child').textContent(), '60');
  await desktop.waitForFunction(() => window.factoryDemo.state.index < 5, null, { timeout: 5000 });
  assert.equal((await floor(desktop)).sum, 0, 'The loop starts again after the result');

  const mobile = await open({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });
  await fit(mobile);
  await mobile.waitForFunction(() => window.factoryDemo.state.index >= 3);
  await mobile.screenshot({ path: resolve(output, 'mobile.png'), fullPage: true });
  await mobile.addStyleTag({ content: 'body { padding-bottom: 150vh; }' });
  await mobile.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  assert.ok(await mobile.evaluate(() => document.getElementById('scene').getBoundingClientRect().bottom < 0), 'The scene is out of view');
  await mobile.waitForTimeout(100);
  const offscreen = await state(mobile);
  await mobile.waitForTimeout(250);
  assert.deepEqual(await state(mobile), offscreen, 'Offscreen playback suspends');
  await mobile.locator('#scene').scrollIntoViewIfNeeded();
  await mobile.waitForFunction(index => window.factoryDemo.state.index > index, offscreen.index);

  const reduced = await open({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  assert.equal((await state(reduced)).playing, true, 'Reduced motion keeps the loop running');
  await reduced.waitForFunction(() => window.factoryDemo.state.index > 1);
  await reduced.screenshot({ path: resolve(output, 'reduced-motion.png'), fullPage: true });
  assert.deepEqual(errors, [], 'No browser errors');
  console.log(`Browser checks passed. Desktop, phone, completion, and reduced-motion screenshots: ${output}`);
} finally { await browser.close(); }
