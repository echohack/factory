export function pointOnPath(points, progress) {
  if (!points?.length) return null;
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let remaining = Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] && lengths[i]) {
      const t = remaining / lengths[i];
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * t, points[i][1] + (points[i + 1][1] - points[i][1]) * t];
    }
    remaining -= lengths[i];
  }
  return points.at(-1);
}
export class FactoryScene {
  constructor(canvas, atlas) { this.canvas = canvas; this.atlas = atlas; this.ctx = canvas.getContext('2d'); }
  render(layout, view = {}) {
    const cssWidth = this.canvas.clientWidth, cssHeight = cssWidth * layout.height / layout.width;
    this.canvas.style.height = `${cssHeight}px`;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(cssWidth * dpr) || this.canvas.height !== Math.round(cssHeight * dpr)) {
      this.canvas.width = Math.round(cssWidth * dpr); this.canvas.height = Math.round(cssHeight * dpr);
    }
    const ctx = this.ctx, tile = cssWidth / layout.width;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = '#e8e5dd'; ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.lineWidth = .5; ctx.strokeStyle = '#cbc8bf';
    for (let x = 0; x <= layout.width; x++) { ctx.beginPath(); ctx.moveTo(x * tile, 0); ctx.lineTo(x * tile, cssHeight); ctx.stroke(); }
    for (let y = 0; y <= layout.height; y++) { ctx.beginPath(); ctx.moveTo(0, y * tile); ctx.lineTo(cssWidth, y * tile); ctx.stroke(); }
    for (const belt of layout.belts ?? []) {
      const [a, b] = [belt.from, belt.to], dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
      if (dx && dy) throw new Error('Use axis-aligned belt segments or explicit beltTiles for corners');
      const length = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
      const direction = dx > 0 ? 0 : dx < 0 ? 1 : dy < 0 ? 2 : 3;
      for (let i = .5; i < length; i++) this.atlas.draw(ctx, belt.sprite ?? 'belt', (a[0] + dx * i) * tile, (a[1] + dy * i) * tile,
        { tileSize: tile, frame: view.beltFrame ?? 0, direction });
    }
    for (const b of layout.beltTiles ?? []) this.atlas.draw(ctx, b.sprite ?? 'belt', b.x * tile, b.y * tile, { tileSize: tile, frame: view.beltFrame ?? 0, direction: b.direction });
    const objects = [...layout.objects].sort((a, b) => a.y - b.y);
    for (const pass of ['shadow', 'body']) for (const object of objects) {
      this.atlas.draw(ctx, object.sprite, object.x * tile, object.y * tile,
        { tileSize: tile, frame: view.frames?.[object.id] ?? 0, pass });
    }
    for (const object of objects) {
      const active = view.active === object.id;
      const lx = (object.labelX ?? object.x) * tile, ly = (object.labelY ?? object.y - 2.2) * tile;
      if (object.labelPlate) {
        ctx.fillStyle = '#f3f2e9'; ctx.fillRect(lx - 43, ly - 13, 86, 36);
      }
      ctx.textAlign = 'center'; ctx.font = '600 11px ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = active ? '#b3481c' : '#393c36'; ctx.fillText(object.label.toUpperCase(), lx, ly);
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#6c7065';
      ctx.fillText(object.caption ?? '', lx, ly + 17);
      ctx.beginPath(); ctx.arc(object.x * tile, (object.y + .85) * tile, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#e6773c' : '#939889'; ctx.fill();
      if (view.readouts?.[object.id] != null) {
        ctx.fillStyle = '#faf8f0'; const text = String(view.readouts[object.id]); ctx.font = '600 12px ui-monospace, monospace';
        const width = Math.max(28, ctx.measureText(text).width + 14), ry = (object.readoutY ?? object.y + 1.35) * tile;
        const rx = (object.readoutX ?? object.x) * tile;
        ctx.fillRect(rx - width / 2, ry - 12, width, 22);
        ctx.fillStyle = '#32372f'; ctx.fillText(text, rx, ry + 3);
      }
    }
    const position = pointOnPath(view.token?.path, view.token?.progress ?? 0);
    if (position) {
      const [x, y] = position.map(p => p * tile), value = String(view.token.value);
      this.atlas.drawIcon(ctx, 'item', x, y, Math.max(21, tile * .65));
      ctx.font = '700 13px ui-monospace, monospace'; const w = Math.max(25, ctx.measureText(value).width + 13);
      ctx.fillStyle = '#292f2b'; ctx.fillRect(x - w / 2, y - 30, w, 22); ctx.textAlign = 'center'; ctx.fillStyle = '#fff9eb'; ctx.fillText(value, x, y - 14);
    }
  }
}
