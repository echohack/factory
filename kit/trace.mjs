export class TracePlayer {
  constructor(events, initialState, { loop = false } = {}) {
    if (events.some(e => !Number.isFinite(e.duration) || e.duration <= 0)) throw new Error('Events require positive finite durations');
    this.events = structuredClone(events);
    this.initialState = structuredClone(initialState);
    this.loop = loop;
    this.reset();
  }
  reset() { this.index = 0; this.elapsed = 0; this.playing = false; return this.snapshot(); }
  play() { if (this.loop || this.index < this.events.length) this.playing = true; }
  pause() { this.playing = false; }
  step() { this.pause(); if (this.index < this.events.length) this.index++; this.elapsed = 0; return this.snapshot(); }
  seek(index) {
    if (!Number.isInteger(index) || index < 0 || index > this.events.length) throw new RangeError('Invalid event index');
    this.pause(); this.index = index; this.elapsed = 0; return this.snapshot();
  }
  update(ms) {
    if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Invalid elapsed time');
    if (!this.playing) return this.snapshot();
    this.elapsed += ms;
    const length = () => this.events[this.index]?.duration ?? (this.loop ? 0 : Infinity);
    while (this.events.length && this.elapsed >= length()) { this.elapsed -= length(); this.index = this.index < this.events.length ? this.index + 1 : 0; }
    if (this.index === this.events.length && !this.loop) { this.elapsed = 0; this.pause(); }
    return this.snapshot();
  }
  snapshot() {
    const event = this.events[this.index] ?? null;
    const state = this.index ? this.events[this.index - 1].after : this.initialState;
    return { index: this.index, total: this.events.length, progress: event ? this.elapsed / event.duration : 1,
      state: structuredClone(state), event: event ? structuredClone(event) : null,
      playing: this.playing, done: !event };
  }
}
