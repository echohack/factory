# Factory

A skill for explaining programs as working Factorio machines. Invoke `/factory`
in clients that support slash skills, or `$factory` in Codex.

The repository contains `SKILL.md`, a small browser rendering/playback kit, asset
import tools, focused references, and a complete interactive array example.

## Run the example

Requires Node.js 20.10+ and the local asset archive created from your owned game.
No package installation is required.

```sh
npm run assets
npm run build
npm run preview
```

Open the printed URL in your external browser. To use a different archive:

```sh
FACTORIO_ARCHIVE=/path/to/factorio-data npm run assets
```

The example explains `[2, 5, 4, 7, 6, 3, 8, 1].filter(even).map(triple).reduce(sum, 0)`.
It exposes the intermediate arrays and final value **60**. Its eager evaluation
order is deliberate; a streaming pipeline would need a different model.
Native inserters handle each inventory transfer: pickup, carry, belt travel,
insertion, and empty return. The dark workbench preserves station labels and the
tile grid, with charcoal textures and checker gutters borrowed from Campfire.

## Install as a skill

Keep this repository at `~/code/factory` and link it into your client’s skill
directory. For Codex, the personal discovery path used here is:

```sh
ln -s ~/code/factory ~/.agents/skills/factory
```

Do not overwrite an existing skill at that path. Codex follows symlinked skill
folders and detects changes automatically. If it does not appear, restart Codex.
See the [official OpenAI documentation](https://learn.chatgpt.com/docs/build-skills).

## Develop

`npm test` checks execution results, event conservation, stepping, sprite crops,
and local asset path handling. `node scripts/verify-browser.mjs` optionally uses
Playwright to check the built page and save desktop/mobile screenshots. It does
not install a browser; see `references/verification.md` for configuration.

All runtime code is framework-free JavaScript and browser Canvas 2D. Generated
sites are local, multi-file static artifacts; use the included HTTP server.

## Artwork and scope

Game artwork is imported into `.local/` and copied into ignored `dist/` output.
No Factorio art is committed. Wube’s asset terms still apply to generated output;
the fact that a site runs locally does not grant permission to publish its art.

The renderer supports ordinary single-file sprite layers, explicit belt variants,
shadows, icons, and the standard yellow inserter's platform and articulated arms.
Its arm projection and transfer timing are explanatory, not an engine simulation.
Unsupported sprite forms fail explicitly. Other inserter rigs, complex working
effects, arbitrary entity reconstruction, and automatic parsing of every
programming language are not implemented.

The layout of the skill is inspired by Anatomy; this kit and example are new code.
The two files in `assets/materials/` are user-authorized copies of Campfire's
ash textures. Their origins and adapted surface recipes are in `references/design.md`.
