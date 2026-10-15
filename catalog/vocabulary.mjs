export const vocabulary = [
  'stream', 'queue', 'buffer', 'log', 'write-ahead log', 'pipeline', 'backpressure', 'handoff', 'batch',
  'fan-out', 'fan-in', 'router', 'load balancer', 'proxy', 'partition', 'shard', 'filter', 'priority', 'overflow', 'gateway',
  'cache', 'memory', 'database', 'index', 'snapshot', 'checkpoint', 'flush', 'evict', 'replica', 'leader', 'follower',
  'worker', 'worker pool', 'process', 'thread', 'event loop', 'scheduler', 'async task',
  'transform', 'map', 'reduce', 'join', 'sort', 'hash', 'parse', 'encode', 'decode', 'compress',
  'publish', 'subscribe', 'topic', 'producer', 'consumer', 'message bus', 'broadcast',
  'commit', 'transaction', 'lock', 'consensus', 'dependency',
  'retry', 'timeout', 'rate limit', 'validate', 'auth', 'reject', 'dead letter', 'garbage collection', 'compaction', 'drop',
  'monitor', 'health check', 'heartbeat', 'metric', 'alert', 'error',
  'cpu', 'gpu', 'compute budget', 'timer', 'config', 'ingest', 'poll', 'network', 'adapter',
];

const chest = ['buffer', 'queue', 'cache', 'memory'];
const inserter = ['handoff', 'commit', 'event loop', 'worker'];
const belt = ['stream', 'queue', 'log', 'write-ahead log', 'pipeline', 'backpressure'];
const splitter = ['load balancer', 'router', 'fan-out', 'fan-in', 'shard', 'partition', 'filter', 'priority'];
const underground = ['proxy', 'network', 'stream', 'pipeline'];
const assembler = ['worker', 'process', 'thread', 'transform', 'join', 'transaction'];
const furnace = ['worker', 'process', 'transform', 'encode'];
const lab = ['consumer', 'validate', 'metric', 'worker'];
const pole = ['dependency', 'message bus', 'network', 'broadcast'];
const engine = ['producer', 'cpu', 'compute budget', 'worker'];
const exchanger = ['adapter', 'encode', 'transform', 'producer'];
const tiers = (names, terms) => Object.fromEntries(names.map(name => [name, terms]));

export const tags = {
  ...tiers(['wooden-chest', 'iron-chest'], chest),
  'steel-chest': [...chest, 'database'],
  'passive-provider-chest': ['publish', 'producer', 'topic', 'leader'],
  'active-provider-chest': ['publish', 'producer', 'flush', 'evict', 'overflow', 'checkpoint'],
  'storage-chest': ['database', 'index', 'cache', 'memory'],
  'buffer-chest': ['buffer', 'cache', 'replica', 'follower'],
  'requester-chest': ['subscribe', 'consumer', 'queue', 'buffer'],
  ...tiers(['inserter', 'fast-inserter', 'long-handed-inserter'], inserter),
  'burner-inserter': [...inserter, 'compute budget'],
  ...tiers(['bulk-inserter', 'stack-inserter'], ['handoff', 'commit', 'batch', 'worker']),
  ...tiers(['transport-belt', 'fast-transport-belt', 'express-transport-belt', 'turbo-transport-belt'], belt),
  ...tiers(['splitter', 'fast-splitter', 'express-splitter', 'turbo-splitter'], splitter),
  ...tiers(['underground-belt', 'fast-underground-belt', 'express-underground-belt', 'turbo-underground-belt'], underground),
  ...tiers(['assembling-machine-1', 'assembling-machine-2', 'assembling-machine-3'], assembler),
  'chemical-plant': ['worker', 'transform', 'join', 'encode', 'pipeline'],
  'oil-refinery': ['worker', 'transform', 'fan-out', 'parse', 'decode', 'pipeline'],
  'centrifuge': ['worker', 'partition', 'sort', 'hash', 'filter'],
  'foundry': ['worker', 'batch', 'gpu', 'transform'],
  'biochamber': ['worker', 'transform', 'timeout', 'batch'],
  'cryogenic-plant': ['worker', 'transform', 'compress', 'snapshot'],
  'crusher': ['worker', 'parse', 'decode', 'fan-out'],
  ...tiers(['stone-furnace', 'steel-furnace', 'electric-furnace'], furnace),
  'recycler': ['garbage collection', 'compaction', 'dead letter', 'drop', 'decode'],
  'burner-mining-drill': ['producer', 'ingest', 'stream', 'compute budget'],
  'pumpjack': ['producer', 'ingest', 'poll', 'stream'],
  ...tiers(['lab', 'biolab'], lab),
  ...tiers(['small-electric-pole', 'medium-electric-pole', 'big-electric-pole', 'substation'], pole),
  'solar-panel': ['producer', 'compute budget', 'cpu', 'timer'],
  'accumulator': ['rate limit', 'buffer', 'compute budget', 'memory'],
  ...tiers(['steam-engine', 'steam-turbine'], engine),
  'nuclear-reactor': ['producer', 'cpu', 'gpu', 'compute budget'],
  'heating-tower': ['heartbeat', 'health check', 'producer', 'compute budget'],
  ...tiers(['boiler', 'heat-exchanger'], exchanger),
  'storage-tank': ['buffer', 'memory', 'reduce', 'cache'],
  'pipe': ['stream', 'network', 'pipeline', 'backpressure'],
  'pump': ['backpressure', 'rate limit', 'gateway', 'pipeline'],
  'arithmetic-combinator': ['map', 'reduce', 'transform', 'hash', 'timer'],
  'decider-combinator': ['filter', 'validate', 'auth', 'reject', 'rate limit', 'consensus', 'lock'],
  'selector-combinator': ['router', 'sort', 'priority', 'index', 'filter'],
  'constant-combinator': ['config', 'producer', 'broadcast', 'memory'],
  'small-lamp': ['alert', 'health check', 'monitor', 'error', 'metric'],
  'radar': ['monitor', 'heartbeat', 'health check', 'metric', 'broadcast'],
  'logistic-robot': ['async task', 'message bus', 'publish', 'subscribe'],
  'construction-robot': ['async task', 'worker', 'retry', 'garbage collection'],
  'roboport': ['scheduler', 'worker pool', 'queue', 'network'],
};

export const meanings = {
  'iron-ore': 'raw bytes', 'copper-ore': 'sample', 'coal': 'message', 'stone': 'file', 'uranium-ore': 'secret',
  'iron-plate': 'record', 'copper-plate': 'frame', 'steel-plate': 'batch',
  'iron-gear-wheel': 'job', 'copper-cable': 'packet', 'electronic-circuit': 'request', 'advanced-circuit': 'delta',
  'processing-unit': 'response', 'battery': 'credit', 'engine-unit': 'command', 'electric-engine-unit': 'transaction',
  'plastic-bar': 'key', 'sulfur': 'error', 'low-density-structure': 'snapshot', 'rocket-fuel': 'lock',
  'automation-science-pack': 'event', 'logistic-science-pack': 'ack', 'chemical-science-pack': 'log entry',
  'production-science-pack': 'metric', 'utility-science-pack': 'alert', 'space-science-pack': 'heartbeat',
  'speed-module': 'config', 'productivity-module': 'feature flag',
};
