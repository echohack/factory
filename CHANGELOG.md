# Changelog

All notable changes to Factory are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `vp run dev` runs Portless as you on port 1355, so it no longer asks for sudo or binds port 443. The examples are at `https://factory.localhost:1355`. `SKILL.md` tells agents never to run Portless with sudo or install it as a startup service, because the root service runs `node` and `node_modules` that your user account can modify.

## [0.2.0] - 2026-10-21

Factory patterns with checked ground rules, and figures that loop with no controls.

### Added

- Factory patterns. `patterns/` holds 36 arrangements taken from real factories, in six families: handoffs, belts, cells, fluids, layout and control. Each has one software meaning, its own rules, and a standard example that runs in the gallery at `https://factory.localhost/#patterns`. `vp run patterns <term>` searches them by vocabulary term.
- Ground rules in `patterns/rules.mjs`, with `checkLayout`, which checks any layout for them: whole tiles, one thing per tile, inserter reach and ends, belt continuity, paired undergrounds, joined pipes, drill drops, areas and power. They replace the building rules that were prose in `SKILL.md` and the references.
- Builders in `patterns/build.mjs` that take positions from the game data: inserter reach, drill drops, fluid ports, wire anchors, underground reach and tile footprints.
- `checkMotion`, which rejects an inserter that carries two values or swings before it returns, and two values on one spot of a belt.
- `wires` and `notes` in a scene layout, for copper, red and green wires and short labels on the floor. A token with an empty value draws only its icon.
- `"library": true` in a page's `assets.json` lists the page with the library while it keeps its own sprite list.
- `vp run verify-patterns` checks the gallery in a browser and saves a screenshot of every example.
- `areas` in a scene layout draw dotted, named rectangles around the major parts of a system. The skill uses them for multi-part figures, and the OBS example marks libobs, the RTMP output and the ffmpeg-mux recording process.
- `TracePlayer` takes `{ loop }`. A looping player starts again from the first event after the last one.

### Changed

- `SKILL.md` builds scenes from factory patterns, and places every building, belt and inserter by the ground rules.
- Reference tables are plain tables: a filled header row, thin dividers between rows and roomier cells, over the same frame and textured floor, without the tile grid.
- Figures loop from the moment the page loads and never stop. A click on a phase heading jumps there and the loop continues. Each figure runs one example at one speed, and its reference tables compare the others. The pattern gallery and the object library also loop.

### Fixed

- Belt corners joined the wrong edges. Factorio names corner sprites by the edges they join, and the OBS example read the names as travel directions. `references/kit.md` now states the convention, and `belt()` picks corners from a path.

### Removed

- `kit/tables.mjs`, which snapped table rows to the tile grid.
- The row of controls under each example: play, pause, step and reset, speed, scenario, and their keyboard shortcuts. The pause button and speed selector from the pattern gallery, and the animate toggle from the object library.

## [0.1.0] - 2026-10-14

The first public release.

### Added

- `SKILL.md`: explain a program as a working Factorio factory. Read the code, write an architecture inventory with file references, map program parts to factory parts, keep a pure model, build from the kit, and verify the figure in a browser.
- The browser kit: `trace.mjs` for deterministic playback and stepping, `sprites.mjs` for native sprite layers, `scene.mjs` for the tile scene with belts, corners, underground pieces, label plates and moving items, `transport.mjs` for articulated inserter handoffs, `process.mjs` for the phase list and parallel lanes, and `tables.mjs` for reference tables snapped to the tile grid.
- The object library: 68 world objects and 28 item tokens with footprints, variants and notes on omitted effects, in Factorio's crafting-menu order, and a browser for it at `/catalog/`.
- A shared vocabulary of 85 architecture terms in `catalog/vocabulary.mjs`. Every object carries four to eight of them, `vp run objects` searches them, and tests keep every term in use.
- Fixed meanings for the 28 item tokens: an iron plate is always a record, copper cable a packet, an electronic circuit a request. The OBS example uses them.
- Examples: `array-pipeline`, filter, map and reduce in JavaScript's eager order, and `obs-pipeline`, OBS Studio streaming and recording at once.
- `vp run assets` imports the art from your own copy of Factorio 2.0 with Space Age: the game's `data/` folder and its `--dump-data` and `--dump-icon-sprites` output. It finds default Steam and standalone installs, or takes `--data` and `--script-output`.
- `assets/manifest.json` records each file's game path, SHA-256 and size, sorted by game path.
- Builds stop with a clear message when the art is not imported, and the tests skip only the art hash check.
- Every command runs through [Vite+](https://viteplus.dev), installed with Bun: `vp install`, `vp run assets`, `vp run dev`, `vp build`, `vp preview`, `vp run objects` and `vp test`. Tasks live in `vite.config.mjs`.
- A sidebar at `https://factory.localhost`, in the style of Campfire's, lists every diagram under `examples/` with its icon, filters them with ⌘K, and picks up new diagrams while `vp run dev` runs. It collapses to an icon rail on narrow screens.
- The examples are a Vite multi-page app. `vp run dev` serves them with live reload at `https://factory.localhost` through Portless, and `vp build` bundles each page with only the sprites its `assets.json` lists.
- Tests for the models, event conservation, stepping, sprite crops and asset paths, with coverage, and optional Playwright checks for the built pages.
- A screenshot of the OBS example at the top of the README.
- README, Apache 2.0 license, changelog, contributing guide and security policy.

### Removed

- Factorio artwork, from the repository and from its history. Git ignores imported art in `assets/`.
