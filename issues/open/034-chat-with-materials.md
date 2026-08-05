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
