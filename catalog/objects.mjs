export const objects = [];
const part = (path, extra = {}) => ({ path: path.split('.').map(k => /^\d+$/.test(k) ? Number(k) : k), ...extra });
const dirs = ['north', 'east', 'south', 'west'];
const directional = (path, extras = []) => Object.fromEntries(dirs.map(d => [d, [part(`${path}.${d}`), ...extras.map(p => part(`${p}.${d}`))]]));
function add(type, name, group, roles, selector, notes = '') {
  objects.push({ id: name, name: name.replaceAll('-', ' ').replace(/^./, c => c.toUpperCase()), group, roles, notes,
    selector: { kind: 'prototype', type, name, ...selector } });
}
const simple = (type, name, group, roles, path, notes) => add(type, name, group, roles, { parts: [part(path)] }, notes);
const machines = 'Native body composition; optional smoke, glow, recipe fluids, and circuit overlays are not included.';

for (const name of ['wooden-chest', 'iron-chest', 'steel-chest']) simple('container', name, 'Storage', ['queue', 'buffer', 'cache'], 'picture');
for (const [name, roles] of Object.entries({
  'passive-provider-chest': ['producer', 'outbox'], 'active-provider-chest': ['dispatch', 'drain'],
  'storage-chest': ['shared storage', 'cache'], 'buffer-chest': ['prefetch', 'buffer'], 'requester-chest': ['consumer', 'inbox'],
})) simple('logistic-container', name, 'Storage', roles, 'animation', 'Chest lid animation. Delivery rules come from the program model.');
for (const name of ['inserter', 'burner-inserter', 'fast-inserter', 'long-handed-inserter', 'bulk-inserter', 'stack-inserter']) {
  objects.push({ id: name, name: name.replaceAll('-', ' ').replace(/^./, c => c.toUpperCase()), group: 'Inserters',
    roles: name === 'long-handed-inserter' ? ['handoff', 'two-tile reach'] : ['handoff', 'pickup', 'release'],
    notes: 'Articulated native rig. Carry counts and speeds must be modeled explicitly; the long-handed rig needs two-tile pickup/drop spacing.',
    selector: { kind: 'inserter', name } });
}
for (const prefix of ['', 'fast-', 'express-', 'turbo-']) {
  simple('transport-belt', `${prefix}transport-belt`, 'Logistics', ['stream', 'sequence', 'transport'], 'belt_animation_set.animation_set', '20 native belt shapes; indices are track variants, not camera angles.');
  const variants = {};
  dirs.forEach((d, i) => {
    const vertical = i % 2 === 0, direction = [2, 0, 3, 1][i];
    variants[d] = [part('belt_animation_set.animation_set', { direction, shift: vertical ? [-.5, 0] : [0, -.5] }),
      part('belt_animation_set.animation_set', { direction, shift: vertical ? [.5, 0] : [0, .5] }), part(`structure.${d}`), part(`structure_patch.${d}`)];
  });
  add('splitter', `${prefix}splitter`, 'Logistics', ['branch', 'merge', 'partition'], { variants }, 'Two belt tracks, housing and cap. The model must implement routing and preserve lane ownership.');
  const tunnels = {};
  for (const [end, path] of [['entrance', 'direction_in'], ['exit', 'direction_out']]) dirs.forEach((d, i) => {
    tunnels[`${end}-${d}`] = [part('structure.back_patch', { sheetDirections: 4, direction: i }),
      part('belt_animation_set.animation_set', { direction: [2, 0, 3, 1][i] }),
      part(`structure.${path}`, { sheetDirections: 4, direction: i }),
      part('structure.front_patch', { sheetDirections: 4, direction: i })];
  });
  add('underground-belt', `${prefix}underground-belt`, 'Logistics', ['hidden transport', 'crossing'], { variants: tunnels }, 'Entrance/exit housings over belt tracks. Underground transit needs its own visible ownership/readout.');
}
for (const n of [1, 2, 3]) simple('assembling-machine', `assembling-machine-${n}`, 'Production', ['function', 'worker', 'transform'], 'graphics_set.animation', machines);
for (const name of ['chemical-plant', 'oil-refinery']) add('assembling-machine', name, 'Production', ['transform', 'multi-input', 'pipeline stage'], { variants: directional('graphics_set.animation') }, machines);
simple('assembling-machine', 'centrifuge', 'Production', ['partition', 'normalize', 'worker'], 'graphics_set.idle_animation', machines);
for (const name of ['foundry', 'biochamber', 'cryogenic-plant']) simple('assembling-machine', name, 'Production', ['worker', 'batch', 'transform'], 'graphics_set.animation', machines);
add('assembling-machine', 'crusher', 'Production', ['decompose', 'parse', 'transform'], { variants: Object.fromEntries(dirs.map(d => [d, [part(`graphics_set.integration_patch.${d}`), part(`graphics_set.animation.${d}`)]])) }, machines);
for (const name of ['stone-furnace', 'steel-furnace', 'electric-furnace']) simple('furnace', name, 'Production', ['compile', 'convert', 'worker'], 'graphics_set.animation', 'Static body; fire, light and working effects are not included. Use a status indicator for work.');
add('furnace', 'recycler', 'Production', ['cleanup', 'deallocate', 'decompose'], { variants: directional('graphics_set.animation') }, machines);
add('mining-drill', 'burner-mining-drill', 'Production', ['source', 'read', 'extract'], { variants: directional('graphics_set.animation') }, 'Native back-and-forth drill animation; exhaust omitted.');
add('mining-drill', 'pumpjack', 'Production', ['source', 'poll', 'extract'], { parts: [part('base_picture'), part('graphics_set.animation.north')] }, 'North-facing horsehead and base; other directions need an explicit mapping.');
for (const name of ['lab', 'biolab']) simple('lab', name, 'Production', ['evaluate', 'validate', 'test'], 'off_animation', 'Idle body composition. Working glow omitted; use a status indicator for work.');

for (const name of ['small-electric-pole', 'medium-electric-pole', 'big-electric-pole', 'substation']) simple('electric-pole', name, 'Power', ['dependency', 'signal bus', 'shared resource'], 'pictures', 'Four native pole views. Wires and network behavior are supplied by the scene.');
simple('solar-panel', 'solar-panel', 'Power', ['source', 'budget'], 'picture');
simple('accumulator', 'accumulator', 'Power', ['accumulator', 'budget', 'stored capacity'], 'chargable_graphics.picture', 'Static body; add a numeric charge/capacity readout.');
for (const name of ['steam-engine', 'steam-turbine']) add('generator', name, 'Power', ['producer', 'throughput', 'resource supply'], { variants: { horizontal: [part('horizontal_animation')], vertical: [part('vertical_animation')] } }, 'Native body animation; steam and fluid simulation omitted.');
add('reactor', 'nuclear-reactor', 'Power', ['shared resource', 'compute budget'], { parts: [part('lower_layer_picture'), part('picture')] }, 'Static cold body. Heat, glow and connection patches are not included.');
simple('reactor', 'heating-tower', 'Power', ['resource supply', 'keep alive'], 'picture', 'Static body; heat and fire omitted.');
for (const name of ['boiler', 'heat-exchanger']) add('boiler', name, 'Power', ['convert', 'resource adapter'], { variants: Object.fromEntries(dirs.map(d => [d, [part(`pictures.${d}.structure`), ...(name === 'boiler' && d === 'east' ? [part('pictures.east.patch')] : [])]])) }, 'Static cold body; fire, fluid and heat overlays omitted.');

simple('storage-tank', 'storage-tank', 'Fluids', ['reservoir', 'buffer', 'aggregate'], 'pictures.picture', 'Two native orientations; fluid windows and level simulation omitted.');
add('pipe', 'pipe', 'Fluids', ['stream', 'connection'], { variants: Object.fromEntries(['straight_vertical', 'straight_horizontal', 'corner_up_right', 'corner_up_left', 'corner_down_right', 'corner_down_left', 't_up', 't_down', 't_right', 't_left', 'cross', 'ending_up', 'ending_down', 'ending_left', 'ending_right'].map(n => [n, [part(`pictures.${n}`)]])) }, 'Explicit connection shapes. Choose a shape from actual neighbors.');
add('pump', 'pump', 'Fluids', ['gate', 'backpressure', 'flow control'], { variants: directional('animations') }, 'Body animation; fluid connections and fluid state are supplied by the model.');

for (const name of ['arithmetic-combinator', 'decider-combinator', 'selector-combinator', 'constant-combinator']) add(name, name, 'Circuits', name.startsWith('arithmetic') ? ['arithmetic', 'map', 'reduce'] : name.startsWith('decider') ? ['predicate', 'condition', 'filter'] : name.startsWith('selector') ? ['select', 'route', 'priority'] : ['constant', 'configuration'], { variants: directional('sprites') }, 'Native body views; labels and wire/LED state must explain the actual operation.');
add('lamp', 'small-lamp', 'Circuits', ['boolean', 'status', 'assertion'], { variants: { off: [part('picture_off')], on: [part('picture_off'), part('picture_on')] } }, 'Explicit on/off faces; no simulated illumination.');
for (const type of ['logistic-robot', 'construction-robot']) add(type, type, 'Robotics', ['message', 'async task', 'delivery'], { variants: { idle: [part('shadow_idle'), part('idle')], moving: [part('shadow_in_motion'), part('in_motion')] } }, '16 native headings. Flight paths, altitude and ownership must be modeled.');
add('roboport', 'roboport', 'Robotics', ['scheduler', 'worker pool', 'dispatcher'], { variants: {
  closed: [part('base'), part('base_patch'), part('base_animation'), part('door_animation_up', { frame: 0 }), part('door_animation_down', { frame: 0 })],
  opening: [part('base'), part('base_patch'), part('base_animation'), part('door_animation_up'), part('door_animation_down')],
} }, 'Base fan and door frames. The opening variant is a one-way sequence; settle at its final frame instead of looping it in a program.');
add('radar', 'radar', 'Circuits', ['observe', 'monitor', 'poll'], { parts: [part('integration_patch'), part('pictures')] }, '64 rotational views; animation is driven by direction, not frame.');

export const tokens = ['iron-plate', 'copper-plate', 'steel-plate', 'iron-ore', 'copper-ore', 'coal', 'stone', 'uranium-ore', 'iron-gear-wheel', 'copper-cable', 'electronic-circuit', 'advanced-circuit', 'processing-unit', 'battery', 'engine-unit', 'electric-engine-unit', 'plastic-bar', 'sulfur', 'low-density-structure', 'rocket-fuel', 'automation-science-pack', 'logistic-science-pack', 'chemical-science-pack', 'production-science-pack', 'utility-science-pack', 'space-science-pack', 'speed-module', 'productivity-module'];
export const deferred = [
  { id: 'electric-mining-drill', reason: 'Moving drill rig uses waypoints and direction-specific working layers; the base alone is incomplete.' },
  { id: 'big-mining-drill', reason: 'Separate moving carriage, drill and status layers need a dedicated rig.' },
  { id: 'electromagnetic-plant', reason: 'Warm-up, working and cooldown states need coordinated multi-part animation.' },
  { id: 'trains-and-rails', reason: 'Rolling stock, track geometry and vehicle orientation need dedicated scene support.' },
  { id: 'creatures-and-turrets', reason: 'Walking, attacking and aiming need explicit state and direction rigs.' },
];
