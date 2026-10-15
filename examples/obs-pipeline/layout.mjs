const E = [1, 0], S = [0, 1], N = [0, -1];
const STATIONS = [
  ['camera', 'pumpjack', 3, 3.5, 5.5, 'Camera', 'async source, 60 fps'],
  ['asyncq', 'steel-chest', 1, 11.5, 5.5, 'Async frames', 'camera queue'],
  ['unused', 'wooden-chest', 1, 11.5, 10.5, 'Released', 'never rendered'],
  ['gfx', 'assembling-machine-3', 3, 19.5, 5.5, 'Graphics thread', 'compose, scale, NV12'],
  ['game', 'burner-mining-drill', 2, 20, 9, 'Game capture', 'sync source'],
  ['preview', 'small-lamp', 1, 22.5, 9.5, 'Preview', 'render_displays'],
  ['skipped', 'wooden-chest', 1, 18.5, 11.5, 'Skipped', 'cache full'],
  ['cache', 'steel-chest', 1, 27.5, 5.5, 'Frame cache', 'video-io, 6 slots'],
  ['venc', 'chemical-plant', 3, 35.5, 5.5, 'x264', 'video-io thread'],
  ['stream', 'assembling-machine-1', 3, 43.5, 5.5, 'Stream output', 'interleave A/V'],
  ['sendbuf', 'buffer-chest', 1, 51.5, 5.5, 'Send buffer', 'RTMP queue'],
  ['dropped', 'wooden-chest', 1, 51.5, 11.5, 'Dropped', 'P-frames'],
  ['uplink', 'assembling-machine-2', 3, 59.5, 5.5, 'Uplink', 'send thread'],
  ['mic', 'pumpjack', 3, 3.5, 14.5, 'Mic', 'async audio'],
  ['micbuf', 'steel-chest', 1, 11.5, 14.5, 'Mic buffer', ''],
  ['desk', 'pumpjack', 3, 3.5, 18.5, 'Desktop audio', 'async audio'],
  ['deskbuf', 'steel-chest', 1, 11.5, 18.5, 'Desktop buffer', ''],
  ['mixer', 'foundry', 5, 19.5, 16.5, 'Audio thread', 'mix 1024 samples'],
  ['aenc', 'chemical-plant', 3, 27.5, 16.5, 'AAC', 'audio-io thread'],
  ['record', 'assembling-machine-1', 3, 43.5, 16.5, 'Recording output', 'interleave A/V'],
  ['mux', 'assembling-machine-2', 3, 51.5, 16.5, 'ffmpeg-mux', 'separate process'],
  ['file', 'steel-chest', 1, 59.5, 16.5, 'recording.mkv', '']
];
const ROUTE_SPECS = [
  ['camera:asyncq', [4.5, 5.5], E, [11.5, 5.5], E],
  ['asyncq:gfx', [11.5, 5.5], E, [18.5, 5.5], E],
  ['asyncq:unused', [11.5, 5.5], S, [11.5, 10.5], S],
  ['game:gfx', [19.5, 8.5], N, [19.5, 6.5], N, null, null, true],
  ['gfx:cache', [20.5, 5.5], E, [27.5, 5.5], E],
  ['gfx:skipped', [18.5, 6.5], S, [18.5, 11.5], S],
  ['cache:venc', [27.5, 5.5], E, [34.5, 5.5], E],
  ['venc:stream', [36.5, 5.5], E, [42.5, 5.5], E],
  ['venc:record', [36.5, 6.5], S, [42.5, 15.5], E, [[36.5, 15.5]], [[36.5, 9.5], [36.5, 11.5]]],
  ['mic:micbuf', [4.5, 14.5], E, [11.5, 14.5], E],
  ['desk:deskbuf', [4.5, 18.5], E, [11.5, 18.5], E],
  ['micbuf:mixer', [11.5, 14.5], E, [17.5, 14.5], E],
  ['deskbuf:mixer', [11.5, 18.5], E, [17.5, 18.5], E],
  ['mixer:aenc', [21.5, 16.5], E, [26.5, 16.5], E],
  ['aenc:stream', [28.5, 15.5], N, [44.5, 6.5], N, [[28.5, 10.5], [44.5, 10.5]]],
  ['aenc:record', [28.5, 16.5], E, [42.5, 16.5], E],
  ['stream:sendbuf', [44.5, 5.5], E, [51.5, 5.5], E],
  ['sendbuf:dropped', [51.5, 5.5], S, [51.5, 11.5], S],
  ['sendbuf:uplink', [51.5, 5.5], E, [58.5, 5.5], E],
  ['record:mux', [44.5, 16.5], E, [50.5, 16.5], E],
  ['mux:file', [52.5, 16.5], E, [59.5, 16.5], E]
];
const DESKTOP_LABELS = {
  camera: [3.5, 1.6], asyncq: [11.5, 1.6], gfx: [19.5, 1.6], cache: [27.5, 1.6], venc: [35.5, 1.6], stream: [43.5, 1.6], sendbuf: [51.5, 1.6], uplink: [59.5, 1.6],
  unused: [8.2, 10.4], preview: [25.3, 9.4], game: [24.9, 11.6], skipped: [15.2, 11.4], dropped: [54.6, 11.4],
  mic: [3.5, 11.6], micbuf: [11.5, 12.6], desk: [3.5, 21.1], deskbuf: [11.5, 21.1], mixer: [19.5, 21.1], aenc: [27.5, 21.1],
  record: [43.5, 21.1], mux: [51.5, 21.1], file: [59.5, 21.1]
};
const DESKTOP_READOUTS = {
  asyncq: [8.4, 7.6], unused: [13.4, 10.5], gfx: [15.6, 8.1], skipped: [20.6, 11.5], cache: [27.5, 7.1], venc: [32.6, 8.4],
  stream: [40.4, 8.4], sendbuf: [48.2, 8.3], dropped: [49.4, 11.5], uplink: [59.5, 7.9], micbuf: [11.5, 15.9], deskbuf: [11.5, 17.1],
  mixer: [19.5, 20.0], aenc: [27.5, 18.9], record: [43.5, 18.9], mux: [51.5, 18.9], file: [59.5, 18.1]
};
const MOBILE = {
  camera: ['Camera', [5.5, 1.1], null], asyncq: ['Async frames', [5.5, 8.4], [5.5, 13.3]], unused: ['Released', [10.5, 13.6], [12.6, 11.5]],
  gfx: ['Graphics', [5.5, 15.4], [5.5, 22.2]], game: ['Game', [12.2, 20.6], null], preview: ['Preview', [12.6, 22.7], null],
  skipped: ['Skipped', [11.5, 16.6], [13.4, 18.5]], cache: ['Frame cache', [5.5, 24.6], [5.5, 29.4]],
  venc: ['x264', [5.5, 32.4], [5.5, 38.0]], stream: ['Stream', [5.5, 40.4], [5.5, 45.9]], sendbuf: ['Send buffer', [5.5, 48.6], [5.5, 53.4]],
  dropped: ['Dropped', [11.5, 53.6], [13.5, 51.5]], uplink: ['Uplink', [5.5, 56.6], [5.5, 62.0]],
  mic: ['Mic', [14.5, 1.1], null], desk: ['Desktop', [18.8, 1.1], null], micbuf: ['Audio buffers', [16.5, 8.6], [14.5, 13.3]],
  deskbuf: ['', [0, 0], [18.5, 13.3]], mixer: ['Audio mix', [16.5, 23.1], [20.6, 18.6]], aenc: ['AAC', [16.5, 25.1], [16.5, 29.6]],
  record: ['Record', [16.5, 40.4], [16.5, 45.9]], mux: ['ffmpeg-mux', [16.5, 48.6], [16.5, 53.6]], file: ['File', [16.5, 57.0], [16.5, 61.6]]
};
const T = ([x, y]) => [y, x];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const dirIndex = ([dx, dy]) => dx > 0 ? 0 : dx < 0 ? 1 : dy < 0 ? 2 : 3;
const CORNERS = { '0>2': 4, '2>0': 5, '1>2': 6, '2>1': 7, '3>0': 8, '0>3': 9, '3>1': 10, '1>3': 11 };

function buildRoute([key, outPort, outDir, inPort, inDir, via, under, direct], flip) {
  const P = flip ? T : p => p;
  [outPort, outDir, inPort, inDir] = [outPort, outDir, inPort, inDir].map(P);
  const [from, to] = key.split(':');
  if (direct) {
    const arm = { id: `${key}:arm`, pivot: add(outPort, outDir), pickup: outPort, drop: inPort, flow: outDir };
    return { key, from, to, direct: true, out: arm, tiles: [], beltPath: [] };
  }
  const start = add(outPort, outDir, 2), end = add(inPort, inDir, -2);
  const path = [start, ...(via ?? []).map(P), end];
  const out = { id: `${key}:out`, pivot: add(outPort, outDir), pickup: outPort, drop: start, flow: outDir };
  const into = { id: `${key}:in`, pivot: add(inPort, inDir, -1), pickup: end, drop: inPort, flow: inDir };
  const hidden = (under ?? []).map(P);
  const tiles = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [a, b] = [path[i], path[i + 1]], d = [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
    const n = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    for (let k = i ? 1 : 0; k <= n; k++) {
      const p = add(a, d, k), last = k === n && i < path.length - 2;
      let direction = dirIndex(d);
      if (last) {
        const c = path[i + 2], d2 = [Math.sign(c[0] - b[0]), Math.sign(c[1] - b[1])];
        direction = CORNERS[`${dirIndex(d)}>${dirIndex(d2)}`];
      }
      tiles.push({ x: p[0], y: p[1], direction, sprite: 'transport-belt' });
    }
  }
  if (hidden.length) {
    const [a, b] = hidden, d = dirIndex([Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])]);
    const name = ['east', 'west', 'north', 'south'][d];
    const lo = (p, i) => Math.min(a[i], b[i]) <= p[i] && p[i] <= Math.max(a[i], b[i]);
    for (let i = tiles.length - 1; i >= 0; i--) if (lo([tiles[i].x, tiles[i].y], 0) && lo([tiles[i].x, tiles[i].y], 1)) tiles.splice(i, 1);
    tiles.push({ x: a[0], y: a[1], sprite: 'underground-belt', variant: `entrance-${name}`, direction: 0 },
      { x: b[0], y: b[1], sprite: 'underground-belt', variant: `exit-${name}`, direction: 0 });
  }
  return { key, from, to, out, into, tiles, beltPath: path, hidden };
}

const AREAS = [
  ['libobs', [0.15, 0.5, 38.15, 22.5], [0.5, 0.5, 21.1, 38.5]],
  ['obs-outputs · RTMP', [38.8, 0.5, 23.7, 12.5], [0.5, 39, 12.5, 24]],
  ['obs-ffmpeg · ffmpeg-mux', [38.8, 13.5, 23.7, 9.5], [13.5, 39, 8.1, 24]],
];

export function factoryLayout(mobile = false) {
  const objects = STATIONS.map(([id, sprite, size, x0, y0, label, caption]) => {
    const [x, y] = mobile ? [y0, x0] : [x0, y0];
    const [labelX, labelY] = mobile ? MOBILE[id][1] : DESKTOP_LABELS[id], ro = mobile ? MOBILE[id][2] : DESKTOP_READOUTS[id];
    if (mobile) { label = MOBILE[id][0]; caption = ''; }
    return { id, sprite, size, x, y, label, caption, labelX, labelY, labelPlate: mobile,
      ...(ro ? { readoutX: ro[0], readoutY: ro[1] } : {}),
      variant: sprite === 'chemical-plant' ? (mobile ? 'south' : 'east') : sprite === 'burner-mining-drill' ? (mobile ? 'west' : 'north') : sprite === 'small-lamp' ? 'off' : undefined };
  });
  const routes = Object.fromEntries(ROUTE_SPECS.map(spec => { const r = buildRoute(spec, mobile); return [r.key, r]; }));
  const areas = AREAS.map(([label, desktop, phone]) => {
    const [x, y, width, height] = mobile ? phone : desktop;
    return { label, x, y, width, height, ...(mobile ? { labelEdge: 'left' } : {}) };
  });
  return { width: mobile ? 22 : 63, height: mobile ? 63.5 : 23.5, objects, routes, areas,
    beltTiles: Object.values(routes).flatMap(r => r.tiles) };
}
