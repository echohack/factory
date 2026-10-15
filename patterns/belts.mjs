import { station, arm, belt, ride, splitter, lanePath } from './build.mjs';
import { timeline } from './motion.mjs';

export default [
  {
    id: 'side-load',
    name: 'Side-load',
    family: 'Belts',
    seen: ['furnace column'],
    shows: 'Two streams merge into one and keep apart: each source fills its own lane.',
    use: 'Video and audio packets in one output queue; two partitions on one connection.',
    terms: ['fan-in', 'partition', 'stream', 'join'],
    rules: [
      'A belt that ends against the side of another belt feeds only the near lane.',
      'Feed each lane from its own side when the two kinds must stay apart.',
      'Never merge two kinds onto the same lane.',
    ],
    example() {
      const objects = [
        station('video', 'steel-chest', .5, 2.5, { label: 'Video', labelX: 1.2, labelY: 1 }),
        station('audio', 'steel-chest', 10.5, 4.5, { label: 'Audio', labelX: 9.8, labelY: 3 }),
        station('merged', 'steel-chest', 5.5, 10.5, { label: 'Output', labelX: 7.6, labelY: 10.9 }),
      ];
      const arms = [arm('video-out', [1.5, 2.5], 'east'), arm('audio-out', [9.5, 4.5], 'west'), arm('drain', [5.5, 9.5], 'south')];
      const [video, audio, drain] = arms;
      const legs = [
        [{ arm: video.id }, { path: [...ride(video.drop, [[2.5, 2.5], [5.5, 2.5]]).slice(0, -1), [5.3, 2.7], [5.3, 8.5], drain.pickup] }, { arm: drain.id }],
        [{ arm: audio.id }, { path: [...ride(audio.drop, [[8.5, 4.5], [5.5, 4.5]]).slice(0, -1), [5.7, 4.3], [5.7, 8.5], drain.pickup] }, { arm: drain.id }],
      ];
      const reach = timeline({ arms, flows: legs.map(l => ({ every: 1, legs: l })) }).map(f => f.legs[2].start);
      return {
        width: 11, height: 11, objects, arms,
        beltTiles: [...belt([[2.5, 2.5], [4.5, 2.5]]), ...belt([[8.5, 4.5], [6.5, 4.5]]), ...belt([[5.5, 2.5], [5.5, 8.5]])],
        flows: [
          { icon: 'item-copper-plate', every: 3000, offset: 3000 - reach[0], legs: legs[0] },
          { icon: 'item-copper-ore', every: 3000, offset: 4500 - reach[1], legs: legs[1] },
        ],
      };
    },
  },
  {
    id: 'splitter-fan-out',
    name: 'Splitter fan-out',
    family: 'Belts',
    seen: ['centrifuge block', 'main base'],
    shows: 'A load balancer: one stream alternates between two consumers.',
    use: 'Round-robin across two replicas; one queue drained by two worker groups.',
    terms: ['load balancer', 'fan-out', 'router', 'shard'],
    rules: [
      'The splitter sends values to its two outputs in turn and keeps each value on its lane.',
      'When one output backs up, everything goes to the other. Show that if the program does.',
      'A splitter is two tiles wide; belts enter from behind and leave ahead, never from the side.',
    ],
    example() {
      const objects = [
        station('requests', 'steel-chest', .5, 4.5, { label: 'Requests', labelX: 1.3, labelY: 3 }),
        station('replica-a', 'assembling-machine-2', 12.5, 2.5, { label: 'Replica A', labelX: 8.8, labelY: 1.3 }),
        station('replica-b', 'assembling-machine-2', 12.5, 7.5, { label: 'Replica B', labelX: 8.8, labelY: 9.1 }),
      ];
      const arms = [arm('send', [1.5, 4.5], 'east'), arm('a-in', [10.5, 2.5], 'east'), arm('b-in', [10.5, 7.5], 'east')];
      const [send, a, b] = arms;
      const upper = [[2.5, 4.5], [7.5, 4.5], [7.5, 2.5], [9.5, 2.5]], lower = [[5.5, 5.5], [7.5, 5.5], [7.5, 7.5], [9.5, 7.5]];
      return {
        width: 15, height: 10, objects, arms, working: ['replica-a', 'replica-b'],
        beltTiles: [...belt([[2.5, 4.5], [4.5, 4.5]]), splitter(5.5, 5, 'east'), ...belt([[6.5, 4.5], [7.5, 4.5], [7.5, 2.5], [9.5, 2.5]]),
          ...belt([[6.5, 5.5], [7.5, 5.5], [7.5, 7.5], [9.5, 7.5]])],
        flows: [
          { icon: 'item-electronic-circuit', every: 2600, legs: [{ arm: send.id }, { path: ride(send.drop, upper, a.pickup) }, { arm: a.id }, { wait: 1800, at: 'replica-a' }] },
          { icon: 'item-electronic-circuit', every: 2600, offset: 1300, legs: [{ arm: send.id },
            { path: [send.drop, [2.7, 4.7], [5.2, 4.7], ...ride(null, lower, b.pickup, 1).map((p, i) => i ? p : [5.8, 5.7])] }, { arm: b.id }, { wait: 1800, at: 'replica-b' }] },
        ],
      };
    },
  },
  {
    id: 'splitter-ladder',
    name: 'Splitter ladder',
    family: 'Belts',
    seen: ['centrifuge block'],
    shows: 'One trunk feeds several worker rows: a splitter at each row peels off that row’s share.',
    use: 'Partitioned consumers, one partition per row; a dispatcher feeding several pools.',
    terms: ['partition', 'shard', 'load balancer', 'worker pool'],
    rules: [
      'The trunk runs down one side. Each row starts at a splitter on the trunk.',
      'The last row takes the end of the trunk with a corner, not a splitter.',
      'Rows run in parallel; draw them the same length so the reader can compare them.',
    ],
    example() {
      const xs = [4.5, 8.5, 12.5], objects = [], arms = [], flows = [];
      const rows = [{ y: 2.5, my: 5.5, path: x => [[1.3, 0], [1.3, 1.2], [2.3, 1.8], [2.3, 2.7], [x, 2.7], [x, 2.5]] },
        { y: 9.5, my: 12.5, path: x => [...lanePath([[1.5, 0], [1.5, 9.5], [x, 9.5]], 1), [x, 9.5]] }];
      rows.forEach((row, r) => xs.forEach((x, i) => {
        const id = `row-${r}-${i}`, feed = arm(`${id}-in`, [x, row.y + 1], 'south');
        objects.push(station(id, 'assembling-machine-2', x, row.my));
        arms.push(feed);
        flows.push({ icon: 'item-iron-gear-wheel', every: 6000, offset: (r * 3 + i) * 1000, legs: [{ path: row.path(x) }, { arm: feed.id }, { wait: 2500, at: id }] });
      }));
      return {
        width: 14, height: 14, objects, arms, flows, working: objects.map(o => o.id),
        beltTiles: [{ x: 1.5, y: .5, direction: 3, sprite: 'transport-belt' }, splitter(2, 1.5, 'south'), ...belt([[2.5, 2.5], [12.5, 2.5]]),
          ...belt([[1.5, 2.5], [1.5, 9.5], [12.5, 9.5]])],
      };
    },
  },
  {
    id: 'belt-loop',
    name: 'Loop',
    family: 'Belts',
    seen: ['space platform', 'centrifuge block'],
    shows: 'Values circulate until a consumer takes them. Nothing is lost; an untaken value comes around again.',
    use: 'A retry ring; a shared offer that workers claim when they are free.',
    terms: ['retry', 'queue', 'subscribe', 'consumer'],
    rules: [
      'The loop is a closed belt with no start and no end. The producer drops onto it from outside.',
      'Consumers take from the loop. A value they pass stays on it.',
      'Show a value making a second lap when the program retries or waits.',
    ],
    example() {
      const loop = [[2.5, 2.5], [13.5, 2.5], [13.5, 7.5], [2.5, 7.5]];
      const objects = [
        station('offers', 'steel-chest', .5, 5.5, { label: 'Offers', labelX: 1, labelY: 3.9 }),
        station('worker-a', 'assembling-machine-2', 6.5, 5.5), station('worker-b', 'assembling-machine-2', 10.5, 5.5),
      ];
      const arms = [arm('offer', [1.5, 5.5], 'east'), arm('claim-a', [6.5, 3.5], 'south'), arm('claim-b', [10.5, 3.5], 'south')];
      const lap = lanePath([[2.5, 5.5], ...loop, [2.5, 2.5], [10.5, 2.5]], 1);
      return {
        width: 15, height: 9, objects, arms, working: ['worker-a', 'worker-b'],
        beltTiles: belt(loop, { loop: true }),
        flows: [
          { icon: 'item-iron-gear-wheel', every: 5000, legs: [{ arm: 'offer' }, { path: [arms[0].drop, ...lanePath([[2.5, 5.5], [2.5, 2.5], [6.5, 2.5]], 1), [6.5, 2.5]] }, { arm: 'claim-a' }, { wait: 1500, at: 'worker-a' }] },
          { icon: 'item-iron-gear-wheel', every: 5000, offset: 2500, legs: [{ arm: 'offer' }, { path: [arms[0].drop, ...lap, [10.5, 2.5]] }, { arm: 'claim-b' }, { wait: 1500, at: 'worker-b' }] },
        ],
      };
    },
  },
  {
    id: 'underpass',
    name: 'Underpass',
    family: 'Belts',
    seen: ['main base', 'main bus base', 'oil refinery'],
    shows: 'Two streams cross without touching. Neither sees the other’s values.',
    use: 'Independent pipelines that share a floor; a network hop that passes through another part.',
    terms: ['proxy', 'network', 'stream', 'partition'],
    rules: [
      'The crossing stream goes underground: an entrance before the other belt and an exit after it, on one line.',
      'A yellow underground spans at most four tiles; faster tiers reach farther.',
      'The value is hidden while it is underground. Hide it in the animation too.',
    ],
    example() {
      const objects = [
        station('records', 'steel-chest', .5, 4.5, { label: 'Records', labelX: 1.3, labelY: 3 }),
        station('stored', 'steel-chest', 12.5, 4.5, { label: 'Stored', labelX: 11.9, labelY: 3 }),
        station('frames', 'steel-chest', 6.5, .5, { label: 'Frames', labelX: 8.9, labelY: .9 }),
        station('shown', 'steel-chest', 6.5, 9.5, { label: 'Shown', labelX: 8.7, labelY: 9.9 }),
      ];
      const arms = [arm('r-out', [1.5, 4.5], 'east'), arm('r-in', [11.5, 4.5], 'east'), arm('f-out', [6.5, 1.5], 'south'), arm('f-in', [6.5, 8.5], 'south')];
      const [rOut, rIn, fOut, fIn] = arms;
      return {
        width: 13, height: 10, objects, arms,
        beltTiles: [...belt([[2.5, 4.5], [10.5, 4.5]], { under: [[[5.5, 4.5], [7.5, 4.5]]] }), ...belt([[6.5, 2.5], [6.5, 7.5]])],
        flows: [
          { icon: 'item-iron-plate', every: 2000, legs: [{ arm: rOut.id }, { path: ride(rOut.drop, [[2.5, 4.5], [10.5, 4.5]], rIn.pickup), hidden: [[[5.5, 4.5], [7.5, 4.5]]] }, { arm: rIn.id }] },
          { icon: 'item-copper-plate', every: 2000, offset: 1000, legs: [{ arm: fOut.id }, { path: ride(fOut.drop, [[6.5, 2.5], [6.5, 7.5]], fIn.pickup) }, { arm: fIn.id }] },
        ],
      };
    },
  },
  {
    id: 'belt-bundle',
    name: 'Belt bundle',
    family: 'Belts',
    seen: ['main base', 'oil refinery'],
    shows: 'Several streams between the same two parts run side by side and turn together.',
    use: 'Channels multiplexed over one connection; the topics two services exchange; a trunk between two sites.',
    terms: ['stream', 'network', 'partition', 'pipeline'],
    rules: [
      'Belts between the same two parts keep their order and turn together, with nested corners.',
      'A bundle never crosses itself. Plan the order at the source so it arrives in order.',
      'Each belt still carries one kind.',
    ],
    example() {
      const routes = [
        { kind: 'item-iron-plate', y: 1.5, path: [[2.5, 1.5], [10.5, 1.5], [10.5, 7.5], [14.5, 7.5]] },
        { kind: 'item-copper-plate', y: 2.5, path: [[2.5, 2.5], [9.5, 2.5], [9.5, 8.5], [14.5, 8.5]] },
        { kind: 'item-plastic-bar', y: 3.5, path: [[2.5, 3.5], [8.5, 3.5], [8.5, 9.5], [14.5, 9.5]] },
      ];
      const objects = [], arms = [], flows = [], beltTiles = [];
      routes.forEach(({ kind, y, path }, i) => {
        const end = path.at(-1)[1];
        objects.push(station(`from-${i}`, 'steel-chest', .5, y, i ? {} : { label: 'Service A', labelX: 1.6, labelY: .7 }),
          station(`to-${i}`, 'steel-chest', 16.5, end, i ? {} : { label: 'Service B', labelX: 15.6, labelY: 6.7 }));
        const send = arm(`send-${i}`, [1.5, y], 'east'), take = arm(`take-${i}`, [15.5, end], 'east');
        arms.push(send, take);
        beltTiles.push(...belt(path));
        flows.push({ icon: kind, every: 2000, offset: i * 650, legs: [{ arm: send.id }, { path: ride(send.drop, path, take.pickup) }, { arm: take.id }] });
      });
      return { width: 17, height: 10.5, objects, arms, flows, beltTiles };
    },
  },
  {
    id: 'overflow',
    name: 'Overflow',
    family: 'Belts',
    seen: ['space platform'],
    shows: 'What the consumer cannot take runs to the end of the belt and into a dead letter chest.',
    use: 'A dead letter queue; a drop policy; load shedding when a worker is busy.',
    terms: ['overflow', 'dead letter', 'drop', 'backpressure'],
    rules: [
      'The consumer takes from the middle of the belt. The belt runs on past it.',
      'An inserter at the end of the belt moves every value that reaches it into the overflow chest.',
      'Count what overflows on the chest. Dropped values stay visible; they never vanish.',
    ],
    example() {
      const objects = [
        station('messages', 'steel-chest', .5, 3.5, { label: 'Messages', labelX: 1.4, labelY: 1.6 }),
        station('worker', 'assembling-machine-2', 5.5, 6.5, { label: 'Worker', labelX: 8.4, labelY: 6.6 }),
        station('dead', 'wooden-chest', 12.5, 3.5, { label: 'Dead letters', labelX: 11.6, labelY: 1.6, readoutX: 12, readoutY: 5.4 }),
      ];
      const arms = [arm('send', [1.5, 3.5], 'east', 'fast-inserter'), arm('take', [5.5, 4.5], 'south'), arm('spill', [11.5, 3.5], 'east')];
      const [send, take, spill] = arms;
      return {
        width: 13, height: 8, objects, arms, working: ['worker'], beltTiles: belt([[2.5, 3.5], [10.5, 3.5]]),
        flows: [
          { icon: 'item-coal', every: 2000, legs: [{ arm: 'send' }, { path: ride(send.drop, [[2.5, 3.5], [5.5, 3.5]], take.pickup) }, { arm: 'take' }, { wait: 1500, at: 'worker' }] },
          { icon: 'item-coal', every: 2000, offset: 1000, legs: [{ arm: 'send' }, { path: ride(send.drop, [[2.5, 3.5], [10.5, 3.5]], spill.pickup) }, { arm: 'spill' }, { store: 'dead' }] },
        ],
        readouts: (held, t, stored) => ({ dead: `${stored.dead ?? 0}` }),
      };
    },
  },
  {
    id: 'mixed-loop',
    name: 'Mixed loop',
    family: 'Belts',
    seen: ['space platform'],
    shows: 'Several kinds share one circulating belt. Each consumer’s inserter takes only its kind.',
    use: 'One topic that carries several message types; a shared queue where workers filter by type.',
    terms: ['topic', 'filter', 'subscribe', 'router'],
    rules: [
      'Write each inserter’s filter beside it. An inserter never takes a kind outside its filter.',
      'A value no one takes keeps circulating, so the loop shows unclaimed work.',
      'Use this only when the program really mixes kinds on one channel. Otherwise give each kind its own belt.',
    ],
    example() {
      const loop = [[2.5, 1.5], [13.5, 1.5], [13.5, 7.5], [2.5, 7.5]];
      const objects = [
        station('camera', 'assembling-machine-2', 5.5, 3.5, { label: 'Video', labelX: 5.5, labelY: 6.1 }),
        station('mic', 'assembling-machine-1', 9.5, 4.5, { label: 'Audio', labelX: 11.9, labelY: 6.1 }),
        station('player', 'assembling-machine-3', 6.5, 10.5), station('mixer', 'assembling-machine-2', 10.5, 10.5),
      ];
      const arms = [arm('frames-out', [3.5, 3.5], 'west'), arm('samples-out', [9.5, 2.5], 'north'),
        arm('frames-in', [6.5, 8.5], 'south', 'fast-inserter'), arm('samples-in', [10.5, 8.5], 'south', 'fast-inserter')];
      const [framesOut, samplesOut, framesIn, samplesIn] = arms;
      return {
        width: 15, height: 12, objects, arms, working: ['camera', 'mic', 'player', 'mixer'], beltTiles: belt(loop, { loop: true }),
        notes: [{ text: 'frames only', x: 4.3, y: 8.6 }, { text: 'samples only', x: 12.7, y: 8.6 }],
        flows: [
          { icon: 'item-copper-plate', every: 3000, legs: [{ wait: 1200, at: 'camera' }, { arm: framesOut.id },
            { path: [framesOut.drop, ...lanePath([[2.5, 3.5], [2.5, 1.5], [13.5, 1.5], [13.5, 7.5], [6.5, 7.5]], -1).slice(1), framesIn.pickup] }, { arm: framesIn.id }, { wait: 1500, at: 'player' }] },
          { icon: 'item-copper-ore', every: 3000, offset: 1500, legs: [{ wait: 1200, at: 'mic' }, { arm: samplesOut.id },
            { path: [samplesOut.drop, ...lanePath([[9.5, 1.5], [13.5, 1.5], [13.5, 7.5], [10.5, 7.5]], -1).slice(1), samplesIn.pickup] }, { arm: samplesIn.id }, { wait: 1500, at: 'mixer' }] },
        ],
      };
    },
  },
  {
    id: 'backpressure',
    name: 'Backpressure',
    family: 'Belts',
    seen: ['main base', 'main bus base'],
    shows: 'A full belt stops the producer: the queue grows back from the slow consumer until the producer waits with its hand full.',
    use: 'A bounded queue with blocking sends; TCP flow control; a stream whose slow reader throttles the writer.',
    terms: ['backpressure', 'queue', 'buffer', 'stream'],
    rules: [
      'Values on a full belt sit nose to tail, four to a tile on a lane, and move only when the front one is taken.',
      'The producer’s inserter waits over the belt with a closed hand until a slot opens. It never drops the value elsewhere.',
      'The consumer’s rate sets the pace for everything upstream. Show both rates.',
    ],
    example() {
      const P = 2500, slots = 24, slot = k => [10.5 - .25 * k, 3.7];
      const objects = [
        station('producer', 'assembling-machine-2', 1.5, 3.5, { label: 'Producer', labelY: 1.2 }),
        station('consumer', 'assembling-machine-2', 13.5, 3.5, { label: 'Consumer', labelY: 1.2 }),
      ];
      const push = arm('push', [3.5, 3.5], 'east'), take = arm('take', [11.5, 3.5], 'east');
      const steps = [];
      for (let k = slots - 1; k > 0; k--) steps.push({ path: [slot(k), slot(k - 1)] }, { stay: slot(k - 1), wait: k === 1 ? P - 283 : P - 133 });
      return {
        width: 15, height: 6, objects, arms: [push, take], working: ['consumer'], beltTiles: belt([[4.5, 3.5], [10.5, 3.5]]),
        notes: [{ text: 'can make 1 per 1.2 s', x: 3.4, y: 5.4 }, { text: 'takes 1 per 2.5 s', x: 12.6, y: 5.4 }],
        flows: [{ icon: 'item-iron-gear-wheel', every: P, legs: [
          { arm: 'push', hold: P - 2 * 595 }, { path: [push.drop, slot(slots - 1)] }, { stay: slot(slots - 1), wait: P - 533 },
          ...steps, { path: [slot(0), take.pickup] }, { arm: 'take' }, { wait: 1300, at: 'consumer' }] }],
      };
    },
  },
  {
    id: 'balancer',
    name: 'Balancer',
    family: 'Belts',
    seen: ['centrifuge block', 'main base'],
    shows: 'Two uneven streams go through one splitter and leave as two even streams.',
    use: 'Rebalancing partitions across consumers; spreading a hot shard; evening load between two replicas.',
    terms: ['load balancer', 'shard', 'partition', 'fan-in'],
    rules: [
      'Both inputs enter the back of the splitter. Each output gets every other value, whichever input it came from.',
      'Write the rate on each input and each output, so the evening is visible.',
      'A value keeps its lane through the splitter.',
    ],
    example() {
      const inputs = [{ centers: [[.5, 2.5], [4.5, 2.5], [4.5, 3.5], [5.5, 3.5]], y: 3.5, every: 600, count: 8, icon: 'item-iron-plate' },
        { centers: [[.5, 5.5], [4.5, 5.5], [4.5, 4.5], [5.5, 4.5]], y: 4.5, every: 2400, count: 2, icon: 'item-iron-plate', shift: 300 }];
      const outputs = [{ centers: [[7.5, 3.5], [8.5, 3.5], [8.5, 2.5], [13, 2.5]], y: 3.5 }, { centers: [[7.5, 4.5], [8.5, 4.5], [8.5, 5.5], [13, 5.5]], y: 4.5 }];
      const speed = 1.875 / 1000, length = path => path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);
      const items = inputs.flatMap(input => Array.from({ length: input.count }, (_, n) => {
        const lead = [...lanePath([...input.centers.slice(0, -1), [6.2, input.y]], 1)];
        return { input, offset: (input.shift ?? 0) + n * input.every, lead, arrive: (input.shift ?? 0) + n * input.every + length(lead) / speed };
      })).sort((a, b) => a.arrive - b.arrive);
      const flows = items.map((item, i) => {
        const out = outputs[i % 2], tail = lanePath([[6.8, out.y], ...out.centers], 1);
        return { icon: item.input.icon, every: 4800, offset: item.offset, legs: [{ path: [...item.lead, ...tail] }] };
      });
      return {
        width: 13, height: 7, objects: [], arms: [], flows,
        notes: [{ text: '8 per cycle', x: 2.4, y: 1.7 }, { text: '2 per cycle', x: 2.4, y: 6.6 }, { text: '5 per cycle', x: 11, y: 1.7 }, { text: '5 per cycle', x: 11, y: 6.6 }],
        beltTiles: [...belt(inputs[0].centers), ...belt(inputs[1].centers), splitter(6.5, 4, 'east'),
          ...belt(outputs[0].centers.map(p => p[0] === 13 ? [12.5, p[1]] : p)), ...belt(outputs[1].centers.map(p => p[0] === 13 ? [12.5, p[1]] : p))],
      };
    },
  },
];
