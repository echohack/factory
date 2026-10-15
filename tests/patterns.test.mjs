import { test, expect } from 'vite-plus/test';
import { readFile } from 'node:fs/promises';
import { patterns, families, sources, groundRules, checkLayout, findPatterns } from '../patterns/index.mjs';
import { station, arm, belt, pipes, fluidPorts, lanePath, drillDrop, poleWire, TILES, BELT_IO } from '../patterns/build.mjs';
import { timeline, motion, checkMotion } from '../patterns/motion.mjs';
import { spriteIDs } from '../patterns/sprites.mjs';
import { vocabulary } from '../catalog/vocabulary.mjs';
import { factoryLayout } from '../examples/obs-pipeline/layout.mjs';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const rulesNamed = (...ids) => groundRules.filter(rule => ids.includes(rule.id));

test('the library holds between 20 and 50 patterns, each with an ID of its own', () => {
  expect(patterns.length).toBeGreaterThanOrEqual(20);
  expect(patterns.length).toBeLessThanOrEqual(50);
  expect(new Set(patterns.map(p => p.id)).size).toBe(patterns.length);
});

test('every pattern names its family, sources, meaning, vocabulary terms and rules', () => {
  for (const p of patterns) {
    expect(families, p.id).toContain(p.family);
    expect(p.seen.length, p.id).toBeGreaterThan(0);
    for (const source of p.seen) expect(Object.keys(sources), `${p.id}: ${source}`).toContain(source);
    for (const term of p.terms) expect(vocabulary, `${p.id}: ${term}`).toContain(term);
    expect(p.rules.length, p.id).toBeGreaterThanOrEqual(2);
    for (const text of [p.name, p.shows, p.use, ...p.rules]) expect(text, p.id).not.toMatch(/—/);
  }
  for (const rule of groundRules) expect(rule.text, rule.id).not.toMatch(/—/);
});

test('every standard example obeys the ground rules', () => {
  for (const p of patterns) expect(checkLayout(p.example()), p.id).toStrictEqual([]);
});

test('every standard example runs without an inserter holding two values or two values sharing a spot', () => {
  for (const p of patterns) expect(checkMotion(p.example()), p.id).toStrictEqual([]);
});

test('every family has patterns and search finds them by vocabulary term', () => {
  for (const family of families) expect(patterns.some(p => p.family === family), family).toBe(true);
  expect(findPatterns('load balancer').map(p => p.id)).toEqual(expect.arrayContaining(['splitter-fan-out', 'balancer']));
  expect(findPatterns('retry').map(p => p.id)).toEqual(expect.arrayContaining(['belt-loop', 'recirculation']));
});

const chest = (id, x, y) => station(id, 'steel-chest', x, y);
const machine = (id, x, y) => station(id, 'assembling-machine-2', x, y);
const broken = {
  'whole-tiles': { width: 8, height: 5, objects: [machine('m', 5, 2.5)] },
  'one-per-tile': { width: 8, height: 5, objects: [machine('m', 5.5, 2.5)], beltTiles: belt([[.5, 2.5], [7.5, 2.5]]) },
  'inserter-reach': { width: 8, height: 5, objects: [chest('c', .5, 2.5), machine('m', 4.5, 2.5)], arms: [{ ...arm('a', [1.5, 2.5], 'east'), drop: [3.5, 2.5] }] },
  'inserter-ends': { width: 8, height: 5, objects: [machine('m', 5.5, 2.5)], arms: [arm('a', [2.5, .5], 'east')] },
  'belt-continuity': { width: 9, height: 5, objects: [chest('c', .5, 2.5), machine('m', 5.5, 2.5)], arms: [arm('a', [1.5, 2.5], 'east')], beltTiles: belt([[2.5, 2.5], [3.5, 2.5]]) },
  'underground-pairs': { width: 12, height: 3, beltTiles: belt([[.5, 1.5], [11.5, 1.5]], { under: [[[1.5, 1.5], [9.5, 1.5]]] }) },
  'pipes-connect': { width: 6, height: 4, beltTiles: [...pipes([[.5, 1.5], [1.5, 1.5]]), ...pipes([[.5, 2.5], [1.5, 2.5]])] },
  'drill-drops': { width: 6, height: 6, objects: [station('d', 'burner-mining-drill', 3, 3, { variant: 'east' })] },
  'areas': { width: 12, height: 6, objects: [machine('m', 5.5, 2.5)], areas: [{ label: 'A', x: 0, y: 0, width: 5, height: 6 }, { label: 'B', x: 5.2, y: 0, width: 5, height: 6 }] },
  'powered': { width: 20, height: 6, objects: [station('p', 'small-electric-pole', .5, .5), machine('m', 15.5, 2.5)] },
};

test('each checked ground rule rejects a layout that breaks it, and only that rule is needed to catch it', () => {
  const checked = groundRules.filter(rule => rule.check).map(rule => rule.id);
  expect(Object.keys(broken).sort()).toStrictEqual([...checked].sort());
  for (const [id, layout] of Object.entries(broken)) expect(checkLayout(layout, rulesNamed(id)).length, id).toBeGreaterThan(0);
});

test('a belt that runs into a building is named as such', () => {
  const [violation] = checkLayout(broken['belt-continuity'], rulesNamed('belt-continuity'));
  expect(violation.message).toMatch(/runs into m/);
});

test('belt corners join the edges their Factorio names give', () => {
  const names = ['east_to_north', 'north_to_east', 'west_to_north', 'north_to_west', 'south_to_east', 'east_to_south', 'south_to_west', 'west_to_south'];
  const travelFrom = { east: 1, west: 0, north: 3, south: 2 }, travelTo = { east: 0, west: 1, north: 2, south: 3 };
  names.forEach((name, i) => { const [from, to] = name.split('_to_'); expect(BELT_IO[4 + i], name).toStrictEqual([travelFrom[from], travelTo[to]]); });
  expect(belt([[.5, .5], [2.5, .5], [2.5, 2.5]]).map(t => t.direction)).toStrictEqual([0, 0, 11, 3, 3]);
});

test('the OBS belts pass the continuity rule, and the corner table that shipped before would not', () => {
  const old = { '0>2': 4, '2>0': 5, '1>2': 6, '2>1': 7, '3>0': 8, '0>3': 9, '3>1': 10, '1>3': 11 };
  for (const mobile of [false, true]) {
    const layout = factoryLayout(mobile), arms = Object.values(layout.routes).flatMap(r => [r.out, r.into].filter(Boolean));
    const rules = rulesNamed('belt-continuity', 'underground-pairs', 'one-per-tile');
    expect(checkLayout({ ...layout, arms }, rules)).toStrictEqual([]);
    const before = layout.beltTiles.map(t => t.direction >= 4 ? { ...t, direction: old[BELT_IO[t.direction].join('>')] } : t);
    expect(checkLayout({ ...layout, arms, beltTiles: before }, rules).length).toBeGreaterThan(0);
  }
});

test('tile footprints round up the catalog selection boxes', async () => {
  const catalog = JSON.parse(await read('../assets/catalog.json'));
  for (const object of catalog.objects.filter(o => TILES[o.id])) expect(TILES[object.id], object.id).toStrictEqual(object.footprint.map(Math.ceil));
});

test('inserters, drills and fluid ports sit where the game data puts them', () => {
  expect(arm('a', [2.5, 2.5], 'east')).toMatchObject({ pickup: [1.5, 2.5], drop: [3.7, 2.5] });
  expect(arm('l', [2.5, 2.5], 'south', 'long-handed-inserter')).toMatchObject({ pickup: [2.5, .5], drop: [2.5, 4.7] });
  expect(drillDrop({ x: 3, y: 3, variant: 'east' })).toStrictEqual([4.3, 2.5]);
  expect(fluidPorts(station('c', 'chemical-plant', 5.5, 5.5, { variant: 'north' })).map(p => p.pipe)).toStrictEqual([[4.5, 3.5], [6.5, 3.5], [4.5, 7.5], [6.5, 7.5]]);
  expect(fluidPorts(station('c', 'chemical-plant', 5.5, 5.5, { variant: 'west' })).map(p => p.pipe)).toStrictEqual([[3.5, 6.5], [3.5, 4.5], [7.5, 6.5], [7.5, 4.5]]);
  expect(fluidPorts(station('p', 'pump', 8, 4.5, { variant: 'east' })).map(p => p.pipe)).toStrictEqual([[9.5, 4.5], [6.5, 4.5]]);
  expect(fluidPorts(station('t', 'storage-tank', 3.5, 3.5)).map(p => p.pipe)).toStrictEqual([[2.5, 1.5], [5.5, 4.5], [4.5, 5.5], [1.5, 2.5]]);
  expect(pipes([[.5, 2.5], [1.5, 2.5]], { objects: [station('t', 'storage-tank', 3.5, 3.5)] }).map(p => p.variant)).toStrictEqual(['ending_right', 'straight_horizontal']);
});

test('pipes take the shape that joins their neighbors', () => {
  const shape = (...around) => pipes([[1.5, 1.5], ...around.map(([dx, dy]) => [1.5 + dx, 1.5 + dy])])[0].variant;
  const [N, E, S, W] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  expect([shape(N, S), shape(E, W), shape(N, E), shape(N, W), shape(S, E), shape(S, W)])
    .toStrictEqual(['straight_vertical', 'straight_horizontal', 'corner_up_right', 'corner_up_left', 'corner_down_right', 'corner_down_left']);
  expect([shape(N, E, W), shape(S, E, W), shape(N, S, E), shape(N, S, W), shape(N, E, S, W)]).toStrictEqual(['t_up', 't_down', 't_right', 't_left', 'cross']);
  expect([shape(N), shape(S), shape(W), shape(E)]).toStrictEqual(['ending_up', 'ending_down', 'ending_left', 'ending_right']);
});

test('lanes stay on their side through corners', () => {
  expect(lanePath([[.5, .5], [2.5, .5], [2.5, 2.5]], 1)).toStrictEqual([[.5, .7], [2.3, .7], [2.3, 2.5]]);
  expect(lanePath([[.5, .5], [2.5, .5], [2.5, 2.5]], -1)).toStrictEqual([[.5, .3], [2.7, .3], [2.7, 2.5]]);
});

test('poles wire to each other at their tops and reach the machines around them', () => {
  const a = station('a', 'small-electric-pole', 1.5, 2.5), b = station('b', 'small-electric-pole', 6.5, 2.5);
  expect(poleWire(a, b).from).toStrictEqual([1.5, 2.5 - 2.58]);
  const layout = { width: 10, height: 6, objects: [a, b, machine('m', 4.5, 2.5)] };
  expect(checkLayout({ ...layout, wires: [poleWire(a, b)] }, rulesNamed('powered'))).toStrictEqual([]);
  expect(checkLayout({ ...layout, wires: [] }, rulesNamed('powered'))[0].message).toMatch(/not wired/);
});

test('a held inserter keeps its value until release, then returns empty', () => {
  const example = patterns.find(p => p.id === 'backpressure').example();
  const plan = timeline(example), push = plan[0].legs[0];
  const holding = motion(example, push.start + push.ms - 10, plan), back = motion(example, push.start + push.ms + 300, plan);
  expect(holding.arms.find(a => a.id === 'push').closed).toBe(true);
  expect(holding.tokens.some(t => t.heldBy === 'push')).toBe(true);
  expect(back.arms.find(a => a.id === 'push').closed).toBe(false);
  expect(back.tokens.some(t => t.heldBy === 'push')).toBe(false);
});

test('the gallery page lists exactly the sprites the patterns draw', async () => {
  const assets = JSON.parse(await read('../examples/patterns/assets.json'));
  expect([...assets.ids].sort(), 'Run vp run patterns --assets').toStrictEqual(spriteIDs());
  expect(assets.library).toBe(true);
});

test('the README gives the current number of patterns', async () => {
  expect(await read('../README.md')).toContain(`${patterns.length} arrangements`);
});

test('references/patterns.md names every pattern and every ground rule', async () => {
  const text = await read('../references/patterns.md');
  for (const p of patterns) expect(text, p.id).toContain(`\`${p.id}\``);
  for (const rule of groundRules) expect(text, rule.id).toContain(`\`${rule.id}\``);
});
