# Object library

The reusable selection lives in `catalog/objects.mjs`, and its terms and item
meanings in `catalog/vocabulary.mjs`. The generated `assets/catalog.json` lists
IDs, role terms, footprints, source prototype, native variants, frame counts and
rendering limitations, in Factorio's crafting-menu order within each collection. The actual layers and
files are in `assets/manifest.json`. These are world entities, not enlarged icons.

Run `vp run objects cache` (or `worker`, `predicate`, `Power`, etc.) to find a
part. Run `vp run dev`, then open `/catalog/` at `https://factory.localhost`
to inspect the 68 world objects and 28 item tokens. The browser has search,
category filters, direction/state selectors and optional animation previews.

| Collection | Useful choices | Terms |
|---|---|---|
| Storage | Wood, iron, steel, five logistic chests | buffer, queue, cache, database, publish, subscribe, leader, replica, follower, flush, evict |
| Inserters | Burner, standard, long-handed, fast, bulk, stack | handoff, commit, event loop, batch |
| Logistics | Four tiers of belts, underground belts and splitters | stream, log, write-ahead log, backpressure, load balancer, router, fan-out, fan-in, shard, proxy |
| Production | Drills, furnaces, foundry, recycler, biochamber, assemblers, refinery, chemical plant, centrifuge, cryogenic plant, labs, crusher | worker, process, thread, transform, join, parse, encode, decode, snapshot, garbage collection, dead letter, ingest, validate |
| Power | Poles, substation, boiler, engines, solar panel, accumulator, reactor, heat exchanger, turbine, heating tower | dependency, message bus, broadcast, compute budget, cpu, gpu, rate limit, heartbeat, adapter |
| Fluids | Tank, pipe in 15 shapes, pump | buffer, stream, backpressure, rate limit, gateway |
| Circuits | Lamp, arithmetic, decider, selector and constant combinators, radar | map, reduce, filter, auth, reject, consensus, lock, sort, index, config, monitor, health check, alert |
| Robotics | Logistic robot, construction robot, roboport | async task, message bus, retry, scheduler, worker pool |
| Items | Ores, plates, intermediates, science packs, modules | One fixed meaning each; see below |

## Vocabulary

Every object carries four to eight of the 85 terms in `catalog/vocabulary.mjs`.
Tests keep every term attached to at least one object and every object inside the
vocabulary. To add a term, tag an object with it in the same change, then run
`vp run assets` to copy the terms into `catalog.json`.

## Item meanings

Each item token stands for one kind of data in every figure. Carry each kind of
data on its token, and label tokens to tell items of the same kind apart.

| Item | Meaning | Item | Meaning |
|---|---|---|---|
| `coal` | message | `copper-cable` | packet |
| `stone` | file | `electronic-circuit` | request |
| `iron-ore` | raw bytes | `advanced-circuit` | delta |
| `copper-ore` | sample | `processing-unit` | response |
| `uranium-ore` | secret | `engine-unit` | command |
| `iron-plate` | record | `electric-engine-unit` | transaction |
| `copper-plate` | frame | `low-density-structure` | snapshot |
| `steel-plate` | batch | `rocket-fuel` | lock |
| `plastic-bar` | key | `automation-science-pack` | event |
| `sulfur` | error | `logistic-science-pack` | ack |
| `battery` | credit | `chemical-science-pack` | log entry |
| `iron-gear-wheel` | job | `production-science-pack` | metric |
| `speed-module` | config | `utility-science-pack` | alert |
| `productivity-module` | feature flag | `space-science-pack` | heartbeat |

Use stable IDs directly:

```js
const atlas = await loadSprites('./assets/', {
  ids: ['chemical-plant', 'requester-chest', 'item-electronic-circuit']
});
atlas.draw(ctx, 'chemical-plant', x, y, { tileSize: 32, variant: 'east', frame });
atlas.drawIcon(ctx, 'item-electronic-circuit', tokenX, tokenY, 24);
```

The example's seven original aliases (`filter`, `map`, `belt`, `item`, etc.)
still work. Prefer canonical IDs for new scenes. A page lists its IDs in its
`assets.json`, and `vp build` copies only those, with their variants and all animation pages.

Footprints come from the north-facing prototype selection box. Swap width/height
for rotated rectangular buildings; preserve the actual belt and inserter contact
tiles. The standard transport planner is for adjacent chest/assembler handoffs,
not a generic router for every shape in the catalog. Splitter routing, fluid
connections, robot flight, circuit wires and inventory rules remain model work.

Animation means the selected body has native frames; it does not promise every
in-game effect. Each object's `notes` in `assets/catalog.json` name static bodies
and omitted effects. The electric/big mining drill rigs, electromagnetic plant
state machine, vehicles, rails and creatures are listed under `deferred` in
`assets/catalog.json`, not represented by partial bodies.
Public timing claims still require a real trace; gallery playback is illustrative.

To extend the library, inspect the exact prototype in the data dump, add explicit paths
and role/coverage notes in `catalog/objects.mjs`, regenerate with `vp run assets`,
then run the crop/hash checks and visually inspect all new orientations. Keep
unsupported layers as an explicit limitation or implement their format; never
guess a sheet layout or drop an essential machine part.
