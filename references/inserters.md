# Inserter transfers

Ordinary inserters pick up behind their bases and drop in front. Belts transport
items; inserters cross the inventory boundary of a chest or assembler. See the
[Factorio mechanics reference](https://wiki.factorio.com/Inserters) and the game's
bundled `doc-html/prototypes/InserterPrototype.html`, next to `data/`, for the installed definitions.
Current web prototype documentation may describe a different game version.

Use tile centers (`n + 0.5`) consistently. Chests occupy one tile; the example's
assemblers occupy three by three. The ground rules in `patterns/rules.mjs` place
inserter bases and belt tiles, and `checkLayout` enforces them; this file covers
the transfer itself. In the game an inserter takes one tile behind its base and
drops 1.2 tiles ahead, onto the far lane of a belt; `arm()` in
`patterns/build.mjs` builds exactly that.

`connectStations(source, target)` constructs a straight link with two standard
inserters and at least two belt tiles. `connectLayout(layout)` wires `connections`
pairs into `routes` and `beltTiles`. Diagonal links and insufficient gaps throw.
Complex paths need explicit routes; never stretch an arm across several tiles.
For these inline links, items occupy the right-hand belt lane. Side-loading
layouts need their own far-lane placement.

The example emits five events per transfer:

1. `pickup`: remove a value from source stock and put it in the output hand.
2. `out`: swing the closed hand to the belt and release the item there.
3. `belt`: travel along the belt while the output hand returns empty; the input
   hand picks up the item at the end.
4. `in`: swing the closed input hand; credit the destination only at release.
5. `return`: swing back empty, without a duplicate token.

`transferView(routes, event, progress)` derives poses and the single visible token.
Held-item and hand coordinates are identical. Stock plus the in-flight item stays
constant. Historical filtered/mapped arrays are program results, separate from
remaining chest stock. A machine begins work only after insertion completes.

Import `{ "kind": "inserter", "name": "inserter" }` for the native platform,
base, open/closed hands, and shadows. The platform uses its four-direction sheet;
arm components articulate independently. Joint anchors were measured on the
2.0.77 standard sprites. The two-link projection and event durations are
explanatory choreography, not an exact reproduction of engine lighting, physics,
power, or throughput. The six mapped types share these joint positions and have
been checked with their native platform and hand widths. The long-handed inserter
uses two-tile reach and a larger hand size; the adjacent transport planner does not
automatically route it. Bulk/stack hand artwork does not itself implement batching.
Choose the arm’s `sprite` ID and supply matching geometry and model behavior.
