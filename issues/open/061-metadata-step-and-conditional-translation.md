# 061 — Read the metadata, then decide what to run

**Status** open (shipped, refinements pending) · **Opened** 2026-08-08 · **From** Dinis

## Why

A control point between transcription and everything downstream: read the transcript
once, work out what it *is*, and use that to decide what the rest of the pass should
do. Dinis's framing — language, topics, classification (formal/casual,
positive/negative, security alerts like prompt injection) — plus the concrete decision
that pays for it: **only translate when the detected language differs from the
reader's.**

## What shipped

A `classify` step between `transcribe` and `translate`, on **every** pass.

```
normalise → ingest → transcribe → classify ─┬─ facts.needsTranslation ─→ translate ─→ summary
                                            └─────────────────────────────────────→ summary
```

**The metadata** (`website/app/classify.js`, `prompts/classify-prompt.md`):
detected language + confidence, up to 5 topics, `register`, `sentiment`, `urgency`,
`signals`, and a one-line gist.

**The signal vocabulary**, answering Dinis's "others?":

| key | why it is worth having |
|---|---|
| `prompt-injection` | the note addresses an AI rather than a person |
| `credentials` | a password, key, PIN or one-time code spoken aloud |
| `personal-data` | identifiable details about somebody |
| `financial-request` | asks for money to move or payment details to change |
| `urgency-pressure` | pushes for speed, discourages checking with anyone |
| `legal-or-medical` | where an approximate summary can cause harm |

The last two together are the shape of most **voice-note fraud**, and neither half is
alarming alone — so the card treats the pair as its own state.

## The machine change, and why it is safe

`when` accepted `options.<flag>` only, because the price on screen must be knowable
before the run. A transition may now declare both:

```json
{ "to": "translate", "when": "facts.needsTranslation", "quoteWhen": "options.translate" }
```

- **Quoting** resolves `facts.*` as true → the ceiling assumes every discoverable
  branch is taken.
- **Running** evaluates it for real → a pass spends **less** than quoted, never more.

Two invariants live in the runner, not in convention:

1. **A fact may never add a step.** A transition whose target was not on the quoted
   path is unavailable however true its condition is. Otherwise a model's answer could
   route into unpriced work — the budget gate would refuse it, but a loud crash is not
   a design.
2. **A degrading step may still declare facts.** `classify` attaches
   `needsTranslation: true` to its own failure, because `undefined` reads as false and
   that is the dangerous direction: losing the metadata must never silently withhold a
   translation somebody asked for.

## The trust boundary

`classify.js` reads whatever a stranger said into their phone.

- Every value resolves to an **allowlist key**; anything else is dropped.
- **Nothing from it is ever put back into a prompt.** Interpolating a topic would let a
  voice note write our instructions — the attack `prompt-injection` exists to report.
- **Unsure means do the work**: `needsTranslation` is false only on a confident match
  (≥0.75). Wrong that way costs a fraction of a penny; wrong the other way hands
  somebody a debrief in a language they cannot read.

**The signals are a signal, not a control**, and the card says so in as many words. The
classifier reads the same untrusted text as everything else and can be talked out of
reporting, so a clean card is not evidence of safety.

## Cost

Classify is $0.01 declared, ~$0.0005 actual on a short note. It pays for itself the
first time it prevents a $0.003–0.009 translation. Verified end to end: an English note
for an English reader with translate ON spent **$0.0015 against a $0.11 quote**.

## Still to do

- [ ] **Present the metadata on the flow panel too** — the trace carries
      `skippedBecause` and only the card shows it today.
- [ ] **Locale strings for the card.** The rail label is translated; the card's own
      labels and signal texts fall back to English in all four cultures.
- [ ] **Feed topics into the chat context** — the chat can already read materials, and
      topics would sharpen it. Carefully: they are display-only strings today, and
      putting them in a prompt is exactly what rule 2 forbids without more thought.
- [ ] **A signal has no action attached.** Showing "financial request + urgency" is
      right; what a user should then *do* is undesigned.
- [ ] Consider whether a flagged note should suppress the infographic, which is the
      most shareable artefact and the easiest to screenshot out of context.

## Links

- `website/app/classify.js`, `website/app/prompts/classify-prompt.md`
- `website/components/wa-facts-card/v0/v0.1/v0.1.0/`
- `tests/unit/classify.test.mjs` (9), `tests/unit/workflow.test.mjs` (facts cases),
  `tests/integration/translate.test.mjs` (16 checks)
