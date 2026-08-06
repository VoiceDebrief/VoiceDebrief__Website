# Design Brief: The Workflow Declared — A JSON State Machine With The Budget On The Step

**version** v0.1.21
**date** 6 August 2026
**from** Claude (build session agent), from the human brief v0.33.56 (Dinis, 6 Aug)
**to** Dev, Architect, Designer, QA
**status** SHIPPED (steps 1–4 of the brief's build order) — this pack was written immediately before the build it describes
**source** `team/humans/dinis_cruz/briefs/` v0.33.56 ("workflows as state machines; the budget belongs on the step; disagreement is the product")

*Part of the [project library](https://whatsapp-voice-transcription.sgraph.ai/library/) — every doc behind this product, organised by audience.*

---

## What This Builds

The v0.33.56 brief in one sentence: lift the existing one-pass out of code and declare
it as a state machine in a JSON file — each step naming what it requires, what it
produces, which model it uses, **what it may spend**, where it may go next and what
happens when it fails — then let everything else (a quotable maximum price, a
visual "what will happen / what actually happened" view, parallel consensus
transcription, purchasable variants) grow out of that declaration.

Dinis's steer on top of the brief: **make it a generic JSON state machine**, because
that scales. This pack reconciles that with the brief's own "do not build a workflow
engine" caution by splitting along the right line:

- **The format is generic.** Any DAG of steps with `requires / produces / model /
  budget / next / on_failure` is expressible. The consensus workflow and the price
  variants are new *files*, not new code shapes.
- **The machinery is minimal.** A validator, a runner that walks the declaration
  (~150 lines), and a renderer. No expression language — conditions are declared
  option flags (`"when": "options.infographic"`). No editor, no scheduler. If a
  real engine is ever needed it will grow out of working files, not precede them.

## Grounding: What The Code Does Today

`website/app/pipeline.js` **is** the workflow, implicit in code: normalise (content
sniffing, issue 025) → ingest (engine `addFiles` + the issue-029 dedupe-reuse) →
transcribe (`transcribeItem`, engine default `google/gemini-3.5-flash`) → summary
(`ask` with the site-served prompt) → infographic (only if asked; model from the
picker). Failure behaviour is already differentiated and already correct:
transcribe failures **abort**, summary and infographic failures **degrade** (the
transcript stands on its own). The declaration must state exactly this — step 1 of
the build order changes no behaviour.

Two things make this repo unusually ready:

- The app already fetches its prompts as site files at runtime (5 Aug decision), so
  a workflow file at `website/app/workflows/standard.json` is the established
  pattern, not a new one. Same-origin fetch, inside the CSP.
- The debug store already records every LLM exchange with model, latency, cost and
  generation id — the execution trace is an overlay of step ids onto records that
  already exist, not a new capture layer.

## The Declaration

`website/app/workflows/standard.json` (schema enforced by a validator that runs at
load AND in unit tests):

```json
{
  "id": "standard", "schema": 1, "version": "v0.1.21",
  "title": "Standard",
  "description": "Transcript, summary and an infographic from one voice note.",
  "start": "normalise",
  "steps": [
    { "id": "normalise",  "kind": "local",           "label": "Identify the audio",
      "requires": ["file"],       "produces": ["audio"],      "budget": { "usd": 0 },
      "next": [{ "to": "ingest" }],       "on_failure": "abort" },
    { "id": "ingest",     "kind": "engine",          "label": "Load into the engine",
      "requires": ["audio"],      "produces": ["item"],       "budget": { "usd": 0 },
      "next": [{ "to": "transcribe" }],   "on_failure": "abort" },
    { "id": "transcribe", "kind": "llm-transcribe",  "label": "Transcribe",
      "model": "google/gemini-3.5-flash",
      "requires": ["item"],       "produces": ["transcript"], "budget": { "usd": 0.05 },
      "next": [{ "to": "summary" }],      "on_failure": "abort" },
    { "id": "summary",    "kind": "llm-text",        "label": "Summarise",
      "model": "google/gemini-3.5-flash",
      "requires": ["transcript"], "produces": ["summary"],    "budget": { "usd": 0.02 },
      "next": [{ "to": "infographic", "when": "options.infographic" }, { "to": "done" }],
      "on_failure": "degrade" },
    { "id": "infographic","kind": "llm-infographic", "label": "Draw the infographic",
      "model": "options.infographicModel",
      "requires": ["transcript"], "produces": ["infographic"],"budget": { "usd": 0.20 },
      "next": [{ "to": "done" }],         "on_failure": "degrade" }
  ]
}
```

Schema decisions, and why:

| Decision | Reason |
|---|---|
| `model` is a pinned identifier, or an `options.*` reference for the one user-selectable step | The brief wants pinning; the infographic picker is existing UX that stays. The reference is *declared*, so the workflow still cannot call an unlisted surface |
| `budget.usd` — the unit is USD | The engine already meters USD; GBP is a display concern (5 Aug decision). This answers the brief's open question with a decision the repo already made |
| `when` values are dotted option flags only | The entire "expression language" is `options.<name>` truthiness. Anything richer is the engine the brief forbids |
| `on_failure` ∈ `abort` / `degrade` | Exactly the two behaviours the code already has. `degrade` records the failure and takes the step's `next` as if skipped; `abort` stops the run with the existing error codes |
| `done` is the single terminal | Every path must reach it; the validator walks reachability |
| `schema: 1` + workflow `version` | An output should be able to say which definition produced it (the brief's versioning question) |

## Budgets: Honest Semantics

A browser cannot halt a model mid-call, so pretending a budget interrupts a step
would be theatre. The enforceable, honest semantics:

1. **The quote.** For the options chosen, the runner computes the path's budget sum
   before anything runs. The UI shows it next to the Transcribe button ("max cost
   for this run ≈ £0.21") — the brief's "maximum cost knowable before it runs".
2. **The entry gate.** Before *entering* any step: `spentSoFar + step.budget` must
   fit within the path's declared total. A workflow that overran earlier is stopped
   at the next boundary with a `workflow-budget` error — it cannot keep spending.
3. **The overrun flag.** After each step, actual cost is recorded against the
   declared ceiling; an overrun is marked in the trace (and visible in the flow
   panel) rather than silently absorbed. Declared-vs-actual becomes measurable,
   which is how the brief's "too tight / too loose" tension gets settled with data.

## The Execution Trace

`runPass` builds a trace alongside the results — one entry per step: `id, label,
model, budgetUsd, status (pending → running → done | failed | degraded | skipped),
startedAt, ms, costUsd, overrun, error` — emitted live as `wa:workflow:step` events
and attached to the results object. It references the debug store's exchange ids
rather than duplicating them. This is the provenance record: which models ran, in
what order, what each cost, which path was taken.

## The Flow Panel (the new sidebar)

`wa-flow-panel` v0.1.0 — a third right-edge tab (🧭 flow) above 💬 chat and ⚙ debug,
joining the existing one-pane-at-a-time protocol (`wa:panel-opened`). Same resizable
pattern as the other panels. Two states, one rendering:

- **Before a run**: the declaration — the step cards in sequence with model,
  budget and the conditional branch visible, plus the quoted maximum for the
  currently chosen options. This is "what will happen", readable by a customer.
- **During/after a run**: the same cards driven by the trace — live status,
  actual cost against budget, duration per step, degraded/failed states honestly
  coloured, the skipped branch dimmed. This is "what actually happened".

Design intent: calm and professional — the visual language of the site (navy,
mist, the existing chip/tag idiom), motion limited to state-colour transitions
and the existing spinner; no animation for its own sake. A footer links to the
raw declaration file — the receipts habit from the engineering hub.

## API Surface (all through `window.__tool`, as everything is)

| Action | Returns |
|---|---|
| `getWorkflow()` | `{ definition, maxUsd, pathUsd(options) }` — the declaration + quotable ceilings |
| `getWorkflowTrace()` | the current/last run's trace (empty before any run) |

`runPass` keeps its exact signature and its exact event stream — every existing
component and test continues to work. **Acceptance for step 1 is the brief's own:
deleting `standard.json` breaks the tool** (there is no code fallback), and all
existing gates stay green because behaviour is unchanged.

## What Is Deliberately NOT In This Slice

- **The consensus workflow (brief part two).** Blocked on a real decision: the D2
  model allowlist has only one audio-transcription model (`gemini-3.5-flash`), and
  consensus needs a second from a *different family*, chosen by measured error
  divergence on hard fixtures — a Dinis amendment to D2. Issue opened, not built.
  When it lands it is two new step kinds (`parallel`, `consolidate`) and a new
  file — the schema already carries it.
- **Named purchasable variants** (brief step 6) — trivially new files once pricing
  copy exists; sequenced after consensus so the price ladder is real.
- **An editor, conditional expressions, a scheduler** — the engine the brief
  forbids.

## Sequencing (matches the human brief's build order)

1. **Declare + execute from the declaration** — no behaviour change (issue 042)
2. **Budgets enforced + max cost quoted pre-run** (issue 042)
3. **The flow panel rendering the definition** (issue 043)
4. **The execution trace overlaid live** (issue 043)
5. Consensus: parallel step + disagreement-marking consolidator (issue 044 — needs the D2 amendment)
6. Named workflows at price points (issue 045)

## Testing

- Unit: the validator against the shipped file and against broken definitions
  (unknown transition, unreachable step, duplicate id, negative budget, missing
  failure path); budget math for both option states.
- Integration: the existing app-boot and chat-loop suites unchanged and green —
  that is the no-behaviour-change proof; app-boot gains flow-panel checks.
- QA-to-docs: a new journey shot of the flow panel over a finished run — the
  "what actually happened" view becomes a user-docs image the day it exists.

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
