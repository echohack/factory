import { makeTrace, SCENARIOS, CACHE_SIZE, HANDOFF, RELEASE, CYCLE, INTERVAL, DROP_P_MS, KEYINT, uploadRatio } from './model.mjs';
import { TracePlayer } from './kit/trace.mjs';
import { loadSprites } from './kit/sprites.mjs';
import { FactoryScene } from './kit/scene.mjs';
import { swing, pointOnPath } from './kit/transport.mjs';
import { processOutline } from './kit/process.mjs';
import { keepRowsOnGrid } from './kit/tables.mjs';
import { factoryLayout } from './layout.mjs';
const $ = id => document.getElementById(id);
let settings = { ...SCENARIOS.healthy }, trace = makeTrace(settings), player = new TracePlayer(trace.events, trace.initial);
let scene, visible = true, lastTime = null, lastIndex = -1, frameClock = 0;
const media = matchMedia('(prefers-reduced-motion: reduce)'), narrow = matchMedia('(max-width: 560px)');
let cachedLayout = null, cachedNarrow = null;
const layout = () => { if (cachedNarrow !== narrow.matches) { cachedNarrow = narrow.matches; cachedLayout = factoryLayout(narrow.matches); } return cachedLayout; };
const LANES = [
  { key: 'capture', title: 'Capture', machines: ['camera', 'mic', 'desk', 'game'], routes: /^(camera|mic|desk):/ },
  { key: 'render', title: 'Render', machines: ['gfx'], routes: /^(asyncq|game|gfx):/ },
  { key: 'video', title: 'Encode video', machines: ['venc'], routes: /^(cache|venc):/ },
  { key: 'audio', title: 'Mix and encode audio', machines: ['mixer', 'aenc'], routes: /^(micbuf|deskbuf|mixer|aenc):/ },
  { key: 'stream', title: 'Stream', machines: ['uplink'], routes: /^(stream|sendbuf):/ },
  { key: 'record', title: 'Record', machines: ['mux'], routes: /^(record|mux):/ }
];
const ANIMATED = ['camera', 'mic', 'desk', 'gfx', 'venc', 'mixer', 'aenc', 'uplink', 'mux', 'game'];
const working = (state, t) => Object.entries(state.busy).filter(([, b]) => b && t >= b.from && t < b.to).map(([m]) => m);
const laneActive = (state, t) => LANES.filter(l => l.machines.some(m => working(state, t).includes(m)) ||
  state.transits.some(tr => l.routes.test(tr.key) && t >= tr.start && t <= tr.start + CYCLE)).map(l => l.key);
const outline = processOutline($('process'), LANES, { onJump: jump });
function jump(key) {
  const lane = LANES.find(l => l.key === key), from = player.snapshot().index;
  const i = trace.events.findIndex((e, j) => j > from && (lane.machines.some(m => e.after.busy[m]?.from === e.t) ||
    e.after.transits.some(tr => lane.routes.test(tr.key) && tr.start === e.t)));
  if (i >= 0) { player.seek(i + 1); lastTime = null; render(); }
}

// Arm poses and visible items for every handoff running at time t.
function handoffs(l, state, t) {
  const arms = [], tokens = [];
  for (const route of Object.values(l.routes)) {
    const rest = arm => ({ ...arm, hand: arm.pickup, closed: false });
    const out = rest(route.out), into = route.into && rest(route.into);
    arms.push(out); if (into) arms.push(into);
    const tr = state.transits.find(x => x.key === route.key && t >= x.start && t <= x.start + CYCLE);
    if (!tr) continue;
    const u = t - tr.start, token = position => tokens.push({ position, value: tr.label, icon: tr.icon, heldBy: null });
    if (route.direct) {
      if (u < RELEASE) { out.hand = swing(out, u / RELEASE); out.closed = true; token(out.hand); }
      else out.hand = swing(out, (u - RELEASE) / HANDOFF.back, true);
      continue;
    }
    const beltStart = HANDOFF.out, beltEnd = HANDOFF.out + HANDOFF.belt;
    if (u < beltStart) { out.hand = swing(out, u / HANDOFF.out); out.closed = true; token(out.hand); }
    else if (u < beltStart + HANDOFF.belt) {
      out.hand = swing(out, Math.min(1, (u - beltStart) / HANDOFF.out), true);
      const p = pointOnPath(route.beltPath, (u - beltStart) / HANDOFF.belt);
      const under = route.hidden?.length === 2 && route.hidden.every(([x]) => Math.abs(x - p[0]) < .01) && p[1] > Math.min(route.hidden[0][1], route.hidden[1][1]) && p[1] < Math.max(route.hidden[0][1], route.hidden[1][1])
        || route.hidden?.length === 2 && route.hidden.every(([, y]) => Math.abs(y - p[1]) < .01) && p[0] > Math.min(route.hidden[0][0], route.hidden[1][0]) && p[0] < Math.max(route.hidden[0][0], route.hidden[1][0]);
      if (!under) token(p);
    } else if (u < RELEASE) { into.hand = swing(into, (u - beltEnd) / HANDOFF.in); into.closed = true; token(into.hand); }
    else into.hand = swing(into, (u - RELEASE) / HANDOFF.back, true);
  }
  return { arms, tokens };
}
function readouts(s, t) {
  const b = m => s.busy[m] && t >= s.busy[m].from && t < s.busy[m].to ? s.busy[m].label : null;
  const used = s.stock.cache.length + s.cacheReserved + (s.encoding ? 1 : 0);
  const v = s.stock.sendbuf.filter(p => p.kind === 'video'), span = v.length > 1 ? v.at(-1).dts - v[0].dts : 0;
  return {
    asyncq: `${s.stock.asyncq.length} queued`, unused: s.count.unused,
    gfx: [b('gfx') ?? 'idle', s.count.missed ? `missed ${s.count.missed}` : ''].filter(Boolean).join(' · '),
    skipped: s.count.skipped, cache: `${used}/${CACHE_SIZE} slots`,
    venc: s.encoding ? `${s.encoding.label.split('×')[0]} · ${Math.min(s.encoding.done + (b('venc') ? 1 : 0), s.encoding.count)}/${s.encoding.count}` : 'idle',
    stream: `${s.stock.stream.length} held`, record: `${s.stock.record.length} held`,
    sendbuf: `${s.stock.sendbuf.length} pkt · ${Math.round(span)} ms`, dropped: s.count.dropped,
    uplink: `${b('uplink') ?? 'idle'} · ${s.count.sent} sent`, micbuf: s.stock.micbuf.length, deskbuf: s.stock.deskbuf.length,
    mixer: b('mixer') ?? 'idle', aenc: b('aenc') ?? 'idle', mux: b('mux') ?? 'idle', file: `${s.count.file} packets`
  };
}
function simTime(snap) { const e = snap.event; return e ? e.from + (e.t - e.from) * snap.progress : snap.state.t; }
function render() {
  if (!scene) return;
  const snap = player.snapshot(), l = layout(), t = simTime(snap);
  const state = snap.event ? snap.event.before : snap.state;
  const on = working(state, t), still = media.matches;
  const { arms, tokens } = handoffs(l, state, still && snap.event ? snap.event.from : t);
  scene.render(l, { beltFrame: frameClock / 60, arms, tokens, active: on,
    frames: Object.fromEntries(on.filter(m => ANIMATED.includes(m)).map(m => [m, still ? 0 : t / 1.2])),
    variants: { preview: on.includes('gfx') ? 'on' : 'off' }, readouts: readouts(state, t) });
  $('play').textContent = snap.done ? 'Run again ↺' : snap.playing ? 'Pause Ⅱ' : snap.index ? 'Continue ▶' : 'Start ▶';
  $('step').disabled = snap.done;
  if (snap.done) outline.set('done'); else outline.set(laneActive(state, t), { done: [] });
  if (snap.index !== lastIndex) {
    const said = snap.index ? trace.events.slice(0, snap.index).findLast(e => e.notes.length) : null;
    $('narration').textContent = snap.done ? summary(trace.result) : said ? said.notes.at(-1) : 'Ready.';
    lastIndex = snap.index;
  }
  const c = state.count;
  $('scene').setAttribute('aria-label', `OBS at ${t.toFixed(0)} ms. Rendered ${c.rendered} frames, missed ${c.missed}, skipped ${c.skippedStat}, dropped ${c.dropped}. Stream sent ${c.sent} packets; recording wrote ${c.file}.`);
}
const summary = s => `Complete. ${s.count.rendered} frames rendered for ${s.count.ticks} ticks. Missed ${s.count.missed}, skipped ${s.count.skippedStat}, dropped ${s.count.dropped}. Stream sent ${s.count.sent} packets; the recording wrote ${s.count.file}.`;

const fmt = (n, unit) => `${n} ${unit}`;
function renderTables() {
  const rows = [
    ['Camera', 'capture thread', 'obs-source.c', 'Pushes a frame every 16.7 ms into the source’s async queue (up to 30).'],
    ['Async frames', 'graphics thread', 'obs-source.c', 'Each tick takes the newest frame that is due and releases older ones unrendered.'],
    ['Game capture', 'graphics thread', 'game-capture', 'Sync source: draws its texture when the graphics thread renders the scene.'],
    ['Graphics thread', 'graphics thread', 'obs-video.c', `Every ${INTERVAL.toFixed(1)} ms: tick sources, draw the scene and preview, scale, convert to NV12. Late frames repeat (missed).`],
    ['Frame cache', 'graphics → video-io', 'video-io.c', `${CACHE_SIZE} slots. When full, the new frame is skipped and the newest cached frame is encoded again.`],
    ['x264', 'video-io thread', 'obs-x264.c', `One packet per tick. Keyframe every ${KEYINT} packets. Sends one reference to each output.`],
    ['Mic, desktop audio', 'capture threads', 'obs-source.c', 'Push 1024-sample chunks (21.3 ms) into per-source buffers.'],
    ['Audio thread', 'audio thread', 'obs-audio.c', 'Mixes one chunk from every source per 21.3 ms, two chunks behind capture.'],
    ['AAC', 'audio-io thread', 'obs-ffmpeg-audio-encoders.c', 'One packet per chunk. Sends one reference to each output.'],
    ['Interleave', 'encoder threads', 'obs-output.c', 'Holds packets in timestamp order. Sends one only when a later packet of the other type is held.'],
    ['Send buffer', 'output thread', 'rtmp-stream.c', `With 5+ packets and over ${DROP_P_MS} ms of video queued, drops queued P-frames, then new ones until a keyframe. Never drops audio.`],
    ['Uplink', 'send thread', 'rtmp-stream.c', 'Writes one packet at a time at the upload speed.'],
    ['ffmpeg-mux', 'separate process', 'obs-ffmpeg-mux.c', 'Writes every packet to the file. The recording never drops.'],
    ['Not drawn: hardware encoders', 'graphics thread', 'obs-video-gpu-encode.c', 'NVENC, AMF and QSV take GPU textures through their own queue, not the frame cache.'],
    ['Not drawn: filters, scene items', 'graphics thread', 'obs-scene.c', 'Drawn inside the graphics thread’s render step.'],
    ['Not drawn: other outputs', 'output threads', 'obs-output.c', 'Replay buffer and virtual camera attach to the same encoders or the raw video.'],
    ['Not drawn: B-frames, dynamic bitrate', 'encoder, send thread', 'rtmp-stream.c', 'Change which packets can be dropped and when.']
  ];
  fill('stages', rows);
  const res = Object.entries(SCENARIOS).map(([name, cfg]) => {
    const r = name === currentName() ? trace.result : makeTrace(cfg).result, c = r.count;
    return [LABEL[name], `${cfg.render} ms`, `${cfg.encode} ms`, `${uploadRatio(cfg.upload).toFixed(1)}× bitrate`, c.ticks, c.missed, c.skippedStat, c.dropped, `${c.sent} / ${c.file}`];
  });
  fill('results', res);
}
const LABEL = { healthy: 'Healthy', render: 'Rendering lag', encode: 'Encoding lag', network: 'Network congestion' };
const currentName = () => Object.entries(SCENARIOS).find(([, s]) => Object.keys(s).every(k => s[k] === settings[k]))?.[0] ?? 'custom';
const grids = {};
function fill(id, rows) {
  $(`${id}-body`).replaceChildren(...rows.map(([head, ...cells]) => {
    const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = head; tr.append(th);
    for (const text of cells) { const td = document.createElement('td'); td.textContent = text; tr.append(td); }
    return tr;
  }));
  (grids[id] ??= keepRowsOnGrid($(id))).refresh();
}
function toggle() { if (player.snapshot().done) { player.reset(); frameClock = 0; lastIndex = -1; } player.playing ? player.pause() : player.play(); lastTime = null; render(); }
function reset() { player.reset(); frameClock = 0; lastIndex = -1; lastTime = null; render(); }
function load(next) {
  settings = next; trace = makeTrace(settings); player = new TracePlayer(trace.events, trace.initial);
  for (const key of ['render', 'encode', 'upload']) $(`set-${key}`).value = String(settings[key]);
  $('scenario').value = currentName();
  reset();
}
$('play').addEventListener('click', toggle);
$('step').addEventListener('click', () => { player.step(); lastTime = null; render(); });
$('reset').addEventListener('click', reset);
$('factory').addEventListener('keydown', e => {
  if (e.target.closest('input,select,textarea,button,a') || e.altKey || e.metaKey || e.ctrlKey || !scene) return;
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  if (e.code === 'ArrowRight') { e.preventDefault(); player.step(); render(); }
});
$('scenario').addEventListener('change', () => { if (SCENARIOS[$('scenario').value]) load({ ...SCENARIOS[$('scenario').value] }); });
for (const key of ['render', 'encode', 'upload']) $(`set-${key}`).addEventListener('change', () => load({ ...settings, [key]: Number($(`set-${key}`).value) }));
$('upload-fast').textContent = `${uploadRatio(3).toFixed(1)}× bitrate`;
$('upload-slow').textContent = `${uploadRatio(.6).toFixed(1)}× bitrate`;
media.addEventListener('change', () => { if (media.matches) player.pause(); lastTime = null; lastIndex = -1; render(); });
narrow.addEventListener('change', render);
document.addEventListener('visibilitychange', () => { lastTime = null; });
new IntersectionObserver(entries => { visible = entries[0].isIntersecting; lastTime = null; }, { threshold: 0 }).observe($('scene'));
new ResizeObserver(render).observe($('scene'));
function frame(now) {
  if (scene && visible && !document.hidden && player.playing) {
    const dt = lastTime == null ? 0 : Math.min(now - lastTime, 100) * Number($('speed').value);
    player.update(dt); frameClock = media.matches ? 0 : frameClock + dt; render();
  }
  lastTime = visible && !document.hidden ? now : null; requestAnimationFrame(frame);
}
renderTables();
try {
  const atlas = await loadSprites('./assets/');
  scene = new FactoryScene($('scene'), atlas);
  for (const id of ['play', 'step', 'reset']) $(id).disabled = false;
  load(settings); requestAnimationFrame(frame);
  window.factoryDemo = { seek(i) { player.seek(i); render(); }, get state() { return player.snapshot(); }, get trace() { return trace; }, get layout() { return layout(); },
    load(name) { load({ ...SCENARIOS[name] }); }, step() { player.step(); render(); }, finish() { player.seek(trace.events.length); render(); }, reset, render };
} catch (error) { $('narration').textContent = error.message; $('narration').classList.remove('sr-only'); console.error(error); }
