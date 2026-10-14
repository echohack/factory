// A modeled trace of OBS streaming and recording at once. Each OBS thread runs on
// its own clock; rules follow libobs, obs-outputs and obs-ffmpeg. Times are model
// milliseconds at real OBS rates (30 fps video, 48 kHz AAC). Inputs are scenario
// costs, not measurements. Every state change is an instant; the view interpolates
// the inserter handoffs between instants.
export const FPS = 30, INTERVAL = 1000 / FPS, FRAMES = 45, CACHE_SIZE = 6, KEYINT = 15;
export const CAMERA_FPS = 60, AUDIO_INTERVAL = 1024 / 48, AUDIO_DELAY = 2 * (1024 / 48);
export const DROP_P_MS = 400, KEY_SIZE = 6, P_SIZE = 1, AUDIO_SIZE = .2;
export const HANDOFF = { out: 2, belt: 3, in: 2, back: 1 }; // model ms; a visible stand-in for a queue push
export const RELEASE = HANDOFF.out + HANDOFF.belt + HANDOFF.in, CYCLE = RELEASE + HANDOFF.back;
export const MIX_MS = 3, AAC_MS = 3, MUX_MS = 1;
export const SCENARIOS = {
  healthy: { render: 20, encode: 20, upload: 3 },
  render: { render: 50, encode: 20, upload: 3 },
  encode: { render: 20, encode: 50, upload: 3 },
  network: { render: 20, encode: 20, upload: .6 }
};
export const OPTIONS = { render: [20, 50], encode: [20, 50], upload: [3, .6] };
const BITRATE = (KEY_SIZE + (KEYINT - 1) * P_SIZE) / KEYINT + AUDIO_SIZE * INTERVAL / AUDIO_INTERVAL;
export const uploadRatio = upload => upload / BITRATE;
export function validate(s) {
  for (const key of Object.keys(OPTIONS)) if (!OPTIONS[key].includes(s?.[key])) throw new Error(`Unsupported ${key} setting`);
}
// Routes are the inserter-and-belt links drawn in layout.mjs.
export const ROUTES = [
  ['camera', 'asyncq'], ['asyncq', 'gfx'], ['asyncq', 'unused'], ['game', 'gfx'], ['gfx', 'cache'], ['gfx', 'skipped'],
  ['cache', 'venc'], ['venc', 'stream'], ['venc', 'record'],
  ['mic', 'micbuf'], ['desk', 'deskbuf'], ['micbuf', 'mixer'], ['deskbuf', 'mixer'], ['mixer', 'aenc'],
  ['aenc', 'stream'], ['aenc', 'record'],
  ['stream', 'sendbuf'], ['sendbuf', 'dropped'], ['sendbuf', 'uplink'], ['record', 'mux'], ['mux', 'file']
].map(([a, b]) => `${a}:${b}`);

export function makeTrace(settings) {
  validate(settings);
  const { render: R, encode: E, upload: B } = settings;
  const END = FRAMES * INTERVAL;
  const s = {
    t: 0,
    stock: { asyncq: [], cache: [], micbuf: [], deskbuf: [], sendbuf: [], stream: [], record: [] },
    held: { camera: [], game: [], gfx: [], venc: [], mic: [], desk: [], mixer: [], aenc: [], uplink: [], mux: [] },
    transits: [], busy: {},
    count: { unused: 0, skipped: 0, dropped: 0, file: 0, sent: 0, missed: 0, skippedStat: 0, rendered: 0, ticks: 0 },
    last: { unused: null, skipped: null, dropped: null, file: null, sent: null },
    cacheReserved: 0, encoding: null, vt: 0, minPriority: 0, lastVideoDts: null, lagged: null
  };
  const initial = structuredClone(s), events = [];
  // Arrival order at each sink, for checks; not part of the displayed state.
  const trail = { mux: [], sendbuf: [], dropped: [], sent: [] };
  // ---- discrete-event scheduler --------------------------------------------
  const queue = []; let seq = 0;
  const at = (time, fn) => { queue.push({ time, seq: seq++, fn }); };
  let notes = [];
  const note = text => notes.push(text);
  const routes = Object.fromEntries(ROUTES.map(key => [key, { free: 0, waiting: [] }]));
  // Move one item (or a batch) across a route. take() removes it from the source
  // at pickup; give() credits the destination at release.
  const send = (key, item, take, give) => {
    if (!routes[key]) throw new Error(`Unknown route ${key}`);
    routes[key].waiting.push({ item, take, give }); pump(key);
  };
  const pump = key => {
    const r = routes[key];
    if (!r.waiting.length || r.free > s.t) return;
    const { item, take, give } = r.waiting.shift();
    take();
    const transit = { key, label: item.label, icon: item.icon, kind: item.kind, n: item.n ?? 1, start: s.t, released: false };
    s.transits.push(transit); r.free = s.t + CYCLE;
    at(s.t + RELEASE, () => { transit.released = true; give(); });
    at(s.t + CYCLE, () => { s.transits.splice(s.transits.indexOf(transit), 1); pump(key); });
  };

  // ---- async video source: camera capture thread (60 fps) -------------------
  // Sources capture until the graphics thread has covered the stream's video time.
  const live = () => s.videoEnd == null || s.t < s.videoEnd;
  const camera = c => at(c * 1000 / CAMERA_FPS, () => {
    if (!live()) return;
    camera(c + 1);
    const frame = { label: `C${c + 1}`, icon: 'item-copper-plate', kind: 'camera', ts: s.t };
    s.held.camera.push(frame); busy('camera', s.t, s.t + 1000 / CAMERA_FPS);
    send('camera:asyncq', frame, () => s.held.camera.splice(s.held.camera.indexOf(frame), 1), () => s.stock.asyncq.push(frame));
  });
  camera(0);
  const chunks = { mic: 0, desk: 0 };
  // ---- async audio sources: capture threads push 1024-sample chunks ----------
  for (const [src, buf, icon] of [['mic', 'micbuf', 'item-iron-ore'], ['desk', 'deskbuf', 'item-copper-ore']])
    (function capture(n) { at(n * AUDIO_INTERVAL, () => {
      if (!live()) return;
      capture(n + 1); chunks[src] = n + 1;
      const chunk = { label: `${src === 'mic' ? 'm' : 'd'}${n + 1}`, icon, kind: 'chunk', n };
      s.held[src].push(chunk); busy(src, s.t, s.t + AUDIO_INTERVAL);
      send(`${src}:${buf}`, chunk, () => s.held[src].splice(s.held[src].indexOf(chunk), 1), () => s.stock[buf].push(chunk));
    }); })(0);

  // ---- graphics thread (obs-video.c) ------------------------------------------
  let frameNo = 0;
  const gfxTick = () => {
    const k = ++frameNo, tickStart = s.t;
    // tick_sources(): the async source keeps the newest frame that is due and releases older ones.
    const due = s.stock.asyncq.filter(f => f.ts <= s.t);
    const pick = due.at(-1);
    for (const f of due.slice(0, -1)) send('asyncq:unused', f, () => s.stock.asyncq.splice(s.stock.asyncq.indexOf(f), 1),
      () => { s.count.unused++; s.last.unused = f.label; });
    if (due.length > 1) note(`Camera delivered ${due.length} frames since the last tick; OBS uses ${pick.label} and releases ${due.length - 1}.`);
    let inputs = 0; const need = pick ? 2 : 1;
    const arrived = () => { if (++inputs === need) busy('gfx', s.t, tickStart + R, `F${k}`); };
    if (pick) send('asyncq:gfx', pick, () => s.stock.asyncq.splice(s.stock.asyncq.indexOf(pick), 1), () => { s.held.gfx.push(pick); arrived(); });
    const tex = { label: `G${k}`, icon: 'item-iron-gear-wheel', kind: 'game' };
    // Game capture is a sync source: it draws on the graphics thread when asked.
    s.held.game.push(tex); busy('game', s.t, s.t + RELEASE);
    send('game:gfx', tex, () => s.held.game.splice(s.held.game.indexOf(tex), 1), () => { s.held.gfx.push(tex); arrived(); });
    at(tickStart + R, () => finishRender(k, tickStart));
  };
  const finishRender = (k) => {
    // Inputs are consumed into the composited, scaled, NV12-converted frame.
    s.held.gfx = []; s.busy.gfx = null; s.count.rendered++;
    // video_sleep(): sleep to the next tick, or count every interval that passed.
    const late = s.t >= s.vt + INTERVAL;
    const count = late ? Math.floor(Math.max(s.t - s.vt, INTERVAL) / INTERVAL) : 1;
    const nextVt = s.vt + INTERVAL * count;
    s.count.missed += count - 1; s.count.ticks += count; s.vt = nextVt;
    if (count > 1) { s.lagged = `F${k}`; note(`F${k} finished ${(s.t - (nextVt - INTERVAL * count)).toFixed(0)} ms into its tick; OBS shows it for ${count} ticks (missed frames +${count - 1}).`); }
    const frame = { label: count > 1 ? `F${k}×${count}` : `F${k}`, id: `F${k}`, icon: 'item-iron-plate', kind: 'frame', count, reps: ['new', ...Array(count - 1).fill('lag')], skipped: 0, done: 0 };
    s.held.gfx.push(frame);
    const used = s.stock.cache.length + s.cacheReserved + (s.encoding ? 1 : 0);
    if (used >= CACHE_SIZE) {
      // video_output_lock_frame(): a full cache cannot take the frame.
      const last = s.stock.cache.at(-1) ?? s.encoding;
      last.count += count; last.skipped += count; last.reps.push(...Array(count).fill('skip')); last.label = `${last.id}×${last.count}`;
      note(`Frame cache full (${CACHE_SIZE}/${CACHE_SIZE}). F${k} is skipped; ${last.id} will be encoded ${count} more time${count > 1 ? 's' : ''}.`);
      send('gfx:skipped', frame, () => s.held.gfx.splice(s.held.gfx.indexOf(frame), 1), () => { s.count.skipped++; s.last.skipped = frame.id; });
    } else {
      s.cacheReserved++;
      send('gfx:cache', frame, () => s.held.gfx.splice(s.held.gfx.indexOf(frame), 1), () => { s.cacheReserved--; s.stock.cache.push(frame); encodeVideo(); });
    }
    if (k < FRAMES) at(late ? s.t : nextVt, gfxTick);
    else s.videoEnd = s.vt;
  };
  at(0, gfxTick);

  // ---- video-io thread + x264 (video-io.c, obs-encoder.c) ----------------------
  let pts = 0, vencBusy = false;
  const encodeVideo = () => {
    if (vencBusy) return;
    if (s.encoding && s.encoding.done < s.encoding.count) { vencBusy = true; at(s.t, () => startEncode(false)); return; }
    if (!s.stock.cache.length) return;
    vencBusy = true;
    const f = s.stock.cache[0];
    send('cache:venc', f, () => { s.stock.cache.shift(); s.encoding = f; s.held.venc.push(f); }, () => startEncode(true));
  };
  const startEncode = fresh => {
    const f = s.encoding, work = Math.max(1, E - (fresh ? RELEASE : 0));
    busy('venc', s.t, s.t + work, f.id);
    at(s.t + work, () => {
      const p = pts++, key = p % KEYINT === 0, reason = f.reps[f.done];
      f.done++;
      // video_output_cur_frame(): a repeat taken from skipped counts as a skipped frame.
      if (f.done < f.count && f.skipped > 0) { f.skipped--; s.count.skippedStat++; }
      s.busy.venc = null; vencBusy = false;
      if (f.done === f.count) { s.held.venc.splice(s.held.venc.indexOf(f), 1); s.encoding = null; }
      for (const out of ['stream', 'record']) {
        const pkt = { label: `${key ? 'K' : 'P'}${p}`, icon: key ? 'item-advanced-circuit' : 'item-electronic-circuit', kind: 'video', key, dts: p * INTERVAL, size: key ? KEY_SIZE : P_SIZE, reason, image: f.id };
        s.held.venc.push(pkt);
        send(`venc:${out}`, pkt, () => s.held.venc.splice(s.held.venc.indexOf(pkt), 1), () => interleave(out, pkt));
      }
      encodeVideo();
    });
  };

  // ---- audio thread (obs-audio.c) + AAC on the audio-io thread ------------------
  (function mixTick(n) { at(n * AUDIO_INTERVAL + AUDIO_DELAY, () => {
    if (n >= Math.min(chunks.mic, chunks.desk)) { if (live()) mixTick(n); return; }
    mixTick(n + 1);
    const mic = s.stock.micbuf.find(c => c.n === n), desk = s.stock.deskbuf.find(c => c.n === n);
    let got = 0;
    const both = () => { if (++got < 2) return; busy('mixer', s.t, s.t + MIX_MS, `A${n + 1}`);
      at(s.t + MIX_MS, () => {
        s.held.mixer = s.held.mixer.filter(c => c.n !== n); s.busy.mixer = null;
        const mixed = { label: `A${n + 1}`, icon: 'item-copper-cable', kind: 'mix', n };
        s.held.mixer.push(mixed);
        send('mixer:aenc', mixed, () => s.held.mixer.splice(s.held.mixer.indexOf(mixed), 1), () => {
          s.held.aenc.push(mixed); busy('aenc', s.t, s.t + AAC_MS, `a${n}`);
          at(s.t + AAC_MS, () => {
            s.held.aenc.splice(s.held.aenc.indexOf(mixed), 1); s.busy.aenc = null;
            for (const out of ['stream', 'record']) {
              const pkt = { label: `a${n}`, icon: 'item-battery', kind: 'audio', dts: n * AUDIO_INTERVAL, size: AUDIO_SIZE };
              s.held.aenc.push(pkt);
              send(`aenc:${out}`, pkt, () => s.held.aenc.splice(s.held.aenc.indexOf(pkt), 1), () => interleave(out, pkt));
            }
          });
        });
      }); };
    for (const [buf, chunk] of [['micbuf', mic], ['deskbuf', desk]])
      send(`${buf}:mixer`, chunk, () => s.stock[buf].splice(s.stock[buf].indexOf(chunk), 1), () => { s.held.mixer.push(chunk); both(); });
  }); })(0);

  // ---- outputs: interleave_packets() (obs-output.c) -----------------------------
  const flushing = { stream: false, record: false };
  const interleave = (out, pkt) => {
    const buf = s.stock[out];
    let i = buf.findIndex(p => !p.leaving && p.dts > pkt.dts || (p.dts === pkt.dts && pkt.kind === 'audio' && p.kind === 'video'));
    if (i < 0) i = buf.length; buf.splice(i, 0, pkt);
    release(out);
  };
  // A packet leaves only when the buffer holds a later packet of the other type.
  // Released packets wait in the buffer for the output inserter, in order.
  const release = out => {
    const buf = s.stock[out];
    for (;;) {
      const rest = buf.filter(p => !p.leaving), head = rest[0];
      if (!head || !(flushing[out] || rest.some(p => p.kind !== head.kind && p.dts > head.dts))) return;
      head.leaving = true;
      if (out === 'stream') send('stream:sendbuf', head, () => buf.splice(buf.indexOf(head), 1), () => rtmpData(head));
      else send('record:mux', head, () => buf.splice(buf.indexOf(head), 1), () => muxWrite(head));
    }
  };

  // ---- recording: ffmpeg-mux writes every packet; it never drops ------------------
  let muxBusy = false; const muxQueue = [];
  const muxWrite = pkt => { trail.mux.push(pkt); s.held.mux.push(pkt); muxQueue.push(pkt); muxNext(); };
  const muxNext = () => {
    if (muxBusy || !muxQueue.length) return;
    const pkt = muxQueue.shift(); muxBusy = true; busy('mux', s.t, s.t + MUX_MS, pkt.label);
    at(s.t + MUX_MS, () => {
      s.busy.mux = null; muxBusy = false;
      send('mux:file', pkt, () => s.held.mux.splice(s.held.mux.indexOf(pkt), 1), () => { s.count.file++; s.last.file = pkt.label; });
      muxNext();
    });
  };

  // ---- streaming: rtmp_stream_data() + send_thread (rtmp-stream.c) ----------------
  const rtmpData = pkt => {
    trail.sendbuf.push(pkt);
    const q = s.stock.sendbuf;
    if (pkt.kind === 'video') {
      // check_to_drop_frames(): too much buffered video drops queued P-frames.
      const first = q.find(p => p.kind === 'video' && !p.key);
      const span = first && s.lastVideoDts != null ? s.lastVideoDts - first.dts : 0;
      if (q.length >= 5 && span > DROP_P_MS) {
        const victims = q.filter(p => p.kind === 'video' && !p.key);
        note(`Send buffer holds ${span.toFixed(0)} ms of video (over ${DROP_P_MS} ms). OBS drops ${victims.length} queued P-frames, keeps keyframes and audio, and drops new P-frames until the next keyframe.`);
        for (const v of victims) q.splice(q.indexOf(v), 1);
        s.held.sendbufOut = (s.held.sendbufOut ?? 0) + victims.length;
        send('sendbuf:dropped', { label: `${victims.length}×P`, icon: 'item-electronic-circuit', n: victims.length }, () => {}, () => {
          s.held.sendbufOut -= victims.length; trail.dropped.push(...victims); s.count.dropped += victims.length; s.last.dropped = `${victims[0].label}–${victims.at(-1).label}`;
        });
        s.minPriority = 3;
      }
      // add_video_packet(): while dropping, discard until a keyframe arrives.
      if (!pkt.key && s.minPriority === 3) {
        s.held.sendbufOut = (s.held.sendbufOut ?? 0) + 1;
        send('sendbuf:dropped', pkt, () => {}, () => { trail.dropped.push(pkt); s.held.sendbufOut--; s.count.dropped++; s.last.dropped = pkt.label; });
        return;
      }
      s.minPriority = 0; s.lastVideoDts = pkt.dts;
    }
    q.push(pkt); sendNext();
  };
  let uplinkBusy = false;
  const sendNext = () => {
    if (uplinkBusy || !s.stock.sendbuf.length) return;
    uplinkBusy = true;
    const pkt = s.stock.sendbuf[0], ms = pkt.size / B * INTERVAL;
    send('sendbuf:uplink', pkt, () => s.stock.sendbuf.shift(), () => {
      s.held.uplink.push(pkt); busy('uplink', s.t, s.t + ms, pkt.label);
      at(s.t + ms, () => { s.held.uplink = []; s.busy.uplink = null; s.count.sent++; trail.sent.push(pkt); s.last.sent = pkt.label; uplinkBusy = false; sendNext(); });
    });
  };

  // Stop: once every frame is encoded, the outputs flush what they still hold.
  const busy = (machine, from, to, label) => { s.busy[machine] = { from, to, label }; };
  at(END, function stop() {
    const upstream = /^(camera|asyncq|game|gfx|cache|venc|mic|desk|micbuf|deskbuf|mixer|aenc):/;
    const pending = frameNo < FRAMES || s.busy.gfx || s.stock.cache.length || s.encoding || vencBusy || s.cacheReserved ||
      s.held.mixer.length || s.held.aenc.length || s.held.venc.length || s.stock.micbuf.length || s.stock.deskbuf.length ||
      s.transits.some(t => upstream.test(t.key)) || live() || s.t < s.videoEnd + AUDIO_DELAY + MIX_MS + AAC_MS + 2 * CYCLE;
    if (pending) { at(s.t + 20, stop); return; }
    flushing.stream = flushing.record = true; release('stream'); release('record');
  });

  // ---- run ---------------------------------------------------------------------
  let prevT = 0;
  while (queue.length) {
    queue.sort((a, b) => a.time - b.time || a.seq - b.seq);
    const time = queue[0].time;
    const before = events.at(-1)?.after ?? snapshot(s);
    s.t = time; notes = [];
    while (queue.length && queue[0].time === time) { queue.shift().fn(); queue.sort((a, b) => a.time - b.time || a.seq - b.seq); }
    for (const [m, b] of Object.entries(s.busy)) if (b && b.to <= s.t && !['gfx', 'venc', 'mixer', 'aenc', 'uplink', 'mux'].includes(m)) s.busy[m] = null;
    events.push({ t: time, from: prevT, duration: Math.max(4, Math.min(260, (time - prevT) * 24)), notes, before, after: snapshot(s) });
    prevT = time;
    if (events.length > 20000) throw new Error('Model did not terminate');
  }
  return { initial: snapshot(initial), events, result: snapshot(s), trail };
}
function snapshot(s) {
  const strip = items => items.map(({ label, icon, kind, key, dts }) => ({ label, icon, kind, key, dts }));
  return {
    t: s.t, vt: s.vt,
    stock: Object.fromEntries(Object.entries(s.stock).map(([k, v]) => [k, strip(v)])),
    held: Object.fromEntries(Object.entries(s.held).map(([k, v]) => [k, Array.isArray(v) ? strip(v) : v])),
    transits: s.transits.map(t => ({ ...t })), busy: structuredClone(s.busy),
    count: { ...s.count }, last: { ...s.last }, cacheReserved: s.cacheReserved,
    encoding: s.encoding ? { label: s.encoding.label, done: s.encoding.done, count: s.encoding.count } : null,
    minPriority: s.minPriority, lagged: s.lagged
  };
}
