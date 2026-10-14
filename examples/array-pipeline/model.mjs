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
  let state = { input: [...input], tested: 0, filtered: [], rejected: [], mapped: [], reduced: 0, sum: 0, phase: 'filter' };
  const initial = structuredClone(state), events = [];
  const emit = (fields, change = () => {}) => {
    const before = structuredClone(state); change();
    events.push({ duration: 750, ...fields, before, after: structuredClone(state) });
  };
  for (let i = 0; i < input.length; i++) {
    const value = input[i], accepted = value % 2 === 0;
    emit({ phase: 'filter', line: 1, from: 'input', to: 'filter', value, token: i, message: `Test ${value}: ${accepted ? 'even, keep it' : 'odd, reject it'}.` });
    emit({ phase: 'filter', line: 1, from: 'filter', to: accepted ? 'filtered' : 'reject', value, token: i, machine: 'filter', accepted,
      message: accepted ? `${value} enters the filtered buffer.` : `${value} goes to the rejected buffer.` }, () => {
      state.tested++; (accepted ? state.filtered : state.rejected).push(value);
    });
  }
  emit({ phase: 'map', line: 2, duration: 450, message: 'Filtering is complete. Map now reads the filtered array.' }, () => { state.phase = 'map'; });
  for (let i = 0; i < state.filtered.length; i++) {
    const value = state.filtered[i];
    emit({ phase: 'map', line: 2, from: 'filtered', to: 'map', value, token: i, message: `Multiply ${value} by 3.` });
    emit({ phase: 'map', line: 2, from: 'map', to: 'mapped', value: value * 3, token: i, machine: 'map', message: `${value} × 3 = ${value * 3}.` }, () => { state.mapped.push(value * 3); });
  }
  emit({ phase: 'reduce', line: 3, duration: 450, message: 'Mapping is complete. Reduce starts with an accumulator of 0.' }, () => { state.phase = 'reduce'; });
  for (let i = 0; i < state.mapped.length; i++) {
    const value = state.mapped[i], previous = state.sum;
    emit({ phase: 'reduce', line: 3, from: 'mapped', to: 'sum', value, token: i, message: `${previous} + ${value} = ${previous + value}.` }, () => { state.sum += value; state.reduced++; });
  }
  emit({ phase: 'done', line: 3, duration: 450, message: `Complete. The result is ${state.sum}.` }, () => { state.phase = 'done'; });
  return { initial, events, result: state.sum };
}
