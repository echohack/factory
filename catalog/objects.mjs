import { tags, meanings } from './vocabulary.mjs';

export const collections = ['Storage', 'Inserters', 'Logistics', 'Production', 'Power', 'Fluids', 'Circuits', 'Robotics'];
export const objects = [];
const part = (path, extra = {}) => ({ path: path.split('.').map(k => /^\d+$/.test(k) ? Number(k) : k), ...extra });
const dirs = ['north', 'east', 'south', 'west'];
const directional = (path, extras = []) => Object.fromEntries(dirs.map(d => [d, [part(`${path}.${d}`), ...extras.map(p => part(`${p}.${d}`))]]));
function tagsFor(name) {
  if (!tags[name]) throw new Error(`catalog/vocabulary.mjs has no tags for ${name}`);
  return tags[name];
}
function add(type, name, group, selector, notes = '') {
  objects.push({ id: name, name: name.replaceAll('-', ' ').replace(/^./, c => c.toUpperCase()), group, roles: tagsFor(name), notes,
    selector: { kind: 'prototype', type, name, ...selector } });
}
const simple = (type, name, group, path, notes) => add(type, name, group, { parts: [part(path)] }, notes);
const machines = 'Native body composition; optional smoke, glow, recipe fluids, and circuit overlays are not included.';

for (const name of ['wooden-chest', 'iron-chest', 'steel-chest']) simple('container', name, 'Storage', 'picture');
for (const name of ['passive-provider-chest', 'active-provider-chest', 'storage-chest', 'buffer-chest', 'requester-chest']) simple('logistic-container', name, 'Storage', 'animation', 'Chest lid animation. Delivery rules come from the program model.');
for (const name of ['inserter', 'burner-inserter', 'fast-inserter', 'long-handed-inserter', 'bulk-inserter', 'stack-inserter']) {
  objects.push({ id: name, name: name.replaceAll('-', ' ').replace(/^./, c => c.toUpperCase()), group: 'Inserters',
    roles: tagsFor(name),
    notes: 'Articulated native rig. Carry counts and speeds must be modeled explicitly; the long-handed rig needs two-tile pickup/drop spacing.',
    selector: { kind: 'inserter', name } });
}
for (const prefix of ['', 'fast-', 'express-', 'turbo-']) {
  simple('transport-belt', `${prefix}transport-belt`, 'Logistics', 'belt_animation_set.animation_set', '20 native belt shapes; indices are track variants, not camera angles.');
  const variants = {};
  dirs.forEach((d, i) => {
    const vertical = i % 2 === 0, direction = [2, 0, 3, 1][i];
    variants[d] = [part('belt_animation_set.animation_set', { direction, shift: vertical ? [-.5, 0] : [0, -.5] }),
      part('belt_animation_set.animation_set', { direction, shift: vertical ? [.5, 0] : [0, .5] }), part(`structure.${d}`), part(`structure_patch.${d}`)];
  });
  add('splitter', `${prefix}splitter`, 'Logistics', { variants }, 'Two belt tracks, housing and cap. The model must implement routing and preserve lane ownership.');
  const tunnels = {};
  for (const [end, path] of [['entrance', 'direction_in'], ['exit', 'direction_out']]) dirs.forEach((d, i) => {
    tunnels[`${end}-${d}`] = [part('structure.back_patch', { sheetDirections: 4, direction: i }),
      part('belt_animation_set.animation_set', { direction: [2, 0, 3, 1][i] }),
      part(`structure.${path}`, { sheetDirections: 4, direction: i }),
      part('structure.front_patch', { sheetDirections: 4, direction: i })];
  });
  add('underground-belt', `${prefix}underground-belt`, 'Logistics', { variants: tunnels }, 'Entrance/exit housings over belt tracks. Underground transit needs its own visible ownership/readout.');
}
for (const n of [1, 2, 3]) simple('assembling-machine', `assembling-machine-${n}`, 'Production', 'graphics_set.animation', machines);
for (const name of ['chemical-plant', 'oil-refinery']) add('assembling-machine', name, 'Production', { variants: directional('graphics_set.animation') }, machines);
simple('assembling-machine', 'centrifuge', 'Production', 'graphics_set.idle_animation', machines);
for (const name of ['foundry', 'biochamber', 'cryogenic-plant']) simple('assembling-machine', name, 'Production', 'graphics_set.animation', machines);
add('assembling-machine', 'crusher', 'Production', { variants: Object.fromEntries(dirs.map(d => [d, [part(`graphics_set.integration_patch.${d}`), part(`graphics_set.animation.${d}`)]])) }, machines);
for (const name of ['stone-furnace', 'steel-furnace', 'electric-furnace']) simple('furnace', name, 'Production', 'graphics_set.animation', 'Static body; fire, light and working effects are not included. Use a status indicator for work.');
add('furnace', 'recycler', 'Production', { variants: directional('graphics_set.animation') }, machines);
add('mining-drill', 'burner-mining-drill', 'Production', { variants: directional('graphics_set.animation') }, 'Native back-and-forth drill animation; exhaust omitted.');
add('mining-drill', 'pumpjack', 'Production', { parts: [part('base_picture'), part('graphics_set.animation.north')] }, 'North-facing horsehead and base; other directions need an explicit mapping.');
for (const name of ['lab', 'biolab']) simple('lab', name, 'Production', 'off_animation', 'Idle body composition. Working glow omitted; use a status indicator for work.');

for (const name of ['small-electric-pole', 'medium-electric-pole', 'big-electric-pole', 'substation']) simple('electric-pole', name, 'Power', 'pictures', 'Four native pole views. Wires and network behavior are supplied by the scene.');
simple('solar-panel', 'solar-panel', 'Power', 'picture');
simple('accumulator', 'accumulator', 'Power', 'chargable_graphics.picture', 'Static body; add a numeric charge/capacity readout.');
for (const name of ['steam-engine', 'steam-turbine']) add('generator', name, 'Power', { variants: { horizontal: [part('horizontal_animation')], vertical: [part('vertical_animation')] } }, 'Native body animation; steam and fluid simulation omitted.');
add('reactor', 'nuclear-reactor', 'Power', { parts: [part('lower_layer_picture'), part('picture')] }, 'Static cold body. Heat, glow and connection patches are not included.');
simple('reactor', 'heating-tower', 'Power', 'picture', 'Static body; heat and fire omitted.');
for (const name of ['boiler', 'heat-exchanger']) add('boiler', name, 'Power', { variants: Object.fromEntries(dirs.map(d => [d, [part(`pictures.${d}.structure`), ...(name === 'boiler' && d === 'east' ? [part('pictures.east.patch')] : [])]])) }, 'Static cold body; fire, fluid and heat overlays omitted.');

simple('storage-tank', 'storage-tank', 'Fluids', 'pictures.picture', 'Two native orientations; fluid windows and level simulation omitted.');
add('pipe', 'pipe', 'Fluids', { variants: Object.fromEntries(['straight_vertical', 'straight_horizontal', 'corner_up_right', 'corner_up_left', 'corner_down_right', 'corner_down_left', 't_up', 't_down', 't_right', 't_left', 'cross', 'ending_up', 'ending_down', 'ending_left', 'ending_right'].map(n => [n, [part(`pictures.${n}`)]])) }, 'Explicit connection shapes. Choose a shape from actual neighbors.');
add('pump', 'pump', 'Fluids', { variants: directional('animations') }, 'Body animation; fluid connections and fluid state are supplied by the model.');

for (const name of ['arithmetic-combinator', 'decider-combinator', 'selector-combinator', 'constant-combinator']) add(name, name, 'Circuits', { variants: directional('sprites') }, 'Native body views; labels and wire/LED state must explain the actual operation.');
add('lamp', 'small-lamp', 'Circuits', { variants: { off: [part('picture_off')], on: [part('picture_off'), part('picture_on')] } }, 'Explicit on/off faces; no simulated illumination.');
for (const type of ['logistic-robot', 'construction-robot']) add(type, type, 'Robotics', { variants: { idle: [part('shadow_idle'), part('idle')], moving: [part('shadow_in_motion'), part('in_motion')] } }, '16 native headings. Flight paths, altitude and ownership must be modeled.');
add('roboport', 'roboport', 'Robotics', { variants: {
  closed: [part('base'), part('base_patch'), part('base_animation'), part('door_animation_up', { frame: 0 }), part('door_animation_down', { frame: 0 })],
  opening: [part('base'), part('base_patch'), part('base_animation'), part('door_animation_up'), part('door_animation_down')],
} }, 'Base fan and door frames. The opening variant is a one-way sequence; settle at its final frame instead of looping it in a program.');
add('radar', 'radar', 'Circuits', { parts: [part('integration_patch'), part('pictures')] }, '64 rotational views; animation is driven by direction, not frame.');

export const tokens = Object.keys(meanings);
export const deferred = [
  { id: 'electric-mining-drill', reason: 'Moving drill rig uses waypoints and direction-specific working layers; the base alone is incomplete.' },
  { id: 'big-mining-drill', reason: 'Separate moving carriage, drill and status layers need a dedicated rig.' },
  { id: 'electromagnetic-plant', reason: 'Warm-up, working and cooldown states need coordinated multi-part animation.' },
  { id: 'trains-and-rails', reason: 'Rolling stock, track geometry and vehicle orientation need dedicated scene support.' },
  { id: 'creatures-and-turrets', reason: 'Walking, attacking and aiming need explicit state and direction rigs.' },
];
