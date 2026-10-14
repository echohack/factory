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
  assert.ok((await desktop.locator('#scene').screenshot()).equals(pixels), 'Pause freezes sprite pixels');
  await desktop.locator('#step').click();
  assert.equal((await state(desktop)).index, paused.index + 1);
  await desktop.locator('#factory').focus();
  await desktop.keyboard.press('ArrowRight');
  assert.equal((await state(desktop)).index, paused.index + 2);
  await desktop.screenshot({ path: resolve(output, 'desktop.png'), fullPage: true });

  // The process outline highlights the active step and jumps to a step on click.
  await desktop.locator('#process button', { hasText: 'Map' }).click();
  assert.equal((await state(desktop)).event.phase, 'map');
  assert.match(await desktop.locator('#process [aria-current="step"]').textContent(), /Map/);
  assert.equal(await desktop.locator('#process .process-step.done').count(), 1);
  // Exercise each event through the same public controls as the reader.
  while (!(await state(desktop)).done) await desktop.locator('#step').click();
  assert.equal((await floor(desktop)).sum, 60);
  assert.deepEqual(await desktop.locator('#ops-body td:last-child').allTextContents(), ['[2, 4, 6, 8]', '[6, 12, 18, 24]', '60']);
  assert.equal(await desktop.evaluate(() => [...document.querySelectorAll('.blueprint .table-wrap')].flatMap(wrap => [...wrap.querySelectorAll('tr')].map(row => {
    const top = row.getBoundingClientRect().top - wrap.getBoundingClientRect().top, height = row.getBoundingClientRect().height;
    return Math.abs(top / 32 - Math.round(top / 32)) < .02 && Math.abs(height / 32 - Math.round(height / 32)) < .02;
  })).every(Boolean)), true, 'Table rows sit on the floor grid');
  assert.match(await desktop.locator('#scene').getAttribute('aria-label'), /Accumulator 60\./);
  assert.equal(await desktop.locator('#process .process-step.done').count(), 3);
  assert.deepEqual((await floor(desktop)).filtered, [2, 4, 6, 8]);
  assert.deepEqual((await floor(desktop)).mapped, [6, 12, 18, 24]);
  assert.deepEqual((await floor(desktop)).rejected, [5, 7, 3, 1]);
  await desktop.screenshot({ path: resolve(output, 'complete.png'), fullPage: true });
  await desktop.locator('#reset').click();
  assert.equal((await floor(desktop)).sum, 0);
  assert.deepEqual((await floor(desktop)).mapped, []);

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
  assert.equal((await floor(desktop)).sum, 6);
  assert.equal(await desktop.locator('#ops-body tr:last-child td:last-child').textContent(), '6');
  await desktop.locator('#input-values').fill('');
  await desktop.locator('#input-form button').click();
  while (!(await state(desktop)).done) await desktop.locator('#step').click();
  assert.equal((await floor(desktop)).sum, 0);

  const mobile = await open({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });
  await fit(mobile);
  for (let i = 0; i < 3; i++) await mobile.locator('#step').click();
  await mobile.screenshot({ path: resolve(output, 'mobile.png'), fullPage: true });
  // Extra room below the page lets the whole scene scroll out of view; check that premise before testing suspension.
  await mobile.addStyleTag({ content: 'body { padding-bottom: 150vh; }' });
  await mobile.locator('#play').click();
  await mobile.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  assert.ok(await mobile.evaluate(() => document.getElementById('scene').getBoundingClientRect().bottom < 0), 'The scene is out of view');
  await mobile.waitForTimeout(100);
  const offscreen = await state(mobile);
  await mobile.waitForTimeout(250);
  assert.deepEqual(await state(mobile), offscreen, 'Offscreen playback suspends');
  await mobile.locator('#scene').scrollIntoViewIfNeeded();
  await mobile.waitForFunction(index => window.factoryDemo.state.index > index, offscreen.index);
  await mobile.locator('#play').click();

  const reduced = await open({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  assert.equal((await state(reduced)).playing, false);
  // Reduced motion draws each event at its start pose, so a frame paused mid-event matches progress 0.
  await reduced.locator('#step').click();
  const still = await reduced.locator('#scene').screenshot(), index = (await state(reduced)).index;
  await reduced.locator('#speed').selectOption('0.5');
  await reduced.locator('#play').click();
  await reduced.waitForFunction(index => window.factoryDemo.state.progress > .1 || window.factoryDemo.state.index !== index, index);
  await reduced.locator('#play').click();
  if ((await state(reduced)).index === index) assert.ok((await reduced.locator('#scene').screenshot()).equals(still), 'Reduced motion has no interpolated movement');
  else console.log('Reduced-motion frame check skipped: playback crossed an event boundary before pausing');
  await reduced.screenshot({ path: resolve(output, 'reduced-motion.png'), fullPage: true });
  assert.deepEqual(errors, [], 'No browser errors');
  console.log(`Browser checks passed. Desktop, phone, completion, and reduced-motion screenshots: ${output}`);
} finally { await browser.close(); }
