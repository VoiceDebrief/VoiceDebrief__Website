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
