---
created: 2026-08-06T11:00:00Z
source: library/review-packs/v0.1.20__project-review/v0.1.20__02__code-and-architecture-review.md (review findings S1–S5)
priority: urgent
estimated_effort: medium
---

# App security hardening: ?origin= allowlist, CSP, chat prompt-tool gating

The v0.1.20 review's security findings, to close before the seeded-key era:

1. **`?origin=` allowlist (S1, the urgent one)** — `config.js` lets a query param
   replace the engine origin and `engine.js`/`infographic.js` dynamically import
   from it: a crafted link executes attacker JS in the app origin, where the user's
   OpenRouter key sits in localStorage. Allowlist `dev.tools.sgraph.ai`,
   `tools.sgraph.ai`, localhost. ~5 lines.
2. **Meta CSP on the app page (S2)** — pinned `script-src`/`connect-src`; neuters
   the S1 class and bounds the SVG/XSS surface.
3. **Gate model-callable `set_prompt`/`reset_prompt` (S3)** — model output can
   currently persist prompt overrides to localStorage across sessions (prompt
   injection via a poisoned voice note). Human-confirm or de-scope; consider
   confirm-gating `update_transcript`.
4. **SVG sanitisation (S4)** — verify upstream `sg-llm-infographic` sanitisation or
   strip `on*` attributes / `<foreignObject>` before DOM insertion; add
   hostile-content render tests (review doc 03 D1).
5. **Smaller (S5)** — rename the `sg-openrouter-mgmt-key` localStorage key (with
   migration read); validate key on save via `getKeyStatus`; escape the model name
   in `infographicNote`.

Related but tracked elsewhere: secret scanning / pre-commit control is issue 013;
the AppSec seeded-key conditions doc + SECURITY.md is issue 010's first deliverable.

## Status 6 Aug (created)
Open, not started. Items 1–2 are the highest-value hours in the repo right now.

## Status 6 Aug (later) — items 1 and 2 SHIPPED
- **Item 1 done**: `config.js` validates `?origin=` against an allowlist
  (`dev.tools.sgraph.ai`, `tools.sgraph.ai`, `localhost`, `127.0.0.1`; http/https
  only, origin-only — paths stripped) and falls back to the default origin with a
  console warning. Unit-tested including evil-host, suffix-spoof
  (`dev.tools.sgraph.ai.evil.example`) and `javascript:` cases.
- **Item 2 done**: meta CSP on the app page — `script-src`/`connect-src` pinned to
  self + the two tools origins + OpenRouter + the pinned jsdelivr decoder
  (`blob:` and `'wasm-unsafe-eval'` are required by sg-wasm-cache's blob-URL
  import of the inlined-WASM opus decoder); `object-src 'none'`, `base-uri 'self'`.
  Verified against the full real decode chain (fixture → sg-audio-decode →
  cachedImport → WASM opus decode → WAV) and both integration gates.
- Also: `scripts/mirror_engine.mjs` builds a local engine mirror for the
  integration tests' MIRROR_DIR mode (review E4 — sandboxed/pinned runs).
- Items 3–5 remain open.

## Status 6 Aug (qa merge) — item 1 superseded by issue 041
The qa branch independently found and allow-listed the same `?origin=` vector the
same day; Dinis then called the better fix — **remove the parameter entirely**
(issue 041, merged): `ORIGIN` is a hardcoded constant and a unit test asserts
`config.js` never reads the query string. S1 is closed by removal, not by
allow-list. Item 2 (the CSP) stands and its localhost allowances were tightened
away with the parameter. Items 3–5 remain open.
