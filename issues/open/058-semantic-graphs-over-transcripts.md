# 058 — Semantic graphs over transcripts and summaries

**Status** open · **Opened** 2026-08-08 · **From** Dinis (brief v0.33.56, *Voice Debrief Ontologies*)

## Why

The second application of the concept model (issue 057), this time pointed at customer
content rather than at our own interface words: pull a concept structure out of each
recording, and map subsequent recordings against a scheme the customer already has, so
fifty voice notes become one index in their vocabulary.

The brief's own framing: **extraction alone is close to commodity and accumulates into
nothing; mapping against a supplied scheme is the valuable half; and what fails to map
is the finding.**

## Current state — nothing built, deliberately

A briefing pack has been assembled instead, because the visualisation cannot be designed
from a schema. It has to be designed from data nobody has seen yet.

`library/briefs/semantic-graphs/` — self-contained, zippable, no repo access needed:

| Doc | What |
|---|---|
| README | Index and status |
| 00 | The ask in one page |
| 01 | The product and the constraints that are not negotiable |
| 02 | What the concept scheme actually built, and the three views output must fit |
| 03 | Dinis's *Concepts, Not Words* brief, verbatim |
| 04 | Dinis's *Voice Debrief Ontologies* brief, verbatim |
| 05 | Engineering review of both |
| 06 | The simulation specification, with acceptance criteria |
| `data/` | The real `concepts.json`, `summary-prompt.md`, `translate-prompt.md`, `standard.json` |

The pack goes to an interactive session which produces a markdown simulation; that
simulation comes back here as the implementation specification.

## The three corrections recorded in doc 05

1. **Windowing is not sweeping.** The brief reads "five concepts at a time outperformed
   ten" as *window the whole scheme in slices*, then lists the resulting cost as a
   tension. Five-at-a-time is the **adjudication batch over retrieved candidates**; the
   retrieval step exists so the scheme is never presented whole. With retrieval, cost is
   O(unmapped spans) — one to three calls, flat as the ontology grows. Without it, a
   500-concept ontology costs 100 calls per recording and **cannot be quoted before it
   runs**, so it cannot be a workflow variant at all against our $0.30 ceiling.
2. **Embedding retrieval is not available.** No backend, and we have only ever called
   chat completions. Substitute lexical retrieval over label + altLabel + definition +
   scopeNote, in the browser — free, instant, and the brief's own "definitions improve
   matching" finding helps it more than it would embeddings.
3. **Format symmetry: one core schema, two profiles.** The core transfers; the review
   fields (`verdict`, `finding`, `proposed`, `current`, `keys`) mean nothing for a
   customer ontology, which instead needs provenance — which recording, when, at what
   confidence. "Same format" read as "same file" ends with one carrying the other's
   fields.

## Two things the brief under-weights

- **Our input is a voice note, not a document.** The cited research indexes documents
  yielding dozens of concepts; a 60-second note yields 3–8. Bootstrapping a scheme
  probably needs 20–50 recordings, not three. **This is the main thing the simulation
  must measure.**
- **The sticky asset is the sensitive one.** An ontology distilled from fifty private
  voice notes is more revealing than any single transcript. The brief argues persistence
  from retention; it should argue it from risk too, and under the ciphertext rule that
  decides whether `localStorage` is acceptable at all.

## Already half-built here

- Chat-emits-operations has a working precedent: `update_summary` / `update_transcript` /
  `restore_original`, tier `changes materials`, with *"✎ edited by the assistant ·
  restore the original"* on the page. Ontology operations belong in the same tiered
  registry.
- "What fails to map is the finding" is a house pattern three times over: record-not-block
  screenshots, the honest routing line, and the `decide` verdict in issue 057.

## Next

- [ ] Hand the pack to an interactive session; bring the simulation back into
      `library/briefs/semantic-graphs/responses/`.
- [ ] From it: the visualisation spec, the operation vocabulary, and the shape of a
      mapping step.
- [ ] `workflows/index.json` — an allowlist, because `WORKFLOW_URL` is a single
      hardcoded constant and "mapping is a workflow variant" means a second workflow.
- [ ] Provenance profile on the core concept schema.

## Links

- Pack: `library/briefs/semantic-graphs/`
- Depends on issue 057 (the concept scheme and the English pass)
- Rename to VoiceDebrief decided, `VoiceDebrief.ai` bought (8 Aug); 43 literals still
  say "Voice Note Transcribe"
