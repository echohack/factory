import handoffs from './handoffs.mjs';
import belts from './belts.mjs';
import cells from './cells.mjs';
import fluids from './fluids.mjs';
import layout from './layout.mjs';
import control from './control.mjs';

export { groundRules, checkLayout } from './rules.mjs';
export const families = ['Handoffs', 'Belts', 'Cells', 'Fluids', 'Layout', 'Control'];
export const sources = {
  'main base': 'A dense base with a solar field, a drill field, trains, and belts bundled around machine blocks.',
  'assembly blocks': 'Assembler columns facing shared belts, with near and far inserters and lamps.',
  'main bus base': 'A main bus across the middle with smelter lines, lab columns and blocks tapping off.',
  'oil refinery': 'Mirrored refinery rows, colored fluid lines, header pipes and a crossing yard.',
  'space platform': 'A narrow hull: collectors at the front, processing in the middle, thrusters at the back.',
  'centrifuge block': 'Two rows of centrifuges around a shared belt, fed by a splitter ladder and a loop.',
  'furnace column': 'Mirrored stone furnaces with fuel and ore belts wrapped around and a fishbone spine.',
};
export const patterns = [...handoffs, ...belts, ...cells, ...fluids, ...layout, ...control];

export function findPatterns(query = '') {
  const q = query.toLowerCase().trim();
  return patterns.filter(p => !q || [p.id, p.name, p.family, p.shows, p.use, ...p.terms].join(' ').toLowerCase().includes(q));
}
