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

## Viewport sizing and isolated local preview

- `index.html` keeps `100vh` fallbacks followed by `100dvh` for the hero minimum
  height, sticky-stage height, overlapping-scene negative margin, and reduced-motion
  scene height. The `520vh` animation travel lengths are intentional and unchanged.
- The hero uses a minimum height, not a fixed crop. Content and in-place town results
  may make it taller than a viewport; test that text, search and the example remain
  available rather than hiding overflow to force a one-screen measurement.
- At widths up to 520px, tighter hero spacing and a centred 290px-wide preview keep
  the original font sizes, words, image aspect ratio and visible scroll hint. The
  desktop layout is unaffected. In reduced motion, scene overlap margins are zero so
  the three explanation sections remain separate and readable.
- `tools/homepage_preview.js` exercises 390×844, 1280×720, 1440×900 and 1920×1080,
  normal and reduced motion. It accepts only the approved worktree and a local preview
  at `http://127.0.0.1:8400`, checks the served HTML matches the worktree, and refuses to
  overwrite an earlier screenshot attempt. Run from `/root/tools/shot` with
  `NODE_PATH=/root/tools/shot/node_modules node /root/code/uw-codex-site/tools/homepage_preview.js attempt-1`.
- The homepage sends a production `/px` beacon even on localhost. The helper installs
  its context-wide request fence before navigation: external requests and WebSockets
  are blocked, town search and subscription submissions are local response fixtures,
  and only public static local assets may reach the preview server. Do not replace
  this with an unfenced browser script or saved-account screenshot tool.
- Focused offline checks: `node --test tests/homepage_preview.test.js` from this repo.
  Screenshot measurements report a failed check with exit 1; setup failure exits 2.
  A fixed headless viewport is not proof of mobile browser-toolbar behavior; retain
  a real-device check for that browser-specific interaction.

## Homepage structured data

- The head contains three separate JSON-LD blocks: the original `SoftwareApplication`
  and its unchanged Solo/Studio offers, `Organization`, and `FAQPage`.
- `FAQPage` mirrors all nine visible `.faq details` questions and their complete answer
  text, including both paragraphs of the publishing answer. Update the visible answer
  and JSON-LD together. The lead-source answer describes Overture Maps with OpenStreetMap
  fallback and incomplete checks; earnings are recorded when paid and paid out by Finley,
  with automatic Stripe payouts unavailable and no payout timing promised.
- `Organization` uses Unwebbed, `https://unwebbed.app/`, the existing `/brand/mark.svg`
  logo, and `hello@unwebbed.app`. Do not invent reviews, social profiles or company facts.
- Run `node --test tests/*.test.js` for schema/copy agreement and viewport-fence checks.
  `tools/homepage_schema_preview.js` uses the same pre-navigation production fence as
  the viewport helper and checks actual DOM answers on desktop and phone. Run it from
  `/root/tools/shot` with that folder's `NODE_PATH`; existing evidence is never overwritten.
- For external schema validation, submit only the helper's inert `schema-input.html`
  through Schema.org Validator's Code snippet tab, never a live URL or the executable
  homepage. It contains all three exact JSON-LD blocks and no fetchable HTML resources.
  Keep the input hash and actual tester counts with the result screenshot. A local JSON
  parse check is not an external validator result or a promise of search visibility.
