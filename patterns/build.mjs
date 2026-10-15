export const TILES = {
  'wooden-chest': [1, 1], 'iron-chest': [1, 1], 'steel-chest': [1, 1], 'passive-provider-chest': [1, 1], 'active-provider-chest': [1, 1],
  'storage-chest': [1, 1], 'buffer-chest': [1, 1], 'requester-chest': [1, 1],
  'burner-mining-drill': [2, 2], pumpjack: [3, 3], 'stone-furnace': [2, 2], 'steel-furnace': [2, 2], 'electric-furnace': [3, 3],
  foundry: [5, 5], recycler: [2, 4], biochamber: [3, 3], 'assembling-machine-1': [3, 3], 'assembling-machine-2': [3, 3],
  'assembling-machine-3': [3, 3], 'oil-refinery': [5, 5], 'chemical-plant': [3, 3], centrifuge: [3, 3], 'cryogenic-plant': [5, 5],
  lab: [3, 3], biolab: [5, 5], crusher: [2, 3],
  'small-electric-pole': [1, 1], 'medium-electric-pole': [1, 1], 'big-electric-pole': [2, 2], substation: [2, 2],
  boiler: [3, 2], 'steam-engine': [3, 5], 'steam-turbine': [3, 5], 'solar-panel': [3, 3], accumulator: [2, 2],
  'nuclear-reactor': [5, 5], 'heat-exchanger': [3, 2], 'heating-tower': [3, 3],
  'storage-tank': [3, 3], pump: [1, 2], 'small-lamp': [1, 1], 'arithmetic-combinator': [1, 2], 'decider-combinator': [1, 2],
  'selector-combinator': [1, 2], 'constant-combinator': [1, 1], radar: [3, 3], roboport: [4, 4],
};
export const INVENTORY = new Set(['wooden-chest', 'iron-chest', 'steel-chest', 'passive-provider-chest', 'active-provider-chest',
  'storage-chest', 'buffer-chest', 'requester-chest', 'burner-mining-drill', 'stone-furnace', 'steel-furnace', 'electric-furnace',
  'foundry', 'recycler', 'biochamber', 'assembling-machine-1', 'assembling-machine-2', 'assembling-machine-3', 'oil-refinery',
  'chemical-plant', 'centrifuge', 'cryogenic-plant', 'lab', 'biolab', 'crusher', 'boiler', 'nuclear-reactor', 'roboport']);
export const REACH = { inserter: [1, 1.2], 'burner-inserter': [1, 1.2], 'fast-inserter': [1, 1.2], 'bulk-inserter': [1, 1.2],
  'stack-inserter': [1, 1.2], 'long-handed-inserter': [2, 2.2] };
export const SWING_MS = { inserter: 595, 'burner-inserter': 641, 'fast-inserter': 208, 'long-handed-inserter': 417,
  'bulk-inserter': 208, 'stack-inserter': 208 };
export const BELT_SPEED = { 'transport-belt': 1.875, 'fast-transport-belt': 3.75, 'express-transport-belt': 5.625, 'turbo-transport-belt': 7.5 };
export const UNDERGROUND_GAP = { 'underground-belt': 4, 'fast-underground-belt': 6, 'express-underground-belt': 8, 'turbo-underground-belt': 10 };
export const SUPPLY = { 'small-electric-pole': 2.5, 'medium-electric-pole': 3.5, 'big-electric-pole': 2, substation: 9 };
export const WIRE_REACH = { 'small-electric-pole': 7.5, 'medium-electric-pole': 9, 'big-electric-pole': 32, substation: 18 };
const POLE_TOP = { 'small-electric-pole': [0, -2.58], 'medium-electric-pole': [.23, -3.11], 'big-electric-pole': [0, -3.84], substation: [0, -2.69] };
const POLE_SHADOW = { 'small-electric-pole': [3.08, .08], 'medium-electric-pole': [3.58, -.2], 'big-electric-pole': [3.83, -.53], substation: [4.25, .25] };
const CIRCUIT = {
  chest: { red: [.34, .2], green: [.41, .42] }, 'small-lamp': { red: [.39, .27], green: [.45, .48] },
  arm: { red: [.52, .11], green: [.39, .25] },
  'small-electric-pole': { red: [.41, -2.53], green: [-.39, -2.53] },
  'constant-combinator': { red: [-.27, -.55], green: [.22, -.55] },
  input: { red: [-.27, .48], green: [.28, .47] }, output: { red: [-.28, -.67], green: [.31, -.66] },
};

export const STEP = { east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] };
export const NAMES = ['east', 'west', 'north', 'south'];
export const VECTORS = [[1, 0], [-1, 0], [0, -1], [0, 1]];
const dirIndex = ([dx, dy]) => dx > 0 ? 0 : dx < 0 ? 1 : dy < 0 ? 2 : 3;
export const BELT_IO = [[0, 0], [1, 1], [2, 2], [3, 3], [1, 2], [3, 0], [0, 2], [3, 1], [2, 0], [1, 3], [2, 1], [0, 3]];
const CORNER = Object.fromEntries(BELT_IO.slice(4).map(([into, out], i) => [`${into}>${out}`, i + 4]));
const sign = v => Math.sign(Math.round(v * 1e6));
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

export function footprint(object) {
  if (object.width) return [object.width, object.height];
  if (object.size) return [object.size, object.size];
  const [w, h] = TILES[object.sprite] ?? [1, 1];
  return /^(east|west|horizontal)$/.test(object.variant ?? '') ? [h, w] : [w, h];
}

export function cells(object) {
  const [w, h] = footprint(object), out = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push([object.x - w / 2 + i + .5, object.y - h / 2 + j + .5]);
  return out;
}

export function inside(point, object) {
  const [w, h] = footprint(object);
  return Math.abs(point[0] - object.x) < w / 2 && Math.abs(point[1] - object.y) < h / 2;
}

export const station = (id, sprite, x, y, extra = {}) => ({ id, sprite, x, y, ...extra });

export function arm(id, pivot, facing, sprite = 'inserter') {
  const d = STEP[facing], [take, put] = REACH[sprite];
  return { id, sprite, pivot, pickup: add(pivot, d, -take), drop: add(pivot, d, put), flow: d };
}

function walk(points, loop) {
  const route = loop ? [...points, points[0]] : points, tiles = [];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1], d = [sign(b[0] - a[0]), sign(b[1] - a[1])];
    if (d[0] && d[1]) throw new Error('Belt segments must be axis-aligned');
    const n = Math.round(Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]));
    for (let k = i ? 1 : 0; k <= n; k++) tiles.push({ at: add(a, d, k), d: dirIndex(d) });
  }
  if (loop) tiles.pop();
  return tiles.map((tile, i) => {
    const next = tiles[i + 1] ?? (loop ? tiles[0] : null), previous = tiles[i - 1] ?? (loop ? tiles.at(-1) : null);
    const out = next ? dirIndex([sign(next.at[0] - tile.at[0]), sign(next.at[1] - tile.at[1])]) : tile.d;
    const into = previous ? dirIndex([sign(tile.at[0] - previous.at[0]), sign(tile.at[1] - previous.at[1])]) : out;
    return { at: tile.at, into, out };
  });
}

export function belt(points, { sprite = 'transport-belt', loop = false, under = [] } = {}) {
  const tiles = walk(points, loop).map(({ at, into, out }) =>
    ({ x: at[0], y: at[1], direction: into === out ? out : CORNER[`${into}>${out}`], sprite }));
  const tunnel = sprite.replace('transport-belt', 'underground-belt');
  for (const [a, b] of under) {
    const d = [sign(b[0] - a[0]), sign(b[1] - a[1])], name = NAMES[dirIndex(d)];
    const between = t => (t.x - a[0]) * d[0] + (t.y - a[1]) * d[1] > 0 && (b[0] - t.x) * d[0] + (b[1] - t.y) * d[1] > 0 &&
      (d[0] ? Math.abs(t.y - a[1]) < 1e-6 : Math.abs(t.x - a[0]) < 1e-6);
    for (let i = tiles.length - 1; i >= 0; i--) if (between(tiles[i])) tiles.splice(i, 1);
    for (const [p, end] of [[a, 'entrance'], [b, 'exit']]) {
      const tile = tiles.find(t => same([t.x, t.y], p));
      if (!tile) throw new Error('An underground end must lie on the belt path');
      Object.assign(tile, { sprite: tunnel, variant: `${end}-${name}`, direction: 0, underground: end, flow: dirIndex(d), pair: end === 'entrance' ? b : a });
    }
  }
  return tiles;
}

export function splitter(x, y, facing, sprite = 'splitter') {
  const d = STEP[facing], across = [Math.abs(d[1]), Math.abs(d[0])];
  return { x, y, sprite, variant: facing, direction: 0, splitter: true, flow: dirIndex(d),
    cells: [add([x, y], across, -.5), add([x, y], across, .5)] };
}

export function lanePath(points, side, offset = .2) {
  return points.map((p, i) => {
    const into = i ? [sign(p[0] - points[i - 1][0]), sign(p[1] - points[i - 1][1])] : null;
    const out = i < points.length - 1 ? [sign(points[i + 1][0] - p[0]), sign(points[i + 1][1] - p[1])] : null;
    const normals = [into, out].filter(Boolean).map(d => [-d[1] * side * offset, d[0] * side * offset]);
    if (normals.length === 2 && same(normals[0], normals[1])) normals.pop();
    return normals.reduce((q, n) => add(q, n), p);
  });
}

export function ride(drop, centers, pickup, side) {
  const d = [sign(centers[1][0] - centers[0][0]), sign(centers[1][1] - centers[0][1])];
  const lean = drop ? (drop[0] - centers[0][0]) * -d[1] + (drop[1] - centers[0][1]) * d[0] : 0;
  const lane = lanePath(centers, side ?? (lean < -1e-6 ? -1 : 1));
  const onto = (q, a, b) => Math.abs(a[1] - b[1]) < 1e-6 ? [q[0], a[1]] : [a[0], q[1]];
  if (drop) lane[0] = onto(drop, lane[0], lane[1]);
  if (pickup) lane[lane.length - 1] = onto(pickup, lane.at(-2), lane.at(-1));
  return [...(drop ? [drop] : []), ...lane, ...(pickup ? [pickup] : [])].filter((p, i, all) => !i || !same(p, all[i - 1]));
}

const PIPE_SHAPES = { NS: 'straight_vertical', EW: 'straight_horizontal', EN: 'corner_up_right', NW: 'corner_up_left',
  ES: 'corner_down_right', SW: 'corner_down_left', ENW: 't_up', ESW: 't_down', ENS: 't_right', NSW: 't_left', ENSW: 'cross',
  N: 'ending_up', S: 'ending_down', W: 'ending_left', E: 'ending_right' };
const FLUID_PORTS = {
  'chemical-plant': [[-1, -1, 'north'], [1, -1, 'north'], [-1, 1, 'south'], [1, 1, 'south']],
  'oil-refinery': [[-1, 2, 'south'], [1, 2, 'south'], [-2, -2, 'north'], [0, -2, 'north'], [2, -2, 'north']],
  'storage-tank': [[-1, -1, 'north'], [1, 1, 'east'], [1, 1, 'south'], [-1, -1, 'west']],
  pump: [[0, -.5, 'north'], [0, .5, 'south']],
  pumpjack: [[1, -1, 'north']],
};
const TURNS = { north: 0, east: 1, south: 2, west: 3 };
const turn = ([x, y], n) => { for (let i = 0; i < n; i++) [x, y] = [-y, x]; return [x, y]; };
export function fluidPorts(object) {
  const n = TURNS[object.variant] ?? 0;
  return (FLUID_PORTS[object.sprite] ?? []).map(([x, y, side]) => {
    const edge = add([object.x, object.y], turn([x, y], n)), out = turn(STEP[side], n);
    return { edge, pipe: add(edge, out), out };
  });
}

export function pipes(points, { objects = [], open = [] } = {}) {
  const key = p => `${p[0]}:${p[1]}`, set = new Map(points.map(p => [key(p), p]));
  const ends = new Set([...open.map(([a, b]) => `${key(a)}>${key(b)}`), ...objects.flatMap(fluidPorts).map(port => `${key(port.pipe)}>${key(port.edge)}`)]);
  return points.map(p => {
    const sides = [['N', [0, -1]], ['E', [1, 0]], ['S', [0, 1]], ['W', [-1, 0]]]
      .filter(([, d]) => set.has(key(add(p, d))) || ends.has(`${key(p)}>${key(add(p, d))}`)).map(([s]) => s).sort().join('');
    const shape = PIPE_SHAPES[sides] ?? (sides.length ? null : 'straight_horizontal');
    if (!shape) throw new Error(`No pipe shape joins ${sides}`);
    return { x: p[0], y: p[1], sprite: 'pipe', variant: shape, direction: 0, pipe: true };
  });
}
export function poleWire(a, b) {
  return { from: add([a.x, a.y], POLE_TOP[a.sprite]), to: add([b.x, b.y], POLE_TOP[b.sprite]), color: 'copper',
    shadow: [add([a.x, a.y], POLE_SHADOW[a.sprite]), add([b.x, b.y], POLE_SHADOW[b.sprite])], poles: [a.id, b.id] };
}
function circuitPoint(target, color, end) {
  if (target.pivot) return add(target.pivot, CIRCUIT.arm[color]);
  const table = /combinator$/.test(target.sprite) && target.sprite !== 'constant-combinator' ? CIRCUIT[end ?? 'input']
    : /chest$/.test(target.sprite) ? CIRCUIT.chest : CIRCUIT[target.sprite];
  if (!table) throw new Error(`No circuit connection on ${target.sprite}`);
  return add([target.x, target.y], table[color]);
}
export function circuitWire(a, b, color = 'red', { fromEnd, toEnd } = {}) {
  return { from: circuitPoint(a, color, fromEnd), to: circuitPoint(b, color, toEnd), color };
}

export function drillDrop(drill) {
  const [x, y] = [-.5, -1.3], turn = { north: [x, y], east: [-y, x], south: [-x, -y], west: [y, -x] }[drill.variant ?? 'north'];
  return add([drill.x, drill.y], turn);
}
