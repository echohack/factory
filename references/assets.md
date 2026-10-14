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

All source artwork is archived. Prepared clips cover the 20 shape/direction
variants of each of four belt tiers and the working cycles of assemblers 1–3.
Their WebP previews run at an arbitrary inspection rate, not program time.
Inserters, complex machines and creatures still need composition/articulation.

## Importing

`scripts/import-assets.mjs` takes a JSON spec. Inspect the example for exact syntax.
Each named sprite selects either a prototype and a path to its sprite definition,
or an exported icon. Files are copied by content hash to the output directory;
`manifest.json` contains normalized frames/layers, source attribution, and version.
The importer validates crops and rejects path traversal and unsupported layouts.

The first implementation supports `filename`, `layers`, width/height or size,
frame count, line length, direction count, offsets, scale, and shadows. It fails
on multi-file/stripe layouts, frame sequences, runtime tint, nonstandard blending,
and direction dictionaries. Extend it with a test and visual check when needed;
do not silently drop layers to get a result.

Offsets are in tiles; one tile is conventionally 32 pixels at scale 1. Layer
scales apply to source pixels. Factorio’s art already has its perspective. Belt
direction indices are layout variants, not arbitrary camera rotations. Shadows
use a 0.35 preview opacity multiplier; accurate lighting is outside the current kit.

The source includes an empty `core/graphics/arrows/tip-arrow.png`, 34 references
to Switch vibration resources absent on macOS, and one inactive explosion
filename superseded by stripes. See the archive’s exception reports.

## Sharing

Keep cached artwork, generated sites, screenshots containing game art, and any
exported asset packs out of Git. The code repository is separate from the user’s
local art library. Check the applicable [Factorio terms](https://factorio.com/terms-of-service)
before a user-requested public release. Importing
art from an owned copy does not itself license public asset redistribution.
