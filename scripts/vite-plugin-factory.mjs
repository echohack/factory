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
  if (!await exists(path)) return { ids: [], catalog: false, icon: null };
  const spec = JSON.parse(await readFile(path));
  if (spec.all) return { ids: null, catalog: true, icon: spec.icon ?? null };
  return { ids: spec.ids ?? Object.keys(spec.sprites ?? {}), catalog: false, icon: spec.icon ?? null };
}

const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const decode = text => text.replace(/&(amp|lt|gt|quot|#39);/g, entity => entities[entity]);

export async function figureList() {
  const library = JSON.parse(await readFile(join(assets, 'manifest.json')));
  const figures = await Promise.all((await pages()).map(async name => {
    const html = await readFile(join(examples, name, 'index.html'), 'utf8').catch(() => null);
    if (html == null) return null;
    const title = decode(/<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? '').replace(/^\s*Factory\s*[·—–-]\s*/, '').trim() || name;
    const { catalog, icon } = await selection(name).catch(() => ({ catalog: false, icon: null }));
    const sprite = icon ? library.sprites[`icon-${icon}`] ?? library.sprites[icon] : null;
    const file = sprite?.kind === 'icon' && await exists(join(assets, sprite.file)) ? sprite.file : null;
    return { name, title, icon: file, library: catalog };
  }));
  return figures.filter(Boolean);
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

export function factory() {
  return {
    name: 'factory',
    async config() {
      const names = await pages();
      const input = Object.fromEntries(names.map(name => [name, join(examples, name, 'index.html')]));
      return { build: { rollupOptions: { input: { index: join(examples, 'index.html'), ...input } } } };
    },
    configureServer(server) {
      const listed = path => /[\\/]examples[\\/][^\\/]+[\\/](index\.html|assets\.json)$/.test(path);
      const refresh = path => { if (listed(path)) server.ws.send({ type: 'custom', event: 'factory:figures' }); };
      for (const event of ['add', 'change', 'unlink']) server.watcher.on(event, refresh);
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split(/[?#]/)[0];
        try {
          if (url === '/figures.json') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(await figureList())); }
          const icon = /^\/icons\/([^/]+)$/.exec(url)?.[1];
          const icons = icon && Object.values(JSON.parse(await readFile(join(assets, 'manifest.json'))).sprites).filter(sprite => sprite.kind === 'icon');
          if (icons && icons.some(sprite => sprite.file === icon) && await exists(join(assets, icon))) { res.setHeader('Content-Type', 'image/png'); return res.end(await readFile(join(assets, icon))); }
        } catch (error) { res.statusCode = 500; return res.end(error.message); }
        next();
      });
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
    async generateBundle() {
      const figures = await figureList();
      this.emitFile({ type: 'asset', fileName: 'figures.json', source: JSON.stringify(figures, null, 2) + '\n' });
      for (const icon of new Set(figures.map(figure => figure.icon).filter(Boolean))) this.emitFile({ type: 'asset', fileName: `icons/${icon}`, source: await readFile(join(assets, icon)) });
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
