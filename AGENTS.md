# Unwebbed marketing site (unwebbed.app)

This repository is the static homepage served by GitHub Pages at https://unwebbed.app.
It is one of two Unwebbed codebases. The other is the web app at https://app.unwebbed.app,
in the private repository `finleysmith1-ctrl/unwebbed-cloud`.

**The full project handoff for any AI assistant, including Finley's standing rules, how
changes ship, and the open items, is `AGENTS.md` at the root of that app repository.**
Read it before changing anything here. Its "marketing site" section covers this repo.

Quick facts for this repo:

- No framework, no build step. `index.html` is the whole homepage; `examples/` holds the
  example sites it links to.
- Deploy = push to `main`. GitHub Pages rebuilds in roughly 40 to 60 seconds. Every file
  in this repository is public, so never commit anything private.
- The first line of any report to Finley about this site is **"Live on unwebbed.app"** or
  **"Not pushed yet"**.
