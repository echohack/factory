# Contributing to Factory

Thank you for helping. A Factory figure is judged by whether a reader understands the program from the floor alone, so most of this guide is about checking your work before anyone else does.

## Setup

You need:

- **The [Vite+](https://viteplus.dev) CLI, `vp`.** Every command runs through it. `vp install` uses Bun 1.2.4, as pinned in `package.json`. Without the global CLI, run `bun install` once, then `bunx vp` in place of `vp`.
- **Node.js 24**, as pinned in `.nvmrc`. Portless needs it; Vite+ also runs on Node 22.18 or later. The kit, the build scripts and the import use only Node's built-in modules.
- **Factorio 2.0 with Space Age**, for the art. The README's [Game assets](README.md#game-assets) section shows how to export and import it.
- **Google Chrome and an existing Playwright installation** for the browser checks.
- **Claude Code**, Codex or OpenCode, to try the skill itself.

```sh
git clone https://github.com/echohack/factory.git
cd factory
vp install
vp run assets
```

To use your working copy as the skill while you change it, link it into your personal skills folder. Move any installed copy out of the way first.

```sh
ln -s "$PWD" ~/.claude/skills/factory
```

For Codex, or for OpenCode:

```sh
ln -s "$PWD" ~/.agents/skills/factory
```

```sh
ln -s "$PWD" ~/.config/opencode/skills/factory
```

## Building the examples

```sh
vp run dev
```

`vp run dev` serves every example with live reload at `https://factory.localhost`, behind a sidebar that lists them, through [Portless](https://github.com/vercel-labs/portless). Its first run creates a local certificate authority and binds port 443, which asks for sudo. `vp dev` serves the same pages on localhost without Portless.

```sh
vp build
vp preview
```

`vp build` writes `dist/array-pipeline/`, `dist/obs-pipeline/`, `dist/catalog/` and `dist/patterns/`, each with only the sprites its `assets.json` lists. `vp preview` serves them on `http://127.0.0.1:4173/`. Built pages contain game art, so `dist/` is ignored and never committed.

## The checks

Run the ones that match what you touched, and read every PNG they write: open it and look.

**Tests.** The models, event conservation, stepping, sprite crops and asset paths, and every factory pattern's standard example against the ground rules and the motion check, on Vite+. Without imported art, the art hash test is skipped; run it with the art before you change the library. All tests must pass.

```sh
vp test
vp test watch
vp test run --coverage
```

**Browser checks.** Against `vp preview` after `vp build`; pass a URL such as `https://factory.localhost/array-pipeline/` to check the dev server instead. Set `CHROME_PATH` to use a specific Chrome. Screenshots go to `.local/qa/`.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs vp run verify-browser
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs vp run verify-catalog
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs vp run verify-patterns
```

**Review.** [`references/verification.md`](references/verification.md) has the full list: desktop and 390 px widths, a branch outcome, an operation in progress, the final result, reduced motion, and a loop that never stops.

## House rules

These come from [`SKILL.md`](SKILL.md) and [`references/`](references). A pull request that breaks one will be asked to change.

- **No comments in code.** Not in JavaScript, CSS or HTML. Put the explanation in names and structure, and longer guidance in `references/`.
- **No game art in Git.** Imported PNGs in `assets/` and everything in `dist/` and `.local/` stay out of commits. Check `git status` before you commit. Import art only from your own copy of the game.
- **The model is the truth.** Keep each figure's model pure and runnable on its own. Readouts, counters and machine activity come from it. Animation may interpolate between events, but it never invents work or loses a value.
- **Build from factory patterns.** Arrange scenes from the patterns in [`patterns/`](patterns), and keep every layout passing `checkLayout`, which enforces the ground rules: an inserter between each building and its belt, no belt under or into a building, the game's reach, paired undergrounds, joined pipes. An arrangement that recurs becomes a pattern, with a standard example that passes `checkLayout` and `checkMotion`. See [`references/patterns.md`](references/patterns.md).
- **Inserters do every handoff.** Show the pickup, a closed hand carrying the item, the release and an empty return, and keep stock plus items in flight constant. See [`references/inserters.md`](references/inserters.md).
- **The real scope.** A figure of a system draws every thread, queue and output a user of that system would name, and lists what it leaves out in its reference table, with a reason.
- **Library changes go through the catalog.** Add or change objects in [`catalog/objects.mjs`](catalog/objects.mjs), run `vp run assets`, and commit the regenerated `assets/manifest.json` and `assets/catalog.json`. Map each layer from the data dump. Never guess a sheet layout or drop a part to make an import pass.
- **Kit changes keep the examples working.** Rebuild both examples, the catalog and the pattern gallery, run the checks, and update [`references/kit.md`](references/kit.md) in the same pull request.
- **Plain strings.** A figure's titles, labels and table cells are written plainly, with no taglines, narration or em dashes.

## Changing the skill's text

`SKILL.md` and `references/` are instructions an agent follows, so keep them short, exact and in the same plain voice. When you add an example, give it a folder under `examples/` with an `index.html` and an `assets.json` that lists its sprite IDs and its sidebar `"icon"`. Vite picks it up as a page, and the sidebar lists it by its `<title>`. Add it to the table in the README.

## Pull requests

1. For anything larger than a fix, open a draft pull request early, so we can agree on the approach before you polish it.
2. Fork the repository and branch from `main`.
3. Make one change per pull request.
4. Run `vp test` with the art imported, run `vp build`, and confirm that `git status --short` shows only what you meant to change.
5. For a visual change, attach screenshots at desktop and phone widths.
6. Add a line under `Unreleased` in [`CHANGELOG.md`](CHANGELOG.md).

## Reporting a problem

Issues are turned off. For a bug, open a pull request with a fix or a failing test. Report security problems privately, as described in [SECURITY.md](SECURITY.md).
