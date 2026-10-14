await import('../examples/array-pipeline/build.mjs');
await import('../examples/obs-pipeline/build.mjs');
const { buildSite } = await import('./build-site.mjs');
await buildSite('catalog');
