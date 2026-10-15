import { station, arm, belt, ride, lanePath, drillDrop } from './build.mjs';

export default [
  {
    id: 'worker-row',
    name: 'Worker row',
    family: 'Cells',
    seen: ['main base', 'main bus base'],
    shows: 'A worker pool: identical workers take from one input stream and put results on one output stream.',
    use: 'Competing consumers on one queue; a thread pool; a fleet of stateless workers.',
    terms: ['worker pool', 'consumer', 'queue', 'worker'],
    rules: [
      'Identical workers stand side by side, all facing the same input belt.',
      'Each worker has its own input inserter and its own output inserter.',
      'The number of workers is the real pool size, or the scale is stated.',
    ],
    example() {
      const xs = [1.5, 4.5, 7.5, 10.5, 13.5], objects = [], arms = [], flows = [];
      xs.forEach((x, i) => {
        const id = `worker-${i}`, take = arm(`${id}-in`, [x, 1.5], 'south'), give = arm(`${id}-out`, [x, 5.5], 'south');
        objects.push(station(id, 'electric-furnace', x, 3.5));
        arms.push(take, give);
        flows.push({ icon: 'item-iron-ore', every: 4500, offset: i * 900, legs: [{ path: ride(null, [[0, .5], [x, .5]], take.pickup, 1) }, { arm: take.id },
          { wait: 2500, at: id }, { arm: give.id, icon: 'item-iron-plate' }, { path: ride(give.drop, [[x, 6.5], [15, 6.5]]) }] });
      });
      return { width: 15, height: 7, objects, arms, flows, beltTiles: [...belt([[.5, .5], [13.5, .5]]), ...belt([[1.5, 6.5], [14.5, 6.5]])] };
    },
  },
  {
    id: 'mirrored-rows',
    name: 'Mirrored rows',
    family: 'Cells',
    seen: ['oil refinery', 'centrifuge block', 'furnace column', 'assembly blocks'],
    shows: 'Two worker pools face one shared stream and put their results on their own outside streams.',
    use: 'Two consumer groups on one topic; primary and secondary workers that share a queue.',
    terms: ['worker pool', 'consumer', 'fan-out', 'subscribe'],
    rules: [
      'Both rows face the shared belt in the middle, one inserter tile away.',
      'Results leave on the outer side of each row, never back onto the shared belt.',
      'Keep the rows the same length unless the pools really differ in size.',
    ],
    example() {
      const xs = [2.5, 5.5, 8.5, 11.5], objects = [], arms = [], flows = [];
      xs.forEach((x, i) => {
        for (const [row, y, face, outY] of [['top', 3.5, 'north', .5], ['bottom', 9.5, 'south', 12.5]]) {
          const id = `${row}-${i}`, take = arm(`${id}-in`, [x, row === 'top' ? 5.5 : 7.5], face), give = arm(`${id}-out`, [x, row === 'top' ? 1.5 : 11.5], face);
          objects.push(station(id, 'assembling-machine-2', x, y));
          arms.push(take, give);
          flows.push({ icon: 'item-electronic-circuit', every: 6000, offset: i * 1500 + (row === 'top' ? 0 : 750), legs: [
            { path: ride(null, [[0, 6.5], [x, 6.5]], take.pickup, 1) }, { arm: take.id }, { wait: 3000, at: id },
            { arm: give.id, icon: 'item-processing-unit' }, { path: ride(give.drop, [[x, outY], [14, outY]]) }] });
        }
      });
      return {
        width: 14, height: 13, objects, arms, flows, working: objects.map(o => o.id),
        beltTiles: [...belt([[.5, 6.5], [11.5, 6.5]]), ...belt([[2.5, .5], [13.5, .5]]), ...belt([[2.5, 12.5], [13.5, 12.5]])],
      };
    },
  },
  {
    id: 'fishbone',
    name: 'Fishbone',
    family: 'Cells',
    seen: ['furnace column'],
    shows: 'A collector: short stubs from workers on both sides join one spine, each side on its own lane.',
    use: 'Results gathered from many workers into one ordered output; a fan-in aggregator.',
    terms: ['fan-in', 'reduce', 'join', 'stream'],
    rules: [
      'Each worker drops onto a short stub that side-loads into the spine.',
      'Left stubs fill the left lane and right stubs the right lane, so the reader can tell the sides apart.',
      'The feed wraps around the outside of the block so both columns reach it.',
    ],
    example() {
      const rows = [2.5, 5.5, 8.5], objects = [], arms = [], flows = [], beltTiles = [];
      const feed = [[.5, 10.5], [.5, .5], [14.5, .5], [14.5, 8.5]];
      beltTiles.push(...belt(feed), ...belt([[7.5, 2.5], [7.5, 10.5]]));
      rows.forEach((r, i) => {
        objects.push(station(`left-${i}`, 'stone-furnace', 3, r + .5), station(`right-${i}`, 'stone-furnace', 12, r + .5));
        const lIn = arm(`left-${i}-in`, [1.5, r], 'east'), lOut = arm(`left-${i}-out`, [4.5, r], 'east');
        const rOut = arm(`right-${i}-out`, [10.5, r], 'west'), rIn = arm(`right-${i}-in`, [13.5, r], 'west');
        arms.push(lIn, lOut, rOut, rIn);
        beltTiles.push(...belt([[5.5, r], [6.5, r]]), ...belt([[9.5, r], [8.5, r]]));
        flows.push({ icon: 'item-iron-ore', every: 6600, offset: i * 2200, legs: [{ path: [...lanePath([[.5, 11], [.5, r]], 1), lIn.pickup] }, { arm: lIn.id },
          { wait: 2200, at: `left-${i}` }, { arm: lOut.id, icon: 'item-iron-plate' }, { path: [lOut.drop, [5.7, r + .2], [7.3, r + .2], [7.3, 11]] }] });
        flows.push({ icon: 'item-iron-ore', every: 6600, offset: i * 2200 + 1100, legs: [{ path: [...lanePath([...feed.slice(0, 3), [14.5, r]], 1), rIn.pickup] }, { arm: rIn.id },
          { wait: 2200, at: `right-${i}` }, { arm: rOut.id, icon: 'item-iron-plate' }, { path: [rOut.drop, [9.3, r - .2], [7.7, r - .2], [7.7, 11]] }] });
      });
      return { width: 15, height: 11, objects, arms, flows, beltTiles };
    },
  },
  {
    id: 'daisy-chain',
    name: 'Daisy chain',
    family: 'Cells',
    seen: ['main bus base', 'main base'],
    shows: 'Each node keeps what it needs and passes the rest to the next node, with no belt between them.',
    use: 'Chain replication; a bucket brigade; middleware that forwards a request down a chain.',
    terms: ['replica', 'follower', 'handoff', 'pipeline'],
    rules: [
      'Only the head of the chain takes from the belt. The others take from their neighbor.',
      'An inserter between two neighbors reaches into both, like direct insertion.',
      'Draw the chain in order, head first, so the reader follows it in one direction.',
    ],
    example() {
      const objects = [], arms = [], flows = [];
      [2.5, 6.5].forEach((y, r) => {
        const ids = [3.5, 7.5, 11.5].map((x, i) => { const id = `lab-${r}-${i}`; objects.push(station(id, 'lab', x, y)); return id; });
        const links = [1.5, 5.5, 9.5].map((x, i) => arm(`link-${r}-${i}`, [x, y], 'east'));
        arms.push(...links);
        flows.push({ icon: 'item-automation-science-pack', every: 2400, offset: r * 1200, legs: [{ path: [...lanePath([[.5, 0], [.5, y]], -1), links[0].pickup] },
          { arm: links[0].id }, { wait: 1200, at: ids[0] }, { arm: links[1].id }, { wait: 1200, at: ids[1] }, { arm: links[2].id }, { wait: 1800, at: ids[2] }] });
      });
      return { width: 13, height: 8, objects, arms, flows, beltTiles: belt([[.5, .5], [.5, 6.5]]) };
    },
  },
  {
    id: 'drill-field',
    name: 'Drill field',
    family: 'Cells',
    seen: ['main base', 'main bus base'],
    shows: 'Sharded ingest: many producers write into shared streams that merge into one trunk.',
    use: 'Collectors on many hosts shipping logs to one pipeline; partitions merged by a consumer.',
    terms: ['ingest', 'producer', 'shard', 'fan-in'],
    rules: [
      'Drills face the belt from both sides and drop straight onto it, with no inserter.',
      'Each column of drills has its own belt; columns merge into the trunk at the end.',
      'A column that joins the trunk from the side fills only the trunk’s near lane.',
    ],
    example() {
      const objects = [], flows = [];
      for (const [column, belt] of [['a', 4.5], ['b', 11.5]]) for (const [k, cy] of [2, 4, 6, 8].entries()) for (const side of ['east', 'west']) {
        const drill = station(`${column}-${side}-${k}`, 'burner-mining-drill', side === 'east' ? belt - 1.5 : belt + 1.5, cy, { variant: side });
        objects.push(drill);
        const [x, y] = drillDrop(drill), lane = side === 'east' ? 1 : -1;
        const path = column === 'a' ? lanePath([[belt, y], [belt, 11.5], [17, 11.5]], lane) : [[x, y], [x, 11.3], [17, 11.3]];
        const slot = column === 'b' ? 3 * k + (side === 'east' ? 1 : 2) : 3 * k, travel = (11.5 - y + (column === 'a' ? 7 : 0)) / 1.875 * 1000;
        flows.push({ icon: 'item-iron-ore', every: 4400, offset: ((slot * 4400 / 12 - travel) % 4400 + 4400) % 4400, legs: [{ path: [[x, y], ...path.slice(1)] }] });
      }
      return {
        width: 17, height: 12, objects, arms: [], flows, working: objects.map(o => o.id),
        beltTiles: [...belt([[4.5, 1.5], [4.5, 11.5], [16.5, 11.5]]), ...belt([[11.5, 1.5], [11.5, 10.5]])],
      };
    },
  },
  {
    id: 'stage-rows',
    name: 'Stage rows',
    family: 'Cells',
    seen: ['centrifuge block', 'assembly blocks', 'oil refinery'],
    shows: 'A two-stage pipeline where each stage is a pool. The machine counts show the ratio of their rates.',
    use: 'Parse then execute; decode then render; any pipeline whose stages scale on their own.',
    terms: ['pipeline', 'worker pool', 'queue', 'transform'],
    rules: [
      'The first row drops onto the shared belt; the second row takes from it, downstream of where it was dropped.',
      'Size each row by its rate. A stage that takes 3 s next to one that takes 2 s gets 3 machines for every 2.',
      'Write each stage’s time beside its row.',
    ],
    example() {
      const top = [1.5, 4.5], bottom = [4.5, 7.5, 10.5], objects = [], arms = [];
      top.forEach((x, i) => { objects.push(station(`parse-${i}`, 'assembling-machine-2', x, 3.5)); arms.push(arm(`parse-${i}-in`, [x, 1.5], 'south'), arm(`parse-${i}-out`, [x, 5.5], 'south')); });
      bottom.forEach((x, i) => { objects.push(station(`run-${i}`, 'assembling-machine-3', x, 9.5)); arms.push(arm(`run-${i}-in`, [x, 7.5], 'south'), arm(`run-${i}-out`, [x, 11.5], 'south')); });
      const byID = Object.fromEntries(arms.map(a => [a.id, a]));
      const flows = [0, 1, 2, 3, 4, 5].map(n => {
        const t = n % 2, b = n % 3, xt = top[t], xb = bottom[b], takeTop = byID[`parse-${t}-in`], giveTop = byID[`parse-${t}-out`];
        const takeRun = byID[`run-${b}-in`], giveRun = byID[`run-${b}-out`];
        return { icon: 'item-electronic-circuit', every: 6000, offset: n * 1000, legs: [
          { path: ride(null, [[0, .5], [xt, .5]], takeTop.pickup, 1) }, { arm: takeTop.id }, { wait: 2000 - 1190, at: `parse-${t}` },
          { arm: giveTop.id, icon: 'item-engine-unit' }, { path: ride(giveTop.drop, [[xt, 6.5], [xb, 6.5]], takeRun.pickup) }, { arm: takeRun.id },
          { wait: 3000 - 1190, at: `run-${b}` }, { arm: giveRun.id, icon: 'item-processing-unit' }, { path: ride(giveRun.drop, [[xb, 12.5], [12, 12.5]]) }] };
      });
      return {
        width: 12, height: 13, objects, arms, flows, working: objects.map(o => o.id),
        notes: [{ text: 'parse · 2 s', x: 9, y: 3.6 }, { text: 'run · 3 s', x: 1.6, y: 9.6 }],
        beltTiles: [...belt([[.5, .5], [4.5, .5]]), ...belt([[1.5, 6.5], [10.5, 6.5]]), ...belt([[4.5, 12.5], [11.5, 12.5]])],
      };
    },
  },
  {
    id: 'recirculation',
    name: 'Recirculation',
    family: 'Cells',
    seen: ['centrifuge block'],
    shows: 'A feedback loop: part of a machine’s output goes back to its own input for another pass.',
    use: 'A retry that goes back through the same worker; iterative refinement; compaction that rewrites its own output.',
    terms: ['retry', 'transform', 'compaction', 'queue'],
    rules: [
      'The return belt joins the input belt by side-loading, so returning values keep their own lane.',
      'A second output takes what is finished. Label the returning value so the pass is visible.',
      'The loop needs an exit. Show the condition that ends it.',
    ],
    example() {
      const objects = [
        station('worker', 'centrifuge', 5.5, 4.5, { label: 'Worker', labelX: 8.6, labelY: 2.3 }),
        station('done', 'steel-chest', 8.5, 4.5, { label: 'Done', labelX: 8.5, labelY: 6.3, readoutX: 8.5, readoutY: 7.6 }),
      ];
      const arms = [arm('in', [5.5, 2.5], 'south'), arm('again', [5.5, 6.5], 'south'), arm('finish', [7.5, 4.5], 'east')];
      const [into, again] = arms, loop = [[5.5, 7.5], [1.5, 7.5], [1.5, 2.5]];
      const back = [...ride(again.drop, loop), [1.3, 1.7], [5.5, 1.7], into.pickup];
      return {
        width: 10, height: 9, objects, arms, working: ['worker'],
        beltTiles: [...belt([[.5, 1.5], [5.5, 1.5]]), ...belt(loop)],
        flows: [{ icon: 'item-iron-gear-wheel', every: 4000, legs: [
          { path: ride(null, [[0, 1.5], [5.5, 1.5]], into.pickup, -1) }, { arm: 'in' }, { wait: 1500, at: 'worker' },
          { arm: 'again', label: 'retry' }, { path: back, label: 'retry' }, { arm: 'in', label: 'retry' }, { wait: 1500, at: 'worker' },
          { arm: 'finish', icon: 'item-processing-unit' }, { store: 'done' }] }],
        readouts: (held, t, stored) => ({ done: `${stored.done ?? 0}` }),
      };
    },
  },
  {
    id: 'mall',
    name: 'Mall',
    family: 'Cells',
    seen: ['main base'],
    shows: 'A row of different machines draws on the same shared inputs, and each fills its own store with its own product.',
    use: 'Small services that each build something different from the same tables or topics; report generators.',
    terms: ['producer', 'publish', 'transform', 'worker'],
    rules: [
      'Every machine faces the same input belts; the products differ.',
      'Each product goes to its own chest, labeled with what it holds.',
      'Use different machines only when the products really differ. Identical work is a worker row.',
    ],
    example() {
      const kinds = [['assembling-machine-1', 'item-processing-unit', 'Responses'], ['assembling-machine-2', 'item-advanced-circuit', 'Deltas'],
        ['assembling-machine-3', 'item-low-density-structure', 'Snapshots'], ['assembling-machine-2', 'item-production-science-pack', 'Metrics']];
      const objects = [], arms = [], flows = [];
      kinds.forEach(([sprite, product, label], i) => {
        const x = 2.5 + 4 * i, id = `maker-${i}`, store = `store-${i}`;
        objects.push(station(id, sprite, x, 4.5), station(store, 'passive-provider-chest', x, 7.5, { label, labelX: x, labelY: 9.1, readoutX: x + 1.6, readoutY: 7.6 }));
        const far = arm(`${id}-far`, [x - 1, 2.5], 'south', 'long-handed-inserter'), near = arm(`${id}-near`, [x, 2.5], 'south'), out = arm(`${id}-out`, [x, 6.5], 'south');
        arms.push(far, near, out);
        flows.push({ icon: 'item-plastic-bar', every: 3200, offset: i * 800, legs: [{ path: ride(null, [[0, .5], [x - 1, .5]], far.pickup, 1) }, { arm: far.id }] });
        flows.push({ icon: 'item-iron-plate', every: 3200, offset: i * 800 + 400, legs: [{ path: ride(null, [[0, 1.5], [x, 1.5]], near.pickup, 1) }, { arm: near.id },
          { wait: 1400, at: id }, { arm: out.id, icon: product }, { store: store }] });
      });
      return {
        width: 17, height: 9.5, objects, arms, flows, working: kinds.map((k, i) => `maker-${i}`),
        beltTiles: [...belt([[.5, .5], [13.5, .5]]), ...belt([[.5, 1.5], [14.5, 1.5]])],
        readouts: (held, t, stored) => Object.fromEntries(kinds.map((k, i) => [`store-${i}`, `${stored[`store-${i}`] ?? 0}`])),
      };
    },
  },
];
