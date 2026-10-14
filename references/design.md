# Dark blueprint workbench

Preserve the labeled tile grid and clear transport controls. Use deep navy framing (#0c172b), a drafting-blue floor (#153c67), icy white
type (#e6f1ff), muted blue secondary labels, powder-blue controls (#b7d9fa),
and small amber active states. Keep the interface blue; the native machine art
retains its original colors. Make the factory floor the primary visual section.

The user authorized borrowing materials and layout from `~/code/campfire`:

- `app/assets/css/approved-textures.css`: Graphite fuzz, a 256 px repeating
  ash-fuzz layer at .26 screen opacity and grain at .2 soft-light opacity.
  Desaturate both texture layers over the blue floor to avoid a green cast.
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
