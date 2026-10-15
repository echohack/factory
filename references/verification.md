# Verification

Run `vp test` and build the example with actual imported art. Test the model
against the language’s real result, including empty and all-rejected inputs.
Stepping and continuous playback must reach the same final state. Check that
every intermediate array and cumulative total agrees with the model.

Open the output in the user’s external browser. Inspect at desktop width and
390 px, including a rejection, a working machine, and completion. Read every QA
screenshot that you create. Check anchors, belt continuity, shadow placement,
token visibility, label collisions, and clipping. The page should not scroll
horizontally. Native UI controls must remain readable when the scene reflows.

For every connection, verify that belt tiles and inserter bases stay outside
building footprints. Check pickup and drop reach, lane alignment, a held item in
mid-swing, and the empty return. Recipients gain stock only at release; stock plus
in-flight items must remain constant. A machine must receive input before work.
Inspect the dark floor, texture contrast, checker gutters, and readable labels.

Compare screenshots with `Buffer.equals`, never `assert.deepEqual`: when two image
Buffers differ, Node builds a byte-by-byte diff that can exhaust system memory.
Compare frames only within one paused event; a timed gap can cross an event boundary.

Verify pause, step, reset, edited input, invalid input, keyboard control, speed,
reduced motion, and hidden/offscreen suspension. Avoid announcing every animation
frame to screen readers; announce completed semantic events.

Optional automated browser check, against `vp preview` after `vp build`. To check
the dev server instead, pass its URL, such as `https://factory.localhost/array-pipeline/`:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
vp run verify-browser
```

The check uses a separate headless Chrome profile and saves screenshots into
`.local/qa/`. It does not control the user’s existing browser session or install
dependencies. For interactive inspection, use the external browser.

Imported Factorio art in `assets/` is ignored by Git; only the manifest, catalog
and materials are tracked. Before committing, inspect `git status` and keep game
art, generated `dist/` and `.local/` output out of source control. Importer errors should identify an unsupported field
or missing asset, not quietly produce a placeholder that looks like success.

For catalog changes, `vp test` checks every mapped layer’s crop bounds and file
hash. Use `vp run verify-catalog` with the same browser environment variables
to check search, variants, pause, mobile and reduced motion.
Inspect the resulting contact sheets as well as any new animated frame sequences.

Check scope against the architecture inventory before polishing. Every inventory
entry is drawn, or it appears in the reference table's omissions with a reason.
Confirm that no core data path is missing, that independent threads run in
parallel lanes, and that every fan-out or fan-in in the code appears in the scene.
