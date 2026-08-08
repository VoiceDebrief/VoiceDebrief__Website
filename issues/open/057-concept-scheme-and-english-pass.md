# 057 — Concepts, not words: a concept scheme and an English review pass

**Status** open · **Opened** 2026-08-08 · **From** Dinis (brief v0.33.56, *Concepts, Not Words*)

## Why

An abstraction layer between the concepts the product expresses and the words each
culture uses for them. The brief's own worked example is the argument: `draft`
translates to `rascunho`, which reads badly — and chasing that led to the discovery
that **the English word was probably wrong first**. Naming a concept forces a
decision the source language let you avoid, which makes the layer a quality control
on English rather than only an aid to translation.

Adopt rather than invent: SKOS already models one concept carrying one preferred
label per language, alternative labels, and broader/narrower/related relations.

## What was built (M1 — the English pass)

`website/engineering/concepts/` — a review surface, **deliberately not wired to the
shipped strings**. Nothing on the app page reads `concepts.json`; the locale files
are still hand-written and still the only thing the product loads.

- **`concepts.json`** — 15 concepts in 3 schemes, each with a definition, a scope
  note, the label that ships today in all four cultures, a verdict, a finding, and
  proposed labels where the English is wrong.
- **The page** renders it three ways, because deciding how to look at this was half
  the ask: **cards** (definition first — good for deciding), **matrix** (every
  culture on one row — good for spotting divergence), **relations** (the
  broader/narrower/related graph — the structure a held-out check would compare).
- **`tests/unit/concepts.test.mjs`** — 5 tests: schema, verdict/proposal coherence,
  relation symmetry both ways, the count, and the drift gate.

## The verdicts

| | |
|---|---|
| **change** | 2 — `draft`, `soon` |
| **decide** | 4 — `language` ×2, `Routed — cheapest`, `Restricted*` |
| **keep** | 9 |

### `draft` → `unreviewed` (the one that started it)

The answer is not the one the brief guessed. The brief supposed the concept behind
`draft` was *incomplete coverage* and proposed "incomplete or partial". The data
says otherwise: **all four locales ship 53 of 53 keys**. Nothing is missing.
`locales/index.json` states what the flag actually gates — *"a locale flips to
`live` only after a human has reviewed its qa-to-docs screenshots"*.

So the concept is a state of **verification**, not of **authoring** and not of
**coverage**. `draft` names the wrong axis; `incomplete` and `partial` name a
different wrong axis. And `rascunho` was never a bad translation — it faithfully
carried a word that was already pointing the wrong way, which is exactly the
property the brief argues for, landing harder than its own example.

The Portuguese then diverges legitimately: pt-PT `por rever`, pt-BR `não revisado`.

### `soon` → `planned`

`en-gb/culture.json` declares the register as *"Plain, direct British English. No
marketing register"* — and `soon` is a promise about time that nothing backs. The
concept is intent, not imminence. pt-PT `planeado` / pt-BR `planejado`, a real
orthographic split.

### The privacy chips (decide — these want sign-off)

`Routed — cheapest` and `Restricted*` both name a **mechanism** inside a group
labelled *privacy*, where the question is where the audio goes — and the first
smuggles a second axis, price, into the same string. `On-device` is the only chip
already labelled on the scheme's own axis, which is how the inconsistency was
spotted at all. Proposed: *Any provider* / *Approved providers only* / *On-device*,
one scale on one axis. **Not changed unilaterally**: these are claims made to users
about their recordings.

### The one that is not a defect

pt-PT uses `idioma` for the setting and `língua` for the tongue that was spoken.
English uses one word for both and gets away with it because context disambiguates.
Portuguese is being *more* precise, not inconsistent — a genuine lexical gap.
Recorded, not forced.

## Departures from the brief, and why

1. **Terms, not strings.** The app ships 53 keys and most are prose. A sentence does
   not have a concept — it has meaning in context. Modelling the whole table would
   miscategorise the majority of it, so only the ~20 genuine terms are in scope.
2. **The held-out check is a report, not a gate — and is not built.** It is
   model-generated and, by the brief's own argument, cannot tell a bad translation
   from a lexical gap. Every other gate in this CI is deterministic; one flaky
   model-judged gate would erode trust in the rest. This is the same conclusion
   issue 053 reached about screenshots, for the same reason.
3. **The vocabulary, not the RDF stack.** No triple store, no SPARQL, no skos-xl
   reification. For 15 concepts on a site with no backend that is all cost.
4. **A graph-divergence check is premature.** 15 terms induce 21 edges, and the
   relations view exists partly to make that visible. Within a scheme the shape is
   real; across a vocabulary this flat, two cultures would differ mostly by noise.

## The drift gate

The brief lists *"how is the scheme kept in step with shipped strings?"* as an open
question. A separate surface drifts, and a review document describing strings that
changed months ago is worse than none because it is confidently wrong. So every
concept records what ships and `concepts.test.mjs` asserts those recordings against
the real locale files. Proven to bite: changing `pt-pt/core.json`'s `localeDraft` to
`esboço` fails the build with the concept named.

## Answering the brief's "what I have not seen"

Two things already existed:

- **`culture.json` carries a `tone` field per locale** — *"Português europeu, directo
  e sóbrio. Tratamento por 'você'…"*. The nearest thing we ship to a scope note.
- **The per-culture explanation layer exists** — in the Claude Design response
  (`library/briefs/ux-experiments/responses/design_handoff_culture_packs/`: reason
  markers plus a ten-row compare matrix), not in the product.

## Next

- [ ] Decide the four `decide` verdicts — the two privacy chips need Dinis's sign-off.
- [ ] Apply the two `change` verdicts to `website/app/locales/` (a separate,
      reviewable commit — the screenshots move and `draft` is on screen today).
- [ ] Extend to the chat/flow/debug domains once M1b extracts them (~130 literals).
- [ ] Express not-applicable-in-a-culture; the schema cannot say it yet.
- [ ] The held-out generation report, appended per version+commit like
      `baseline-changes.md`.

## Links

- Brief: *Concepts, Not Words* (v0.33.56, 6 Aug) — Dinis
- Depends on issue 050 (i18n/culture/themes), which produced the locale files
- Precedent for report-not-gate: issue 053
