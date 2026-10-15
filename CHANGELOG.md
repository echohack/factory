# Changelog

All notable changes to Factory are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The first public release.

### Added

- `SKILL.md`: explain a program as a working Factorio factory. Read the code, write an architecture inventory with file references, map program parts to factory parts, keep a pure model, build from the kit, and verify the figure in a browser.
- The browser kit: `trace.mjs` for deterministic playback and stepping, `sprites.mjs` for native sprite layers, `scene.mjs` for the tile scene with belts, corners, underground pieces, label plates and moving items, `transport.mjs` for articulated inserter handoffs, `process.mjs` for the phase list and parallel lanes, and `tables.mjs` for reference tables snapped to the tile grid.
- The object library: 68 world objects and 28 item tokens with program roles, footprints, variants and notes on omitted effects, and a browser for it at `/catalog/`.
- Examples: `array-pipeline`, filter, map and reduce in JavaScript's eager order, and `obs-pipeline`, OBS Studio streaming and recording at once.
- `npm run assets` imports the art from your own copy of Factorio 2.0 with Space Age: the game's `data/` folder and its `--dump-data` and `--dump-icon-sprites` output. It finds default Steam and standalone installs, or takes `--data` and `--script-output`.
- `assets/manifest.json` records each file's game path, SHA-256 and size, sorted by game path.
- Builds stop with a clear message when the art is not imported, and the tests skip only the art hash check.
- Tests for the models, event conservation, stepping, sprite crops and asset paths on [Vite+](https://viteplus.dev), installed with Bun: `bun run test`, `bun run test:watch` and `bun run test:coverage`. Optional Playwright checks for the built pages.
- A video of the OBS example at the top of the README.
- README, Apache 2.0 license, changelog, contributing guide and security policy.

### Removed

- Factorio artwork, from the repository and from its history. Git ignores imported art in `assets/`.
