import { test, expect } from 'vite-plus/test';
import { makeTrace, SCENARIOS, CACHE_SIZE, KEYINT, CYCLE } from '../examples/obs-pipeline/model.mjs';
import { TracePlayer } from '../kit/trace.mjs';

const traces = Object.fromEntries(Object.entries(SCENARIOS).map(([name, cfg]) => [name, makeTrace(cfg)]));
const monotonic = list => list.every((p, i) => !i || p.dts >= list[i - 1].dts);

test('each overload raises only its own OBS counter', () => {
  const c = name => traces[name].result.count;
  expect([c('healthy').missed, c('healthy').skippedStat, c('healthy').dropped]).toStrictEqual([0, 0, 0]);
  expect(c('render').missed > 0 && !c('render').skippedStat && !c('render').dropped).toBeTruthy();
  expect(c('encode').skippedStat > 0 && !c('encode').missed && !c('encode').dropped).toBeTruthy();
  expect(c('network').dropped > 0 && !c('network').missed && !c('network').skippedStat).toBeTruthy();
});

test('every scenario drains: nothing in transit, no packet left behind', () => {
  for (const { result: s } of Object.values(traces)) {
    expect(s.transits.length).toBe(0);
    for (const key of ['cache', 'micbuf', 'deskbuf', 'sendbuf', 'stream', 'record']) expect(s.stock[key].length, key).toBe(0);
    for (const [key, items] of Object.entries(s.held)) expect(Array.isArray(items) ? items.length : items, key).toBe(0);
    expect(s.count.sent + s.count.dropped, 'the stream sends or drops each packet the recording writes').toBe(s.count.file);
  }
});

test('one video packet per output tick, and both outputs receive every packet', () => {
  for (const { result: s, trail } of Object.values(traces)) {
    expect(trail.mux.filter(p => p.kind === 'video').length).toBe(s.count.ticks);
    expect(trail.sendbuf.length).toBe(trail.mux.length);
  }
});

test('interleaving delivers each output in timestamp order', () => {
  for (const { trail } of Object.values(traces)) { expect(monotonic(trail.mux)).toBeTruthy(); expect(monotonic(trail.sendbuf)).toBeTruthy(); }
});

test('network drops never touch keyframes or audio, and stop at a keyframe', () => {
  const { trail } = traces.network;
  expect(trail.dropped.every(p => p.kind === 'video' && !p.key)).toBeTruthy();
  const sentVideo = trail.sent.filter(p => p.kind === 'video');
  const lastDrop = Math.max(...trail.dropped.map(p => p.dts));
  const resume = sentVideo.find(p => p.dts > lastDrop);
  expect(resume.key, 'the first video packet after a drop is a keyframe').toBeTruthy();
  expect(sentVideo.filter(p => p.key).length === trail.mux.filter(p => p.key).length).toBeTruthy();
  expect(trail.mux.filter(p => p.key).length).toBe(Math.ceil(traces.network.result.count.ticks / KEYINT));
});

test('the frame cache never exceeds its six slots, and handoffs never overlap on one arm', () => {
  for (const { events } of Object.values(traces)) for (const e of events) {
    const s = e.after;
    expect(s.stock.cache.length + s.cacheReserved + (s.encoding ? 1 : 0) <= CACHE_SIZE).toBeTruthy();
    const keys = s.transits.map(t => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(s.transits.every(t => s.t - t.start <= CYCLE)).toBeTruthy();
  }
});

test('render lag repeats frames; encoding lag skips them', () => {
  expect(traces.render.trail.mux.filter(p => p.reason === 'lag').length === traces.render.result.count.missed).toBeTruthy();
  expect(traces.encode.trail.mux.filter(p => p.reason === 'skip').length === traces.encode.result.count.skippedStat).toBeTruthy();
});

test('stepping and timed playback reach the same final state', () => {
  const trace = traces.encode;
  const a = new TracePlayer(trace.events, trace.initial), b = new TracePlayer(trace.events, trace.initial);
  while (!a.snapshot().done) a.step();
  b.play(); while (!b.snapshot().done) b.update(53);
  expect(a.snapshot().state).toStrictEqual(b.snapshot().state);
});
