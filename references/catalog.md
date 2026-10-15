# Object library

The reusable selection lives in `catalog/objects.mjs`. Its generated
`assets/catalog.json` lists IDs, program roles, footprints, source prototype,
native variants, frame counts and rendering limitations. The actual layers and
files are in `assets/manifest.json`. These are world entities, not enlarged icons.

Run `vp run objects cache` (or `worker`, `predicate`, `Power`, etc.) to find a
part. Run `vp run dev`, then open `/catalog/` at `https://factory.localhost`
to inspect the 68 world objects and 28 item tokens. The browser has search,
category filters, direction/state selectors and optional animation previews.

| Collection | Useful choices | Program roles |
|---|---|---|
| Storage | Wood, iron, steel, five logistic chests | Queues, caches, inboxes, outboxes, prefetch |
| Inserters | Standard, burner, fast, long-handed, bulk, stack | Discrete ownership transfers |
| Logistics | Four tiers of belts, splitters and underground belts | Streams, branches, joins, crossings |
| Production | Assemblers, chemical plant, refinery, centrifuge, foundry, biochamber, cryogenic plant, crusher, furnaces, recycler, labs, burner drill, pumpjack | Functions, transforms, parsing, validation, cleanup, sources |
| Power | Poles, substation, accumulator, solar panel, engines, turbine, reactors, boiler, heat exchanger | Dependencies, shared budgets, resource supply |
| Fluids | Tank, pump and 15 pipe shapes | Reservoirs, backpressure, flow gates |
| Circuits | Arithmetic, decider, selector, constant combinators, lamp, radar | Arithmetic, predicates, configuration, status, observation |
| Robotics | Logistic robot, construction robot, roboport | Messages, asynchronous tasks, schedulers |
| Items | Plates, ores, gears, circuits, batteries, science packs and modules | Distinct values, payloads, typed messages |

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
in-game effect. Card notes identify static bodies and omitted effects. The
electric/big mining drill rigs, electromagnetic plant state machine, vehicles,
rails and creatures are listed as deferred, not represented by partial bodies.
Public timing claims still require a real trace; gallery playback is illustrative.

To extend the library, inspect the exact prototype in the data dump, add explicit paths
and role/coverage notes in `catalog/objects.mjs`, regenerate with `vp run assets`,
then run the crop/hash checks and visually inspect all new orientations. Keep
unsupported layers as an explicit limitation or implement their format; never
guess a sheet layout or drop an essential machine part.
