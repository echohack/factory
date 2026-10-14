# Dark workbench

Preserve the labeled tile grid and clear transport controls. Use charcoal surfaces
with a slight green cast, warm white type, sage secondary labels, olive controls,
and amber active states. Make the factory floor the primary visual section.

The user authorized borrowing materials and layout from `~/code/campfire`:

- `app/assets/css/approved-textures.css`: Graphite fuzz, a 256 px repeating
  ash-fuzz layer at .26 screen opacity and grain at .2 soft-light opacity.
- `app/components/CharacterSheet/CharacterSheetSection.vue`: 4 px checker gutters
  between opaque content slabs.
- `app/assets/css/skill-tree-book.css`: framed workbench, quiet header/footer
  rules, mono metadata, and responsive margins.

`assets/materials/ash-fuzz.webp` and `ash-grain.png` are unchanged copies of
Campfire's files in `public/img/textures/`. They are separate from the locally
imported Factorio game artwork. The build copies them into `materials/`.

Use 12 px checker gutters on desktop and 6 px on phones. The floor material is
under the Canvas, leaving labels and machinery clear. Grid lines are quieter than
belt edges. Reflow stations vertically on smaller screens; keep text readable
instead of scaling the font down with the tiles.
