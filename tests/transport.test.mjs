import { test, expect } from 'vite-plus/test';
import { connectStations, connectLayout, swing, transferView } from '../kit/transport.mjs';
import { factoryLayout } from '../examples/array-pipeline/layout.mjs';
import { makeTrace, DEFAULT_INPUT } from '../examples/array-pipeline/model.mjs';

const near = (a, b) => a.forEach((v, i) => expect(Math.abs(v - b[i]) < 1e-9).toBeTruthy());
const inBuilding = (tile, object) => Math.abs(tile.x - object.x) < (object.size ?? 1) / 2 && Math.abs(tile.y - object.y) < (object.size ?? 1) / 2;

test('both layouts put two adjacent inserters on every link and keep belts outside buildings', () => {
  for (const mobile of [false, true]) {
    const layout = connectLayout(factoryLayout(mobile));
    expect(Object.keys(layout.routes).length).toBe(6);
    const occupied = new Set();
    for (const tile of layout.beltTiles) {
      expect(layout.objects.every(object => !inBuilding(tile, object))).toBeTruthy();
      expect(occupied.has(`${tile.x}:${tile.y}`)).toBe(false);
      occupied.add(`${tile.x}:${tile.y}`);
    }
    for (const route of Object.values(layout.routes)) for (const arm of [route.out, route.into]) {
      expect(occupied.has(arm.pivot.join(':'))).toBe(false);
      expect(layout.objects.every(object => !inBuilding({ x: arm.pivot[0], y: arm.pivot[1] }, object))).toBeTruthy();
      for (const endpoint of [arm.pickup, arm.drop]) {
        const distance = Math.hypot(...endpoint.map((v, i) => v - arm.pivot[i]));
        expect(distance >= 1 && distance <= 1.25, 'Standard inserter only reaches its adjacent tile, including lane offset').toBeTruthy();
      }
    }
  }
  expect(() => connectStations({ id: 'a', x: 0, y: 0 }, { id: 'b', x: 3, y: 0 })).toThrow(/room/);
});

test('handoffs meet exactly; carried tokens follow the closed hand and return swings are empty', () => {
  const layout = connectLayout(factoryLayout()), route = layout.routes['input:filter'];
  near(swing(route.out, 0), route.out.pickup);
  near(swing(route.out, 1), route.out.drop);
  near(swing(route.out, 1, true), route.out.pickup);
  const view = (stage, progress) => transferView(layout.routes, { route: route.key, stage, value: 2 }, progress);
  near(view('out', 1).token.position, view('belt', 0).token.position);
  near(view('belt', 1).token.position, view('in', 0).token.position);
  for (const stage of ['out', 'in']) for (const progress of [0, .25, .5, .75, 1]) {
    const frame = view(stage, progress), arm = frame.arms.find(a => a.id === frame.token.heldBy);
    expect(arm.closed).toBe(true);
    expect(arm.hand).toStrictEqual(frame.token.position);
    expect(frame.arms.filter(a => a.closed).length).toBe(1);
  }
  expect(view('return', .5).token).toBe(null);
  expect(view('return', .5).arms.some(a => a.closed)).toBe(false);
});

test('stock plus the single in-flight value is conserved; recipients only gain stock at release', () => {
  for (const input of [DEFAULT_INPUT, [-2, 0, 3], [], [1, 3]]) {
    const trace = makeTrace(input);
    for (const event of trace.events) {
      const { before, after } = event;
      expect(Object.values(after.stock).reduce((a, b) => a + b, 0) + Number(!!after.transit)).toBe(input.length);
      expect(Object.values(after.stock).every(n => n >= 0)).toBeTruthy();
      if (event.kind === 'work') expect(before.stock[event.machine], 'A machine has its input before work').toBe(1);
      if (event.kind !== 'transfer') continue;
      expect(after.stock[event.to] - before.stock[event.to]).toBe(event.stage === 'in' ? 1 : 0);
      expect(before.stock[event.from] - after.stock[event.from]).toBe(event.stage === 'pickup' ? 1 : 0);
      if (event.stage === 'return') expect(after.transit).toBe(null);
    }
    expect(trace.events.at(-1).after.transit).toBe(null);
  }
});

test('a shifted port lets one machine side feed parallel belts', () => {
  const machine = { id: 'm', x: 5.5, y: 5.5, size: 3 }, upper = { id: 'u', x: 13.5, y: 4.5 }, lower = { id: 'l', x: 13.5, y: 6.5 };
  const layout = connectLayout({ objects: [machine, upper, lower], connections: [['m', 'u', { shift: -1 }], ['m', 'l', { shift: 1 }]] });
  expect(layout.routes['m:u'].out.pickup).toStrictEqual([6.5, 4.5]);
  expect(layout.routes['m:l'].out.pivot).toStrictEqual([7.5, 6.5]);
  expect(layout.routes['m:u'].tiles.every(t => t.y === 4.5) && layout.routes['m:l'].tiles.every(t => t.y === 6.5)).toBeTruthy();
  expect(() => connectLayout({ objects: [machine, upper], connections: [['m', 'u', { shift: -2 }]] })).toThrow(/stay on the source/);
});
