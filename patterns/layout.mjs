import { station, arm, belt, ride, splitter, poleWire } from './build.mjs';

export default [
  {
    id: 'main-bus',
    name: 'Main bus',
    family: 'Layout',
    seen: ['main bus base', 'oil refinery'],
    shows: 'A shared backbone: parallel belts, one per kind of data, with blocks that tap the kinds they need.',
    use: 'An event bus with one topic per belt; a shared data platform that many services read.',
    terms: ['message bus', 'topic', 'subscribe', 'publish'],
    rules: [
      'Each bus belt carries one kind and runs straight across the floor.',
      'A block taps a belt with a splitter and turns its share off at a right angle.',
      'A tap that crosses other bus belts passes while they dive underground. Bus belts never bend around a block.',
    ],
    example() {
      const objects = [
        station('block-1', 'assembling-machine-2', 4.5, 1.5, { label: 'Block 1', labelX: 8.4, labelY: 1.9 }),
        station('block-2', 'assembling-machine-3', 11.5, 11.5, { label: 'Block 2', labelX: 7.6, labelY: 11.9 }),
      ];
      const arms = [arm('tap-1', [4.5, 3.5], 'north'), arm('tap-2', [11.5, 9.5], 'south')];
      const under = y => ({ under: [[[10.5, y], [12.5, y]]] }), hidden = y => [[[10.5, y], [12.5, y]]];
      return {
        width: 18, height: 13, objects, arms, working: ['block-1', 'block-2'],
        beltTiles: [
          ...belt([[.5, 5.5], [2.5, 5.5]]), splitter(3.5, 5, 'east'), { x: 4.5, y: 4.5, direction: 0, sprite: 'transport-belt' },
          ...belt([[4.5, 5.5], [8.5, 5.5]]), splitter(9.5, 5, 'east'), ...belt([[10.5, 4.5], [11.5, 4.5], [11.5, 8.5]]),
          ...belt([[10.5, 5.5], [17.5, 5.5]], under(5.5)), ...belt([[.5, 6.5], [17.5, 6.5]], under(6.5)), ...belt([[.5, 7.5], [17.5, 7.5]], under(7.5)),
        ],
        flows: [
          { icon: 'item-iron-plate', every: 3000, legs: [{ path: [[0, 5.7], [3.2, 5.7], [3.8, 4.7], [4.5, 4.7], [4.5, 4.5]] }, { arm: 'tap-1' }, { wait: 1500, at: 'block-1' }] },
          { icon: 'item-iron-plate', every: 3000, offset: 1000, legs: [{ path: [[0, 5.7], [9.2, 5.7], [9.8, 4.7], [11.3, 4.7], [11.3, 8.5], [11.5, 8.5]] }, { arm: 'tap-2' }, { wait: 1500, at: 'block-2' }] },
          { icon: 'item-iron-plate', every: 3000, offset: 2000, legs: [{ path: [[0, 5.7], [18, 5.7]], hidden: hidden(5.5) }] },
          { icon: 'item-copper-plate', every: 1500, offset: 400, legs: [{ path: [[0, 6.7], [18, 6.7]], hidden: hidden(6.5) }] },
          { icon: 'item-plastic-bar', every: 1500, offset: 1100, legs: [{ path: [[0, 7.7], [18, 7.7]], hidden: hidden(7.5) }] },
        ],
      };
    },
  },
  {
    id: 'districts',
    name: 'Districts',
    family: 'Layout',
    seen: ['main base', 'space platform'],
    shows: 'Each major part of the system is its own district, and streams cross the edges between them.',
    use: 'A web frontend, a worker and a database; a service and an outside API like GitHub.',
    terms: ['process', 'network', 'gateway', 'adapter'],
    rules: [
      'Lay the stations out by part first, then route belts between the parts.',
      'Every station of a part sits inside its dotted area. Labels and readouts stay inside too.',
      'Only belts, pipes and wires cross an area edge.',
    ],
    example() {
      const objects = [
        station('inbox', 'steel-chest', 1.5, 3.5, { label: 'Inbox', labelY: 5.6 }),
        station('api', 'assembling-machine-2', 4.5, 3.5, { label: 'API', labelY: 6.1 }),
        station('worker', 'assembling-machine-3', 12.5, 3.5, { label: 'Worker', labelY: 6.1 }),
        station('results', 'steel-chest', 15.5, 3.5, { label: 'Results', labelY: 5.6 }),
      ];
      const arms = [arm('accept', [2.5, 3.5], 'east'), arm('enqueue', [6.5, 3.5], 'east'), arm('dequeue', [10.5, 3.5], 'east'), arm('finish', [14.5, 3.5], 'east')];
      const [, enqueue, dequeue] = arms;
      return {
        width: 17, height: 7, objects, arms, working: ['api', 'worker'],
        areas: [{ label: 'Web', x: .5, y: .5, width: 7, height: 6 }, { label: 'Worker', x: 8.5, y: .5, width: 8, height: 6 }],
        beltTiles: belt([[7.5, 3.5], [9.5, 3.5]]),
        flows: [{ icon: 'item-electronic-circuit', every: 2400, legs: [{ arm: 'accept' }, { wait: 900, at: 'api' }, { arm: 'enqueue', icon: 'item-iron-gear-wheel' },
          { path: ride(enqueue.drop, [[7.5, 3.5], [9.5, 3.5]], dequeue.pickup) }, { arm: 'dequeue' }, { wait: 1200, at: 'worker' }, { arm: 'finish', icon: 'item-processing-unit' }] }],
      };
    },
  },
  {
    id: 'spine',
    name: 'Spine',
    family: 'Layout',
    seen: ['space platform'],
    shows: 'A self-contained unit: one narrow hull with intake at the front, stages in order along it, and its own power aboard.',
    use: 'An edge device; a sidecar; a single deployable service whose stages always run in the same order.',
    terms: ['pipeline', 'process', 'ingest', 'dependency'],
    rules: [
      'Draw the unit as one long, narrow area. Input enters at one end and output leaves at the other.',
      'Stages follow the axis in pipeline order. Nothing doubles back.',
      'Put what the unit depends on, such as its power and its store, inside the hull. Light a lamp at each section boundary.',
    ],
    example() {
      const objects = [
        station('crush', 'crusher', 4.5, 6, { variant: 'east', label: 'Crush', labelX: 4.5, labelY: 8.1 }),
        station('refine', 'assembling-machine-2', 8.5, 5.5, { label: 'Refine', labelX: 8.5, labelY: 8.1 }),
        station('hub', 'storage-chest', 11.5, 5.5, { label: 'Hub', labelX: 11.5, labelY: 8.1, readoutX: 11, readoutY: 3.5 }),
        station('thrust', 'assembling-machine-3', 14.5, 5.5, { label: 'Thrust', labelX: 14.5, labelY: 8.1 }),
        station('solar-0', 'solar-panel', 18.5, 2.5, { label: 'Power', labelX: 21.5, labelY: 4.9 }), station('solar-1', 'solar-panel', 21.5, 2.5),
        station('pole-0', 'medium-electric-pole', 4.5, 4.5), station('pole-1', 'medium-electric-pole', 12.5, 4.5), station('pole-2', 'medium-electric-pole', 17.5, 4.5),
        ...[6.5, 10.5, 16.5].map((x, i) => station(`bulkhead-${i}`, 'small-lamp', x, 7.5, { variant: 'on' })),
      ];
      const arms = [arm('intake', [2.5, 5.5], 'east'), arm('crushed', [6.5, 5.5], 'east'), arm('stow', [10.5, 5.5], 'east'),
        arm('draw', [12.5, 5.5], 'east'), arm('exhaust', [16.5, 5.5], 'east')];
      const [intake, , , , exhaust] = arms, poles = objects.filter(o => o.sprite === 'medium-electric-pole');
      return {
        width: 25, height: 9, objects, arms, working: ['crush', 'refine', 'thrust'],
        areas: [{ label: 'Platform', x: .5, y: .5, width: 24, height: 8 }],
        wires: [poleWire(poles[0], poles[1]), poleWire(poles[1], poles[2])],
        beltTiles: [...belt([[.5, 5.5], [1.5, 5.5]]), ...belt([[17.5, 5.5], [24.5, 5.5]])],
        flows: [{ icon: 'item-iron-ore', every: 2600, legs: [{ path: ride(null, [[0, 5.5], [1.5, 5.5]], intake.pickup, 1) }, { arm: 'intake' },
          { wait: 900, at: 'crush' }, { arm: 'crushed', icon: 'item-iron-plate' }, { wait: 900, at: 'refine' }, { arm: 'stow', icon: 'item-low-density-structure' },
          { wait: 2600, at: 'hub' }, { arm: 'draw' }, { wait: 900, at: 'thrust' }, { arm: 'exhaust', icon: 'item-engine-unit' },
          { path: ride(exhaust.drop, [[17.5, 5.5], [25, 5.5]]) }] }],
        readouts: held => ({ hub: `${held.hub ?? 0} stored` }),
      };
    },
  },
];
