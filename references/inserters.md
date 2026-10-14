# Inserter transfers

Ordinary inserters pick up behind their bases and drop in front. Belts transport
items; inserters cross the inventory boundary of a chest or assembler. See the
[Factorio mechanics reference](https://wiki.factorio.com/Inserters) and the archive's
`reference/doc-html/prototypes/InserterPrototype.html` for installed 2.0.77 definitions.
Current web prototype documentation may describe a different game version.

Use tile centers (`n + 0.5`) consistently. Chests occupy one tile; the example's
assemblers occupy three by three. Put each inserter base outside the building, in
an adjacent unoccupied tile. Keep belt tiles outside both buildings and arm bases.

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
archived standard sprites. The two-link projection and event durations are
explanatory choreography, not an exact reproduction of engine lighting, physics,
power, or throughput. Only the standard yellow inserter rig is verified. Other
types require their own reach, sprite anchors, and visual tests.
