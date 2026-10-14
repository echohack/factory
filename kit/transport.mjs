// Tile geometry and transfer choreography are independent of Canvas and playback.
export const pointOnPath = (points, progress) => {
  if (!points?.length) return null;
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let remaining = Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] && lengths[i]) {
      const t = remaining / lengths[i];
      return points[i].map((v, axis) => v + (points[i + 1][axis] - v) * t);
    }
    remaining -= lengths[i];
  }
  return points.at(-1);
};
const add = (a, b, scale = 1) => a.map((v, i) => v + b[i] * scale);
const center = object => [object.x, object.y];

export function connectLayout(layout) {
  const byID = Object.fromEntries(layout.objects.map(object => [object.id, object]));
  // A shift moves the source port along its face, so one machine side can feed several belts.
  const routes = Object.fromEntries(layout.connections.map(([a, b, { shift = 0 } = {}]) => {
    const source = byID[a], target = byID[b];
    if (Math.abs(shift) > ((source.size ?? 1) - 1) / 2) throw new Error('A shifted port must stay on the source building');
    const across = Math.abs(target.x - source.x) > Math.abs(target.y - source.y) ? 'y' : 'x';
    const route = connectStations(shift ? { ...source, [across]: source[across] + shift } : source, target); return [route.key, route];
  }));
  return { ...layout, routes, beltTiles: Object.values(routes).flatMap(route => route.tiles) };
}

export function connectStations(source, target) {
  const dx = Math.sign(target.x - source.x), dy = Math.sign(target.y - source.y);
  if (!!dx === !!dy) throw new Error('Transfers require distinct, axis-aligned stations');
  const direction = [dx, dy], right = [-dy, dx];
  const sourcePort = add(center(source), direction, ((source.size ?? 1) - 1) / 2);
  const targetPort = add(center(target), direction, -((target.size ?? 1) - 1) / 2);
  const start = add(sourcePort, direction, 2), end = add(targetPort, direction, -2);
  if ((end[0] - start[0]) * dx + (end[1] - start[1]) * dy < 1) throw new Error('Leave room for two inserters and at least two belt tiles');
  const key = `${source.id}:${target.id}`;
  const out = { id: `${key}:out`, pivot: add(sourcePort, direction), pickup: sourcePort,
    drop: add(add(start, direction, .2), right, .2), flow: direction };
  const into = { id: `${key}:in`, pivot: add(targetPort, direction, -1), pickup: add(end, right, .2),
    drop: add(targetPort, direction, .2), flow: direction };
  const tiles = [];
  const length = Math.round(Math.abs(end[0] - start[0]) + Math.abs(end[1] - start[1]));
  for (let i = 0; i <= length; i++) {
    const [x, y] = add(start, direction, i);
    tiles.push({ x, y, direction: dx > 0 ? 0 : dx < 0 ? 1 : dy < 0 ? 2 : 3 });
  }
  return { key, from: source.id, to: target.id, out, into, tiles, beltPath: [out.drop, into.pickup] };
}

export function swing(arm, progress, returning = false) {
  const start = arm.pickup.map((v, i) => v - arm.pivot[i]);
  const end = arm.drop.map((v, i) => v - arm.pivot[i]);
  let angle = Math.atan2(start[1], start[0]), delta = Math.atan2(end[1], end[0]) - angle;
  while (delta < 0) delta += Math.PI * 2;
  while (delta > Math.PI * 2) delta -= Math.PI * 2;
  const p = Math.max(0, Math.min(1, returning ? 1 - progress : progress));
  const t = p * p * (3 - 2 * p);
  angle += delta * t;
  const radius = Math.hypot(...start) * (1 - t) + Math.hypot(...end) * t;
  return add(arm.pivot, [Math.cos(angle), Math.sin(angle)], radius);
}

export function transferView(routes, event, progress = 0) {
  const arms = Object.values(routes).flatMap(route => [route.out, route.into]).map(arm => ({ ...arm, hand: arm.pickup, closed: false }));
  const route = event?.route && routes[event.route];
  if (!route) return { arms, token: null };
  const out = arms.find(a => a.id === route.out.id), into = arms.find(a => a.id === route.into.id);
  let position = null, heldBy = null;
  if (event.stage === 'pickup') position = out.pickup;
  if (event.stage === 'out') { out.hand = swing(out, progress); out.closed = true; position = out.hand; heldBy = out.id; }
  if (event.stage === 'belt') { out.hand = swing(out, Math.min(1, progress * 2), true); position = pointOnPath(route.beltPath, progress); }
  if (event.stage === 'in') { into.hand = swing(into, progress); into.closed = true; position = into.hand; heldBy = into.id; }
  if (event.stage === 'return') into.hand = swing(into, progress, true);
  return { arms, token: position ? { position, value: event.value, heldBy } : null };
}
