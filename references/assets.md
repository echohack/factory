# Game assets

The library was mapped from Factorio **2.0.77** with Space Age, Quality and
Elevated Rails. The importer reads three things from the user's own copy:

| Source | Flag or variable | Use |
|---|---|---|
| The install's `data/` folder | `--data`, `FACTORIO_DATA` | Original art; `base/info.json` gives the version |
| `script-output/data-raw-dump.json` | `--script-output`, `FACTORIO_SCRIPT_OUTPUT` | Evaluated prototype definitions, from `--dump-data` |
| `script-output/<type>/<name>.png` | same folder | Engine-rendered icons, from `--dump-icon-sprites` |

Without flags, the importer looks in the default Steam and standalone install
folders and in the user data folder's `script-output`. The README lists them.
`--archive` or `FACTORIO_ARCHIVE` reads a prepared archive instead: `data/`,
`metadata/data-raw-dump.json`, `metadata/archive-summary.json` with a `version`,
and icons in `Factorio-Assets/icons/<type>/<name>.png`.

`assets/manifest.json` is the reusable imported library. Each file entry records
its game path (`source`), SHA-256 and size. `assets/catalog.json` maps 68 world
objects and 28 item tokens to program roles and native variants. Read
`catalog.md` for the selection workflow. The original seven demo selectors remain
available as aliases.

## Importing

`vp run assets` regenerates the library from `catalog/objects.mjs` using the
user's game files. `vp run import-assets --spec file.json --out folder` imports a
small JSON spec instead, with a
`sprites` object. Each sprite is one of:

- `icon`: exported icon `category` and `name`.
- `inserter`: one of the six mapped native inserter names.
- `prototype`: prototype `type` and `name`, plus `path`, `parts`, or `variants`.

A `path` is an array of prototype keys/array indices. `parts` combines explicit
paths in drawing order. Each part has `path` and optional `shift` in tiles,
`direction` for a fixed source-sheet direction, `frame` for a fixed frame, or
`sheetDirections` for a Sprite4Way sheet. `variants` maps names to part arrays;
for example a machine can expose north/east/south/west or off/on compositions.
See the catalog source for complete splitters, underground belts and roboports.
No layer is silently removed to force an import to succeed.

The importer supports single-file and `filenames`/`lines_per_file` animations,
frame sequences, forward/backward/ping-pong cycles, layers, sheets, native scale,
shifts and shadows. Its PNGs are byte-for-byte source copies, named by content
hash. The manifest records file hashes, dimensions, crops and game version.

Stripes, arbitrary tint/blending, lighting, working visualisation state machines,
creature rigs and general auto-discovery are still unsupported. Catalog mappings
name their selected composition and omitted effects. Some bodies are static even
though the full entity has working effects in the game. The six inserter types
share measured joint anchors; their movement remains illustrative choreography.

Offsets are in tiles; one tile is conventionally 32 pixels at scale 1. Layer
scales apply to source pixels. Factorio’s art already has its perspective. Belt
direction indices are layout variants, not arbitrary camera rotations. Shadows
use a 0.35 preview opacity multiplier; accurate lighting is outside the current kit.

The 2.0.77 data includes an empty `core/graphics/arrows/tip-arrow.png`, 34
references to Switch vibration resources absent on macOS, and one inactive
explosion filename superseded by stripes. None of them is in the library.

## Repository layout

Factorio artwork belongs to Wube Software and stays out of Git: `.gitignore`
ignores everything in `assets/` except `manifest.json`, `catalog.json` and
`materials/`. `dist/`, `.local/` and generated screenshots are ignored too. `vp dev`
serves and `vp build` copies only the sprite files a page lists in its
`assets.json`; the object browser includes the full library.
