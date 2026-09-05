# Homepage viewport review — item 12

Not pushed yet. Cost: $0 — local static preview and fake town responses only.

## Scope and branch

`codex/item-12` starts from freshly fetched homepage `origin/main` at `4985ba0`.
The first `index.html` attempt added exactly four declarations: the `dvh` version immediately follows
each original `vh` fallback for the overlap margin, stage height, hero minimum height
and reduced-motion scene height. No typography, spacing, palette, imagery, copy,
animation timing or existing content was changed.

Port 8398 was already occupied by an older preview. It was left untouched. The approved
worktree is served on `127.0.0.1:8400`; neither 8398 nor 8399 was stopped or changed.
The fresh helper uses no old screenshot scripts, credentials, cookies, app imports,
production requests, database, AI build or real form submission.

## First attempt: preserved before any iteration

Screenshots: `drafts/shots/item-12/attempt-1/`.
Measurements: `drafts/shots/item-12/attempt-1/measurements.json`.

| Size | Initial hero height | One screen | Content retained | Horizontal overflow |
|---|---:|---|---|---:|
| 390×844 | 950.77px | **No — 106.77px taller** | Yes | 0px |
| 1280×720 | 720px | Yes | Yes | 0px |
| 1440×900 | 900px | Yes | Yes | 0px |
| 1920×1080 | 1080px | Yes | Yes | 0px |

Normal and reduced motion have the same hero measurements. All eight runs have viewport-
sized sticky stages, no JavaScript errors, and no horizontal overflow before or after
the fixture search. Reduced-motion scenes match the viewport too. Real scroll events
were exercised at the start/middle/end of each scene; each run retains scene screenshots.
Search results are deliberately allowed to grow the hero and remain reachable.

The first mobile one-screen requirement was **not complete**. The stacked hero's content
exceeds the viewport even though the dynamic minimum height is correct. Preserve this
attempt was preserved and the first screenshots were shown before a mobile adjustment
was authorized. No text is cropped or hidden to force a pass.

Visual inspection also found a baseline reduced-motion bug: all three scene starts
coincided, letting the following Examples section cover them. The initial measurements
proved their heights, not their visibility. The second attempt adds exposure and
increasing-scene-position checks rather than treating those first screenshots as passes.

## Authorized narrow second attempt

Only a new `max-width:520px` block adjusts the small-phone hero: grid gap 36→16px;
padding 92px/20px/64px→84px/20px/20px; heading top margin 20→12px; paragraph top
margin 18→10px; search top margin 26→16px. The preview retains its 16:10 mobile
aspect ratio, is centred and capped at 290px wide. The previously hidden scroll hint
is shown with an 8px top margin. Font sizes and line heights are unchanged. All
desktop and wider-tablet rules remain unchanged.

Within the existing reduced-motion media query only, the overlap margin is reset to
zero. Normal animation lengths remain `520vh`; no animation has been added.
Screenshots and results for this round are retained separately in `attempt-2/`.
Final measurements: all four initial heroes now match their requested viewport height
(844/720/900/1080px) with every hero text block, search, preview, caption and scroll hint
inside the first screen. All normal/reduced runs have zero horizontal overflow. The
three desktop hero PNGs are byte-identical to attempt 1. The parent reviewer opened
the corrected phone hero and all three phone reduced-motion scenes.

`attempt-3/` repeats this exact same design with the added 844→700→844 phone resize
check. All eight runs pass their layout, exposure and animation-endpoint checks; stage
heights recompute and return correctly, and hero content is retained at 700px without
forcing it into one screen. Each run blocked 16 production requests and used eight
town fixtures. Ten focused offline tests pass. These are **Chromium CSS viewport
checks**, not a real iPhone or Safari test. Safari toolbar expand/collapse remains a
manual check; only two visual designs were attempted, with all earlier proof retained.

### Existing price-label issue — follow up in item 15

Do not interpret the animation-endpoint check as proof that every scene's text is
fully visible. Source and browser boxes confirm the existing `.stage .lab` absolute
positioning also applies to `.price .line .lab`. On the phone, the second price label
extends about 16px into the following value's box. This predates item 12 and appears
with normal motion too. No price styles or text changed here. Item 15 should separate
the row labels from the stage label positioning and verify every wrapped label.

## Safety and limits

The browser fence was installed before every navigation. It blocked 16 attempted
production analytics requests; eight town searches used a fixed five-row fixture.
Only public static GETs reached the local preview. No subscriptions were submitted.
Eight focused Node tests passed. The browser helper correctly exited 1 because the
two mobile one-screen checks failed; this is not an all-green preview.

Headless Chromium supports `dvh` here, but a fixed emulated viewport cannot prove how a
real mobile browser's toolbar expands or collapses. A device check remains appropriate.
The reviewed screenshots and existing price-label limitation are recorded above.

## Reproduce safely

Start the local server only after verifying its port is free; never stop another listener:

```sh
cd /root/code/uw-codex-site
python3 -m http.server 8400 --bind 127.0.0.1
```

In a separate shell, run the guarded helper from its installed dependency folder. Use a
new attempt number (1 through 4); earlier evidence is never overwritten or deleted:

```sh
cd /root/tools/shot
NODE_PATH=/root/tools/shot/node_modules node /root/code/uw-codex-site/tools/homepage_preview.js attempt-2
```

Do not push `main`: that deploys the public homepage. This is a review branch only;
the public homepage remains unchanged.
