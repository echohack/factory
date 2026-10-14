# Local assets

Default archive: `/path/to/factorio-data`.
Set `FACTORIO_ARCHIVE` or pass `--archive` to the importer to override it.

The archived game is Factorio **2.0.77** with Space Age, Quality, and Elevated
Rails. `metadata/archive-summary.json` records the source/version.

| Path under archive | Use |
|---|---|
| `data/` | Untouched original data and art |
| `metadata/data-raw-dump.json` | Evaluated prototype definitions |
| `metadata/asset-index.jsonl` | Images, dimensions, hashes, prototype users |
| `metadata/sprite-definitions.jsonl` | Sprite definitions with JSON pointers |
| `Factorio-Assets/icons/<type>/<name>.png` | Engine-rendered icons |
| `Factorio-Assets/animations/<entity>/<variant>/` | 83 prepared clips |
| `reference/doc-html/` | Documentation for the archived version |

All source artwork is archived. `assets/manifest.json` is the reusable imported
library, and `assets/catalog.json` maps 68 world objects and 28 item tokens to
program roles and native variants. Read `catalog.md` for the selection workflow.
The original seven demo selectors remain available as aliases.

## Importing

`npm run assets` regenerates the library from `catalog/objects.mjs` using the
local archive. `scripts/import-assets.mjs` also accepts a small JSON spec with a
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

The source includes an empty `core/graphics/arrows/tip-arrow.png`, 34 references
to Switch vibration resources absent on macOS, and one inactive explosion
filename superseded by stripes. See the archive’s exception reports.

## Repository layout

The selected art in `assets/` is intentionally tracked in the user's private
repository. `dist/`, `.local/`, generated screenshots and the complete archive
remain separate. Builds read `assets/` directly and copy only the required sprite
files for an individual factory; the object browser includes the full library.
