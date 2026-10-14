import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const catalog = JSON.parse(await readFile(fileURLToPath(new URL('../assets/catalog.json', import.meta.url))));
const query = process.argv.slice(2).join(' ').toLowerCase();
const found = [...catalog.objects, ...catalog.tokens].filter(o => [o.id, o.name, o.group, ...o.roles].join(' ').toLowerCase().includes(query));
for (const o of found) console.log(`${o.id.padEnd(29)} ${o.group.padEnd(11)} ${o.motion.padEnd(11)} ${o.roles.join(', ')}`);
console.log(`${found.length} matches. Use the ID with SpriteAtlas; see assets/catalog.json for variants, footprint and limitations.`);
