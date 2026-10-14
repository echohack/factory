import { cp, mkdir, readFile, mkdtemp, rename, rm } from 'node:fs/promises';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '../..');
let staging;
try {
  const assets = resolve(root, '.local/assets');
  const manifest = JSON.parse(await readFile(join(assets, 'manifest.json')));
  const out = resolve(root, 'dist/array-pipeline'); await mkdir(dirname(out), { recursive: true });
  staging = await mkdtemp(join(dirname(out), '.array-pipeline-'));
  for (const file of ['index.html', 'app.mjs', 'model.mjs', 'layout.mjs', 'style.css']) await cp(join(here, file), join(staging, file));
  await cp(join(root, 'kit'), join(staging, 'kit'), { recursive: true });
  await cp(join(root, 'assets/materials'), join(staging, 'materials'), { recursive: true });
  await mkdir(join(staging, 'assets'));
  for (const file of ['manifest.json', ...Object.keys(manifest.files)]) {
    if (file !== basename(file)) throw new Error('Invalid manifest filename');
    await cp(join(assets, file), join(staging, 'assets', file));
  }
  await rm(out, { recursive: true, force: true });
  await rename(staging, out); staging = null;
  console.log(`Built ${out}/index.html`);
} catch (error) { console.error(`Build failed: ${error.message}\nRun npm run assets first.`); process.exitCode = 1; }
finally { if (staging) await rm(staging, { recursive: true, force: true }); }
