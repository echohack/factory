import { test, expect } from 'vite-plus/test';
import { readFile } from 'node:fs/promises';
import { pageAssets, figureList } from '../scripts/vite-plugin-factory.mjs';
import { spriteFiles } from '../kit/sprites.mjs';

const read = path => readFile(new URL(path, import.meta.url)).then(JSON.parse);

test('each page gets only the sprites its assets.json names, with every file they draw from', async () => {
  const library = await read('../assets/manifest.json');
  const array = await read('../examples/array-pipeline/assets.json'), obs = await read('../examples/obs-pipeline/assets.json');
  for (const [name, ids] of [['array-pipeline', Object.keys(array.sprites)], ['obs-pipeline', obs.ids]]) {
    const page = await pageAssets(name);
    expect(Object.keys(page.manifest.sprites)).toStrictEqual(ids);
    const files = [...new Set(ids.flatMap(id => spriteFiles(library.sprites[id])))];
    expect(page.files).toStrictEqual(files);
    expect(Object.keys(page.manifest.files)).toStrictEqual(files);
    expect(page.catalog).toBe(false);
  }
});

test('the catalog page gets the whole library and its catalog', async () => {
  const library = await read('../assets/manifest.json'), page = await pageAssets('catalog');
  expect(Object.keys(page.manifest.sprites)).toStrictEqual(Object.keys(library.sprites));
  expect(page.files.length).toBe(Object.keys(library.files).length);
  expect(page.catalog).toBe(true);
});

test('the sidebar lists every page by its title, with the library apart and only library icons', async () => {
  const library = await read('../assets/manifest.json'), figures = await figureList();
  expect(figures.map(figure => [figure.name, figure.title, figure.library])).toStrictEqual([
    ['array-pipeline', 'filter, map, reduce', false],
    ['catalog', 'Object library', true],
    ['obs-pipeline', 'OBS streaming pipeline', false],
  ]);
  const icons = Object.values(library.sprites).filter(sprite => sprite.kind === 'icon').map(sprite => sprite.file);
  for (const figure of figures) if (figure.icon !== null) expect(icons).toContain(figure.icon);
});
