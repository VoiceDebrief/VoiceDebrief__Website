---
created: 2026-08-06T17:30:00Z
source: team/humans/dinis_cruz/briefs v0.33.56 (workflows as state machines); library/dev_packs/v0.1.21__workflow-state-machine/
priority: high
estimated_effort: medium
---

# The workflow declared: a JSON state machine with the budget on the step

Lift the one-pass out of code into `website/app/workflows/standard.json` — each
step declaring id / kind / label / requires / produces / model / budget / next /
on_failure — and execute FROM the declaration (steps 1–2 of the v0.33.56 brief's
build order). Generic format, minimal machinery: a validator, a runner (~150
lines), no expression language (`options.<flag>` truthiness only), no editor.

## Outcome 6 Aug 2026 — SHIPPED
- `website/app/workflow.js`: validator (duplicate ids, unknown transitions,
  reachability both ways, budget/failure-mode/when checks, declared fallback
  required), quote maths (`pathUsd`/`maxUsd`), and the runner with honest budget
  semantics — the quote is the path's budget sum, the ENTRY GATE stops a run that
  has overrun at the next step boundary (`workflow-budget`), and per-step
  overruns are recorded on the trace, never absorbed.
- `pipeline.js` executes from the declaration; the step bodies became executors;
  the wa:* event stream is byte-identical. Deleting standard.json breaks the
  tool — there is no code fallback (the brief's own acceptance test).
- The quotable maximum is shown on the options screen before a run ("max cost
  for this run ≈ £0.21"), following the infographic checkbox.
- New actions `getWorkflow` / `getWorkflowTrace` (manifest: 37); the execution
  trace (per-step status, cost vs ceiling, duration, path taken) rides on
  `results.trace` and streams as `wa:workflow:*` events — the provenance record.
- One declared-behaviour fix, recorded honestly: the code SAID infographic
  failures degrade but actually aborted the pass (stage 4 had no try/catch);
  the declaration now enforces the stated policy — an infographic failure
  degrades and `wa:pass:complete` still fires.
- Tests: 7 new unit tests (validator negatives, quote maths, runner
  abort/degrade/budget-gate/skip semantics); app-boot gains workflow checks;
  the chat-loop suite passing unchanged is the no-behaviour-change proof.
