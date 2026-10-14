# Factory

A skill for explaining programs as working Factorio machines. Invoke `/factory`
in clients that support slash skills, or `$factory` in Codex.

The repository contains `SKILL.md`, a small browser rendering/playback kit, asset
import tools, focused references, and a complete interactive array example.

## Run the example

Requires Node.js 20.10+. The mapped artwork is included in this private repository.
No package installation or game archive is needed to build the examples.

```sh
npm run build
npm run preview
```

Open `/array-pipeline/` for the working example or `/catalog/` for the searchable
object library in your external browser. The library contains **68 world objects
and 28 item tokens**, with native variants, animation previews and program roles.
Search it from the terminal with `npm run objects -- worker`.

To expand or regenerate the library from the local archive:

```sh
FACTORIO_ARCHIVE=/path/to/factorio-data npm run assets
```

The example explains `[2, 5, 4, 7, 6, 3, 8, 1].filter(even).map(triple).reduce(sum, 0)`.
It exposes the intermediate arrays and final value **60**. Its eager evaluation
order is deliberate; a streaming pipeline would need a different model.
Native inserters handle each inventory transfer: pickup, carry, belt travel,
insertion, and empty return. The dark blueprint workbench preserves station labels and the
tile grid, with ash textures and checker gutters borrowed from Campfire.

## Install as a skill

Keep this repository at `~/code/factory` and link it into your client’s skill
directory. For Codex, the personal discovery path used here is:

```sh
ln -s ~/code/factory ~/.agents/skills/factory
```

## Develop

`npm test` checks execution results, event conservation, stepping, sprite crops,
and local asset path handling. `node scripts/verify-browser.mjs` optionally uses
Playwright to check the built page and save desktop/mobile screenshots. It does
not install a browser; see `references/verification.md` for configuration.

All runtime code is framework-free JavaScript and browser Canvas 2D. Generated
sites are local, multi-file static artifacts; use the included HTTP server.
