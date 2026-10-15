import { station, pipes } from './build.mjs';

const wave = (t, period, low, high) => { const p = ((t % period) + period) % period / period; return Math.round(p < .5 ? low + (high - low) * 2 * p : high - (high - low) * 2 * (p - .5)); };

export default [
  {
    id: 'pipe-header',
    name: 'Pipe header',
    family: 'Fluids',
    seen: ['oil refinery'],
    shows: 'A shared supply line: every worker taps one header, and when supply runs short the far end starves first.',
    use: 'Bandwidth on a shared link; a quota drawn by many clients; a connection pool that workers share.',
    terms: ['stream', 'compute budget', 'rate limit', 'backpressure'],
    rules: [
      'Use a pipe for a quantity with no identity, such as bytes, bandwidth or budget. Use a belt for values that have one.',
      'The header runs past every worker; each worker taps it with a short pipe into its own port.',
      'When demand exceeds supply, show the farthest workers idle rather than every worker slowed.',
    ],
    example() {
      const source = station('source', 'pumpjack', 1.5, 4.5, { label: 'Supply', labelX: 1.5, labelY: 7.4, readoutX: 1.5, readoutY: 1.2 });
      const plants = [4.5, 7.5, 10.5, 13.5].map((x, i) => station(`worker-${i}`, 'chemical-plant', x, 5.5, { variant: 'north', readoutY: 7.9 }));
      const header = [];
      for (let x = 2.5; x <= 12.5; x++) header.push([x, 2.5]);
      return {
        width: 15, height: 8.5, objects: [source, ...plants], arms: [], flows: [], working: ['source', 'worker-0', 'worker-1', 'worker-2'],
        beltTiles: pipes([...header, ...plants.map(p => [p.x - 1, 3.5])], { objects: [source, ...plants] }),
        readouts: () => ({ source: '60/s', 'worker-0': '20/s', 'worker-1': '20/s', 'worker-2': '20/s', 'worker-3': 'starved' }),
      };
    },
  },
  {
    id: 'tank-buffer',
    name: 'Tank buffer',
    family: 'Fluids',
    seen: ['oil refinery', 'main base'],
    shows: 'A buffer for a continuous quantity: bursts fill the tank and a steady consumer drains it.',
    use: 'A socket send buffer; a jitter buffer in front of a decoder; a byte queue between a bursty reader and a steady writer.',
    terms: ['buffer', 'backpressure', 'memory', 'stream'],
    rules: [
      'Show the tank’s level as a percentage, never as items.',
      'The source runs in bursts; the consumer runs steadily. The level carries the difference.',
      'A full tank stops the source. An empty tank stops the consumer. Show whichever the program does.',
    ],
    example() {
      const source = station('source', 'pumpjack', 1.5, 4.5, { label: 'Source', labelX: 1.5, labelY: 7.4 });
      const tank = station('tank', 'storage-tank', 7.5, 3.5, { label: 'Buffer', labelX: 7.5, labelY: 6.4, readoutY: 7.6 });
      const plant = station('consumer', 'chemical-plant', 12.5, 6.5, { variant: 'north', label: 'Consumer', labelX: 12.5, labelY: 3.2 });
      const on = t => ((t % 6000) + 6000) % 6000 < 3000;
      return {
        width: 15, height: 8.5, objects: [source, tank, plant], arms: [], flows: [],
        working: t => on(t) ? ['source', 'consumer'] : ['consumer'],
        beltTiles: pipes([[2.5, 2.5], [3.5, 2.5], [4.5, 2.5], [5.5, 2.5], [9.5, 4.5], [10.5, 4.5], [11.5, 4.5]], { objects: [source, tank, plant] }),
        readouts: (held, t) => ({ tank: `${wave(t, 6000, 20, 80)}%` }),
      };
    },
  },
  {
    id: 'pump-gate',
    name: 'Pump gate',
    family: 'Fluids',
    seen: ['oil refinery'],
    shows: 'A rate limit at a boundary: the pump caps the flow out of one part, and the upstream tank absorbs the bursts.',
    use: 'A traffic shaper; a token bucket at an API edge; a valve between a producer and a slower service.',
    terms: ['rate limit', 'gateway', 'backpressure', 'buffer'],
    rules: [
      'The pump sits at the edge of the part it guards, on the upstream side.',
      'Write the cap beside the pump.',
      'Show both levels: the upstream tank swings, the downstream one stays steady.',
    ],
    example() {
      const upstream = station('upstream', 'storage-tank', 3.5, 3.5, { readoutX: 3.5, readoutY: 6.2 });
      const pump = station('gate', 'pump', 8, 4.5, { variant: 'east' });
      const downstream = station('downstream', 'storage-tank', 12.5, 4.5, { readoutX: 12.5, readoutY: 1.5 });
      return {
        width: 16, height: 7.5, objects: [upstream, pump, downstream], arms: [], flows: [], working: ['gate'],
        areas: [{ label: 'Upstream', x: .5, y: .5, width: 9, height: 6.5 }, { label: 'Downstream', x: 10, y: .5, width: 6, height: 6.5 }],
        notes: [{ text: 'cap 1.2 kL/s', x: 8, y: 3.2 }],
        beltTiles: pipes([[.5, 2.5], [1.5, 2.5], [5.5, 4.5], [6.5, 4.5], [9.5, 4.5], [10.5, 4.5], [14.5, 6.5], [15.5, 6.5]], { objects: [upstream, pump, downstream], open: [[[.5, 2.5], [-.5, 2.5]], [[15.5, 6.5], [16.5, 6.5]]] }),
        readouts: (held, t) => ({ upstream: `${wave(t, 7000, 15, 90)}%`, downstream: `${wave(t, 7000, 48, 52)}%` }),
      };
    },
  },
  {
    id: 'cascade',
    name: 'Cascade',
    family: 'Fluids',
    seen: ['oil refinery'],
    shows: 'Surplus moves down a tier: when a tier fills past its mark, a converter turns the surplus into the next, cheaper tier.',
    use: 'Metric rollups from raw to minutes to hours; cache tiers from memory to disk to archive; log retention.',
    terms: ['compaction', 'transform', 'overflow', 'buffer'],
    rules: [
      'Draw the tiers in order, each a tank with its level, and a converter between each pair.',
      'A converter runs only while the tier above it is past its mark. Write the mark beside it.',
      'Each tier holds less than the one above it, so the levels tell the reader where data piles up.',
    ],
    example() {
      const hot = station('hot', 'storage-tank', 2.5, 3.5, { label: 'Raw', labelX: 2.5, labelY: 1, readoutX: 2.5, readoutY: 6.2 });
      const roll1 = station('minutes', 'chemical-plant', 7.5, 3.5, { variant: 'west' });
      const warm = station('warm', 'storage-tank', 12.5, 5.5, { label: 'Per minute', labelX: 12.5, labelY: 3, readoutX: 12.5, readoutY: 8.2 });
      const roll2 = station('hours', 'chemical-plant', 17.5, 5.5, { variant: 'west' });
      const cold = station('cold', 'storage-tank', 22.5, 7.5, { label: 'Per hour', labelX: 22.5, labelY: 5, readoutX: 22.5, readoutY: 10.2 });
      const objects = [hot, roll1, warm, roll2, cold];
      const level = (t, period, low, high) => { const p = ((t % period) + period) % period / period; return Math.round(p < .5 ? low + (high - low) * 2 * p : high - (high - low) * 2 * (p - .5)); };
      return {
        width: 25, height: 11, objects, arms: [], flows: [],
        working: t => [...(level(t, 8000, 55, 95) > 80 ? ['minutes'] : []), ...(level(t + 2000, 8000, 40, 90) > 80 ? ['hours'] : [])],
        notes: [{ text: 'runs above 80%', x: 7.5, y: 6.2 }, { text: 'runs above 80%', x: 17.5, y: 8.2 }],
        beltTiles: pipes([[4.5, 4.5], [5.5, 4.5], [9.5, 4.5], [10.5, 4.5], [14.5, 6.5], [15.5, 6.5], [19.5, 6.5], [20.5, 6.5]], { objects }),
        readouts: (held, t) => ({ hot: `${level(t, 8000, 55, 95)}%`, warm: `${level(t + 2000, 8000, 40, 90)}%`, cold: `${level(t, 16000, 10, 40)}%` }),
      };
    },
  },
];
