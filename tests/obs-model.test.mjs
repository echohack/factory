import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTrace, SCENARIOS, CACHE_SIZE, KEYINT, CYCLE } from '../examples/obs-pipeline/model.mjs';
import { TracePlayer } from '../kit/trace.mjs';

const traces = Object.fromEntries(Object.entries(SCENARIOS).map(([name, cfg]) => [name, makeTrace(cfg)]));
const monotonic = list => list.every((p, i) => !i || p.dts >= list[i - 1].dts);

test('each overload raises only its own OBS counter', () => {
  const c = name => traces[name].result.count;
  assert.deepEqual([c('healthy').missed, c('healthy').skippedStat, c('healthy').dropped], [0, 0, 0]);
  assert.ok(c('render').missed > 0 && !c('render').skippedStat && !c('render').dropped);
  assert.ok(c('encode').skippedStat > 0 && !c('encode').missed && !c('encode').dropped);
  assert.ok(c('network').dropped > 0 && !c('network').missed && !c('network').skippedStat);
});

test('every scenario drains: nothing in transit, no packet left behind', () => {
  for (const { result: s } of Object.values(traces)) {
    assert.equal(s.transits.length, 0);
    for (const key of ['cache', 'micbuf', 'deskbuf', 'sendbuf', 'stream', 'record']) assert.equal(s.stock[key].length, 0, key);
    for (const [key, items] of Object.entries(s.held)) assert.equal(Array.isArray(items) ? items.length : items, 0, key);
    assert.equal(s.count.sent + s.count.dropped, s.count.file, 'the stream sends or drops each packet the recording writes');
  }
});

test('one video packet per output tick, and both outputs receive every packet', () => {
  for (const { result: s, trail } of Object.values(traces)) {
    assert.equal(trail.mux.filter(p => p.kind === 'video').length, s.count.ticks);
    assert.equal(trail.sendbuf.length, trail.mux.length);
  }
});

test('interleaving delivers each output in timestamp order', () => {
  for (const { trail } of Object.values(traces)) { assert.ok(monotonic(trail.mux)); assert.ok(monotonic(trail.sendbuf)); }
});

test('network drops never touch keyframes or audio, and stop at a keyframe', () => {
  const { trail } = traces.network;
  assert.ok(trail.dropped.every(p => p.kind === 'video' && !p.key));
  const sentVideo = trail.sent.filter(p => p.kind === 'video');
  const lastDrop = Math.max(...trail.dropped.map(p => p.dts));
  const resume = sentVideo.find(p => p.dts > lastDrop);
  assert.ok(resume.key, 'the first video packet after a drop is a keyframe');
  assert.ok(sentVideo.filter(p => p.key).length === trail.mux.filter(p => p.key).length);
  assert.equal(trail.mux.filter(p => p.key).length, Math.ceil(traces.network.result.count.ticks / KEYINT));
});

test('the frame cache never exceeds its six slots, and handoffs never overlap on one arm', () => {
  for (const { events } of Object.values(traces)) for (const e of events) {
    const s = e.after;
    assert.ok(s.stock.cache.length + s.cacheReserved + (s.encoding ? 1 : 0) <= CACHE_SIZE);
    const keys = s.transits.map(t => t.key);
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(s.transits.every(t => s.t - t.start <= CYCLE));
  }
});

test('render lag repeats frames; encoding lag skips them', () => {
  assert.ok(traces.render.trail.mux.filter(p => p.reason === 'lag').length === traces.render.result.count.missed);
  assert.ok(traces.encode.trail.mux.filter(p => p.reason === 'skip').length === traces.encode.result.count.skippedStat);
});

test('stepping and timed playback reach the same final state', () => {
  const trace = traces.encode;
  const a = new TracePlayer(trace.events, trace.initial), b = new TracePlayer(trace.events, trace.initial);
  while (!a.snapshot().done) a.step();
  b.play(); while (!b.snapshot().done) b.update(53);
  assert.deepEqual(a.snapshot().state, b.snapshot().state);
});
