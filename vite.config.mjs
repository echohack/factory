import { defineConfig } from 'vite-plus';

export default defineConfig({
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
