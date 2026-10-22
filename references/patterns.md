# Factory patterns

A factory pattern is an arrangement that Factorio players build again and again,
with one fixed software meaning. A worker row is a worker pool. A splitter fan-out
is a load balancer. Backpressure is a full belt that stops its producer. Build a
figure from patterns, and a reader who knows one figure can read the next.

Patterns live in `patterns/`, next to the object library in `catalog/`:

| File | Holds |
|---|---|
| `rules.mjs` | The ground rules every scene obeys, and `checkLayout`, which checks them |
| `build.mjs` | Builders for the parts: stations, inserters, belts with corners, splitters, undergrounds, lanes, pipes, wires |
| `handoffs.mjs`, `belts.mjs`, `cells.mjs`, `fluids.mjs`, `layout.mjs`, `control.mjs` | The patterns, by family, each with a standard example |
| `motion.mjs` | Runs the standard examples, and `checkMotion`, which checks their movement |
| `index.mjs` | The registry, the families, the sources and `findPatterns` |

The gallery at `https://factory.localhost:1355/#patterns` runs every standard example
beside its rules. `vp run patterns <term>` searches the patterns by name or
vocabulary term and prints their rules; `vp run patterns --rules` prints the
ground rules.

## Choose patterns

1. Write the architecture inventory that `SKILL.md` asks for.
2. For each item, find the pattern whose meaning matches what the code does, not
   what the item is called. A queue between two threads is a belt handoff or a
   buffer chest. A retry is a loop or recirculation. A rate limit is a pump gate or
   a circuit limit. Search the vocabulary term: `vp run patterns retry`.
3. Lay out the major parts with `districts`, then place each part's patterns inside
   its area, then route the belts between them.
4. Keep each pattern's rules. A pattern changes size and count with the program,
   never its arrangement.
5. When no pattern fits, build from the ground rules and say so in the plan. If the
   arrangement recurs, add it to the library.

Use a belt for values that have identity, such as requests, frames and records. Use
a pipe for a quantity that has none, such as bytes, bandwidth or budget. Use poles
for a dependency that is drawn on but never handed over.

## Ground rules

Every scene obeys these, whatever its patterns. `checkLayout(layout)` returns each
broken rule with a message; add it to the figure's tests and expect an empty list.

| Rule | Statement | Check |
|---|---|---|
| `whole-tiles` | Every building, belt and inserter sits on whole tiles of the grid. | `checkLayout` |
| `one-per-tile` | No two buildings, belts, pipes or inserters share a tile, and nothing leaves the floor. | `checkLayout` |
| `inserter-reach` | An inserter takes from the tile behind it and drops on the tile in front. A long-handed inserter reaches two tiles. An inserter drops onto the far lane of a belt. | `checkLayout` |
| `inserter-ends` | Each inserter takes from a belt or an inventory and drops onto a belt or into an inventory. | `checkLayout` |
| `belt-continuity` | A belt never runs into a building. It starts where something feeds it and ends where an inserter takes from it, at a side-load, a splitter, an underground, or the floor edge. | `checkLayout` |
| `underground-pairs` | An underground entrance has an exit on the same line, in the same direction, within its reach. | `checkLayout` |
| `pipes-connect` | Every pipe opening meets another pipe or a fluid port. Two pipes never touch unless they join. | `checkLayout` |
| `drill-drops` | A mining drill drops straight onto the belt or into the inventory in front of it. | `checkLayout` |
| `areas` | Each major part has its own dotted area. A station sits wholly inside one area; areas keep half a tile apart. | `checkLayout` |
| `powered` | When a scene draws poles, every powered machine and inserter stands in a supply area, and copper wires join the poles. | `checkLayout` |
| `one-kind-per-lane` | A belt lane or a pipe carries one kind of data, on its fixed item token. | Review |
| `edge-is-outside` | A belt, pipe or wire that leaves the floor edge goes to something outside the figure. Label what it reaches. | Review |

The rules read hand-built layouts too: undergrounds, splitters and pipes are
recognized by sprite and variant. Positions, reaches, fluid ports, wire anchors,
footprints and speeds come from the game data, not from estimates.

## Patterns

### Handoffs

| Pattern | Shows | Use for |
|---|---|---|
| `belt-handoff` | An asynchronous handoff: the producer drops a value on a stream and moves on. | A request queued for a worker; a job written to a log and read later. |
| `direct-insertion` | A synchronous call: one stage hands its result straight to the next, with no queue between. | A function call chain; a parser that feeds an executor in the same thread. |
| `long-reach` | A worker reads a second input from a farther stream without merging the two. | Jobs on one stream and credits or config on another. |
| `buffer-chest` | A bounded queue between two stages that run at different rates. | A ring buffer between a capture thread and an encoder. |
| `shared-store` | One store that several stages write and several stages read. | A database shared by services; state behind a lock. |
| `batch-loader` | Values collect until a batch is full, then move together in one swing. | Group commits; bulk inserts; a producer that flushes every N messages. |

### Belts

| Pattern | Shows | Use for |
|---|---|---|
| `side-load` | Two streams merge into one and keep apart: each source fills its own lane. | Video and audio packets in one output queue. |
| `splitter-fan-out` | A load balancer: one stream alternates between two consumers. | Round-robin across two replicas. |
| `splitter-ladder` | One trunk feeds several worker rows; a splitter at each row peels off its share. | Partitioned consumers; a dispatcher feeding several pools. |
| `belt-loop` | Values circulate until a consumer takes them. | A retry ring; offers that workers claim when free. |
| `underpass` | Two streams cross without touching. | Independent pipelines that share a floor. |
| `belt-bundle` | Several streams between the same two parts run side by side and turn together. | Channels multiplexed over one connection. |
| `overflow` | What the consumer cannot take runs on into a dead letter chest. | A dead letter queue; load shedding. |
| `mixed-loop` | Several kinds share one loop; each consumer takes only its kind. | One topic that carries several message types. |
| `backpressure` | A full belt stops the producer, which waits with its hand full. | Blocking sends; TCP flow control. |
| `balancer` | Two uneven streams leave one splitter as two even streams. | Rebalancing partitions; spreading a hot shard. |

### Cells

| Pattern | Shows | Use for |
|---|---|---|
| `worker-row` | Identical workers take from one input stream and put results on one output stream. | Competing consumers; a thread pool. |
| `mirrored-rows` | Two worker pools face one shared stream. | Two consumer groups on one topic. |
| `fishbone` | Stubs from workers on both sides join one spine, each side on its own lane. | A fan-in aggregator. |
| `daisy-chain` | Each node passes what it does not keep to the next node, with no belt between. | Chain replication; middleware chains. |
| `drill-field` | Many producers write into shared streams that merge into one trunk. | Log collectors on many hosts; sharded ingest. |
| `stage-rows` | A two-stage pipeline of pools whose machine counts show the ratio of their rates. | Parse then execute; decode then render. |
| `recirculation` | Part of a machine's output goes back to its own input for another pass. | A retry through the same worker; compaction. |
| `mall` | Different machines draw on the same inputs and fill their own stores. | Small services that build different products from the same data. |

### Fluids

| Pattern | Shows | Use for |
|---|---|---|
| `pipe-header` | Every worker taps one supply line; when it runs short, the far end starves first. | Bandwidth on a shared link; a shared quota. |
| `tank-buffer` | Bursts fill a tank and a steady consumer drains it. | A socket buffer; a jitter buffer. |
| `pump-gate` | A pump caps the flow out of one part; the upstream tank absorbs bursts. | A traffic shaper; a token bucket at an API edge. |
| `cascade` | When a tier fills past its mark, a converter turns the surplus into the next tier. | Metric rollups; cache tiers; log retention. |

### Layout

| Pattern | Shows | Use for |
|---|---|---|
| `main-bus` | Parallel belts, one per kind, with blocks that tap what they need. | An event bus with one topic per belt. |
| `districts` | Each major part is its own area; streams cross the edges between them. | A frontend, a worker and a database; an outside API. |
| `spine` | One narrow hull: intake at the front, stages in order, power aboard. | An edge device; a sidecar; a single deployable. |

### Control

| Pattern | Shows | Use for |
|---|---|---|
| `power-grid` | Every machine draws from one network; when it fails, everything stops. | A platform every service needs to run at all. |
| `solar-field` | Identical replicas with no transport between them add to one capacity. | Nodes in a cluster; reserved capacity. |
| `circuit-limit` | A wire from a chest enables its producer only below a limit. | Kanban; a prefetcher with a high-water mark. |
| `robot-network` | Carriers from a shared pool deliver each value to whichever requester asks. | A scheduler dispatching tasks; a broker. |
| `status-lamps` | A lamp wired to each station lights when the station stalls. | Health checks; alerts on a full queue. |

## Build with the builders

Start from the pattern's `example()`: it returns a complete layout with `objects`,
`beltTiles`, `arms`, `wires`, `areas` and `notes` that `FactoryScene.render` draws.
Move and resize it, then check it.

- `station(id, sprite, x, y, extra)` places a building by its center. `footprint`
  and `cells` give its tiles; `TILES` lists them, rotated for east and west variants.
- `arm(id, pivot, facing, sprite)` places an inserter with the game's reach: pickup
  one tile behind, drop 1.2 tiles ahead (two and 2.2 for long-handed).
- `belt(points, { loop, under, sprite })` lays a belt along an axis-aligned path,
  picks every corner sprite, and swaps `under` spans for underground pairs.
- `splitter(x, y, facing)` places a splitter by its center, between its two lanes.
- `lanePath(points, side)` and `ride(drop, centers, pickup)` give the path a value
  takes along a lane, for animation.
- `pipes(points, { objects, open })` picks each pipe's shape from its neighbors and
  the fluid ports of `objects`; `fluidPorts(object)` lists those ports.
- `poleWire(a, b)` and `circuitWire(a, b, color)` hang copper, red and green wires
  from the game's connection points. `drillDrop(drill)` is where a drill drops.

Figures keep their own pure model and `TracePlayer`, as `SKILL.md` describes. The
`flows` of a standard example are a looping illustration for the gallery: legs of
`arm` (with an optional `hold`), `path`, `stay`, `wait` with `at`, `store` and `fly`.
`checkMotion` rejects an inserter that carries two values or swings before it
returns, and two values on one spot of a belt.

## Sources

The patterns came from seven screenshots of working factories:

| Source | What it showed |
|---|---|
| Main base | A solar field, a drill field, a train station, belts bundled around machine blocks, roboports |
| Assembly blocks | Assembler columns facing shared belts, near and far inserters, lamps between machines |
| Main bus base | A main bus with smelter lines, lab columns and blocks that tap off it |
| Oil refinery | Mirrored refinery rows, one color per fluid, header pipes, pumps and cracking |
| Space platform | A narrow hull with collectors in front, a hub, a loop belt and lamps at each section |
| Centrifuge block | Two rows of centrifuges around a shared belt, a splitter ladder and a return loop |
| Furnace column | Mirrored furnaces, ore and fuel belts wrapped around them, a fishbone spine |

## Add a pattern

1. Add an entry to its family's file with `id`, `name`, `family`, `seen`, `shows`,
   `use`, `terms` from `catalog/vocabulary.mjs`, `rules`, and `example()`.
2. Build the example from `build.mjs`. Use only item tokens whose fixed meaning fits.
3. Run `vp test`: the example must pass `checkLayout` and `checkMotion`.
4. Run `vp run patterns --assets` to update the gallery's sprite list, open the
   gallery, and read the screenshots from `vp run verify-patterns`.
5. Add a row to the family's table above.
