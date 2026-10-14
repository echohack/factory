export function frameRect(layer, frame = 0, direction = 0) {
  if (!Number.isFinite(frame) || !Number.isInteger(direction) || direction < 0 || direction >= layer.directions) throw new RangeError('Invalid sprite frame or direction');
  const index = direction * layer.frames + ((Math.floor(frame) % layer.frames) + layer.frames) % layer.frames;
  const x = layer.x + index % layer.columns * layer.width;
  const y = layer.y + Math.floor(index / layer.columns) * layer.height;
  if (x + layer.width > layer.imageWidth || y + layer.height > layer.imageHeight) throw new Error('Sprite crop exceeds source image');
  return { x, y, width: layer.width, height: layer.height };
}
export class SpriteAtlas {
  constructor(manifest, images) { this.manifest = manifest; this.images = images; }
  draw(ctx, id, x, y, { tileSize = 32, frame = 0, direction = 0, pass = 'all', shadowAlpha = .35 } = {}) {
    const sprite = this.manifest.sprites[id];
    if (!sprite || sprite.kind !== 'sprite') throw new Error(`Unknown world sprite: ${id}`);
    const layers = [...sprite.layers].sort((a, b) => Number(!!b.shadow) - Number(!!a.shadow));
    for (const layer of layers) {
      if (pass === 'shadow' && !layer.shadow || pass === 'body' && layer.shadow) continue;
      const rect = frameRect(layer, frame, direction);
      const scale = layer.scale * tileSize / 32, w = rect.width * scale, h = rect.height * scale;
      ctx.save(); if (layer.shadow) ctx.globalAlpha *= shadowAlpha;
      ctx.drawImage(this.images.get(layer.file), rect.x, rect.y, rect.width, rect.height,
        x + layer.shift[0] * tileSize - w / 2, y + layer.shift[1] * tileSize - h / 2, w, h);
      ctx.restore();
    }
  }
  drawIcon(ctx, id, x, y, size = 24) {
    const sprite = this.manifest.sprites[id];
    if (!sprite || sprite.kind !== 'icon') throw new Error(`Unknown icon: ${id}`);
    ctx.drawImage(this.images.get(sprite.file), x - size / 2, y - size / 2, size, size);
  }
  drawInserter(ctx, id, arm, { tileSize = 32, pass = 'arm' } = {}) {
    const rig = this.manifest.sprites[id];
    if (rig?.kind !== 'inserter') throw new Error(`Unknown inserter rig: ${id}`);
    const [x, y] = arm.pivot.map(v => v * tileSize);
    if (pass === 'platform') {
      // Sprite4Way is N/E/S/W; an inserter's orientation faces its pickup tile.
      const direction = arm.flow[0] > 0 ? 3 : arm.flow[0] < 0 ? 1 : arm.flow[1] > 0 ? 0 : 2;
      for (const layer of rig.parts.platform) {
        const r = frameRect(layer, 0, direction), scale = layer.scale * tileSize / 32;
        ctx.drawImage(this.images.get(layer.file), r.x, r.y, r.width, r.height,
          x + layer.shift[0] * tileSize - r.width * scale / 2,
          y + layer.shift[1] * tileSize - r.height * scale / 2, r.width * scale, r.height * scale);
      }
      return;
    }
    const shadow = pass === 'shadow';
    const groundHand = arm.hand.map(v => v * tileSize);
    const reach = Math.hypot(groundHand[0] - x, groundHand[1] - y) / tileSize;
    const bend = Math.sqrt(Math.max(0, rig.handSize ** 2 - (reach / 2) ** 2));
    const offset = shadow ? [.32 * tileSize, .18 * tileSize] : [0, -.12 * tileSize];
    const root = [x + offset[0], y + offset[1]];
    const hand = [groundHand[0] + offset[0], groundHand[1] + offset[1]];
    const elbow = [(root[0] + hand[0]) / 2, (root[1] + hand[1]) / 2 - (shadow ? 0 : bend * tileSize)];
    const segment = (part, a, b, anchorY, tipY) => {
      for (const layer of rig.parts[part]) {
        const r = frameRect(layer), scale = layer.scale * tileSize / 32;
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        ctx.save(); ctx.translate(...a); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2);
        ctx.scale(scale, length / (anchorY - tipY));
        ctx.drawImage(this.images.get(layer.file), r.x, r.y, r.width, r.height, -r.width / 2, -anchorY, r.width, r.height);
        ctx.restore();
      }
    };
    ctx.save(); if (shadow) ctx.globalAlpha *= .45;
    // Pixel joints measured on the archived 2.0.77 standard inserter sprites.
    segment(shadow ? 'baseShadow' : 'base', root, elbow, 128, 16);
    segment(shadow ? arm.closed ? 'closedShadow' : 'openShadow' : arm.closed ? 'closed' : 'open', elbow, hand, 152, 28);
    ctx.restore();
  }
}
export async function loadSprites(baseURL) {
  const base = new URL(baseURL, location.href);
  const response = await fetch(new URL('manifest.json', base));
  if (!response.ok) throw new Error('Assets are missing. Run npm run assets, then npm run build.');
  const manifest = await response.json();
  const files = new Set(Object.values(manifest.sprites).flatMap(s => s.kind === 'icon' ? [s.file] :
    (s.kind === 'inserter' ? Object.values(s.parts).flat() : s.layers).map(l => l.file)));
  const images = new Map(await Promise.all([...files].map(async file => {
    const image = new Image(); image.src = new URL(file, base).href;
    await image.decode(); return [file, image];
  })));
  return new SpriteAtlas(manifest, images);
}
