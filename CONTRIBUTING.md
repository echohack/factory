# Contributing to Factory

Factory is published for reading and reuse under the [Apache 2.0 license](LICENSE). Issues and the wiki are turned off on GitHub, and the repository does not take outside pull requests. You can still clone it and change your own copy. This guide covers how to build it, check it, and keep to its rules.

## Setup

You need:

- **Node.js 20.10 or later.** Nothing to install: the kit, the build scripts and the tests use only Node's built-in modules.
- **Factorio 2.0 with Space Age**, for the art. The README's [Game assets](README.md#game-assets) section shows how to export and import it.
- **A browser**, and for the automated checks, an existing Playwright installation with Chrome.
- **Claude Code**, Codex or OpenCode, to try the skill itself.

```sh
git clone https://github.com/echohack/factory.git
cd factory
npm run assets
```

To use your working copy as the skill while you change it, link it into your personal skills folder. Move any installed copy out of the way first.

```sh
ln -s "$PWD" ~/.claude/skills/factory
```

For Codex:

```sh
ln -s "$PWD" ~/.agents/skills/factory
```

## Building

```sh
npm run build
npm run preview
```

`npm run build` writes `dist/array-pipeline/`, `dist/obs-pipeline/` and `dist/catalog/`, each with only the sprites it uses. `npm run preview` serves them on `http://127.0.0.1:4173/`.

## The checks

**Unit tests.** The models, event conservation, stepping, sprite crops and asset paths. Without imported art, the art hash test is skipped; run it with the art before you change the library.

```sh
npm test
```

**Browser checks.** With the preview server running, against an existing Playwright installation. Set `CHROME_PATH` to use a specific Chrome. Screenshots go to `.local/qa/`; open and read every one.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/verify-browser.mjs http://127.0.0.1:4173/array-pipeline/
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/verify-catalog.mjs http://127.0.0.1:4173/catalog/
```

[`references/verification.md`](references/verification.md) has the full review: desktop and 390 px widths, a branch outcome, an operation in progress, the final result, reduced motion, and pause, step and reset.

## House rules

These come from [`SKILL.md`](SKILL.md) and [`references/`](references).

- **No comments in code.** Not in JavaScript, CSS or HTML. Put the explanation in names and structure, and longer guidance in `references/`.
- **No game art in Git.** Imported PNGs in `assets/` and everything in `dist/` and `.local/` stay out of commits. Check `git status` before you commit. Import art only from your own copy of the game.
- **The model is the truth.** Keep each figure's model pure and runnable on its own. Readouts, counters and machine activity come from it. Animation may interpolate between events, but it never invents work or loses a value.
- **Inserters do every handoff.** Show the pickup, a closed hand carrying the item, the release and an empty return. A belt never runs under a chest or through an assembler, and stock plus items in flight stays constant. See [`references/inserters.md`](references/inserters.md).
- **Library changes go through the catalog.** Add or change objects in [`catalog/objects.mjs`](catalog/objects.mjs), run `npm run assets`, and commit the regenerated `assets/manifest.json` and `assets/catalog.json`. Map each layer from the data dump. Never guess a sheet layout or drop a part to make an import pass.
- **Kit changes keep the examples working.** Rebuild both examples and the catalog, run the checks, and update [`references/kit.md`](references/kit.md) in the same change.
- **Plain strings.** A figure's titles, labels and table cells are written plainly, with no taglines, narration or em dashes.

## Changing the skill's text

`SKILL.md` and `references/` are instructions an agent follows, so keep them short, exact and in the same plain voice. When you add an example, give it a folder under `examples/` with a `build.mjs`, add it to [`scripts/build-examples.mjs`](scripts/build-examples.mjs) and to the list in [`scripts/build-site.mjs`](scripts/build-site.mjs), and add it to the README.

## Changelog

Add a line under `Unreleased` in [`CHANGELOG.md`](CHANGELOG.md) for every change that someone using the skill would notice.
