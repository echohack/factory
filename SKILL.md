---
name: factory
description: Build interactive visualizations of programs, algorithms, and software systems using Factorio objects and locally imported game artwork. Use when the user asks for a Factorio-style explainer or invokes /factory; map execution state to belts, inserters, machines, items, buffers, and circuits.
metadata:
  opencode/slash: "true"
---

# Factory

Explain a program as a working factory. Moving items are values, machine cycles are
operations, and accumulating stock is program state. The mechanism should make the
program understandable before the reader studies its labels.

Requires Node.js 20.10+, a browser, and the local Factorio asset archive. No game
artwork ships in this repository.

The repository follows Anatomy’s useful separation: instructions here, reusable
code in `kit/`, complete examples in `examples/`, focused guidance in `references/`,
and deterministic preparation/checking tools in `scripts/`.

## Start from the program

Read the relevant code or algorithm. Identify its input, transformations, branches,
stored state, and observable result. Choose a small example that exercises the
interesting behavior. State whether the illustration uses an actual execution
trace or an explicitly modeled explanation. Do not imply that visual concurrency
or physical distances measure program timing unless the data supports that.

Write the semantic mapping before arranging objects. Use
[references/programs.md](references/programs.md) for mapping choices. A belt is a
stream, an inserter is a discrete handoff, a chest is stored state, an assembler is work, and a splitter
can represent a branch. A cache needs hit/miss behavior; a queue needs ordering.
The name of the prop alone is not the explanation.

Keep the model pure and independently executable. Compute displayed values,
counters, highlighting, and machine activity from that model. Animation may
interpolate between events, but it must not invent work, lose values, or change
the answer. A stopped machine is visually stopped.

## Build from the kit

Inspect `examples/array-pipeline/model.mjs`, `app.mjs`, and `assets.json` for a
complete small figure. Its filter/map/reduce trace matches JavaScript’s eager
array evaluation: all filtering happens before mapping, then reduction. Do not
silently draw it as a fused streaming pipeline.

Use the example as a starting point, not a required subject or fixed layout.
`kit/trace.mjs` provides deterministic playback and stepping. `kit/sprites.mjs`
draws supported native sprite layers; `kit/scene.mjs` provides tile coordinates,
belts, objects, moving value tokens, and machine activity. `kit/transport.mjs`
places adjacent inserters and supplies pickup, carry, release, and return poses. See
[references/kit.md](references/kit.md) before extending their interfaces.

Import only the needed art. The local archive defaults to
`/path/to/factorio-data`; override with `FACTORIO_ARCHIVE` or
`--archive`. Read [references/assets.md](references/assets.md) for coverage and
limitations. The game archive is the source of truth for dimensions, offsets,
directions, and frame counts. Do not guess crops or substitute item icons for
world entities without making that visual choice explicit.

From the skill directory:

```sh
node scripts/import-assets.mjs --spec examples/array-pipeline/assets.json --out .local/assets
node examples/array-pipeline/build.mjs
node scripts/serve.mjs --root dist --port 4173
```

Open the printed URL in the user’s external browser. These commands need no npm
installation. The build writes a local static site with copied modules and art;
the imported cache and generated output are ignored by Git.

## Make the mechanism legible

Use Factorio’s native tile plane and fixed sprite perspective. Do not apply an
additional isometric transform. Preserve contact points and anchors, draw shadows
behind objects, and keep values visibly associated with their current owner.
Chests and assemblers require inserters: leave an inserter tile between the
building footprint and the belt. Each belt connection has an output inserter and
an input inserter. Never draw a belt under a chest or through an assembler to imply
item transfer. Direct insertion between buildings is also possible when an
inserter's pickup and drop tiles reach both inventories.

Read [references/inserters.md](references/inserters.md) before wiring a scene.
Show pickup, a closed hand carrying the item, release, and an empty return.
The item follows the hand while held, occupies a real belt lane while travelling,
and enters the destination inventory only at release. Include hand contents in
conservation checks; never count a value in both a chest and an inserter.
Start machine work after its input arrives. Pause freezes the arms as well as belts.

Useful detail includes real machinery, connections,
status lamps, and stock; decorative machinery should not imply nonexistent work.

Give the figure a short title, one useful instruction, the relevant code or
pseudocode, and a live readout. Keep labels close to their stations. Reveal a
failure, rejection, cache miss, or bottleneck through behavior as well as color.
Let the reader pause, step, reset, and change a meaningful input. Keep keyboard
controls scoped to the figure and ignore typing in form fields.

Use the chosen midnight blueprint treatment: near-black navy framing, a deep blue
floor, restrained Campfire fuzz and grain, a quiet blue tile grid, soft white station
labels, dark steel-blue controls, amber activity, and narrow checker gutters. Keep this section the visual focus. Read
[references/design.md](references/design.md) for the material recipe and provenance.
Preserve the grid and labels when improving machinery or layout.

Fit the scene at narrow widths; reflow its stations when simply shrinking would
make values unreadable. Supply a DOM/text equivalent of the important state.
Reduced motion should start paused and allow event-by-event inspection. Suspend
automatic work while hidden or offscreen, without a catch-up jump on return.

## Verify the explanation

Follow [references/verification.md](references/verification.md). Run the model’s
meaningful checks, import the actual assets, and open the finished figure. Inspect
desktop and phone layouts, a branch outcome, an operation in progress, the final
result, and reduced motion. Check that pause really freezes machinery and that
reset clears both the simulation and readouts.

When refining, remove superseded directions. Keep only the chosen implementation
and a baseline if comparison remains useful. Deliver the working figure and
briefly state what it explains and any material limits.

## Asset boundary

Keep original Factorio art out of source control. Build from the user’s local
archive and copy only selected files into local output. Public distribution of
game artwork is a separate decision; see `references/assets.md`. The skill does
not itself request publishing, installing unrelated dependencies, or changing
game files.
