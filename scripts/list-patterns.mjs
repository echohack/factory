import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { findPatterns, groundRules } from '../patterns/index.mjs';
import { spriteIDs } from '../patterns/sprites.mjs';

const args = process.argv.slice(2);
if (args.includes('--rules')) {
  for (const rule of groundRules) console.log(`${rule.id.padEnd(18)} ${rule.check ? 'checked' : 'review '}  ${rule.text}`);
  process.exit(0);
}
if (args.includes('--assets')) {
  const ids = spriteIDs(), world = ids.filter(id => !id.startsWith('item-')), items = ids.filter(id => id.startsWith('item-'));
  const wrap = list => list.reduce((lines, id) => {
    const next = `${lines.at(-1)}${JSON.stringify(id)}, `;
    if (next.length > 114) lines.push(`    ${JSON.stringify(id)}, `); else lines[lines.length - 1] = next;
    return lines;
  }, ['    ']).map(line => line.trimEnd()).join('\n').replace(/,$/, '');
  const json = `{\n  "icon": "splitter",\n  "library": true,\n  "ids": [\n${wrap(world)},\n${wrap(items)}\n  ]\n}\n`;
  await writeFile(fileURLToPath(new URL('../examples/patterns/assets.json', import.meta.url)), json);
  console.log(`Wrote ${ids.length} sprite IDs to examples/patterns/assets.json.`);
  process.exit(0);
}
const found = findPatterns(args.join(' '));
for (const p of found) {
  console.log(`${p.id}  ${p.name} · ${p.family}\n  ${p.shows}\n  Use for: ${p.use}\n  Terms: ${p.terms.join(', ')}`);
  for (const rule of p.rules) console.log(`  - ${rule}`);
  console.log();
}
console.log(found.length ? `${found.length} patterns. Builders are in patterns/build.mjs; each example() is a starting layout.`
  : 'No pattern matches. Try a vocabulary term, such as retry, fan-in or load balancer, or run with --rules for the ground rules.');
