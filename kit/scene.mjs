import { pointOnPath } from './transport.mjs';
export { pointOnPath } from './transport.mjs';
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
    ctx.lineWidth = .5; ctx.strokeStyle = '#294562';
    for (let x = 0; x <= layout.width; x++) { ctx.beginPath(); ctx.moveTo(x * tile, 0); ctx.lineTo(x * tile, cssHeight); ctx.stroke(); }
    for (let y = 0; y <= layout.height; y++) { ctx.beginPath(); ctx.moveTo(0, y * tile); ctx.lineTo(cssWidth, y * tile); ctx.stroke(); }
    const areas = layout.areas ?? [];
    ctx.save(); ctx.setLineDash([1.5, 5]); ctx.lineCap = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(143, 181, 222, .7)';
    for (const area of areas) ctx.strokeRect(area.x * tile, area.y * tile, area.width * tile, area.height * tile);
    ctx.restore();
    for (const belt of layout.belts ?? []) {
      const [a, b] = [belt.from, belt.to], dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
      if (dx && dy) throw new Error('Use axis-aligned belt segments or explicit beltTiles for corners');
      const length = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
      const direction = dx > 0 ? 0 : dx < 0 ? 1 : dy < 0 ? 2 : 3;
      for (let i = .5; i < length; i++) this.atlas.draw(ctx, belt.sprite ?? 'belt', (a[0] + dx * i) * tile, (a[1] + dy * i) * tile,
        { tileSize: tile, frame: view.beltFrame ?? 0, direction });
    }
    for (const b of layout.beltTiles ?? []) this.atlas.draw(ctx, b.sprite ?? 'belt', b.x * tile, b.y * tile, { tileSize: tile, frame: view.beltFrame ?? 0, direction: b.direction, variant: b.variant });
    for (const arm of view.arms ?? []) this.atlas.drawInserter(ctx, arm.sprite ?? 'inserter', arm, { tileSize: tile, pass: 'shadow' });
    for (const arm of view.arms ?? []) this.atlas.drawInserter(ctx, arm.sprite ?? 'inserter', arm, { tileSize: tile, pass: 'platform' });
    const objects = [...layout.objects].sort((a, b) => a.y - b.y);
    for (const pass of ['shadow', 'body']) for (const object of objects) {
      this.atlas.draw(ctx, object.sprite, object.x * tile, object.y * tile,
        { tileSize: tile, frame: view.frames?.[object.id] ?? 0, variant: view.variants?.[object.id] ?? object.variant, direction: view.directions?.[object.id] ?? object.direction ?? 0, pass });
    }
    for (const arm of view.arms ?? []) this.atlas.drawInserter(ctx, arm.sprite ?? 'inserter', arm, { tileSize: tile });
    ctx.font = '600 10px ui-monospace, SFMono-Regular, monospace'; ctx.textAlign = 'left';
    for (const area of areas.filter(a => a.label)) {
      const text = area.label.toUpperCase(), width = ctx.measureText(text).width + 12;
      ctx.save();
      if (area.labelEdge === 'left') { ctx.translate(area.x * tile, area.y * tile + 12); ctx.rotate(Math.PI / 2); }
      else ctx.translate(area.x * tile + 12, area.y * tile);
      ctx.fillStyle = '#0c1e35'; ctx.fillRect(0, -8, width, 16);
      ctx.fillStyle = '#8fb5de'; ctx.fillText(text, 6, 4);
      ctx.restore();
    }
    for (const object of objects) {
      const active = [].concat(view.active ?? []).includes(object.id);
      const lx = (object.labelX ?? object.x) * tile, ly = (object.labelY ?? object.y - 2.2) * tile;
      ctx.textAlign = 'center'; ctx.font = '600 11px ui-monospace, SFMono-Regular, monospace';
      if (object.label) {
      if (object.labelPlate) {
        const labelW = ctx.measureText(object.label.toUpperCase()).width + 24;
        ctx.font = '11px system-ui, sans-serif'; const w = Math.max(labelW, ctx.measureText(object.caption ?? '').width + 12);
        ctx.fillStyle = '#0c1e35'; ctx.fillRect(lx - w / 2, ly - 13, w, object.caption ? 36 : 19);
        ctx.font = '600 11px ui-monospace, SFMono-Regular, monospace';
      }
      ctx.fillStyle = active ? '#f0b978' : '#c9d6e6'; ctx.fillText(object.label.toUpperCase(), lx, ly);
      const labelWidth = ctx.measureText(object.label.toUpperCase()).width;
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#9cb5d1';
      ctx.fillText(object.caption ?? '', lx, ly + 17);
      ctx.beginPath(); ctx.arc(lx - labelWidth / 2 - 8, ly - 4, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#f0b978' : '#627f9f'; ctx.fill();
      }
      ctx.textAlign = 'center';
      if (view.readouts?.[object.id] != null) {
        ctx.fillStyle = '#193650'; const text = String(view.readouts[object.id]); ctx.font = '600 12px ui-monospace, monospace';
        const width = Math.max(28, ctx.measureText(text).width + 14), ry = (object.readoutY ?? object.y + 1.35) * tile;
        const rx = (object.readoutX ?? object.x) * tile;
        ctx.fillRect(rx - width / 2, ry - 12, width, 22);
        ctx.fillStyle = '#dbe7f4'; ctx.fillText(text, rx, ry + 3);
      }
    }
    for (const token of view.tokens ?? (view.token ? [view.token] : [])) {
      const position = token.position ?? pointOnPath(token.path, token.progress ?? 0);
      if (!position) continue;
      const [x, groundY] = position.map(p => p * tile), y = groundY - (token.heldBy ? .12 * tile : 0), value = String(token.value);
      this.atlas.drawIcon(ctx, token.icon ?? 'item', x, y, Math.max(13, tile * .5));
      ctx.font = '700 13px ui-monospace, monospace'; const w = Math.max(25, ctx.measureText(value).width + 13);
      ctx.fillStyle = '#0b1a2b'; ctx.fillRect(x - w / 2, y - 30, w, 22); ctx.textAlign = 'center'; ctx.fillStyle = '#dbe7f4'; ctx.fillText(value, x, y - 14);
    }
  }
}
