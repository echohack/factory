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
code in `kit/`, the object library in `catalog/`, factory patterns in `patterns/`,
complete examples in `examples/`, focused guidance in `references/`, and
deterministic preparation/checking tools in `scripts/`.

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

When the system has several major parts, such as a web frontend, a worker and a
database, or an outside service like GitHub, give each part its own named, dotted
area with the `districts` pattern.

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
The name of the prop alone is not the explanation. Then choose factory patterns
for the arrangement, as the next section describes.

Keep the model pure and independently executable. Compute displayed values,
counters, highlighting, and machine activity from that model. Animation may
interpolate between events, but it must not invent work, lose values, or change
the answer. A stopped machine is visually stopped.

## Build from factory patterns

A factory pattern is an arrangement that Factorio players build again and again,
with one fixed software meaning: a worker row is a worker pool, a splitter fan-out
is a load balancer, backpressure is a full belt that stops its producer. The
library in `patterns/` holds them in six families, with the ground rules every
scene obeys, builders for their parts, and a running standard example of each.
Read [references/patterns.md](references/patterns.md) before you lay out a scene,
search with `vp run patterns <term>`, and open
`https://factory.localhost:1355/#patterns` to watch the examples run.

Pick a pattern for each item of the architecture inventory by what the code does:
a queue between threads is a belt handoff or a buffer chest, a pool of identical
workers is a worker row, a retry is a loop or recirculation, a rate limit is a pump
gate or a circuit limit. Lay out the parts as districts, place each part's patterns
inside its area, then route the belts between them. Keep each pattern's rules; only
its size and counts follow the program. When no pattern fits, build from the ground
rules and say so in your plan.

The ground rules replace any placement you would otherwise improvise: an inserter
stands between a building and its belt, belts never run into or under buildings,
arms reach exactly the game's tiles, undergrounds pair up, pipes join only where
they connect, areas keep apart, and poles power what they draw. Run `checkLayout`
from `patterns/rules.mjs` on every layout, in the figure's tests, and expect no
violations.

## Build from the kit

Inspect `examples/array-pipeline/model.mjs`, `app.mjs`, and `assets.json` for a
complete small figure. Its filter/map/reduce trace matches JavaScript’s eager
array evaluation: all filtering happens before mapping, then reduction. Do not
silently draw it as a fused streaming pipeline.

Use the example as a starting point, not a required subject or fixed layout.
A figure is a folder under `examples/` with an `index.html`, modules that import
the kit from `../../kit/`, and an `assets.json` that lists the sprite IDs it draws
as `{ "ids": [...] }`. Vite picks up every such folder as a page. The sidebar at
`https://factory.localhost:1355` lists it by its `<title>`, after `Factory ·`, with the
icon of the object that `"icon"` in `assets.json` names.
`kit/trace.mjs` provides deterministic looping playback and stepping. `kit/sprites.mjs`
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

It serves every figure with live reload at `https://factory.localhost:1355`,
through Portless, which needs Node.js 24 and runs as the user on port 1355.
Never run Portless with sudo, on port 443, or as a startup service
(`portless service install`); if it asks for sudo, stop and tell the user.
The home page is a sidebar of every figure. Open
`https://factory.localhost:1355/#<figure>` in the user’s external browser to show
one in it; `/<figure>/` shows the figure alone, the object browser is `#catalog`,
and the pattern gallery is `#patterns`.
Without Portless, `vp dev` serves the same pages on localhost. `vp build` writes a
static site to `dist/` with only the sprites each page lists, and `vp preview`
serves it on port 4173. `vp run assets` regenerates the library from the user's
game files, and `vp test` runs the tests. Generated output is ignored by Git.

## Make the mechanism legible

Use Factorio’s native tile plane and fixed sprite perspective. Do not apply an
additional isometric transform. Preserve contact points and anchors, draw shadows
behind objects, and keep values visibly associated with their current owner.
Place every building, belt and inserter by the ground rules in `patterns/rules.mjs`.

Read [references/inserters.md](references/inserters.md) before wiring a scene.
Show pickup, a closed hand carrying the item, release, and an empty return.
The item follows the hand while held, occupies a real belt lane while travelling,
and enters the destination inventory only at release. Include hand contents in
conservation checks; never count a value in both a chest and an inserter.
Start machine work after its input arrives.

Useful detail includes real machinery, connections,
status lamps, and stock; decorative machinery should not imply nonexistent work.

Start the page with the scene's workbench. Put no masthead, wordmark, edition
label, eyebrow, or headline above it. The workbench header names what the figure
explains, with a one-line description, never playback status or event counts. Keep
labels close to their stations. Label conventions where they appear in the diagram:
a wire's meaning beside the wire, a flag beside the station that sets it. Use one
word for one action everywhere: if three consumers read a table, all three wires
say READS. Reveal a failure, rejection, cache miss, or bottleneck through behavior
as well as color.

Loop the factory from the moment the page loads, like a real factory that never
stops. Give the `TracePlayer` `{ loop: true }`: after the last event it starts
again from the first. Nothing starts or stops the loop: no play, pause, step or
reset buttons, no keyboard shortcuts, no speed or input selectors. A click on a
phase heading jumps to that phase, and the loop continues from there. The figure
runs one example at one speed; compare other scenarios or inputs in the
reference tables.

Put nothing under the scene. Do not add a row of controls, narration or status
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
same workbench frame and header over the same textured floor, but no tile grid.
Draw it as a plain table: a filled header row, a thin divider between rows, and
room around each cell. Give each table a heading and no description. The
example's Operations table shows the pattern. Start header text, phase headings
and table text on one left edge.

Write every visible string plainly. Use titles, labels, and table cells. Cut
taglines, explanatory paragraphs, and em dashes.

Use the chosen midnight blueprint treatment: near-black navy framing, a deep blue
floor, restrained Campfire fuzz and grain, a quiet blue tile grid, soft white station
labels, dark steel-blue controls, amber activity, and narrow checker gutters. Keep this section the visual focus. Read
[references/design.md](references/design.md) for the material recipe and provenance.
Preserve the grid and labels when improving machinery or layout.

Fit the scene at narrow widths; reflow its stations when simply shrinking would
make values unreadable. Supply a DOM/text equivalent of the important state.
Under reduced motion the loop keeps running, but draws each event's state without
movement in between. Suspend the loop while hidden or offscreen, without a
catch-up jump on return.

## Verify the explanation

Follow [references/verification.md](references/verification.md). Run the model’s
meaningful checks and `checkLayout` on every layout, import the actual assets, and open the finished figure. Inspect
desktop and phone layouts, a branch outcome, an operation in progress, the final
result, and reduced motion. Check that the loop starts by itself and starts again
after the last event, and that each new pass clears both the simulation and
readouts.

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
