import { footprint, cells, inside, INVENTORY, REACH, UNDERGROUND_GAP, SUPPLY, WIRE_REACH, BELT_IO, VECTORS, NAMES, STEP, drillDrop, fluidPorts } from './build.mjs';

const key = ([x, y]) => `${Math.round(x * 2) / 2}:${Math.round(y * 2) / 2}`;
const near = (a, b) => Math.abs(a - b) < 1e-6;
const half = v => near(v - Math.floor(v), .5);
const whole = v => near(v, Math.round(v));
const name = o => o.id ?? `${o.sprite} at ${o.x}, ${o.y}`;
const POLES = new Set(Object.keys(SUPPLY));
const UNPOWERED = new Set(['wooden-chest', 'iron-chest', 'steel-chest', 'passive-provider-chest', 'active-provider-chest', 'storage-chest',
  'buffer-chest', 'requester-chest', 'burner-mining-drill', 'stone-furnace', 'steel-furnace', 'storage-tank',
  'solar-panel', 'accumulator', 'boiler', 'steam-engine', 'steam-turbine', 'nuclear-reactor', 'heat-exchanger', 'heating-tower',
  'constant-combinator', 'biochamber', ...POLES]);

function floor(layout) {
  const occupied = new Map(), belts = new Map();
  const claim = (cell, thing) => { const k = key(cell); occupied.set(k, [...(occupied.get(k) ?? []), thing]); };
  for (const object of layout.objects ?? []) for (const cell of cells(object)) claim(cell, { kind: 'object', ref: object });
  for (const tile of layout.beltTiles ?? []) {
    for (const cell of tile.cells ?? [[tile.x, tile.y]]) {
      claim(cell, { kind: tile.pipe ? 'pipe' : 'belt', ref: tile });
      if (!tile.pipe) belts.set(key(cell), tile);
    }
  }
  for (const arm of layout.arms ?? []) claim(arm.pivot, { kind: 'arm', ref: arm });
  const objectAt = point => (layout.objects ?? []).find(o => inside(point, o));
  return { occupied, belts, objectAt };
}

const flowOf = tile => tile.splitter || tile.underground ? [tile.flow, tile.flow] : BELT_IO[tile.direction];
const cellOf = point => point.map(v => Math.floor(v) + .5);

const checks = {
  'whole-tiles'(layout) {
    const out = [];
    for (const object of layout.objects ?? []) {
      const [w, h] = footprint(object);
      if (!whole(object.x - w / 2) || !whole(object.y - h / 2)) out.push(`${name(object)} does not sit on whole tiles`);
    }
    for (const tile of layout.beltTiles ?? []) for (const cell of tile.cells ?? [[tile.x, tile.y]])
      if (!half(cell[0]) || !half(cell[1])) out.push(`${tile.sprite} at ${tile.x}, ${tile.y} is off the tile grid`);
    for (const arm of layout.arms ?? []) if (!half(arm.pivot[0]) || !half(arm.pivot[1])) out.push(`${arm.id} is off the tile grid`);
    return out;
  },
  'one-per-tile'(layout) {
    const { occupied } = floor(layout), out = [];
    for (const [cell, things] of occupied) if (things.length > 1) out.push(`${things.map(t => t.ref.id ?? t.ref.sprite).join(' and ')} share tile ${cell}`);
    for (const [cell] of occupied) {
      const [x, y] = cell.split(':').map(Number);
      if (layout.width != null && (x < 0 || y < 0 || x > layout.width || y > layout.height)) out.push(`Tile ${cell} lies outside the floor`);
    }
    return out;
  },
  'inserter-reach'(layout) {
    const out = [];
    for (const arm of layout.arms ?? []) {
      const [take, put] = REACH[arm.sprite] ?? REACH.inserter, [dx, dy] = arm.flow;
      const expected = [[arm.pivot[0] - dx * take, arm.pivot[1] - dy * take], [arm.pivot[0] + dx * put, arm.pivot[1] + dy * put]];
      if (!(Math.abs(dx) + Math.abs(dy) === 1)) out.push(`${arm.id} must face along one axis`);
      else if (!expected.every((p, i) => near(p[0], [arm.pickup, arm.drop][i][0]) && near(p[1], [arm.pickup, arm.drop][i][1])))
        out.push(`${arm.id} must take ${take} tile${take > 1 ? 's' : ''} behind and drop ${put} in front`);
    }
    return out;
  },
  'inserter-ends'(layout) {
    const { belts, objectAt } = floor(layout), out = [];
    for (const arm of layout.arms ?? []) for (const [end, point] of [['takes from', arm.pickup], ['drops onto', arm.drop]]) {
      const object = objectAt(point);
      if (belts.has(key(cellOf(point)))) continue;
      if (!object) out.push(`${arm.id} ${end} empty floor`);
      else if (!INVENTORY.has(object.sprite)) out.push(`${arm.id} ${end} ${name(object)}, which has no inventory`);
    }
    return out;
  },
  'belt-continuity'(layout) {
    const { belts, objectAt, occupied } = floor(layout), out = [];
    const outside = cell => layout.width != null && (cell[0] < 0 || cell[1] < 0 || cell[0] > layout.width || cell[1] > layout.height);
    const pickups = new Set((layout.arms ?? []).map(a => key(cellOf(a.pickup))));
    const drops = new Set([...(layout.arms ?? []).map(a => key(cellOf(a.drop))),
      ...(layout.objects ?? []).filter(o => o.sprite === 'burner-mining-drill').map(o => key(cellOf(drillDrop(o))))]);
    const fedFrom = new Set();
    for (const tile of new Set(belts.values())) {
      if (tile.underground === 'entrance') { fedFrom.add(key(tile.pair)); continue; }
      const [, exit] = flowOf(tile), d = VECTORS[exit];
      for (const cell of tile.cells ?? [[tile.x, tile.y]]) {
        const ahead = [cell[0] + d[0], cell[1] + d[1]], next = belts.get(key(ahead));
        if (next) {
          const [entry] = flowOf(next);
          if (VECTORS[entry][0] === -d[0] && VECTORS[entry][1] === -d[1]) out.push(`${tile.sprite} at ${cell} runs head-on into the belt at ${ahead}`);
          else if (next.splitter && entry !== exit) out.push(`${tile.sprite} at ${cell} runs into the side of a splitter`);
          else if (next.underground === 'exit' && entry === exit) out.push(`${tile.sprite} at ${cell} runs into the back of an underground exit`);
          else fedFrom.add(key(ahead));
          continue;
        }
        const object = objectAt(ahead);
        if (object) out.push(`The belt at ${cell} runs into ${name(object)}. An inserter must take from the belt instead`);
        else if (occupied.has(key(ahead)) && occupied.get(key(ahead)).some(t => t.kind === 'pipe')) out.push(`The belt at ${cell} runs into a pipe`);
        else if (!pickups.has(key(cell)) && !outside(ahead)) out.push(`The belt at ${cell} ends where no inserter takes from it`);
      }
    }
    for (const tile of new Set(belts.values())) {
      if (tile.underground === 'exit') { if (!fedFrom.has(key([tile.x, tile.y]))) out.push(`The underground exit at ${tile.x}, ${tile.y} has no entrance`); continue; }
      for (const cell of tile.cells ?? [[tile.x, tile.y]]) {
        const [entry] = flowOf(tile), d = VECTORS[entry], behind = [cell[0] - d[0], cell[1] - d[1]];
        if (tile.splitter && belts.has(key(behind))) continue;
        if (fedFrom.has(key(cell)) || drops.has(key(cell)) || outside(behind)) continue;
        if (!tile.splitter) out.push(`The belt at ${cell} starts where nothing feeds it`);
      }
    }
    return out;
  },
  'underground-pairs'(layout) {
    const out = [], tiles = layout.beltTiles ?? [];
    for (const tile of tiles.filter(t => t.underground === 'entrance')) {
      const exit = tiles.find(t => t.underground === 'exit' && near(t.x, tile.pair[0]) && near(t.y, tile.pair[1]) && t.flow === tile.flow);
      const gap = Math.abs(tile.pair[0] - tile.x) + Math.abs(tile.pair[1] - tile.y) - 1;
      if (!exit) out.push(`The underground entrance at ${tile.x}, ${tile.y} has no exit`);
      else if (gap > (UNDERGROUND_GAP[tile.sprite] ?? 4)) out.push(`The underground at ${tile.x}, ${tile.y} spans ${gap} tiles; ${tile.sprite} reaches ${UNDERGROUND_GAP[tile.sprite]}`);
    }
    return out;
  },
  'pipes-connect'(layout) {
    const out = [], tiles = (layout.beltTiles ?? []).filter(t => t.pipe), at = new Map(tiles.map(t => [key([t.x, t.y]), t]));
    const SIDES = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
    const SHAPES = { straight_vertical: 'NS', straight_horizontal: 'EW', corner_up_right: 'NE', corner_up_left: 'NW', corner_down_right: 'ES',
      corner_down_left: 'SW', t_up: 'ENW', t_down: 'ESW', t_right: 'ENS', t_left: 'NSW', cross: 'ENSW', ending_up: 'N', ending_down: 'S', ending_left: 'W', ending_right: 'E' };
    const ports = new Map((layout.objects ?? []).flatMap(o => fluidPorts(o).map(p => [`${key(p.pipe)}>${key(p.edge)}`, o])));
    const opens = t => [...SHAPES[t.variant]].map(s => [t.x + SIDES[s][0], t.y + SIDES[s][1]]);
    for (const tile of tiles) for (const next of opens(tile)) {
      const neighbor = at.get(key(next));
      if (layout.width != null && (next[0] < 0 || next[1] < 0 || next[0] > layout.width || next[1] > layout.height)) continue;
      if (neighbor ? !opens(neighbor).some(p => key(p) === key([tile.x, tile.y])) : !ports.has(`${key([tile.x, tile.y])}>${key(next)}`))
        out.push(`The pipe at ${tile.x}, ${tile.y} opens toward ${next.join(', ')}, where nothing connects`);
    }
    for (const tile of tiles) for (const s of Object.values(SIDES)) {
      const neighbor = at.get(key([tile.x + s[0], tile.y + s[1]]));
      if (neighbor && !opens(tile).some(p => key(p) === key([neighbor.x, neighbor.y]))) out.push(`The pipes at ${tile.x}, ${tile.y} and ${neighbor.x}, ${neighbor.y} touch without joining; in the game they would join and mix`);
    }
    return out;
  },
  'drill-drops'(layout) {
    const { belts, objectAt } = floor(layout), out = [];
    for (const drill of (layout.objects ?? []).filter(o => o.sprite === 'burner-mining-drill')) {
      const point = drillDrop(drill), target = objectAt(point);
      if (!belts.has(key(cellOf(point))) && !(target && INVENTORY.has(target.sprite))) out.push(`${name(drill)} drops onto empty floor`);
    }
    return out;
  },
  'areas'(layout) {
    const out = [], areas = layout.areas ?? [];
    const contains = (a, o) => { const [w, h] = footprint(o); return o.x - w / 2 >= a.x - 1e-6 && o.x + w / 2 <= a.x + a.width + 1e-6 && o.y - h / 2 >= a.y - 1e-6 && o.y + h / 2 <= a.y + a.height + 1e-6; };
    const touches = (a, o) => { const [w, h] = footprint(o); return o.x + w / 2 > a.x && o.x - w / 2 < a.x + a.width && o.y + h / 2 > a.y && o.y - h / 2 < a.y + a.height; };
    for (const object of layout.objects ?? []) {
      const homes = areas.filter(a => touches(a, object));
      if (homes.length > 1) out.push(`${name(object)} sits in more than one area`);
      for (const a of homes) if (!contains(a, object)) out.push(`${name(object)} crosses the edge of ${a.label}`);
    }
    areas.forEach((a, i) => areas.slice(i + 1).forEach(b => {
      const gap = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width), b.y - (a.y + a.height), a.y - (b.y + b.height));
      if (gap < .5 - 1e-6) out.push(`${a.label} and ${b.label} need half a tile between them`);
    }));
    return out;
  },
  'powered'(layout) {
    const poles = (layout.objects ?? []).filter(o => POLES.has(o.sprite)), out = [];
    if (!poles.length) return out;
    const covered = (thing, [w, h]) => poles.some(p => Math.abs(thing[0] - p.x) < SUPPLY[p.sprite] + w / 2 && Math.abs(thing[1] - p.y) < SUPPLY[p.sprite] + h / 2);
    for (const object of layout.objects) if (!UNPOWERED.has(object.sprite) && !covered([object.x, object.y], footprint(object))) out.push(`${name(object)} stands outside every pole's supply area`);
    for (const arm of layout.arms ?? []) if (arm.sprite !== 'burner-inserter' && !covered(arm.pivot, [1, 1])) out.push(`${arm.id} stands outside every pole's supply area`);
    const byID = Object.fromEntries(poles.map(p => [p.id, p])), linked = new Set([poles[0].id]);
    const copper = (layout.wires ?? []).filter(w => w.poles);
    for (const w of copper) {
      const [a, b] = w.poles.map(id => byID[id]), length = Math.hypot(a.x - b.x, a.y - b.y);
      if (length > Math.min(WIRE_REACH[a.sprite], WIRE_REACH[b.sprite])) out.push(`The wire from ${a.id} to ${b.id} is longer than the poles reach`);
    }
    for (let grew = true; grew;) { grew = false; for (const w of copper) if (linked.has(w.poles[0]) !== linked.has(w.poles[1])) { w.poles.forEach(id => linked.add(id)); grew = true; } }
    for (const p of poles) if (!linked.has(p.id)) out.push(`${p.id} is not wired to the other poles`);
    return out;
  },
};

export const groundRules = [
  { id: 'whole-tiles', text: 'Every building, belt and inserter sits on whole tiles of the grid.' },
  { id: 'one-per-tile', text: 'No two buildings, belts, pipes or inserters share a tile, and nothing leaves the floor.' },
  { id: 'inserter-reach', text: 'An inserter takes from the tile behind it and drops on the tile in front. A long-handed inserter reaches two tiles. An inserter drops onto the far lane of a belt.' },
  { id: 'inserter-ends', text: 'Each inserter takes from a belt or an inventory and drops onto a belt or into an inventory. Chests and machines have inventories; poles, lamps and combinators do not.' },
  { id: 'belt-continuity', text: 'A belt never runs into a building. It starts where something feeds it and ends where an inserter takes from it, at a side-load, a splitter, an underground, or the floor edge. Belts never meet head-on.' },
  { id: 'underground-pairs', text: 'An underground entrance has an exit on the same line, in the same direction, within its reach. Other belts and pipes may cross between them.' },
  { id: 'pipes-connect', text: 'Every pipe opening meets another pipe or a machine’s fluid port. Two pipes never touch side by side unless they join, because in the game they would mix.' },
  { id: 'drill-drops', text: 'A mining drill drops straight onto the belt or into the inventory in front of it, with no inserter.' },
  { id: 'areas', text: 'Each major part of a system has its own dotted area. A station sits wholly inside one area, and areas keep half a tile apart. Belts, pipes and wires cross area edges.' },
  { id: 'powered', text: 'When a scene draws poles, every powered machine and inserter stands in a pole’s supply area, and copper wires within reach join the poles.' },
  { id: 'one-kind-per-lane', text: 'A belt lane or a pipe carries one kind of data, on its fixed item token. Two kinds share a belt only on separate lanes.' },
  { id: 'edge-is-outside', text: 'A belt, pipe or wire that leaves the floor edge goes to something outside the figure. Label what it reaches.' },
].map(rule => ({ ...rule, check: checks[rule.id] ?? null }));

export function normalize(layout) {
  const tiles = (layout.beltTiles ?? []).map(tile => {
    const sprite = tile.sprite ?? 'transport-belt', end = /^(entrance|exit)-(\w+)$/.exec(tile.variant ?? '');
    if (/underground-belt$/.test(sprite) && end && !tile.underground) return { ...tile, sprite, underground: end[1], flow: NAMES.indexOf(end[2]) };
    if (/splitter$/.test(sprite) && !tile.cells) {
      const d = STEP[tile.variant], across = [Math.abs(d[1]) / 2, Math.abs(d[0]) / 2];
      return { ...tile, sprite, splitter: true, flow: NAMES.indexOf(tile.variant), cells: [[tile.x - across[0], tile.y - across[1]], [tile.x + across[0], tile.y + across[1]]] };
    }
    return sprite === 'pipe' ? { ...tile, sprite, pipe: true } : { ...tile, sprite };
  });
  for (const tile of tiles.filter(t => t.underground === 'entrance' && !t.pair)) {
    const d = VECTORS[tile.flow], reach = (UNDERGROUND_GAP[tile.sprite] ?? 4) + 1;
    const exit = tiles.filter(t => t.underground === 'exit' && t.flow === tile.flow && t.sprite === tile.sprite)
      .map(t => ({ t, k: (t.x - tile.x) * d[0] + (t.y - tile.y) * d[1], off: Math.abs((t.x - tile.x) * d[1]) + Math.abs((t.y - tile.y) * d[0]) }))
      .filter(c => c.off < 1e-6 && c.k > 0).sort((a, b) => a.k - b.k)[0];
    tile.pair = exit ? [exit.t.x, exit.t.y] : [tile.x + d[0] * reach, tile.y + d[1] * reach];
  }
  return { ...layout, beltTiles: tiles };
}

export function checkLayout(layout, rules = groundRules) {
  const normal = normalize(layout);
  return rules.filter(rule => rule.check).flatMap(rule => rule.check(normal).map(message => ({ rule: rule.id, message })));
}
