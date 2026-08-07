---
created: 2026-08-06T17:30:00Z
source: team/humans/dinis_cruz/briefs v0.33.56 (steps 3-4: visualisation + execution overlay); library/dev_packs/v0.1.21__workflow-state-machine/
priority: high
estimated_effort: medium
---

# The flow panel: what will happen, what it may cost, what actually happened

A third right-edge tab (🧭 flow) beside 💬 chat and ⚙ debug rendering the
declared workflow — before a run the declaration (steps, models, spending
ceilings, the conditional branch, the quoted maximum for the chosen options);
during and after a run the same cards driven live by the execution trace.

## Outcome 6 Aug 2026 — SHIPPED
- `wa-flow-panel` v0.1.0: resizable pane in the house pattern; joins the
  one-pane-at-a-time protocol; live `wa:workflow:*` overlay with per-step
  status (waiting/running/done/degraded/failed/stopped/not-requested), actual
  cost against ceiling with overruns flagged in red, durations, the skipped
  branch dimmed; a running step gets a spinner + elapsed ticker; the quote
  re-renders when the infographic checkbox changes. Footer links the raw
  declaration file and the design brief (the receipts habit).
- Pure API consumer (`getWorkflow`/`getWorkflowTrace`); GBP display via the
  `window.__waFlow` handoff (the `__waChat` idiom).
- Covered by app-boot checks (opens, closes chat, renders the 5 declared
  steps) and a new qa-to-docs journey shot (08-flow-run) of the panel over a
  finished run.
