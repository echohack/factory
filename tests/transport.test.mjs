import test from 'node:test';
import assert from 'node:assert/strict';
import { connectStations, connectLayout, swing, transferView } from '../kit/transport.mjs';
import { factoryLayout } from '../examples/array-pipeline/layout.mjs';
import { makeTrace, DEFAULT_INPUT } from '../examples/array-pipeline/model.mjs';

const near = (a, b) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9));
const inBuilding = (tile, object) => Math.abs(tile.x - object.x) < (object.size ?? 1) / 2 && Math.abs(tile.y - object.y) < (object.size ?? 1) / 2;

test('both layouts put two adjacent inserters on every link and keep belts outside buildings', () => {
  for (const mobile of [false, true]) {
    const layout = connectLayout(factoryLayout(mobile));
    assert.equal(Object.keys(layout.routes).length, 6);
    const occupied = new Set();
    for (const tile of layout.beltTiles) {
      assert.ok(layout.objects.every(object => !inBuilding(tile, object)));
      assert.equal(occupied.has(`${tile.x}:${tile.y}`), false);
      occupied.add(`${tile.x}:${tile.y}`);
    }
    for (const route of Object.values(layout.routes)) for (const arm of [route.out, route.into]) {
      assert.equal(occupied.has(arm.pivot.join(':')), false);
      assert.ok(layout.objects.every(object => !inBuilding({ x: arm.pivot[0], y: arm.pivot[1] }, object)));
      for (const endpoint of [arm.pickup, arm.drop]) {
        const distance = Math.hypot(...endpoint.map((v, i) => v - arm.pivot[i]));
        assert.ok(distance >= 1 && distance <= 1.25, 'Standard inserter only reaches its adjacent tile, including lane offset');
      }
    }
  }
  assert.throws(() => connectStations({ id: 'a', x: 0, y: 0 }, { id: 'b', x: 3, y: 0 }), /room/);
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
    assert.equal(arm.closed, true);
    assert.deepEqual(arm.hand, frame.token.position);
    assert.equal(frame.arms.filter(a => a.closed).length, 1);
  }
  assert.equal(view('return', .5).token, null);
  assert.equal(view('return', .5).arms.some(a => a.closed), false);
});

test('stock plus the single in-flight value is conserved; recipients only gain stock at release', () => {
  for (const input of [DEFAULT_INPUT, [-2, 0, 3], [], [1, 3]]) {
    const trace = makeTrace(input);
    for (const event of trace.events) {
      const { before, after } = event;
      assert.equal(Object.values(after.stock).reduce((a, b) => a + b, 0) + Number(!!after.transit), input.length);
      assert.ok(Object.values(after.stock).every(n => n >= 0));
      if (event.kind === 'work') assert.equal(before.stock[event.machine], 1, 'A machine has its input before work');
      if (event.kind !== 'transfer') continue;
      assert.equal(after.stock[event.to] - before.stock[event.to], event.stage === 'in' ? 1 : 0);
      assert.equal(before.stock[event.from] - after.stock[event.from], event.stage === 'pickup' ? 1 : 0);
      if (event.stage === 'return') assert.equal(after.transit, null);
    }
    assert.equal(trace.events.at(-1).after.transit, null);
  }
});

test('a shifted port lets one machine side feed parallel belts', () => {
  const machine = { id: 'm', x: 5.5, y: 5.5, size: 3 }, upper = { id: 'u', x: 13.5, y: 4.5 }, lower = { id: 'l', x: 13.5, y: 6.5 };
  const layout = connectLayout({ objects: [machine, upper, lower], connections: [['m', 'u', { shift: -1 }], ['m', 'l', { shift: 1 }]] });
  assert.deepEqual(layout.routes['m:u'].out.pickup, [6.5, 4.5]);
  assert.deepEqual(layout.routes['m:l'].out.pivot, [7.5, 6.5]);
  assert.ok(layout.routes['m:u'].tiles.every(t => t.y === 4.5) && layout.routes['m:l'].tiles.every(t => t.y === 6.5));
  assert.throws(() => connectLayout({ objects: [machine, upper], connections: [['m', 'u', { shift: -2 }]] }), /stay on the source/);
});
