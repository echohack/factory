// Rows on the blueprint floor take whole grid tiles, so the grid lines are the row dividers.
export function snapRows(table, tile = 32) {
  const rows = [...table.rows];
  for (const row of rows) row.style.height = '';
  const heights = rows.map(row => row.getBoundingClientRect().height);
  rows.forEach((row, i) => { row.style.height = `${Math.max(1, Math.ceil(heights[i] / tile - .02)) * tile}px`; });
}

// Re-snap when the width changes, since wrapping changes row heights.
export function keepRowsOnGrid(table, tile = 32) {
  let width = -1;
  const snap = () => { const w = table.getBoundingClientRect().width; if (w !== width) { width = w; snapRows(table, tile); } };
  new ResizeObserver(snap).observe(table.parentElement);
  return { refresh() { width = -1; snap(); } };
}
