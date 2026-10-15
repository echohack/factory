import { cp, mkdir, readFile, writeFile, mkdtemp, rename, rm, access } from 'node:fs/promises';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spriteFiles } from '../kit/sprites.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function buildSite(name, ids) {
  if (!['array-pipeline', 'obs-pipeline', 'catalog'].includes(name)) throw new Error('Unknown example');
  const assets = join(root, 'assets'), source = join(root, 'examples', name), out = join(root, 'dist', name);
  const manifest = JSON.parse(await readFile(join(assets, 'manifest.json')));
  if (ids) manifest.sprites = Object.fromEntries(ids.map(id => { if (!manifest.sprites[id]) throw new Error(`Missing asset: ${id}`); return [id, manifest.sprites[id]]; }));
  const files = [...new Set(Object.values(manifest.sprites).flatMap(spriteFiles))];
  manifest.files = Object.fromEntries(files.map(file => [file, manifest.files[file]]));
  const missing = (await Promise.all(files.map(file => access(join(assets, file)).then(() => null, () => file)))).filter(Boolean);
  if (missing.length) throw new Error(`${missing.length} Factorio images are missing from assets/. Import them from your copy of the game with npm run assets; see README.md.`);
  await mkdir(dirname(out), { recursive: true });
  let staging = await mkdtemp(join(dirname(out), `.${name}-`));
  try {
    await cp(source, staging, { recursive: true, filter: path => !['build.mjs', 'assets.json'].includes(basename(path)) });
    await cp(join(root, 'kit'), join(staging, 'kit'), { recursive: true });
    await cp(join(root, 'assets/materials'), join(staging, 'materials'), { recursive: true });
    await mkdir(join(staging, 'assets'));
    for (const file of files) {
      if (file !== basename(file) || !manifest.files[file]) throw new Error('Invalid manifest filename');
      await cp(join(assets, file), join(staging, 'assets', file));
    }
    await writeFile(join(staging, 'assets/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    if (name === 'catalog') await cp(join(assets, 'catalog.json'), join(staging, 'assets/catalog.json'));
    await rm(out, { recursive: true, force: true });
    await rename(staging, out); staging = null;
    console.log(`Built ${name}: ${Object.keys(manifest.sprites).length} sprites, ${files.length} files.`);
  } finally { if (staging) await rm(staging, { recursive: true, force: true }); }
}
