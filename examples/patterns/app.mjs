import { loadSprites } from '../../kit/sprites.mjs';
import { FactoryScene } from '../../kit/scene.mjs';
import { patterns, families, groundRules, checkLayout, sources } from '../../patterns/index.mjs';
import { timeline, motion, checkMotion } from '../../patterns/motion.mjs';
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const STILL = 2600;
let playing = false, clock = STILL, last = null, atlas = null;
const make = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; };

$('ground-body').replaceChildren(...groundRules.map(rule => {
  const row = make('tr'), head = make('th', null, rule.id); head.scope = 'row';
  row.append(head, make('td', null, rule.text), make('td', 'check', rule.check ? 'checkLayout' : 'Review'));
  return row;
}));
for (const family of families.filter(f => patterns.some(p => p.family === f))) $('family').add(new Option(family, family));

const cards = patterns.map(pattern => {
  const example = pattern.example(), plan = timeline(example), violations = [...checkLayout(example), ...checkMotion(example).map(message => ({ rule: 'motion', message }))];
  const frame = make('article', 'workbench-frame pattern'), bench = make('section', 'workbench'), header = make('div', 'bench-header');
  frame.id = pattern.id; frame.dataset.family = pattern.family;
  const title = make('h2', null, pattern.name); title.id = `${pattern.id}-title`; bench.setAttribute('aria-labelledby', title.id);
  header.append(title, make('p', 'bench-summary', pattern.shows), make('span', 'bench-meta', pattern.family.toUpperCase()));
  const floor = make('div', 'factory-floor'), canvas = make('canvas');
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${pattern.name}: ${pattern.shows}`);
  floor.append(canvas);
  const table = make('table'), body = make('tbody'), rows = [
    ['Use for', pattern.use], ['Rules', pattern.rules], ['Terms', pattern.terms.join(' · ')],
    ['Seen in', pattern.seen.map(s => s[0].toUpperCase() + s.slice(1)).join(' · ')]];
  for (const [label, value] of rows) {
    const row = make('tr'), head = make('th', null, label), cell = make('td'); head.scope = 'row';
    if (Array.isArray(value)) { const list = make('ol', 'rules'); list.append(...value.map(text => make('li', null, text))); cell.append(list); }
    else cell.textContent = value;
    row.append(head, cell); body.append(row);
  }
  table.append(body);
  const blueprint = make('div', 'blueprint'), wrap = make('div', 'table-wrap'); wrap.append(table); blueprint.append(wrap);
  bench.append(header, floor);
  if (violations.length) { const list = make('ul', 'violations'); list.append(...violations.map(v => make('li', null, `${v.rule}: ${v.message}`))); bench.append(list); }
  bench.append(blueprint); frame.append(bench); $('cards').append(frame);
  return { pattern, example, plan, violations, frame, canvas, scene: null, visible: false };
});

function draw(card) {
  if (!card.scene || card.frame.hidden) return;
  const { example, plan } = card, m = motion(example, clock, plan), still = reduced.matches;
  card.scene.render({ ...example, objects: [...example.objects, ...m.robots] }, {
    beltFrame: still ? 0 : clock * .06, arms: m.arms, tokens: m.tokens, frames: still ? {} : m.frames,
    readouts: example.readouts?.(m.held, clock, m.stored), variants: example.variants?.(m.held, clock, m.stored) });
}
const drawAll = () => cards.forEach(draw);

function filter() {
  const query = $('search').value.toLowerCase().trim(), family = $('family').value;
  let shown = 0;
  for (const card of cards) {
    const p = card.pattern, match = (!family || p.family === family) && (!query || [p.id, p.name, p.family, p.shows, p.use, ...p.terms].join(' ').toLowerCase().includes(query));
    card.frame.hidden = !match; if (match) shown++;
  }
  $('count').textContent = `${shown} PATTERNS · ${family ? family.toUpperCase() : 'ALL FAMILIES'}`;
  $('no-match').hidden = shown > 0;
  drawAll();
}

function setPlaying(value) { playing = value; last = null; }
$('search').addEventListener('input', filter);
$('family').addEventListener('input', filter);
reduced.addEventListener('change', drawAll);
document.addEventListener('visibilitychange', () => { last = null; });
const observer = new IntersectionObserver(entries => { for (const entry of entries) { const card = cards.find(c => c.frame === entry.target); card.visible = entry.isIntersecting; if (card.visible) draw(card); } });
new ResizeObserver(drawAll).observe($('cards'));
function tick(now) {
  if (playing && !document.hidden) {
    clock += last == null ? 0 : Math.min(now - last, 100);
    for (const card of cards) if (card.visible) draw(card);
  }
  last = playing && !document.hidden ? now : null;
  requestAnimationFrame(tick);
}

$('summary').textContent = `${patterns.length} PATTERNS / ${groundRules.length} GROUND RULES / ${Object.keys(sources).length} SOURCES`;
filter();
try {
  atlas = await loadSprites('./assets/');
  for (const card of cards) { card.scene = new FactoryScene(card.canvas, atlas); observer.observe(card.frame); }
  setPlaying(true); drawAll(); requestAnimationFrame(tick);
  window.patternsDemo = {
    ids: cards.map(c => c.pattern.id), violations: Object.fromEntries(cards.map(c => [c.pattern.id, c.violations])),
    get clock() { return clock; }, get playing() { return playing; },
    seek(ms) { setPlaying(false); clock = ms; drawAll(); }, play() { setPlaying(true); },
  };
} catch (error) { $('count').textContent = error.message; console.error(error); }
