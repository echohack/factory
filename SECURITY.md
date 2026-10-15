# Security

## What is in scope

Factory is a set of instructions, a browser kit and local Node scripts.

- `vp dev` serves the examples on localhost, and `vp run dev` routes them through the local [Portless](https://github.com/vercel-labs/portless) proxy at `https://factory.localhost`. The factory plugin in `scripts/vite-plugin-factory.mjs` serves each page only the sprite files its `assets.json` names. `vp preview` serves `dist/`, bound to `127.0.0.1:4173` in `vite.config.mjs`.
- `vp run assets` and `vp run import-assets` read your Factorio install and its exports, and write only to `assets/` or the `--out` folder. Every image path from the data dump must resolve inside the game's `data/` folder.
- `vp run verify-browser` and `vp run verify-catalog` load Playwright from `PLAYWRIGHT_MODULE` and drive headless Chrome on the local preview, or on a URL you give them. Point them only at pages you trust.

A security problem is anything in this repository that could let a page, a prompt, a data dump or a file run code, read or write files, or reach the network in a way the user did not ask for: in the kit, in the scripts, in the example pages, or in instructions in `SKILL.md` and `references/` that would lead an agent to do something unsafe.

Factorio itself and its files are out of scope.

## Supported versions

Only the latest commit on `main` is supported.

## Reporting a vulnerability

Please don't report a security problem in public. Report it privately through GitHub's [private vulnerability reporting](https://github.com/echohack/factory/security/advisories/new) for this repository.

Include what you found, how to reproduce it, and what it could let someone do.
