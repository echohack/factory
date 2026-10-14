export function factoryLayout(mobile = false) {
  const positions = mobile
    ? { input: [5.5, 2.5], filter: [5.5, 10.5], filtered: [5.5, 18.5], reject: [13.5, 10.5], map: [5.5, 26.5], mapped: [5.5, 34.5], sum: [5.5, 41.5] }
    : { input: [2.5, 4.5], filter: [10.5, 4.5], filtered: [18.5, 4.5], reject: [10.5, 12.5], map: [26.5, 4.5], mapped: [34.5, 4.5], sum: [41.5, 4.5] };
  const text = { input: ['Input', 'raw values', 'wooden-chest'], filter: ['Filter', 'keep even', 'filter'], filtered: ['Filtered', 'intermediate array', 'steel-chest'],
    reject: ['Rejected', 'odd values', 'wooden-chest'], map: ['Map', 'multiply by 3', 'map'], mapped: ['Mapped', 'intermediate array', 'steel-chest'], sum: ['Reduce', 'sum, starting at 0', 'steel-chest'] };
  const objects = Object.entries(positions).map(([id, [x, y]]) => ({
    id, x, y, size: ['filter', 'map'].includes(id) ? 3 : 1, sprite: text[id][2], label: text[id][0], caption: text[id][1],
    labelX: mobile ? id === 'filter' ? 1.8 : id === 'reject' ? x : 11.5 : x,
    labelY: mobile ? id === 'reject' ? y - 2.5 : y - .15 : id === 'reject' ? 15 : 1.8,
    readoutX: mobile && id !== 'reject' ? 11.5 : x,
    readoutY: mobile && id !== 'reject' ? y + 1.35 : y + 1.5
  }));
  const connections = [
    ['input', 'filter'], ['filter', 'filtered'], ['filter', 'reject'],
    ['filtered', 'map'], ['map', 'mapped'], ['mapped', 'sum']
  ];
  return { width: mobile ? 16 : 44, height: mobile ? 44 : 16.5, objects, connections };
}
