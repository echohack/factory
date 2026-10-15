import { readFile, readdir, access } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spriteFiles } from '../kit/sprites.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const examples = join(root, 'examples'), assets = join(root, 'assets');
const exists = path => access(path).then(() => true, () => false);
const missingArt = count => `${count} Factorio images are missing from assets/. Import them from your copy of the game with vp run assets; see README.md.`;

async function pages() {
  const names = [];
  for (const entry of await readdir(examples, { withFileTypes: true })) {
    if (entry.isDirectory() && await exists(join(examples, entry.name, 'index.html'))) names.push(entry.name);
  }
  return names.sort();
}

async function selection(name) {
  const path = join(examples, name, 'assets.json');
  if (!await exists(path)) return { ids: [], catalog: false };
  const spec = JSON.parse(await readFile(path));
  if (spec.all) return { ids: null, catalog: true };
  return { ids: spec.ids ?? Object.keys(spec.sprites ?? {}), catalog: false };
}

export async function pageAssets(name) {
  const library = JSON.parse(await readFile(join(assets, 'manifest.json')));
  const { ids, catalog } = await selection(name);
  const sprites = ids ? Object.fromEntries(ids.map(id => {
    if (!library.sprites[id]) throw new Error(`${name} uses an unknown sprite: ${id}`);
    return [id, library.sprites[id]];
  })) : library.sprites;
  const files = [...new Set(Object.values(sprites).flatMap(spriteFiles))];
  for (const file of files) if (file !== basename(file) || !library.files[file]) throw new Error(`Invalid manifest filename: ${file}`);
  const missing = (await Promise.all(files.map(async file => await exists(join(assets, file)) ? null : file))).filter(Boolean);
  return { manifest: { ...library, sprites, files: Object.fromEntries(files.map(file => [file, library.files[file]])) }, files, missing, catalog };
}

function redirectHome(server) {
  server.middlewares.use(async (req, res, next) => {
    if (req.url !== '/' && req.url !== '/index.html') return next();
    const names = await pages();
    res.statusCode = 302; res.setHeader('Location', `/${names.includes('array-pipeline') ? 'array-pipeline' : names[0]}/`); res.end();
  });
}

export function factory() {
  return {
    name: 'factory',
    async config() {
      const names = await pages();
      return { build: { rollupOptions: { input: Object.fromEntries(names.map(name => [name, join(examples, name, 'index.html')])) } } };
    },
    configureServer(server) {
      redirectHome(server);
      server.middlewares.use(async (req, res, next) => {
        const match = /^\/([a-z0-9-]+)\/assets\/([^/?#]+)/.exec(req.url ?? '');
        if (!match || !(await pages()).includes(match[1])) return next();
        try {
          const [, name, file] = match, page = await pageAssets(name);
          if (file === 'manifest.json' || file === 'catalog.json') {
            if (page.missing.length) { res.statusCode = 404; return res.end(missingArt(page.missing.length)); }
            if (file === 'catalog.json' && !page.catalog) return next();
            res.setHeader('Content-Type', 'application/json');
            return res.end(file === 'manifest.json' ? JSON.stringify(page.manifest) : await readFile(join(assets, 'catalog.json')));
          }
          if (!page.files.includes(file)) return next();
          res.setHeader('Content-Type', 'image/png');
          res.end(await readFile(join(assets, file)));
        } catch (error) { res.statusCode = 500; res.end(error.message); }
      });
    },
    configurePreviewServer: redirectHome,
    async generateBundle() {
      for (const name of await pages()) {
        const page = await pageAssets(name);
        if (page.missing.length) this.error(missingArt(page.missing.length));
        this.emitFile({ type: 'asset', fileName: `${name}/assets/manifest.json`, source: JSON.stringify(page.manifest, null, 2) + '\n' });
        if (page.catalog) this.emitFile({ type: 'asset', fileName: `${name}/assets/catalog.json`, source: await readFile(join(assets, 'catalog.json')) });
        for (const file of page.files) this.emitFile({ type: 'asset', fileName: `${name}/assets/${file}`, source: await readFile(join(assets, file)) });
      }
    },
  };
}
