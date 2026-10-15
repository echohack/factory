import { test, expect, onTestFinished } from 'vite-plus/test';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { frameRect, SpriteAtlas } from '../kit/sprites.mjs';
import { pointOnPath } from '../kit/scene.mjs';
import { contained, normalizeLayer, importAssets } from '../scripts/import-assets.mjs';

test('sprite crops wrap frames within their own direction, including multi-row sheets', () => {
  const layer = normalizeLayer({ width: 16, height: 24, frame_count: 6, direction_count: 4, line_length: 4, x: 2, y: 3 }, { imageWidth: 66, imageHeight: 147 });
  expect(frameRect(layer, 5, 3)).toStrictEqual({ x: 50, y: 123, width: 16, height: 24 });
  expect(frameRect(layer, 6, 1)).toStrictEqual(frameRect(layer, 0, 1));
  expect(frameRect(layer, -1, 0)).toStrictEqual(frameRect(layer, 5, 0));
  expect(() => frameRect(layer, 0, 4)).toThrow(RangeError);
  expect(() => normalizeLayer({ width: 20, height: 20, frame_count: 6, line_length: 4 }, { imageWidth: 60, imageHeight: 40 })).toThrow(/exceeds/);
});

test('unsupported compositions fail rather than silently losing effects', () => {
  const image = { imageWidth: 64, imageHeight: 64 };
  for (const field of ['stripes', 'filenames', 'tint', 'apply_runtime_tint', 'draw_as_light']) {
    expect(() => normalizeLayer({ size: 32, [field]: true }, image)).toThrow(/Unsupported/);
  }
  expect(() => normalizeLayer({ size: 32, blend_mode: 'additive' }, image)).toThrow(/Unsupported/);
  expect(() => normalizeLayer({ size: 32, run_mode: 'random' }, image)).toThrow(/Unsupported/);
});

test('draw placement preserves native scale and tile offsets with shadows behind bodies', () => {
  const layer = { file: 'image', width: 64, height: 64, frames: 1, directions: 1, columns: 1, x: 0, y: 0, imageWidth: 64, imageHeight: 64, scale: .5, shift: [1, -.5] };
  const calls = [], ctx = { globalAlpha: 1, save() {}, restore() { this.globalAlpha = 1; }, drawImage(...args) { calls.push({ args, alpha: this.globalAlpha }); } };
  new SpriteAtlas({ sprites: { machine: { kind: 'sprite', layers: [layer, { ...layer, shadow: true }] } } }, new Map([['image', 'decoded']])).draw(ctx, 'machine', 100, 200, { tileSize: 48 });
  expect(calls[0].alpha).toBe(.35);
  expect(calls[1].alpha).toBe(1);
  expect(calls[1].args.slice(-4)).toStrictEqual([124, 152, 48, 48]);
});

test('token interpolation follows segment distance, clamps ends, handles empty paths', () => {
  expect(pointOnPath([[0, 0], [3, 0], [3, 4]], .5)).toStrictEqual([3, .5]);
  expect(pointOnPath([[0, 0], [3, 0]], 2)).toStrictEqual([3, 0]);
  expect(pointOnPath([], .5)).toBe(null);
});

test('asset root prevents parent traversal and escaping symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'factory-containment-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'allowed')); await writeFile(join(root, 'outside.png'), 'test');
  await symlink(join(root, 'outside.png'), join(root, 'allowed/link.png'));
  await expect(contained(join(root, 'allowed'), '../outside.png')).rejects.toThrow(/escapes/);
  await expect(contained(join(root, 'allowed'), 'link.png')).rejects.toThrow(/escapes/);
});

test('imported art is copied without alteration and recorded with a content hash', async () => {
  const root = await mkdtemp(join(tmpdir(), 'factory-import-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cL1sAAAAASUVORK5CYII=', 'base64');
  await mkdir(join(root, 'metadata'), { recursive: true }); await mkdir(join(root, 'data/base'), { recursive: true });
  await writeFile(join(root, 'metadata/archive-summary.json'), JSON.stringify({ version: 'test' }));
  await writeFile(join(root, 'metadata/data-raw-dump.json'), JSON.stringify({ container: { example: { picture: { filename: '__base__/test.png', size: 1 } } } }));
  await writeFile(join(root, 'data/base/test.png'), png);
  const spec = join(root, 'spec.json');
  await writeFile(spec, JSON.stringify({ sprites: { chest: { kind: 'prototype', type: 'container', name: 'example', path: ['picture'] } } }));
  const out = join(root, 'output'), manifest = await importAssets({ archive: root, spec, out });
  const file = manifest.sprites.chest.layers[0].file;
  expect(await readFile(join(out, file))).toStrictEqual(png);
  expect(manifest.files[file].sha256).toBe(createHash('sha256').update(png).digest('hex'));
  expect(manifest.gameVersion).toBe('test');
});
