import { readFile, mkdir, writeFile, copyFile, realpath } from 'node:fs/promises';
import { resolve, relative, sep, basename, join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { frameRect } from '../kit/sprites.mjs';

export async function contained(root, file) {
  const base = await realpath(root), path = await realpath(resolve(base, file));
  const rel = relative(base, path);
  if (rel === '..' || rel.startsWith(`..${sep}`) || resolve(base, rel) !== path) throw new Error(`Asset escapes its root: ${file}`);
  return path;
}
export function normalizeLayer(node, image) {
  for (const key of ['filenames', 'stripes', 'frame_sequence', 'tint', 'apply_runtime_tint', 'rotate_shift', 'draw_as_glow', 'draw_as_light', 'tint_as_overlay']) {
    if (node[key]) throw new Error(`Unsupported sprite field: ${key}`);
  }
  if (node.blend_mode && node.blend_mode !== 'normal' || node.run_mode && node.run_mode !== 'forward') throw new Error('Unsupported sprite blend or run mode');
  const size = node.size, width = node.width ?? (Array.isArray(size) ? size[0] : size), height = node.height ?? (Array.isArray(size) ? size[1] : size);
  const frames = node.frame_count ?? 1, directions = node.direction_count ?? 1;
  const shift = node.shift ?? [0, 0];
  const layer = { ...image, width, height, frames, directions, columns: node.line_length || frames,
    x: node.x ?? node.position?.[0] ?? 0, y: node.y ?? node.position?.[1] ?? 0,
    shift: Array.isArray(shift) ? shift : [shift.x, shift.y], scale: node.scale ?? 1, shadow: !!node.draw_as_shadow };
  if ([width, height, frames, directions, layer.columns].some(x => !Number.isInteger(x) || x <= 0) ||
      [layer.x, layer.y].some(x => !Number.isInteger(x) || x < 0) || !Number.isFinite(layer.scale) || layer.scale <= 0 ||
      layer.shift.length !== 2 || layer.shift.some(x => !Number.isFinite(x))) throw new Error('Invalid sprite dimensions or placement');
  // Check the last column used as well as the final row.
  const total = frames * directions, maxColumn = Math.min(total, layer.columns) - 1;
  if (layer.x + (maxColumn + 1) * width > image.imageWidth || layer.y + (Math.floor((total - 1) / layer.columns) + 1) * height > image.imageHeight) throw new Error('Sprite layout exceeds source image');
  frameRect(layer, frames - 1, directions - 1);
  return layer;
}
export async function importAssets({ archive, spec, out }) {
  const summary = JSON.parse(await readFile(join(archive, 'metadata/archive-summary.json')));
  const definitions = JSON.parse(await readFile(join(archive, 'metadata/data-raw-dump.json')));
  const plan = JSON.parse(await readFile(spec));
  const sprites = {}, files = new Map();
  await mkdir(out, { recursive: true });
  async function image(root, rel) {
    const source = await contained(root, rel), data = await readFile(source);
    if (data.length < 24 || !data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error(`Not a readable PNG: ${source}`);
    const sha256 = createHash('sha256').update(data).digest('hex');
    const file = `${sha256.slice(0, 16)}-${basename(source)}`;
    files.set(file, { source, sha256, bytes: data.length });
    return { file, imageWidth: data.readUInt32BE(16), imageHeight: data.readUInt32BE(20) };
  }
  async function layers(node) {
    if (!node || typeof node !== 'object') throw new Error('Missing sprite definition');
    if (node.layers) return (await Promise.all(node.layers.map(layers))).flat();
    if (typeof node.filename !== 'string') throw new Error('Unsupported sprite layout; choose a concrete direction or implement its format');
    const match = /^__([a-z0-9-]+)__\/(.+)$/.exec(node.filename);
    if (!match) throw new Error(`Unsupported asset path: ${node.filename}`);
    return [normalizeLayer(node, await image(join(archive, 'data'), `${match[1]}/${match[2]}`))];
  }
  for (const [id, item] of Object.entries(plan.sprites ?? {})) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid sprite ID: ${id}`);
    if (item.kind === 'icon') {
      if (![item.category, item.name].every(x => /^[a-z0-9_-]+$/.test(x))) throw new Error('Invalid icon selector');
      sprites[id] = { kind: 'icon', ...await image(join(archive, 'Factorio-Assets/icons'), `${item.category}/${item.name}.png`) };
    } else if (item.kind === 'inserter') {
      if (item.name !== 'inserter') throw new Error('Only the verified standard inserter rig is supported');
      const proto = definitions.inserter?.[item.name];
      if (!proto?.platform_picture?.sheet) throw new Error('Inserter requires a four-direction platform sheet');
      const parts = {};
      parts.platform = await layers({ ...proto.platform_picture.sheet, frame_count: 1, direction_count: 4, line_length: 4 });
      for (const [part, field] of Object.entries({ base: 'hand_base_picture', open: 'hand_open_picture', closed: 'hand_closed_picture',
        baseShadow: 'hand_base_shadow', openShadow: 'hand_open_shadow', closedShadow: 'hand_closed_shadow' })) parts[part] = await layers(proto[field]);
      sprites[id] = { kind: 'inserter', prototype: `inserter/${item.name}`, handSize: proto.hand_size ?? .75,
        pickup: proto.pickup_position, drop: proto.insert_position, parts };
    } else if (item.kind === 'prototype') {
      let node = definitions[item.type]?.[item.name];
      for (const key of item.path ?? []) node = node?.[key];
      sprites[id] = { kind: 'sprite', prototype: `${item.type}/${item.name}`, layers: await layers(node) };
    } else throw new Error(`Unsupported selector kind: ${item.kind}`);
  }
  if (!Object.keys(sprites).length) throw new Error('The asset spec is empty');
  for (const [file, data] of files) await copyFile(data.source, join(out, file));
  const manifest = { format: 1, gameVersion: summary.version, attribution: '', sprites,
    files: Object.fromEntries([...files].map(([name, value]) => [name, { sha256: value.sha256, bytes: value.bytes }])) };
  await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), get = (key, fallback) => { const i = args.indexOf(key); return i < 0 ? fallback : args[i + 1]; };
  if (args.includes('--help')) console.log('node scripts/import-assets.mjs --spec file.json --out directory [--archive directory]');
  else try {
    const manifest = await importAssets({ archive: resolve(get('--archive', process.env.FACTORIO_ARCHIVE ?? '/path/to/factorio-data')),
      spec: resolve(get('--spec', 'examples/array-pipeline/assets.json')), out: resolve(get('--out', '.local/assets')) });
    console.log(`Imported ${Object.keys(manifest.sprites).length} sprites from Factorio ${manifest.gameVersion}; ${Object.keys(manifest.files).length} image files.`);
  } catch (error) { console.error(`Asset import failed: ${error.message}`); process.exitCode = 1; }
}
