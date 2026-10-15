import { test, expect } from 'vite-plus/test';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { normalizeLayer } from '../scripts/import-assets.mjs';
import { frameRect, spriteLayers, spriteFiles, SpriteAtlas } from '../kit/sprites.mjs';

test('multi-file animation crosses page boundaries without using padding frames', () => {
  const layer = normalizeLayer({ width: 10, height: 20, frame_count: 7, line_length: 2, lines_per_file: 2, filenames: ['one', 'two'] },
    [{ file: 'one', imageWidth: 20, imageHeight: 40 }, { file: 'two', imageWidth: 20, imageHeight: 40 }]);
  expect(frameRect(layer, 3)).toStrictEqual({ file: 'one', x: 10, y: 20, width: 10, height: 20 });
  expect(frameRect(layer, 4)).toStrictEqual({ file: 'two', x: 0, y: 0, width: 10, height: 20 });
  expect(frameRect(layer, 7)).toStrictEqual(frameRect(layer, 0));
  expect(() => normalizeLayer({ size: 10, frame_count: 9, line_length: 2, lines_per_file: 2, filenames: ['one', 'two'] },
    [{ imageWidth: 20, imageHeight: 20 }, { imageWidth: 20, imageHeight: 20 }])).toThrow(/multi-file/);
});

test('frame sequences and reverse cycles use physical frames rather than logical count', () => {
  const node = { width: 10, height: 10, frame_count: 6, frame_sequence: [1, 1, 2, 3, 2, 1], line_length: 3 };
  const image = { imageWidth: 30, imageHeight: 10 };
  const layer = normalizeLayer(node, image);
  expect(Array.from({ length: 6 }, (_, f) => frameRect(layer, f).x)).toStrictEqual([0, 0, 10, 20, 10, 0]);
  expect(Array.from({ length: 3 }, (_, f) => frameRect(normalizeLayer({ size: 10, frame_count: 3, run_mode: 'backward' }, image), f).x)).toStrictEqual([20, 10, 0]);
  expect(Array.from({ length: 5 }, (_, f) => frameRect(normalizeLayer({ size: 10, frame_count: 3, run_mode: 'forward-then-backward' }, image), f).x)).toStrictEqual([0, 10, 20, 10, 0]);
  expect(() => normalizeLayer({ ...node, frame_sequence: [0, 1] }, image)).toThrow(/sequence/);
});

test('variants keep fixed track directions and static shadows while selecting moving pages', () => {
  const layer = normalizeLayer({ size: 10, frame_count: 2, direction_count: 2, line_length: 2 }, { file: 'moving', imageWidth: 20, imageHeight: 20 });
  const shadow = normalizeLayer({ size: 10, draw_as_shadow: true }, { file: 'shadow', imageWidth: 10, imageHeight: 10 });
  const calls=[], ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){calls.push(args);}};
  const atlas=new SpriteAtlas({ sprites: { machine: {kind:'sprite',layers:[layer],variants:{east:[{...layer,fixedDirection:1},shadow]}}}},new Map([['moving','moving'],['shadow','shadow']]));
  atlas.draw(ctx,'machine',0,0,{variant:'east',direction:1,frame:1});
  expect(calls[0][0]).toBe('shadow');expect(calls[1].slice(1,3)).toStrictEqual([10,10]);
  expect(()=>atlas.draw(ctx,'machine',0,0,{variant:'missing'})).toThrow(/variant/);
});

test('the committed catalog maps every ID to manifest files with valid crops for all frames and directions', async () => {
  const manifest=JSON.parse(await readFile(new URL('../assets/manifest.json',import.meta.url)));
  const catalog=JSON.parse(await readFile(new URL('../assets/catalog.json',import.meta.url)));
  const ids=[...catalog.objects,...catalog.tokens].map(o=>o.id);
  expect(new Set(ids).size).toBe(ids.length);
  for(const id of ids){
    const sprite=manifest.sprites[id];expect(sprite, `Missing ${id}`).toBeTruthy();
    for(const file of spriteFiles(sprite))expect(manifest.files[file], `Untracked manifest image: ${file}`).toBeTruthy();
    for(const layer of spriteLayers(sprite))for(let d=0;d<layer.directions;d++)for(let f=0;f<layer.frames;f++)frameRect(layer,f,d);
  }
  expect(manifest.sprites.foundry.layers[0].pages.length>1).toBeTruthy();
  expect(manifest.sprites['cryogenic-plant'].layers.some(l=>l.sequence)).toBeTruthy();
  expect(manifest.sprites['long-handed-inserter'].pickup[1]).toBe(-2);
});

const manifestURL=new URL('../assets/manifest.json',import.meta.url);
const imported=Object.keys(JSON.parse(await readFile(manifestURL)).files).some(file=>existsSync(new URL(`../assets/${file}`,import.meta.url)));
test.skipIf(!imported)('imported art matches every manifest size and hash',async () => {
  const manifest=JSON.parse(await readFile(manifestURL));
  for(const [file,meta] of Object.entries(manifest.files)){
    const data=await readFile(new URL(`../assets/${file}`,import.meta.url));
    expect(data.length, file).toBe(meta.bytes);
    expect(createHash('sha256').update(data).digest('hex'), file).toBe(meta.sha256);
  }
});
