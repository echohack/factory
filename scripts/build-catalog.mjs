import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { objects, tokens, deferred } from '../catalog/objects.mjs';
import { importAssets, gameOptions, locateGame } from './import-assets.mjs';
import { spriteLayers } from '../kit/sprites.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets');
try {
  const game = await locateGame(gameOptions());
  const definitions = JSON.parse(await readFile(game.dump));
  if (!definitions['assembling-machine']?.foundry) throw new Error('The data dump has no Space Age objects. Turn Space Age on, then run Factorio with --dump-data again.');
  const sprites = Object.fromEntries(objects.map(o => [o.id, o.selector]));
  for (const o of objects) sprites[`icon-${o.id}`] = { kind: 'icon', category: 'entity', name: o.id };
  for (const name of tokens) sprites[`item-${name}`] = { kind: 'icon', category: 'item', name };
  Object.assign(sprites, JSON.parse(await readFile(join(root, 'examples/array-pipeline/assets.json'))).sprites);
  const manifest = await importAssets({ game, spec: { sprites }, out, definitions });
  const catalog = {
    gameVersion: manifest.gameVersion,
    objects: objects.map(({ selector, ...o }) => {
      const sprite = manifest.sprites[o.id], layers = spriteLayers(sprite);
      const proto = definitions[selector.type ?? 'inserter'][selector.name];
      const box = proto.selection_box, footprint = box ? [box[1][0] - box[0][0], box[1][1] - box[0][1]] : null;
      const multiFile = layers.some(l => l.pages?.length > 1);
      return { ...o, prototype: `${selector.type ?? 'inserter'}/${selector.name}`, footprint,
        icon: `icon-${o.id}`, kind: sprite.kind, variants: Object.keys(sprite.variants ?? {}),
        directions: Math.max(1, ...layers.filter(l => l.fixedDirection == null).map(l => l.directions)),
        frames: Math.max(1, ...layers.filter(l => l.fixedFrame == null).map(l => l.frames)),
        motion: sprite.kind === 'inserter' ? 'Articulated' : o.id === 'radar' ? 'Rotation' : layers.some(l => l.frames > 1 && l.fixedFrame == null) ? 'Animated' : 'Static',
        ...(multiFile ? { multiFile: true } : {}) };
    }),
    tokens: tokens.map(name => ({ id: `item-${name}`, name: name.replaceAll('-', ' '), group: 'Items', roles: ['value', 'message', 'payload'], kind: 'icon', motion: 'Icon', variants: [], directions: 1, frames: 1 })),
    deferred,
  };
  await writeFile(join(out, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Mapped ${catalog.objects.length} world objects and ${catalog.tokens.length} item tokens; ${Object.keys(manifest.files).length} source images.`);
  console.log(`Source art: ${(Object.values(manifest.files).reduce((sum, f) => sum + f.bytes, 0) / 1024 / 1024).toFixed(1)} MiB.`);
} catch (error) { console.error(`Asset import failed: ${error.message}`); process.exitCode = 1; }
