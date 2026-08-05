---
created: 2026-08-05T23:30:00Z
source: Dinis — "add the ability to 'chat' with the materials created and to control the tool workflow from the chat environment (via tools)" — a major commercial opportunity
priority: high
estimated_effort: large
---

# M3: chat with the materials; drive the tool from the chat (via tools)

Build the chat panel per the design brief
[`library/dev_packs/v0.1.18__chat-with-materials/00__design-brief.md`](../../library/dev_packs/v0.1.18__chat-with-materials/00__design-brief.md),
which captures the patterns studied (5 Aug) in the reference vault app's chat UX:
context composer built from the same rows as the request, app-owned fenced-block tool
calling against a typed registry, three told-to-the-model budgets, every tool call
visible in the transcript, timer-driven progress, catalogue-matched model choice.

## Status — 5 Aug 2026: BUILT and mock-verified; live keyed validation pending

Everything below is implemented and green: `website/app/chat.js` (controller: context
rows + the bounded exchange loop, registered as API actions), `website/app/chat-tools.js`
(typed registry, 9 tools, three budgets, tolerant fenced-block parser), the `chat` action
on the engine (audited `kind: chat` in the exchange log), `prompts/chat-prompt.md` (5th
editable template), `wa-chat-panel` v0.1.0 (💬 resizable pane: composer drawer, tool
drawer, thread with visible tool rows, suggestions, model select, spend meter, elapsed
ticker), `wa-debug-panel` v0.1.2 (one side pane at a time).

Verified: 30 unit tests (incl. the parser suite) + 17 app-boot checks + the new
**`tests/integration/chat-loop.test.mjs`** — a deterministic, keyless CI test that
scripts OpenRouter end to end: pass → grounded prose (0 steps) → fenced tool call →
`redraw_infographic` REALLY runs (SVG lands on the page) → confirmation prose, with
machinery marking, audit trail and panel rendering all asserted. Wired into both CI
test jobs.

**CLOSED 6 Aug 2026**: Dinis validated the chat live with a real key — "it worked
perfectly" — including tool-driven exchanges (`get_results`, `get_exchanges`) and,
fittingly, having the chat write the developer brief that became issue 035.

## Acceptance
- `wa-chat-panel` (💬, resizable) chats over the pass results with a ticked context
  composer and live cost display (GBP).
- The model can drive the workflow through registry tools that delegate to existing
  `window.__tool` actions only (redraw infographic, change prompts/models, run a
  sample, read costs/exchanges) — bounded by step/spend budgets, all calls audited in
  the transcript AND in the debug pane's exchange log.
- Chat system prompt is a site-served markdown template, editable in the debug pane.
- Keyless integration checks for the panel; keyed e2e for one tool-driven exchange.
- No vault keys or secrets anywhere in the repo (ciphertext rule).
