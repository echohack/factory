import { station, arm, belt, ride } from './build.mjs';
import { timeline } from './motion.mjs';

export default [
  {
    id: 'belt-handoff',
    name: 'Belt handoff',
    family: 'Handoffs',
    seen: ['furnace column', 'assembly blocks', 'main base'],
    shows: 'An asynchronous handoff: the producer drops a value on a stream and moves on.',
    use: 'A request queued for a worker; a job written to a log and read later.',
    terms: ['handoff', 'stream', 'queue', 'producer', 'consumer'],
    rules: [
      'Every link has an output inserter, at least two belt tiles, and an input inserter.',
      'The inserter tile sits between the building and the belt. The belt never touches the inventory.',
      'The value enters the next building only when the input inserter releases it.',
    ],
    example() {
      const objects = [
        station('requests', 'steel-chest', .5, 3.5, { label: 'Requests', labelX: 1.4, labelY: 1.2 }),
        station('worker', 'assembling-machine-2', 8.5, 3.5, { label: 'Worker', labelY: 1.2 }),
        station('responses', 'steel-chest', 16.5, 3.5, { label: 'Responses', labelX: 15.6, labelY: 1.2 }),
      ];
      const arms = [arm('take', [1.5, 3.5], 'east'), arm('feed', [6.5, 3.5], 'east'), arm('emit', [10.5, 3.5], 'east'), arm('store', [15.5, 3.5], 'east')];
      const [take, feed, emit, store] = arms;
      return {
        width: 17, height: 6, objects, arms, working: ['worker'],
        beltTiles: [...belt([[2.5, 3.5], [5.5, 3.5]]), ...belt([[11.5, 3.5], [14.5, 3.5]])],
        flows: [{ icon: 'item-electronic-circuit', every: 1800, legs: [
          { arm: 'take' }, { path: ride(take.drop, [[2.5, 3.5], [5.5, 3.5]], feed.pickup) }, { arm: 'feed' }, { wait: 1200, at: 'worker' },
          { arm: 'emit', icon: 'item-processing-unit' }, { path: ride(emit.drop, [[11.5, 3.5], [14.5, 3.5]], store.pickup) }, { arm: 'store' }] }],
      };
    },
  },
  {
    id: 'direct-insertion',
    name: 'Direct insertion',
    family: 'Handoffs',
    seen: ['assembly blocks', 'main base'],
    shows: 'A synchronous call: one stage hands its result straight to the next, with no queue between.',
    use: 'A function call chain; a parser that feeds an executor in the same thread.',
    terms: ['handoff', 'pipeline', 'dependency', 'process'],
    rules: [
      'One inserter tile separates the two buildings, and the inserter reaches into both.',
      'No belt, so no buffer: when the second stage is busy, the first one waits.',
      'Use a belt handoff instead when the stages run on separate threads or clocks.',
    ],
    example() {
      const objects = [
        station('in', 'steel-chest', .5, 3.5, { label: 'Requests', labelX: 1.2, labelY: 1.2 }),
        station('parse', 'assembling-machine-1', 3.5, 3.5, { label: 'Parse', labelY: 1.2 }),
        station('execute', 'assembling-machine-2', 7.5, 3.5, { label: 'Execute', labelY: 1.2 }),
        station('out', 'steel-chest', 10.5, 3.5, { label: 'Responses', labelX: 9.8, labelY: 1.2 }),
      ];
      const arms = [arm('call', [1.5, 3.5], 'east'), arm('pass', [5.5, 3.5], 'east'), arm('return', [9.5, 3.5], 'east')];
      return {
        width: 11, height: 6, objects, arms, beltTiles: [], working: ['parse', 'execute'],
        flows: [{ icon: 'item-electronic-circuit', every: 2000, legs: [
          { arm: 'call' }, { wait: 700, at: 'parse' }, { arm: 'pass', icon: 'item-engine-unit' }, { wait: 700, at: 'execute' },
          { arm: 'return', icon: 'item-processing-unit' }] }],
      };
    },
  },
  {
    id: 'long-reach',
    name: 'Long reach',
    family: 'Handoffs',
    seen: ['furnace column', 'assembly blocks'],
    shows: 'A worker reads a second input from a farther stream, past the first, without merging the two.',
    use: 'Jobs on one stream and credits or config on another; work that needs a budget token as well as the job.',
    terms: ['dependency', 'compute budget', 'rate limit', 'config'],
    rules: [
      'A long-handed inserter takes two tiles behind it and drops two tiles in front.',
      'The near stream stays between the worker and the far stream; the long arm reaches over it.',
      'Each input keeps its own belt and its own token.',
    ],
    example() {
      const xs = [3.5, 7.5, 11.5], objects = [], arms = [], flows = [];
      xs.forEach((x, i) => {
        objects.push(station(`worker-${i}`, 'assembling-machine-2', x, 4.5));
        const credit = arm(`credit-${i}`, [x - 1, 2.5], 'south', 'long-handed-inserter'), job = arm(`job-${i}`, [x, 2.5], 'south');
        const done = arm(`done-${i}`, [x, 6.5], 'south');
        arms.push(credit, job, done);
        const offset = i * 900;
        flows.push({ icon: 'item-battery', every: 2700, offset, legs: [{ path: ride(null, [[0, .5], [x - 1, .5]], credit.pickup, 1) }, { arm: credit.id }] });
        flows.push({ icon: 'item-iron-gear-wheel', every: 2700, offset: offset + 300, legs: [{ path: ride(null, [[0, 1.5], [x, 1.5]], job.pickup, 1) }, { arm: job.id },
          { wait: 900, at: `worker-${i}` }, { arm: done.id, icon: 'item-processing-unit' }, { path: ride(done.drop, [[x, 7.5], [15, 7.5]]) }] });
      });
      return {
        width: 15, height: 8, objects, arms, flows, working: objects.map(o => o.id),
        beltTiles: [...belt([[.5, .5], [10.5, .5]]), ...belt([[.5, 1.5], [11.5, 1.5]]), ...belt([[3.5, 7.5], [14.5, 7.5]])],
      };
    },
  },
  {
    id: 'buffer-chest',
    name: 'Buffer chest',
    family: 'Handoffs',
    seen: ['main base'],
    shows: 'A bounded queue between two stages that run at different rates.',
    use: 'A ring buffer between a capture thread and an encoder; a bounded work queue.',
    terms: ['buffer', 'queue', 'backpressure', 'memory'],
    rules: [
      'The chest shows its count and its capacity.',
      'When the chest is full, the input inserter holds its value and waits. It never drops it unless the program does.',
      'Stock in the chest plus values in hands stays constant across a handoff.',
    ],
    example() {
      const objects = [
        station('producer', 'assembling-machine-1', 1.5, 3.5, { label: 'Producer', labelY: 1.2 }),
        station('buffer', 'steel-chest', 4.5, 3.5, { label: 'Buffer', labelY: 1.2, readoutY: 5.6 }),
        station('consumer', 'assembling-machine-2', 7.5, 3.5, { label: 'Consumer', labelY: 1.2 }),
      ];
      const arms = [arm('push', [3.5, 3.5], 'east'), arm('pop', [5.5, 3.5], 'east')];
      return {
        width: 9, height: 7, objects, arms, beltTiles: [], working: ['producer', 'consumer'],
        flows: [{ icon: 'item-iron-gear-wheel', every: 1300, legs: [{ wait: 800, at: 'producer' }, { arm: 'push' }, { wait: 3300, at: 'buffer' }, { arm: 'pop' }, { wait: 1000, at: 'consumer' }] }],
        readouts: held => ({ buffer: `${held.buffer ?? 0} / 8` }),
      };
    },
  },
  {
    id: 'shared-store',
    name: 'Shared store',
    family: 'Handoffs',
    seen: ['space platform'],
    shows: 'One store that several stages write and several stages read, each through its own inserter.',
    use: 'A database shared by services; a hub that holds everything a vessel carries; state behind a lock.',
    terms: ['database', 'memory', 'fan-in', 'fan-out'],
    rules: [
      'The store sits in the middle with one inserter per writer and per reader, each on its own side.',
      'A reader takes any value in the store, not only the one its neighbor wrote.',
      'Show the store’s count. A chest has four sides, so it serves at most four stages.',
    ],
    example() {
      const objects = [
        station('writer-a', 'assembling-machine-2', 3.5, 4.5, { label: 'Writer A', labelX: 2.4, labelY: 2.4 }),
        station('writer-b', 'assembling-machine-2', 6.5, 1.5, { label: 'Writer B', labelX: 2.4, labelY: .9 }),
        station('store', 'storage-chest', 6.5, 4.5, { label: 'Store', labelX: 9.6, labelY: .9, readoutX: 9.6, readoutY: 2.3 }),
        station('reader-a', 'assembling-machine-3', 9.5, 4.5, { label: 'Reader A', labelX: 9.5, labelY: 7.1 }),
        station('reader-b', 'assembling-machine-3', 6.5, 7.5, { label: 'Reader B', labelX: 3.4, labelY: 7.7 }),
      ];
      const arms = [arm('write-a', [5.5, 4.5], 'east'), arm('write-b', [6.5, 3.5], 'south'), arm('read-a', [7.5, 4.5], 'east'), arm('read-b', [6.5, 5.5], 'south')];
      return {
        width: 11, height: 9, objects, arms, beltTiles: [], working: ['writer-a', 'writer-b', 'reader-a', 'reader-b'],
        flows: [
          { icon: 'item-iron-plate', every: 2400, legs: [{ wait: 1000, at: 'writer-a' }, { arm: 'write-a' }, { wait: 2400, at: 'store' }, { arm: 'read-b' }, { wait: 1200, at: 'reader-b' }] },
          { icon: 'item-iron-plate', every: 2400, offset: 1200, legs: [{ wait: 1000, at: 'writer-b' }, { arm: 'write-b' }, { wait: 2400, at: 'store' }, { arm: 'read-a' }, { wait: 1200, at: 'reader-a' }] },
        ],
        readouts: held => ({ store: `${held.store ?? 0} records` }),
      };
    },
  },
  {
    id: 'batch-loader',
    name: 'Batch loader',
    family: 'Handoffs',
    seen: ['main base'],
    shows: 'Values collect in a staging chest until a batch is full, then move together in one swing.',
    use: 'Group commits; bulk inserts; a producer that flushes every N messages; a train loaded at a station.',
    terms: ['batch', 'flush', 'buffer', 'commit'],
    rules: [
      'Single values arrive one at a time. A bulk inserter moves the whole batch at once.',
      'The batch is one steel plate token labeled with its size, never several tokens in one hand.',
      'The staging chest shows how full the batch is.',
    ],
    example() {
      const objects = [
        station('staging', 'steel-chest', 4.5, 3.5, { label: 'Staging', labelY: 1.2, readoutY: 5.4 }),
        station('shipment', 'steel-chest', 6.5, 3.5, { label: 'Shipped', labelX: 7, labelY: 1.2, readoutX: 7, readoutY: 5.4 }),
      ];
      const arms = [arm('stage', [3.5, 3.5], 'east'), arm('load', [5.5, 3.5], 'east', 'bulk-inserter')];
      const records = [0, 1, 2, 3].map(k => ({ icon: 'item-iron-plate', every: 6000, offset: 1500 * k, legs: [
        { path: ride(null, [[0, 3.5], [2.5, 3.5]], arms[0].pickup, 1) }, { arm: 'stage' }, { wait: 4700 - 1500 * k, at: 'staging' }] }));
      const start = timeline({ arms, flows: [records[0]] })[0].total;
      return {
        width: 8, height: 6, objects, arms, beltTiles: belt([[.5, 3.5], [2.5, 3.5]]),
        flows: [...records, { icon: 'item-steel-plate', label: '×4', every: 6000, offset: start, legs: [{ arm: 'load' }, { store: 'shipment' }] }],
        readouts: (held, t, stored) => ({ staging: `${held.staging ?? 0} / 4`, shipment: `${stored.shipment ?? 0} batches` }),
      };
    },
  },
];
