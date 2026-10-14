# Midnight blueprint workbench

Preserve the labeled tile grid and clear transport controls. Use near-black navy
framing (#080f1c), a deep blue floor (#0c1e35), soft white type (#c9d6e6), muted
blue secondary labels, dark steel-blue controls (#284b70), and small amber active
states. Keep the grid subdued (#294562 at .5 px) and avoid large pale control fills. Keep the interface blue; the native machine art
retains its original colors. Make the factory floor the primary visual section.

The user authorized borrowing materials and layout from `~/code/campfire`:

- `app/assets/css/approved-textures.css`: Graphite fuzz, a 256 px repeating
  ash-fuzz layer adapted to .10 screen opacity and grain to .14 soft-light opacity
  so the texture does not brighten the dark floor.
  Desaturate both texture layers over the blue floor to avoid a green cast.
- `app/components/CharacterSheet/CharacterSheetSection.vue`: 4 px checker gutters
  between opaque content slabs.
- `app/assets/css/skill-tree-book.css`: framed workbench, quiet header/footer
  rules, mono metadata, and responsive margins.

`assets/materials/ash-fuzz.webp` and `ash-grain.png` are unchanged copies of
Campfire's files in `public/img/textures/`. They are separate from the locally
imported Factorio game artwork. The build copies them into `materials/`.

Reference tables reuse the workbench frame and header. Their `.blueprint` body
carries the same ash textures as the floor, and the table layer draws a 32 px tile
grid of 1 px `rgba(41, 69, 98, .55)` lines to match the canvas grid. The table starts
on a grid line, and `kit/tables.mjs` snaps every row to whole tiles, so the grid
lines are the row dividers. Draw no row borders. Center cell text vertically.

Use 12 px checker gutters on desktop and 6 px on phones. The floor material is
under the Canvas, leaving labels and machinery clear. Grid lines are quieter than
belt edges. Reflow stations vertically on smaller screens; keep text readable
instead of scaling the font down with the tiles.
