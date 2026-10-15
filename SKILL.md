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

Requires Node.js 20.10+, a browser, and Factorio artwork imported from the user's
own copy of Factorio 2.0 with Space Age. The repository ships the library's
manifest and catalog but no game art. If `assets/` holds no PNG files, stop and
ask the user to import it as the README's Game assets section describes. Never
download Factorio art from anywhere else.

The repository follows Anatomy’s useful separation: instructions here, reusable
code in `kit/`, complete examples in `examples/`, focused guidance in `references/`,
and deterministic preparation/checking tools in `scripts/`.

## Start from the program

Read the relevant code or algorithm. Identify its input, transformations, branches,
stored state, and observable result. Choose a small example that exercises the
interesting behavior. Do not imply that visual concurrency or physical distances
measure program timing unless the data supports that.

## Match the system's real scope

A request to explain a system covers the whole system, not one path through it.
"How does OBS work" means sources, compositing, audio mixing, encoders and every
output. One frame on one belt is not enough. Before you arrange anything, write an
architecture inventory from the code. Give a file reference for each item:

- threads and processes, and what each one runs on its own clock
- queues, caches and buffers, with their bounds
- each kind of data that moves (video frames, audio chunks, packets, requests)
- fan-out and fan-in: one producer feeding several consumers, or one stage that
  joins several inputs
- every rule that drops, repeats, reorders, blocks or retries data

Draw every component that a regular user or contributor would name when they
describe the system. Independent threads become parallel lanes that run at the
same time. They do not become stages of one line. Use a single line only when the
program really is one path. Smaller examples are fine for data values, frame
counts or time scale. They are not fine for structure.

Record omissions in the figure's reference table, each with a reason. A core data
path is never an omission: no audio in a media pipeline, no writes in a database,
no second output when the system feeds several. Before you build, ask what an
expert in the system would say is missing. Add it, or record why it is out of
scope. Scale time when you must, but keep the real ratios between rates, and
state the scale.

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
A figure is a folder under `examples/` with an `index.html`, modules that import
the kit from `../../kit/`, and an `assets.json` that lists the sprite IDs it draws
as `{ "ids": [...] }`. Vite picks up every such folder as a page. The sidebar at
`https://factory.localhost` lists it by its `<title>`, after `Factory ·`, with the
icon of the object that `"icon"` in `assets.json` names.
`kit/trace.mjs` provides deterministic playback and stepping. `kit/sprites.mjs`
draws supported native sprite layers; `kit/scene.mjs` provides tile coordinates,
belts, objects, moving value tokens, and machine activity. `kit/transport.mjs`
places adjacent inserters and supplies pickup, carry, release, and return poses. See
[references/kit.md](references/kit.md) before extending their interfaces.

Choose from the library before inventing an asset selector. Read
[references/catalog.md](references/catalog.md), search `vp run objects cache`,
and inspect `assets/catalog.json` for stable IDs, roles, footprints, variants, and
rendering limits. It contains 68 world objects and 28 item tokens. Use different
objects when their roles help explain the program, not just to decorate it.

Every object carries terms from the shared vocabulary in `catalog/vocabulary.mjs`,
such as `load balancer`, `write-ahead log` or `dead letter`; search them with
`vp run objects <term>`. Each item token has one fixed meaning, listed in the same
file and as `meaning` in `catalog.json`: an iron plate is always a record, copper
cable a packet, an electronic circuit a request. Carry each kind of data on the
token with that meaning, and never give a token another meaning.

Load only the IDs a scene uses. To expand the library, `vp run assets` reads the
game's `data/` folder and its `--dump-data` and `--dump-icon-sprites` output.
Read [references/assets.md](references/assets.md) for locations, coverage and
limitations. The game data is the source of truth for dimensions, offsets,
directions, and frame counts. Do not guess crops or substitute item icons for
world entities without making that visual choice explicit.

Every command runs through Vite+. From the skill directory, after `vp install`:

```sh
vp run dev
```

It serves every figure with live reload at `https://factory.localhost`, through
Portless, which needs Node.js 24. The home page is a sidebar of every figure. Open
`https://factory.localhost/#<figure>` in the user’s external browser to show one
in it; `/<figure>/` shows the figure alone, and the object browser is `#catalog`.
Without Portless, `vp dev` serves the same pages on localhost. `vp build` writes a
static site to `dist/` with only the sprites each page lists, and `vp preview`
serves it on port 4173. `vp run assets` regenerates the library from the user's
game files, and `vp test` runs the tests. Generated output is ignored by Git.

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

Start the page with the scene's workbench. Put no masthead, wordmark, edition
label, eyebrow, or headline above it. The workbench header names what the figure
explains, with a one-line description, never playback status or event counts. Keep
labels close to their stations. Label conventions where they appear in the diagram:
a wire's meaning beside the wire, a flag beside the station that sets it. Use one
word for one action everywhere: if three consumers read a table, all three wires
say READS. Reveal a failure, rejection, cache miss, or bottleneck through behavior
as well as color. Let the reader pause, step, and reset. If the reader can change an
input, such as a scenario, put that control in the one row of controls, without
helper text.
Keep keyboard controls scoped to the figure and ignore typing in form fields.

Below the scene, keep only one row of controls. Do not add narration or status
lines, legends, phase tabs, a code listing, a live-state panel, or a footer of
notes, disclaimers or links anywhere on the page. The scene and its
readouts carry the state. Announce completed events in a visually hidden live region,
and show load errors visibly. When the program runs in phases, list the phase
headings top-down in a narrow sidebar on the left of the scene with
`kit/process.mjs`. Use headings only. Give the active heading a lighter background
and the amber rule, mark earlier headings done, and let a click jump to a phase. On
phones the headings stack above the scene. Run independent work, such as separate
consumers of one table, in parallel lanes: their headings light together, and each
lane finishes on its own. Parallel lanes show independence, not measured timing.

Put reference material below the figure in static tables that do not re-render
during playback: each operation's inputs, rule or curve, and parameters, plus a
worked example computed from the model. Frame each table like the scene: the
same workbench frame and header, with the blueprint floor and its tile grid behind
the cells. Snap rows to whole tiles with `kit/tables.mjs` so the grid lines divide
them, and draw no row borders. Give each table a heading and no description. The
example's Operations table shows the pattern. Start header text, phase headings,
controls, and table text on one left edge.

Write every visible string plainly. Use titles, labels, and table cells. Cut
taglines, explanatory paragraphs, and em dashes.

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

Factorio artwork belongs to Wube Software. Git ignores the imported PNGs in
`assets/`; only `manifest.json`, `catalog.json` and `materials/` are tracked. Never
commit game art or built output. New asset selections belong in
`catalog/objects.mjs`; regenerate their hashes and manifest with `vp run assets`.
A factory should copy only the sprites it uses. This skill does not publish
anything, install unrelated software, or change game files.
