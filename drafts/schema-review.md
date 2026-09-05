Not pushed yet

# Homepage FAQ and structured data

Item 13 starts at `22157e9` on `codex/item-12` and adds its own work on `codex/item-13`.
Nothing was merged to main or published. Cost: $0.

## What changed

Added `Organization` with the existing public name, homepage, logo and email. Added
`FAQPage` for all nine existing questions. The original `SoftwareApplication` script is
byte-identical, including its $19 Solo and $49 Studio offers.

Two visible answers changed with the 05:44 board approval: Overture Maps first with
OpenStreetMap fallback and honest incomplete checks; earnings recorded when the client
pays, with Finley handling payouts and automatic Stripe payouts not yet available.
All dollar amounts and the other seven answers are unchanged. No payout timing promised.
The UX-copy skill informed the short, literal wording. No palette, layout or image edit.

## Checks and first preview

`node --test tests/*.test.js`: 18 passed (10 viewport/fence tests and 8 schema tests).
`git diff --check`: clean.

Actual local browser checks at 1440×900 and 390×844: all nine questions and complete
answers match the JSON-LD exactly, 0px horizontal overflow, no JavaScript errors.
The context-wide fence was installed before page creation/navigation; six production
analytics requests were blocked. No town search, subscription, live page or app request
was allowed through. The local served HTML exactly matched the worktree source.

First-attempt files, all retained under `drafts/shots/item13/`:

- `faq-desktop.png`, `faq-mobile.png`
- `leads-desktop.png`, `leads-mobile.png`
- `earnings-desktop.png`, `earnings-mobile.png`
- `preview.json`, `schema-input.html`

Root reviewed all six first screenshots before any iteration. No iteration was needed.
The whole-desktop-FAQ element crop includes the existing fixed navigation over its first
question; this is a capture limitation, not a new source change. The changed-answer crops
and mobile screenshot are clear.

## Actual Schema.org validation

Used [Schema.org Validator](https://validator.schema.org/) → Code snippet → Run test.
The [official validator documentation](https://schema.org/docs/validator.html) supports
direct markup and combining JSON-LD scripts. No live URL was submitted. The inert wrapper
contains all three exact scripts, a restrictive CSP, and no external HTML resource tags
or executable scripts. No guessed/private validation API was used.

The editor copied back exactly the submitted local input before running. Observed result:

| Type | Errors | Warnings | Items |
| --- | ---: | ---: | ---: |
| Organization | 0 | 0 | 1 |
| SoftwareApplication | 0 | 0 | 1 |
| FAQPage | 0 | 0 | 1 |
| Total | 0 | 0 | 3 |

Actual result PNG: `drafts/shots/item13/validator-result.png`.
Counts, hashes and method: `drafts/shots/item13/validator-result.json`.
This proves the submitted structured-data bundle passed the tester; it is not a claim
that Google will display an FAQ rich result or that the draft has been published.

The homepage source SHA-256 was
`f7a36323c827388d81b1f3905b1c5f22d689ecf4316e214df90e8c7906cc4351`.
The exact submitted input SHA-256 was
`f03aea2f7afd43768e78b927da0d93fde9f0c3b67c8658de48dd554aea8a12da`.
The unchanged SoftwareApplication body SHA-256 was
`c175b00403237c9eacd167f4563f7376e6b39b89fe412074b4d21ed7ff7de8ad`.

For future FAQ edits, update visible text and its JSON-LD together, run the tests, then
repeat external validation with a new retained evidence folder. Finley's yes is still
required before anything goes live.
