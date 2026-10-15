import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import { factory } from './scripts/vite-plugin-factory.mjs';

const repo = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: 'examples',
  base: './',
  appType: 'mpa',
  plugins: [factory()],
  build: { outDir: '../dist', emptyOutDir: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  run: {
    tasks: {
      dev: { command: 'portless run --name factory vp dev', cache: false },
      assets: { command: 'node scripts/build-catalog.mjs', cache: false },
      'import-assets': { command: 'node scripts/import-assets.mjs', cache: false },
      objects: { command: 'node scripts/list-assets.mjs', cache: false },
      patterns: { command: 'node scripts/list-patterns.mjs', cache: false },
      'verify-browser': { command: 'node scripts/verify-browser.mjs', cache: false },
      'verify-catalog': { command: 'node scripts/verify-catalog.mjs', cache: false },
      'verify-patterns': { command: 'node scripts/verify-patterns.mjs', cache: false },
    },
  },
  test: {
    root: repo,
    include: ['tests/**/*.test.mjs'],
    environment: 'node',
    allowOnly: !process.env.CI,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['kit/**/*.mjs', 'patterns/**/*.mjs', 'scripts/import-assets.mjs', 'scripts/vite-plugin-factory.mjs', 'examples/*/model.mjs', 'examples/*/layout.mjs'],
    },
  },
});
