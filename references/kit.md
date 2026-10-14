# Kit contracts

`kit/trace.mjs` exports `TracePlayer(events, initialState)`. Each event has
`before`, `after`, a positive `duration` in milliseconds, and optional semantic
fields consumed by a scene. `update(ms)` advances only while playing;
`step()` commits one event and pauses; `seek(index)` selects a committed event
boundary; `reset()` clears playback. `snapshot()` returns the current committed
state, current event, its progress, index, and completion status. The caller owns
visibility, speed and requestAnimationFrame. Event duration is presentation time.

`kit/sprites.mjs` exports `loadSprites(baseURL)` and `SpriteAtlas`. Load from the
importer’s manifest URL directory. `draw(ctx, id, x, y, options)` anchors an object
at its ground center. `tileSize` determines pixels per tile; `frame` is a frame
index; `direction` is a zero-based variant. Drawing supports `pass: 'shadow'` or
`'body'` so a scene can draw all shadows first, then bodies in ground-y order.
Icons use a separate `drawIcon` helper. Missing IDs and invalid variants throw.
`drawInserter(ctx, id, arm, options)` draws a native platform or articulated arm.
The arm supplies `pivot`, `pickup`, `drop`, `flow`, `hand`, and `closed`. Draw
passes `shadow`, `platform`, then `arm` in the scene's appropriate depth order.

`kit/scene.mjs` exports `FactoryScene(canvas, atlas)`. `render(layout, view)` fits
tile coordinates into the responsive canvas. Layout contains `width`, `height`,
`objects: [{id,sprite,x,y,label,caption}]` and axis-aligned `belts` with `from` and
`to` tile points. Each belt segment uses native east/west/north/south artwork.
For corners, provide explicit native variants with `beltTiles` rather than rotating
an image. A view contains machine frame indices, an active object, a token path
and progress, and optional object readouts. Text labels remain upright and are
part of the Canvas picture; the page must supply a DOM state equivalent.
Optional `labelX`, `labelY`, `readoutX`, and `readoutY` place annotations in tile
coordinates. `labelPlate` adds a small opaque backing where a label crosses a belt.
The floor is transparent over a dark CSS material; Canvas draws the tile grid.

`kit/transport.mjs` exports `connectStations`, `connectLayout`, `swing`, and
`transferView`. The example declares station sizes and connection pairs in
`layout.mjs`; `connectLayout` supplies belt tiles and adjacent inserters.
The view includes `arms` and a `token` with an explicit `position` and optional
`heldBy`. Read `inserters.md` for the event and ownership contract.

The array example model is independent from the kit. Its event `phase`, `line`,
`from`, `to`, `value` and `message` fields connect semantic events to scene stations
and code highlighting. For a new algorithm, write a new model and choreography;
do not force it into filter/map/reduce.

Limitations: fixed perspective, no general Factorio simulation, no routing solver,
no arbitrary prototype renderer. Belts end at inserter pickup/drop tiles outside
buildings. Belt speeds and arm projection are illustrative unless measured.
