# Midnight blueprint workbench

Preserve the labeled tile grid and clear transport controls. Use near-black navy
framing (#080f1c), a deep blue floor (#0c1e35), soft white type (#c9d6e6), muted
blue secondary labels, dark steel-blue controls (#284b70), and small amber active
states. Keep the grid subdued (#294562 at .5 px) and avoid large pale control fills. Keep the interface blue; the native machine art
retains its original colors. Make the factory floor the primary visual section.

The materials and layout come from Campfire, a separate project by the same author:

- `app/assets/css/approved-textures.css`: Graphite fuzz, a 256 px repeating
  ash-fuzz layer adapted to .10 screen opacity and grain to .14 soft-light opacity
  so the texture does not brighten the dark floor.
  Desaturate both texture layers over the blue floor to avoid a green cast.
- `app/components/CharacterSheet/CharacterSheetSection.vue`: 4 px checker gutters
  between opaque content slabs.
- `app/assets/css/skill-tree-book.css`: framed workbench, quiet header rules,
  mono metadata, and responsive margins.

`assets/materials/ash-fuzz.webp` and `ash-grain.png` are unchanged copies of
Campfire's files in `public/img/textures/`, tracked in this repository. They are
separate from the imported Factorio game artwork. The build copies them into `materials/`.

Reference tables reuse the workbench frame and header. Their `.blueprint` body
carries the same ash textures as the floor, with no tile grid. Draw plain table
rows: 10 px of vertical padding, top-aligned text, tabular figures, and a 1 px
divider in `rgba(78, 114, 152, .35)` between rows. Fill the header row
with `#183454`, the active sidebar color, and set its labels in `#dbe7f4` at 600.
Run that fill from frame edge to frame edge: the table takes the full width and
its first and last cells carry the inset.

Areas that mark the major parts of a system use a dotted 1.6 px line in
`rgba(143, 181, 222, .7)` with round dots 5 px apart, and the part's name in
uppercase 10 px mono `#8fb5de` on a floor-colored plate across the top edge. The
`areas` ground rule keeps half a tile between neighboring areas; keep every label
and readout of a part inside its area as well.

Header text, sidebar headings, the first control, and table text all start on one
left edge, the `--inset` variable: 24 px on desktop and 16 px on phones. Set every
horizontal padding inside the workbench from it instead of picking a number per
element.

Use 12 px checker gutters on desktop and 6 px on phones. The floor material is
under the Canvas, leaving labels and machinery clear. Grid lines are quieter than
belt edges. Reflow stations vertically on smaller screens; keep text readable
instead of scaling the font down with the tiles.
