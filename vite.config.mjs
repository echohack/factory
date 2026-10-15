import { defineConfig } from 'vite-plus';

export default defineConfig({
  appType: 'mpa',
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  run: {
    tasks: {
      assets: { command: 'node scripts/build-catalog.mjs', cache: false },
      'import-assets': { command: 'node scripts/import-assets.mjs', cache: false },
      objects: { command: 'node scripts/list-assets.mjs', cache: false },
      examples: { command: 'node scripts/build-examples.mjs', cache: false },
      'verify-browser': { command: 'node scripts/verify-browser.mjs', cache: false },
      'verify-catalog': { command: 'node scripts/verify-catalog.mjs', cache: false },
    },
  },
  test: {
    include: ['tests/**/*.test.mjs'],
    environment: 'node',
    allowOnly: !process.env.CI,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['kit/**/*.mjs', 'scripts/import-assets.mjs', 'examples/*/model.mjs', 'examples/*/layout.mjs'],
    },
  },
});
