import { test, expect } from 'vite-plus/test';
import { makeTrace, DEFAULT_INPUT, SOURCE_LINES } from '../examples/array-pipeline/model.mjs';
import { TracePlayer } from '../kit/trace.mjs';

test('trace agrees with the displayed JavaScript, including boundary inputs', () => {
  const execute = new Function('input', SOURCE_LINES.join('\n') + '\nreturn result;');
  for (const input of [DEFAULT_INPUT, [], [1, 3, 5], [0], [-4, -3, 2, 2], Array(16).fill(998)]) {
    const trace = makeTrace(input), final = trace.events.at(-1).after;
    expect(trace.result).toBe(execute(input));
    expect(final.sum).toBe(execute(input));
    expect(final.tested).toBe(input.length);
    expect(final.reduced).toBe(input.filter(n => n % 2 === 0).length);
  }
  expect(makeTrace(DEFAULT_INPUT).result).toBe(60);
});

test('all filtering precedes mapping, then reduction, with conservation at each event', () => {
  const { events, initial } = makeTrace(DEFAULT_INPUT);
  let previous = initial, lastPhase = 0;
  const order = { filter: 0, map: 1, reduce: 2, done: 3 };
  for (const event of events) {
    expect(event.before).toStrictEqual(previous);
    expect(order[event.phase] >= lastPhase).toBeTruthy();
    lastPhase = order[event.phase];
    const s = event.after;
    expect(s.tested).toBe(s.filtered.length + s.rejected.length);
    expect(s.filtered).toStrictEqual(s.input.slice(0, s.tested).filter(n => n % 2 === 0));
    expect(s.rejected).toStrictEqual(s.input.slice(0, s.tested).filter(n => n % 2 !== 0));
    expect(s.mapped).toStrictEqual(s.filtered.slice(0, s.mapped.length).map(n => n * 3));
    expect(s.sum).toBe(s.mapped.slice(0, s.reduced).reduce((a, b) => a + b, 0));
    if (event.phase !== 'filter') expect(s.tested).toBe(s.input.length);
    if (['reduce', 'done'].includes(event.phase)) expect(s.mapped.length).toBe(s.filtered.length);
    previous = s;
  }
});

test('timed playback and event stepping produce identical states', () => {
  const trace = makeTrace(DEFAULT_INPUT), stepper = new TracePlayer(trace.events, trace.initial);
  const running = new TracePlayer(trace.events, trace.initial);
  running.play();
  for (const event of trace.events) {
    const stepped = stepper.step(), timed = running.update(event.duration);
    expect(stepped.index).toBe(timed.index);
    expect(stepped.state).toStrictEqual(timed.state);
  }
  expect(running.snapshot().done).toBe(true);
  expect(running.snapshot().playing).toBe(false);
  expect(running.snapshot().state.sum).toBe(60);
});

test('pause freezes partial progress, step commits once, reset restores initial state', () => {
  const trace = makeTrace([2]), player = new TracePlayer(trace.events, trace.initial);
  player.play(); player.update(trace.events[0].duration * .4); player.pause();
  const paused = player.snapshot();
  expect(paused.progress).toBe(.4);
  expect(player.update(5000)).toStrictEqual(paused);
  expect(player.step().index).toBe(1);
  expect(player.snapshot().progress).toBe(0);
  player.seek(trace.events.length);
  expect(player.snapshot().state.sum).toBe(6);
  expect(player.reset().state).toStrictEqual(trace.initial);
  const copy = player.snapshot(); copy.state.input[0] = 999;
  expect(player.snapshot().state.input[0]).toBe(2);
  expect(() => player.seek(-1)).toThrow(RangeError);
  expect(() => player.update(-1)).toThrow(RangeError);
  expect(() => new TracePlayer([{ duration: 0 }], {})).toThrow();
});

test('a looping player starts again with the same events after the last one', () => {
  const trace = makeTrace(DEFAULT_INPUT), total = trace.events.reduce((sum, e) => sum + e.duration, 0), first = trace.events[0].duration;
  const player = new TracePlayer(trace.events, trace.initial, { loop: true });
  player.play();
  expect(player.update(total - 1)).toMatchObject({ index: trace.events.length - 1, playing: true });
  const again = player.update(1);
  expect(again).toMatchObject({ index: 0, progress: 0, done: false, playing: true });
  expect(again.state).toStrictEqual(trace.initial);
  const once = new TracePlayer(trace.events, trace.initial);
  once.play(); once.update(first + 50);
  expect(player.update(first + 50)).toStrictEqual(once.snapshot());
  player.update(3 * total - first - 50);
  expect(player.snapshot()).toMatchObject({ index: 0, progress: 0, playing: true });
});

test('the model rejects values it cannot draw', () => {
  for (const input of [[Infinity], [1.5], [1000], Array(17).fill(1)]) expect(() => makeTrace(input)).toThrow();
});
