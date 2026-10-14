import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTrace, parseInput, DEFAULT_INPUT, SOURCE_LINES } from '../examples/array-pipeline/model.mjs';
import { TracePlayer } from '../kit/trace.mjs';

test('trace agrees with the displayed JavaScript, including boundary inputs', () => {
  const execute = new Function('input', SOURCE_LINES.join('\n') + '\nreturn result;');
  for (const input of [DEFAULT_INPUT, [], [1, 3, 5], [0], [-4, -3, 2, 2], Array(16).fill(998)]) {
    const trace = makeTrace(input), final = trace.events.at(-1).after;
    assert.equal(trace.result, execute(input));
    assert.equal(final.sum, execute(input));
    assert.equal(final.tested, input.length);
    assert.equal(final.reduced, input.filter(n => n % 2 === 0).length);
  }
  assert.equal(makeTrace(DEFAULT_INPUT).result, 60);
});

test('all filtering precedes mapping, then reduction, with conservation at each event', () => {
  const { events, initial } = makeTrace(DEFAULT_INPUT);
  let previous = initial, lastPhase = 0;
  const order = { filter: 0, map: 1, reduce: 2, done: 3 };
  for (const event of events) {
    assert.deepEqual(event.before, previous);
    assert.ok(order[event.phase] >= lastPhase);
    lastPhase = order[event.phase];
    const s = event.after;
    assert.equal(s.tested, s.filtered.length + s.rejected.length);
    assert.deepEqual(s.filtered, s.input.slice(0, s.tested).filter(n => n % 2 === 0));
    assert.deepEqual(s.rejected, s.input.slice(0, s.tested).filter(n => n % 2 !== 0));
    assert.deepEqual(s.mapped, s.filtered.slice(0, s.mapped.length).map(n => n * 3));
    assert.equal(s.sum, s.mapped.slice(0, s.reduced).reduce((a, b) => a + b, 0));
    if (event.phase !== 'filter') assert.equal(s.tested, s.input.length);
    if (['reduce', 'done'].includes(event.phase)) assert.equal(s.mapped.length, s.filtered.length);
    previous = s;
  }
});

test('timed playback and event stepping produce identical states', () => {
  const trace = makeTrace(DEFAULT_INPUT), stepper = new TracePlayer(trace.events, trace.initial);
  const running = new TracePlayer(trace.events, trace.initial);
  running.play();
  for (const event of trace.events) {
    const stepped = stepper.step(), timed = running.update(event.duration);
    assert.equal(stepped.index, timed.index);
    assert.deepEqual(stepped.state, timed.state);
  }
  assert.equal(running.snapshot().done, true);
  assert.equal(running.snapshot().playing, false);
  assert.equal(running.snapshot().state.sum, 60);
});

test('pause freezes partial progress, step commits once, reset restores initial state', () => {
  const trace = makeTrace([2]), player = new TracePlayer(trace.events, trace.initial);
  player.play(); player.update(300); player.pause();
  const paused = player.snapshot();
  assert.equal(paused.progress, .4);
  assert.deepEqual(player.update(5000), paused);
  assert.equal(player.step().index, 1);
  assert.equal(player.snapshot().progress, 0);
  player.seek(trace.events.length);
  assert.equal(player.snapshot().state.sum, 6);
  assert.deepEqual(player.reset().state, trace.initial);
  const copy = player.snapshot(); copy.state.input[0] = 999;
  assert.equal(player.snapshot().state.input[0], 2);
  assert.throws(() => player.seek(-1), RangeError);
  assert.throws(() => player.update(-1), RangeError);
  assert.throws(() => new TracePlayer([{ duration: 0 }], {}));
});

test('input parser accepts empty and signed integers, rejects ambiguous or unsafe inputs', () => {
  assert.deepEqual(parseInput(''), []);
  assert.deepEqual(parseInput(' -12, 0, 18 '), [-12, 0, 18]);
  for (const text of ['2,,4', '1.5', 'NaN', '1000', '1e2', Array(17).fill(1).join(',')]) assert.throws(() => parseInput(text));
  assert.throws(() => makeTrace([Infinity]));
});
