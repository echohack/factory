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
}
export async function loadSprites(baseURL) {
  const base = new URL(baseURL, location.href);
  const response = await fetch(new URL('manifest.json', base));
  if (!response.ok) throw new Error('Assets are missing. Run npm run assets, then npm run build.');
  const manifest = await response.json();
  const files = new Set(Object.values(manifest.sprites).flatMap(s => s.kind === 'icon' ? [s.file] : s.layers.map(l => l.file)));
  const images = new Map(await Promise.all([...files].map(async file => {
    const image = new Image(); image.src = new URL(file, base).href;
    await image.decode(); return [file, image];
  })));
  return new SpriteAtlas(manifest, images);
}
