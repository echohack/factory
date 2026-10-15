import { station, arm, belt, ride, poleWire, circuitWire } from './build.mjs';
import { timeline } from './motion.mjs';

export default [
  {
    id: 'power-grid',
    name: 'Power grid',
    family: 'Control',
    seen: ['oil refinery', 'centrifuge block', 'assembly blocks', 'furnace column'],
    shows: 'A shared dependency: every machine draws from one network, so when it fails, everything on it stops.',
    use: 'A database or a cluster every service needs; a shared CPU budget.',
    terms: ['dependency', 'compute budget', 'network', 'broadcast'],
    rules: [
      'Poles stand in the gaps between machines, at a regular spacing, and every powered machine and inserter stands in a pole’s supply area.',
      'Copper wires join pole to pole, never pole to machine.',
      'Draw a dependency as a pole network, not as a belt: nothing is handed over, it is drawn on.',
    ],
    example() {
      const xs = [6.5, 10.5, 14.5], objects = [station('source', 'solar-panel', 1.5, 4.5, { label: 'Supply', labelY: 2.4 })], arms = [], flows = [];
      const poles = [4.5, 8.5, 12.5].map((x, i) => station(`pole-${i}`, 'medium-electric-pole', x, 4.5));
      xs.forEach((x, i) => {
        const id = `service-${i}`, take = arm(`${id}-in`, [x, 2.5], 'south'), give = arm(`${id}-out`, [x, 6.5], 'south');
        objects.push(station(id, 'assembling-machine-2', x, 4.5));
        arms.push(take, give);
        flows.push({ icon: 'item-electronic-circuit', every: 3600, offset: i * 1200, legs: [{ path: ride(null, [[0, 1.5], [x, 1.5]], take.pickup, 1) }, { arm: take.id },
          { wait: 1500, at: id }, { arm: give.id, icon: 'item-processing-unit' }, { path: ride(give.drop, [[x, 7.5], [18, 7.5]]) }] });
      });
      objects.push(...poles);
      return {
        width: 18, height: 8, objects, arms, flows, working: xs.map((x, i) => `service-${i}`),
        wires: [poleWire(poles[0], poles[1]), poleWire(poles[1], poles[2])],
        beltTiles: [...belt([[.5, 1.5], [14.5, 1.5]]), ...belt([[6.5, 7.5], [17.5, 7.5]])],
      };
    },
  },
  {
    id: 'solar-field',
    name: 'Solar field',
    family: 'Control',
    seen: ['main base'],
    shows: 'A pool of identical replicas with no transport between them, all adding to one shared capacity.',
    use: 'Nodes in a cluster; a fleet of stateless replicas; reserved capacity that absorbs bursts.',
    terms: ['compute budget', 'producer', 'worker pool', 'buffer'],
    rules: [
      'Pack identical units in a grid. Draw no belts between them: they share nothing but the network.',
      'Draw the real count, or state the scale on a readout.',
      'Accumulators beside the field are reserve capacity that fills when supply exceeds demand.',
    ],
    example() {
      const objects = [];
      for (const [i, x] of [1.5, 4.5, 7.5, 10.5].entries()) for (const [j, y] of [1.5, 4.5].entries()) objects.push(station(`panel-${i}-${j}`, 'solar-panel', x, y));
      for (const [k, y] of [1, 3, 5].entries()) objects.push(station(`reserve-${k}`, 'accumulator', 13, y));
      const hub = station('hub', 'substation', 16, 3, { label: 'Pool', labelX: 16, labelY: 5.3, readoutY: 6.4 });
      objects.push(hub);
      return { width: 18, height: 7.5, objects, arms: [], flows: [], beltTiles: [], readouts: () => ({ hub: '8 × 60 kW' }) };
    },
  },
  {
    id: 'circuit-limit',
    name: 'Circuit limit',
    family: 'Control',
    seen: ['main base'],
    shows: 'A signal gates work: the producer runs only while the stock is below a limit.',
    use: 'Kanban and pull-based production; a prefetcher that stops at a high-water mark; backpressure by signal.',
    terms: ['backpressure', 'rate limit', 'monitor', 'config'],
    rules: [
      'A red or green wire runs from the chest it reads to the inserter it enables. Write the condition beside the inserter.',
      'The inserter stops with an empty hand when the condition is false. Show it standing still.',
      'A lamp on the same wire shows the state where the reader looks.',
    ],
    example() {
      const parts = station('parts', 'steel-chest', .5, 3.5);
      const maker = station('maker', 'assembling-machine-2', 3.5, 3.5, { label: 'Producer', labelY: 1.2 });
      const stock = station('stock', 'steel-chest', 6.5, 3.5, { label: 'Stock', labelX: 6.7, labelY: 1.2, readoutY: 6.9 });
      const lamp = station('full', 'small-lamp', 6.5, 5.5, { variant: 'off' });
      const feed = arm('feed', [1.5, 3.5], 'east'), put = arm('put', [5.5, 3.5], 'east'), take = arm('take', [7.5, 3.5], 'east', 'fast-inserter');
      const flows = [0, 1, 2, 3].map(k => ({ icon: 'item-iron-gear-wheel', every: 12000, offset: 2100 * k + 100, legs: [
        { arm: 'feed' }, { wait: 900, at: 'maker' }, { arm: 'put' }, { wait: 9810 - 1500 * k, at: 'stock' }, { arm: 'take' },
        { path: ride(take.drop, [[8.5, 3.5], [12, 3.5]]) }] }));
      return {
        width: 12, height: 7.5, objects: [parts, maker, stock, lamp], arms: [feed, put, take], flows, working: ['maker'],
        beltTiles: belt([[8.5, 3.5], [11.5, 3.5]]),
        wires: [circuitWire(stock, put, 'red'), circuitWire(stock, lamp, 'red')],
        readouts: held => ({ stock: `${held.stock ?? 0} / 4` }),
        variants: held => ({ full: (held.stock ?? 0) >= 4 ? 'on' : 'off' }),
        notes: [{ text: 'stock < 4', x: 5.5, y: 2.4 }],
      };
    },
  },
  {
    id: 'robot-network',
    name: 'Robot network',
    family: 'Control',
    seen: ['main base'],
    shows: 'Deliveries with no fixed route: a carrier from a shared pool takes each value from a provider to whichever requester asks.',
    use: 'A scheduler that dispatches tasks to a pool; a broker that delivers to subscribers; async jobs with no fixed path.',
    terms: ['scheduler', 'async task', 'message bus', 'worker pool'],
    rules: [
      'Use robots only when the program has no fixed route. A fixed route is a belt.',
      'A robot flies empty from the roboport, carries one value from a provider chest to a requester chest, and flies back empty.',
      'The roboport is the pool the carriers come from. Draw it between the chests it serves.',
    ],
    example() {
      const port = station('port', 'roboport', 9, 4, { variant: 'closed', label: 'Roboport', labelX: 9, labelY: 7.6 });
      const objects = [
        station('producer', 'assembling-machine-2', 1.5, 3.5, { label: 'Producer', labelY: 1.1 }),
        station('offer', 'passive-provider-chest', 4.5, 3.5, { label: 'Provider', labelX: 4.5, labelY: 5.6 }), port,
        station('want-a', 'requester-chest', 13.5, 1.5, { label: 'Requester', labelX: 13.2, labelY: 3.4 }), station('want-b', 'requester-chest', 13.5, 6.5),
        station('consumer-a', 'assembling-machine-3', 16.5, 1.5), station('consumer-b', 'assembling-machine-3', 16.5, 6.5),
      ];
      const arms = [arm('put', [3.5, 3.5], 'east'), arm('take-a', [14.5, 1.5], 'east'), arm('take-b', [14.5, 6.5], 'east')];
      const home = [9, 4], offer = [4.5, 3.5], flows = [];
      for (const [i, [want, take, consumer]] of [['want-a', 'take-a', 'consumer-a'], ['want-b', 'take-b', 'consumer-b']].entries()) {
        const target = [13.5, objects.find(o => o.id === want).y], offset = i * 2000;
        const robot = { icon: 'item-iron-gear-wheel', every: 4000, legs: [{ fly: [home, offer], empty: true }, { fly: [offer, target] }, { fly: [target, home], empty: true }] };
        const [out, carry] = timeline({ arms, flows: [robot] })[0].legs;
        flows.push({ ...robot, offset: offset + 1000 + 595 + 600 - out.ms });
        flows.push({ icon: 'item-iron-gear-wheel', every: 4000, offset, legs: [{ wait: 1000, at: 'producer' }, { arm: 'put' }, { wait: 600, at: 'offer' },
          { wait: carry.ms }, { wait: 300, at: want }, { arm: take }, { wait: 1500, at: consumer }] });
      }
      return { width: 18, height: 8, objects, arms, flows, beltTiles: [], working: ['producer', 'consumer-a', 'consumer-b'] };
    },
  },
  {
    id: 'status-lamps',
    name: 'Status lamps',
    family: 'Control',
    seen: ['space platform', 'assembly blocks'],
    shows: 'Each station has a lamp wired to it that lights when the station stalls, so a failure shows where it happens.',
    use: 'Health checks per service; an alert when a queue is full; a dashboard light per stage.',
    terms: ['health check', 'alert', 'monitor', 'metric'],
    rules: [
      'Put the lamp beside the station it reports on and wire it to the inventory it reads.',
      'Write the lamp’s condition beside it. A lit lamp means the condition holds.',
      'Show the stall in behavior too: the stalled machine stops and its inserters stand still.',
    ],
    example() {
      const xs = [2.5, 7.5, 12.5], objects = [], arms = [], flows = [], wires = [];
      xs.forEach((x, i) => {
        const stalled = i === 2, id = `worker-${i}`;
        const store = station(`out-${i}`, 'steel-chest', x, 6.5, { readoutX: x, readoutY: 8 });
        const lamp = station(`lamp-${i}`, 'small-lamp', x + 2, 6.5, { variant: stalled ? 'on' : 'off' });
        objects.push(station(id, 'assembling-machine-2', x, 3.5), store, lamp);
        const take = arm(`${id}-in`, [x, 1.5], 'south'), give = arm(`${id}-out`, [x, 5.5], 'south');
        arms.push(take, give);
        wires.push(circuitWire(store, lamp, 'red'));
        if (!stalled) flows.push({ icon: 'item-iron-gear-wheel', every: 3000, offset: i * 1000, legs: [{ path: ride(null, [[0, .5], [x, .5]], take.pickup, 1) }, { arm: take.id },
          { wait: 1200, at: id }, { arm: give.id }, { wait: 6000, at: store.id }] });
      });
      return {
        width: 16, height: 8.5, objects, arms, flows, wires, working: ['worker-0', 'worker-1'],
        notes: [{ text: 'on when full', x: 14.7, y: 7.9 }],
        beltTiles: belt([[.5, .5], [12.5, .5]]),
        readouts: held => ({ 'out-0': `${held['out-0'] ?? 0} / 48`, 'out-1': `${held['out-1'] ?? 0} / 48`, 'out-2': '48 / 48' }),
      };
    },
  },
];
