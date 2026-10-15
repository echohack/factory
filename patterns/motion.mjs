import { swing, pointOnPath } from '../kit/transport.mjs';
import { SWING_MS, BELT_SPEED } from './build.mjs';

const ROBOT_SPEED = 3;
const length = points => points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);
const between = (p, [a, b]) => {
  const axis = Math.abs(a[0] - b[0]) > 1e-6 ? 0 : 1, other = 1 - axis;
  return Math.abs(p[other] - a[other]) < .3 && p[axis] > Math.min(a[axis], b[axis]) + .3 && p[axis] < Math.max(a[axis], b[axis]) - .3;
};

export function timeline(example) {
  const arms = Object.fromEntries((example.arms ?? []).map(a => [a.id, a]));
  return (example.flows ?? []).map(flow => {
    let at = 0, icon = flow.icon;
    const legs = [];
    for (const leg of flow.legs) {
      if (leg.icon) icon = leg.icon;
      if (leg.arm && !arms[leg.arm]) throw new Error(`Flow uses an unknown inserter: ${leg.arm}`);
      const ms = leg.arm ? SWING_MS[arms[leg.arm].sprite] + (leg.hold ?? 0) : leg.path ? 1000 * length(leg.path) / (BELT_SPEED[leg.belt ?? 'transport-belt'])
        : leg.fly ? 1000 * length(leg.fly) / ROBOT_SPEED : leg.wait ?? 0;
      if (ms > 0 || leg.store) { legs.push({ ...leg, start: at, ms, icon }); at += ms; }
    }
    return { ...flow, legs, total: at };
  });
}

function* states(plan, t) {
  for (const [f, flow] of plan.entries()) {
    const offset = flow.offset ?? 0, every = flow.every;
    const first = Math.floor((t - offset - flow.total - 1000) / every), last = Math.floor((t - offset) / every);
    for (let k = first; k <= last; k++) {
      const phase = flow.period ? (((offset + k * every) % flow.period) + flow.period) % flow.period : 0;
      if (flow.window && (phase < flow.window[0] || phase >= flow.window[1])) continue;
      const local = t - offset - k * every;
      for (const leg of flow.legs) {
        if (leg.store) continue;
        const u = local - leg.start;
        if (leg.arm) {
          const swing = leg.ms - (leg.hold ?? 0);
          if (u >= 0 && u < leg.ms) yield { kind: 'carry', flow: f, k, leg, p: Math.min(1, u / swing) };
          else if (u >= leg.ms && u < leg.ms + swing) yield { kind: 'return', flow: f, k, leg, p: 1 - (u - leg.ms) / swing };
          continue;
        }
        const p = u / leg.ms;
        if (p >= 0 && p < 1) yield { kind: leg.path || leg.stay ? 'belt' : leg.fly ? 'fly' : 'wait', flow: f, k, leg, p };
      }
    }
  }
}

export function motion(example, t, plan = timeline(example)) {
  const arms = Object.fromEntries((example.arms ?? []).map(a => [a.id, { ...a, hand: a.pickup, closed: false }]));
  const carrying = {}, returning = {}, tokens = [], robots = [], held = {};
  for (const { kind, flow, k, leg, p } of states(plan, t)) {
    const value = leg.label ?? plan[flow].label ?? '';
    if (kind === 'return') returning[leg.arm] = Math.max(returning[leg.arm] ?? 0, p);
    if (kind === 'carry') { carrying[leg.arm] = p; tokens.push({ position: swing(arms[leg.arm], p), icon: leg.icon, value, heldBy: leg.arm }); }
    if (kind === 'belt') { const position = leg.stay ?? pointOnPath(leg.path, p); if (!(leg.hidden ?? []).some(span => between(position, span))) tokens.push({ position, icon: leg.icon, value }); }
    if (kind === 'fly') {
      const position = pointOnPath(leg.fly, p), [dx, dy] = [leg.fly.at(-1)[0] - leg.fly[0][0], leg.fly.at(-1)[1] - leg.fly[0][1]];
      const heading = ((Math.round(Math.atan2(dx, -dy) / (Math.PI / 8)) % 16) + 16) % 16;
      robots.push({ id: `robot-${flow}-${k}`, sprite: leg.robot ?? 'logistic-robot', x: position[0], y: position[1], variant: 'moving', direction: heading });
      if (!leg.empty) tokens.push({ position: [position[0], position[1] - .9], icon: leg.icon, value });
    }
    if (kind === 'wait' && leg.at) held[leg.at] = (held[leg.at] ?? 0) + 1;
  }
  for (const [id, p] of Object.entries(returning)) if (carrying[id] == null) arms[id].hand = swing(arms[id], p);
  for (const [id, p] of Object.entries(carrying)) { arms[id].hand = swing(arms[id], p); arms[id].closed = true; }
  const stored = {};
  for (const flow of plan) for (const leg of flow.legs.filter(l => l.store)) {
    if (flow.window) continue;
    stored[leg.store] = (stored[leg.store] ?? 0) + Math.max(0, Math.floor((t - (flow.offset ?? 0) - leg.start) / flow.every) + 1);
  }
  const working = typeof example.working === 'function' ? example.working(t) : example.working ?? [];
  const frames = Object.fromEntries(working.map(id => [id, t * .03]));
  return { arms: Object.values(arms), tokens, robots, held, stored, frames };
}

export function checkMotion(example, { span = 24000, step = 40, gap = .2 } = {}) {
  const plan = timeline(example), out = new Set();
  for (let t = 0; t < span; t += step) {
    const use = {}, items = [];
    for (const { kind, leg, p } of states(plan, t)) {
      if (kind === 'carry' || kind === 'return') (use[leg.arm] ??= []).push(kind);
      if (kind === 'belt') { const at = leg.stay ?? pointOnPath(leg.path, p); if (!(leg.hidden ?? []).some(s => between(at, s))) items.push(at); }
    }
    for (const [arm, kinds] of Object.entries(use)) {
      if (kinds.filter(k => k === 'carry').length > 1) out.add(`${arm} carries two values at once`);
      else if (kinds.length > 1) out.add(`${arm} starts a new swing before it has returned`);
    }
    items.forEach((a, i) => items.slice(i + 1).forEach(b => { if (Math.hypot(a[0] - b[0], a[1] - b[1]) < gap) out.add(`Two values overlap on the belt near ${a.map(v => v.toFixed(1)).join(', ')}`); }));
  }
  return [...out];
}
