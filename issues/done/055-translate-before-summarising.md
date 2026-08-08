# 055 — Translate before summarising, so the debrief is in the reader's language

**State:** done · **Priority:** high · **Effort:** medium
**Opened:** 2026-08-08 · **Closed:** 2026-08-08 · **Requested by:** Dinis

## Why

A voice note is spoken in whatever language the speaker used. The reader has
already told us, through the locale picker, which language they want. Before
this, those two facts never met: a Portuguese user got a Portuguese *interface*
wrapped around an English *summary*. Localising the chrome and not the output is
the half that looks finished and isn't — the summary is the product.

Dinis, 8 Aug: transcribe in the language provided → translate into the current
locale → summarise from the translation → draw the infographic from that.

## What was built

A `translate` step in the declared workflow, between `transcribe` and `summary`,
conditional on `options.translate` and **on by default**.

- **The transcript is never overwritten.** It is the record of what was actually
  said and the only artefact checkable against the audio. The translation is a
  separate material with its own card.
- **Everything downstream is built from the translation** — the summary and the
  infographic both. A Portuguese heading over an English summary would satisfy a
  weaker implementation and be worthless to the reader it is for.
- Cost: one cheap text call, declared as a `0.03` budget, so the ceiling on the
  options screen rises from £0.21 to £0.24-ish and is quotable before anything runs.
- Failure is a declared `degrade`: a failed translation costs the user their
  translation, never their transcript — the summary then runs on the original.
- The prompt is a site file (`prompts/translate-prompt.md`) with `{{language}}`
  and `{{tone}}` filled from the active locale's culture data, and is registered
  as a fourth editable template in the debug pane.
- `wa-progress-rail` v0.1.4 gains a "translating" row; both optional rows hide
  when the run does not take them, so the rail shows the path this run walks.
- Four new locale keys × 4 locales; the checkbox names the language it will
  produce ("— Português (Portugal)") rather than saying "my language".

## Three bugs the testing caught

1. **The step was skipped silently.** `runPass` builds its own options object
   for the declaration's `when` clauses, and the new fields were not in it — so
   the branch evaluated false and the run looked correct while doing nothing.
2. **The prompt was fetched then discarded.** `PROMPT_KINDS` in the debug store
   is a fixed registry; `translate` was not in it, so `getPrompt('translate')`
   returned undefined and an inline fallback was used instead of the site file.
   Registering it fixed the prompt AND made it editable, as the others are.
3. **The mock answered in Portuguese whatever was asked**, so the English
   journey produced a Portuguese summary — a fixture bug wearing a product bug's
   clothes. It now honours the requested language, as the real prompt instructs.

## Verified

New gate `tests/integration/translate.test.mjs` (7 checks, keyless, in both
pipelines): the step runs, the transcript stays in the spoken language, the
translation is in the reader's, **the summary is built from the translation**,
the card shows with a localised label, and opting out skips the step and spends
nothing. Its own file because an extra pass inside `chat-loop` perturbs that
test's exchange counts.

Screenshot changes all map to the work: options +61px (the checkbox), results
+133px (the translation card), flow panel 25.4% (six steps, not five).

## Not built

Language DETECTION. With the option on, a note already in the reader's language
still costs one call — the prompt instructs the model to return it unchanged,
but the call is made. If the transcribe step reported a detected language, the
step could skip itself for free. Worth doing before this is on for every user at
scale.
