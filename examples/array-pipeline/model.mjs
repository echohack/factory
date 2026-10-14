export const DEFAULT_INPUT = [2, 5, 4, 7, 6, 3, 8, 1];
export const SOURCE_LINES = [
  'const result = input',
  '  .filter(n => n % 2 === 0)',
  '  .map(n => n * 3)',
  '  .reduce((sum, n) => sum + n, 0);'
];
export function parseInput(text) {
  if (!text.trim()) return [];
  const parts = text.split(',').map(x => x.trim());
  if (parts.length > 16 || parts.some(x => !/^-?\d+$/.test(x))) throw new Error('Use up to 16 whole numbers, separated by commas.');
  const values = parts.map(Number);
  if (values.some(x => Math.abs(x) > 999)) throw new Error('Choose values between −999 and 999.');
  return values;
}
export function makeTrace(input) {
  if (!Array.isArray(input) || input.some(n => !Number.isSafeInteger(n) || Math.abs(n) > 999) || input.length > 16) throw new Error('Invalid input values');
  const state = { input: [...input], tested: 0, filtered: [], rejected: [], mapped: [], reduced: 0, sum: 0, phase: 'filter',
    stock: { input: input.length, filter: 0, filtered: 0, reject: 0, map: 0, mapped: 0, sum: 0 },
    resident: { filter: null, map: null }, transit: null };
  const initial = structuredClone(state), events = [];
  const emit = (fields, change = () => {}) => {
    const before = structuredClone(state); change();
    events.push({ duration: 350, ...fields, before, after: structuredClone(state) });
  };
  const transfer = (from, to, value, line, receive = () => {}) => {
    const common = { kind: 'transfer', phase: state.phase, line, from, to, value, route: `${from}:${to}` };
    emit({ ...common, stage: 'pickup', duration: 120, message: `Pick up ${value} from ${from}.` }, () => {
      state.stock[from]--; state.transit = { from, to, value, holder: 'out' };
      if (from in state.resident) state.resident[from] = null;
    });
    emit({ ...common, stage: 'out', duration: 280, message: `The output inserter places ${value} on the belt.` }, () => { state.transit.holder = 'belt'; });
    emit({ ...common, stage: 'belt', duration: 360, message: `${value} reaches the input inserter for ${to}.` }, () => { state.transit.holder = 'in'; });
    emit({ ...common, stage: 'in', duration: 280, message: `The input inserter releases ${value} into ${to}.` }, () => {
      state.stock[to]++; state.transit = null;
      if (to in state.resident) state.resident[to] = value;
      receive();
    });
    emit({ ...common, stage: 'return', duration: 180, message: `The ${to} inserter returns empty.` });
  };
  for (const value of input) {
    transfer('input', 'filter', value, 1);
    const accepted = value % 2 === 0;
    emit({ kind: 'work', phase: 'filter', line: 1, machine: 'filter', value, message: `Test ${value}: ${accepted ? 'even, keep it' : 'odd, reject it'}.` });
    transfer('filter', accepted ? 'filtered' : 'reject', value, 1, () => {
      state.tested++; (accepted ? state.filtered : state.rejected).push(value);
    });
  }
  emit({ phase: 'map', line: 2, message: 'Filtering is complete. Map now reads the filtered array.' }, () => { state.phase = 'map'; });
  for (const value of state.filtered) {
    transfer('filtered', 'map', value, 2);
    emit({ kind: 'work', phase: 'map', line: 2, machine: 'map', value, message: `${value} × 3 = ${value * 3}.` }, () => { state.resident.map = value * 3; });
    transfer('map', 'mapped', value * 3, 2, () => { state.mapped.push(value * 3); });
  }
  emit({ phase: 'reduce', line: 3, message: 'Mapping is complete. Reduce starts with an accumulator of 0.' }, () => { state.phase = 'reduce'; });
  for (const value of state.mapped) transfer('mapped', 'sum', value, 3, () => { state.sum += value; state.reduced++; });
  emit({ phase: 'done', line: 3, message: `Complete. The result is ${state.sum}.` }, () => { state.phase = 'done'; });
  return { initial, events, result: state.sum };
}
