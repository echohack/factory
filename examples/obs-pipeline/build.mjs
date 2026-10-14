import { readFile } from 'node:fs/promises';
import { buildSite } from '../../scripts/build-site.mjs';
const spec = JSON.parse(await readFile(new URL('./assets.json', import.meta.url)));
await buildSite('obs-pipeline', spec.ids);
