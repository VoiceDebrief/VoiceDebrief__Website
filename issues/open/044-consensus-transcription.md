---
created: 2026-08-06T17:30:00Z
source: team/humans/dinis_cruz/briefs v0.33.56 (part two: parallel models, disagreement is the product)
priority: high
estimated_effort: large
blocked_on: a second audio-capable model from a different family — a Dinis amendment to decision D2 (the five-model allowlist has only gemini-3.5-flash for transcription), chosen by MEASURED error divergence on hard fixtures, not benchmark accuracy
---

# Consensus transcription: two models, and disagreement marked, not resolved

Two transcription models in parallel + a consolidator that MARKS content-word
disagreements (`[OWASP | OAS]`) instead of choosing — the consolidator cannot
hear the audio, and the literature shows a text-only corrector picking on
plausibility can roughly double the error rate. Free where punctuation/casing
differ; mark where a content word differs. The disagreement rate is a free
per-file quality score. Requires two new step kinds (`parallel`, `consolidate`)
in the workflow schema — the declaration format already carries the rest.

## Status 6 Aug (created)
Blocked on the model choice above. Steps 1–4 of the brief (declare, budgets,
panel, trace overlay) shipped as issues 042–043; this is step 5.
