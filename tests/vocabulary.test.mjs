import { test, expect } from 'vite-plus/test';
import { readFile } from 'node:fs/promises';
import { vocabulary, tags, meanings } from '../catalog/vocabulary.mjs';
import { objects, tokens } from '../catalog/objects.mjs';

test('the vocabulary has no repeated terms', () => {
  expect(new Set(vocabulary).size).toBe(vocabulary.length);
});

test('every object carries four to eight vocabulary terms', () => {
  for (const object of objects) {
    expect(object.roles.length, object.id).toBeGreaterThanOrEqual(4);
    expect(object.roles.length, object.id).toBeLessThanOrEqual(8);
    expect(new Set(object.roles).size, object.id).toBe(object.roles.length);
    for (const role of object.roles) expect(vocabulary, `${object.id}: ${role}`).toContain(role);
  }
});

test('every vocabulary term names at least one object', () => {
  const used = new Set(objects.flatMap(object => object.roles));
  expect(vocabulary.filter(term => !used.has(term))).toStrictEqual([]);
});

test('every item token has one meaning of its own', () => {
  const values = tokens.map(name => meanings[name]);
  expect(values.every(Boolean)).toBe(true);
  expect(new Set(values).size).toBe(values.length);
});

test('the generated catalog carries the current terms and meanings', async () => {
  const catalog = JSON.parse(await readFile(new URL('../assets/catalog.json', import.meta.url)));
  expect(Object.fromEntries(catalog.objects.map(object => [object.id, object.roles]))).toStrictEqual(tags);
  expect(Object.fromEntries(catalog.tokens.map(token => [token.id.replace(/^item-/, ''), token.meaning]))).toStrictEqual(meanings);
});
