import { readFile, mkdir, writeFile, copyFile, realpath, access } from 'node:fs/promises';
import { resolve, relative, sep, basename, join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { frameRect } from '../kit/sprites.mjs';

export async function contained(root, file) {
  const base = await realpath(root), path = await realpath(resolve(base, file));
  const rel = relative(base, path);
  if (rel === '..' || rel.startsWith(`..${sep}`) || resolve(base, rel) !== path) throw new Error(`Asset escapes its root: ${file}`);
  return path;
}
const home = homedir(), exists = path => access(path).then(() => true, () => false);
const installs = {
  darwin: [`${home}/Library/Application Support/Steam/steamapps/common/Factorio/factorio.app/Contents/data`, '/Applications/factorio.app/Contents/data'],
  win32: ['C:/Program Files (x86)/Steam/steamapps/common/Factorio/data', 'C:/Program Files/Factorio/data'],
  linux: [`${home}/.steam/steam/steamapps/common/Factorio/data`, `${home}/.local/share/Steam/steamapps/common/Factorio/data`],
}[process.platform] ?? [];
const userData = { darwin: `${home}/Library/Application Support/factorio`, win32: join(process.env.APPDATA ?? home, 'Factorio'), linux: `${home}/.factorio` }[process.platform];
async function first(paths) { for (const path of paths) if (path && await exists(path)) return path; }
export function gameOptions(args = process.argv.slice(2), env = process.env) {
  const get = key => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
  const path = (flag, name) => { const value = get(flag) ?? env[name]; return value && resolve(value); };
  return { archive: path('--archive', 'FACTORIO_ARCHIVE'), data: path('--data', 'FACTORIO_DATA'), scriptOutput: path('--script-output', 'FACTORIO_SCRIPT_OUTPUT') };
}
export async function locateGame({ archive, data, scriptOutput } = {}) {
  if (archive) return { data: join(archive, 'data'), icons: join(archive, 'Factorio-Assets/icons'), dump: join(archive, 'metadata/data-raw-dump.json'),
    version: JSON.parse(await readFile(join(archive, 'metadata/archive-summary.json'))).version };
  data ??= await first(installs);
  if (!data || !await exists(join(data, 'base/info.json'))) throw new Error('Factorio data not found. Pass --data with the data folder of your Factorio install; see README.md.');
  scriptOutput ??= await first([userData && join(userData, 'script-output'), join(data, '../script-output')]);
  if (!scriptOutput || !await exists(join(scriptOutput, 'data-raw-dump.json'))) throw new Error('data-raw-dump.json not found. Run Factorio once with --dump-data, or pass --script-output; see README.md.');
  if (!await exists(join(scriptOutput, 'item'))) throw new Error(`No icons in ${scriptOutput}. Run Factorio once with --dump-icon-sprites; see README.md.`);
  return { data, icons: scriptOutput, dump: join(scriptOutput, 'data-raw-dump.json'), version: JSON.parse(await readFile(join(data, 'base/info.json'))).version };
}
export function normalizeLayer(node, image) {
  for (const key of ['stripes', 'tint', 'apply_runtime_tint', 'rotate_shift', 'draw_as_glow', 'draw_as_light', 'tint_as_overlay']) {
    if (node[key]) throw new Error(`Unsupported sprite field: ${key}`);
  }
  if (node.blend_mode && node.blend_mode !== 'normal' || node.run_mode && !['forward', 'backward', 'forward-then-backward'].includes(node.run_mode)) throw new Error('Unsupported sprite blend or run mode');
  if (node.filenames && !Array.isArray(image)) throw new Error('Unsupported filenames without source pages');
  const images = Array.isArray(image) ? image : [image];
  const sequence = node.frame_sequence;
  if (sequence && (!Array.isArray(sequence) || !sequence.length || sequence.some(n => !Number.isInteger(n) || n < 1))) throw new Error('Invalid frame sequence');
  const size = node.size, width = node.width ?? (Array.isArray(size) ? size[0] : size), height = node.height ?? (Array.isArray(size) ? size[1] : size);
  const sourceFrames = sequence ? Math.max(...sequence) : node.frame_count ?? 1;
  const frames = sequence?.length ?? sourceFrames, directions = node.direction_count ?? 1;
  const shift = node.shift ?? [0, 0];
  const layer = { ...images[0], width, height, frames, sourceFrames, directions, columns: node.line_length || (sourceFrames > 1 ? sourceFrames : directions),
    x: node.x ?? node.position?.[0] ?? 0, y: node.y ?? node.position?.[1] ?? 0,
    shift: Array.isArray(shift) ? shift : [shift.x, shift.y], scale: node.scale ?? 1, shadow: !!node.draw_as_shadow };
  if (sequence) layer.sequence = sequence;
  if (node.run_mode) layer.runMode = node.run_mode;
  if ([width, height, frames, directions, layer.columns].some(x => !Number.isInteger(x) || x <= 0) ||
      [layer.x, layer.y].some(x => !Number.isInteger(x) || x < 0) || !Number.isFinite(layer.scale) || layer.scale <= 0 ||
      layer.shift.length !== 2 || layer.shift.some(x => !Number.isFinite(x))) throw new Error('Invalid sprite dimensions or placement');
  const total = sourceFrames * directions;
  const perFile = Array.isArray(image) ? node.lines_per_file * layer.columns : total;
  if (!Number.isInteger(perFile) || perFile <= 0 || images.length !== Math.ceil(total / perFile)) throw new Error('Invalid multi-file sprite layout');
  const pages = images.map((img, i) => {
    const count = Math.min(perFile, total - i * perFile), maxColumn = Math.min(count, layer.columns) - 1;
    if (layer.x + (maxColumn + 1) * width > img.imageWidth || layer.y + (Math.floor((count - 1) / layer.columns) + 1) * height > img.imageHeight) throw new Error('Sprite layout exceeds source image');
    return { ...img, start: i * perFile, count };
  });
  if (Array.isArray(image)) layer.pages = pages;
  frameRect(layer, frames - 1, directions - 1);
  return layer;
}
export async function importAssets({ game, archive, data, scriptOutput, spec, out, definitions: suppliedDefinitions }) {
  game ??= await locateGame({ archive, data, scriptOutput });
  const definitions = suppliedDefinitions ?? JSON.parse(await readFile(game.dump));
  const plan = typeof spec === 'string' ? JSON.parse(await readFile(spec)) : spec;
  const sprites = {}, files = new Map();
  await mkdir(out, { recursive: true });
  async function image(root, rel, source) {
    const path = await contained(root, rel), png = await readFile(path);
    if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error(`Not a readable PNG: ${path}`);
    const sha256 = createHash('sha256').update(png).digest('hex');
    const file = `${sha256.slice(0, 16)}-${basename(path)}`;
    files.set(file, { path, source, sha256, bytes: png.length });
    return { file, imageWidth: png.readUInt32BE(16), imageHeight: png.readUInt32BE(20) };
  }
  async function sourceImage(filename) {
    const match = /^__([a-z0-9-]+)__\/(.+)$/.exec(filename);
    if (!match) throw new Error(`Unsupported asset path: ${filename}`);
    return image(game.data, `${match[1]}/${match[2]}`, filename);
  }
  async function layers(node, sheetDirections = 1) {
    if (!node || typeof node !== 'object') throw new Error('Missing sprite definition');
    if (node.layers) return (await Promise.all(node.layers.map(n => layers(n, sheetDirections)))).flat();
    if (node.sheet) return layers({ ...node.sheet, direction_count: node.sheet.frames ?? sheetDirections, line_length: node.sheet.line_length || node.sheet.frames || sheetDirections });
    if (node.sheets) return (await Promise.all(node.sheets.map(sheet => layers({ sheet }, sheetDirections)))).flat();
    if (node.filenames) return [normalizeLayer(node, await Promise.all(node.filenames.map(sourceImage)))];
    if (typeof node.filename !== 'string') throw new Error('Unsupported sprite layout; choose a concrete direction or implement its format');
    return [normalizeLayer(node, await sourceImage(node.filename))];
  }
  for (const [id, item] of Object.entries(plan.sprites ?? {})) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid sprite ID: ${id}`);
    if (item.kind === 'icon') {
      if (![item.category, item.name].every(x => /^[a-z0-9_-]+$/.test(x))) throw new Error('Invalid icon selector');
      const icon = `${item.category}/${item.name}.png`;
      sprites[id] = { kind: 'icon', ...await image(game.icons, icon, `script-output/${icon}`) };
    } else if (item.kind === 'inserter') {
      if (!['inserter', 'fast-inserter', 'long-handed-inserter', 'burner-inserter', 'bulk-inserter', 'stack-inserter'].includes(item.name)) throw new Error('Unknown inserter rig');
      const proto = definitions.inserter?.[item.name];
      if (!proto?.platform_picture?.sheet) throw new Error('Inserter requires a four-direction platform sheet');
      const parts = {};
      parts.platform = await layers({ ...proto.platform_picture.sheet, frame_count: 1, direction_count: 4, line_length: 4 });
      for (const [part, field] of Object.entries({ base: 'hand_base_picture', open: 'hand_open_picture', closed: 'hand_closed_picture',
        baseShadow: 'hand_base_shadow', openShadow: 'hand_open_shadow', closedShadow: 'hand_closed_shadow' })) parts[part] = await layers(proto[field]);
      for (const [part, height] of Object.entries({ base: 136, open: 164, closed: 164, baseShadow: 132, openShadow: 164, closedShadow: 164 })) {
        if (parts[part].length !== 1 || parts[part][0].height !== height) throw new Error(`Inserter ${item.name} needs new joint measurements for ${part}`);
      }
      sprites[id] = { kind: 'inserter', prototype: `inserter/${item.name}`, handSize: proto.hand_size ?? .75,
        pickup: proto.pickup_position, drop: proto.insert_position, parts };
    } else if (item.kind === 'prototype') {
      const proto = definitions[item.type]?.[item.name];
      if (!proto) throw new Error(`The data dump has no ${item.type}/${item.name}`);
      async function parts(list) {
        return (await Promise.all(list.map(async part => {
          let node = proto;
          for (const key of part.path ?? []) node = node?.[key];
          const result = await layers(node, part.sheetDirections);
          return result.map(layer => {
            const value = { ...layer };
            if (part.shift) value.shift = value.shift.map((v, i) => v + part.shift[i]);
            if (part.direction != null) { frameRect(value, 0, part.direction); value.fixedDirection = part.direction; }
            if (part.frame != null) { if (!Number.isInteger(part.frame) || part.frame < 0 || part.frame >= value.frames) throw new Error('Invalid fixed frame'); value.fixedFrame = part.frame; }
            return value;
          });
        }))).flat();
      }
      const variants = item.variants ? Object.fromEntries(await Promise.all(Object.entries(item.variants).map(async ([name, list]) => [name, await parts(list)]))) : null;
      sprites[id] = { kind: 'sprite', prototype: `${item.type}/${item.name}`,
        layers: variants ? Object.values(variants)[0] : await parts(item.parts ?? [{ path: item.path ?? [] }]), ...(variants ? { variants } : {}) };
    } else throw new Error(`Unsupported selector kind: ${item.kind}`);
  }
  if (!Object.keys(sprites).length) throw new Error('The asset spec is empty');
  for (const [file, { path }] of files) await copyFile(path, join(out, file));
  const manifest = { format: 1, gameVersion: game.version, attribution: '', sprites,
    files: Object.fromEntries([...files].sort(([a, x], [b, y]) => x.source.localeCompare(y.source) || a.localeCompare(b)).map(([name, { source, sha256, bytes }]) => [name, { source, sha256, bytes }])) };
  await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), get = (key, fallback) => { const i = args.indexOf(key); return i < 0 ? fallback : args[i + 1]; };
  if (args.includes('--help')) console.log('vp run import-assets --spec file.json --out directory [--data directory --script-output directory | --archive directory]');
  else try {
    const manifest = await importAssets({ ...gameOptions(args), spec: resolve(get('--spec', 'examples/array-pipeline/assets.json')), out: resolve(get('--out', '.local/assets')) });
    console.log(`Imported ${Object.keys(manifest.sprites).length} sprites from Factorio ${manifest.gameVersion}; ${Object.keys(manifest.files).length} image files.`);
  } catch (error) { console.error(`Asset import failed: ${error.message}`); process.exitCode = 1; }
}
