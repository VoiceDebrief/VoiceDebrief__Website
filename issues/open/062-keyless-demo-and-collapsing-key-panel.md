# 062 — A keyless demo, and a setup step that gets out of the way

**Status** open (shipped) · **Opened** 2026-08-08 · **From** Dinis

## Why

Two first-run problems.

1. **A stranger cannot see what this does.** Every path through the product needs an
   OpenRouter account and a key first, which is a lot to ask before showing somebody
   anything. The `/design/` prototypes already prove the value of a keyless run.
2. **The key panel never finished.** Someone who had already pasted a key still saw a
   full labelled form with an empty input on every visit, which reads as *not done*.

## The demo, and the decision that makes it trustworthy

`website/app/demo.js` + `runPass({ demo: true })`.

**It does not simulate the product — it runs it.** The declared workflow, the executor
shape, the wa:* event stream, the trace, the budget accounting and every card are the
production ones; only the model answers are substituted. The `/design/` prototypes fake
the flow with timers, which is right for a prototype and wrong here: a demo that drifts
from the product is a demo that lies, and the first thing it would lie about is the
thing it exists to show.

So a demo pass genuinely exercises the classify branch, the translate-skip decision, the
facts card and the flow panel. If the workflow changes, the demo changes with it or the
tests fail.

Two things it must never do, both asserted:

- **Never touch the network or the key.** `tests/integration/demo.test.mjs` sets no key,
  clears localStorage, and **aborts** any request to OpenRouter rather than mocking it —
  so if the demo path ever reached the network the test breaks instead of quietly
  costing somebody money.
- **Never be mistakable for a real result.** Every artefact sits under a DEMO stamp, and
  a real pass clears it first so nobody's own recording inherits it.

**The infographic is deliberately not faked.** It is a generated image, and a canned
picture of somebody else's data would be the most misleading thing on the page. The step
declares itself degraded with a reason — which also demonstrates the product's real
degrade behaviour.

## The key panel

`wa-key-panel` v0.1.3. A saved key collapses to one quiet line —
*"✓ Your OpenRouter key is saved in this browser · change"* — and the form returns on
demand with a cancel that has somewhere to go back to. The key itself is never
redisplayed, not even masked: the panel knows only that one exists.

**A rejected key reopens the form.** Collapsing on failure would hide the problem behind
a tick that says everything is fine.

## Two bugs the work produced, both from one cause

The demo button borrowed the `.sample-chip` class for its styling, and **three
independent things selected on that class**:

- the sample loader fired on it too, fetched `undefined`, and painted *"that doesn't look
  like an audio file we can read"* over the demo;
- `app-boot` counted 4 sample chips where it expected 3;
- the qa-to-docs journey clicked the wrong chip.

All three now qualify on `[data-sample]` — what a sample chip actually *is* — rather than
on how it looks. Worth remembering: a class used for styling had become a de facto API.

## Still to do

- [ ] **The cost line reads `this pass: £—`** after a demo. Honest (nothing was spent)
      but it looks like a missing value; it should say £0.00 or *demo*.
- [ ] The demo is only on the app page. The go-live brief (issue 060) puts the workflow
      on the home page, where this matters more.
- [ ] The demo fixture is English only, so a pt-PT visitor sees English artefacts with
      translated chrome. A second fixture, or running the real translate step on the
      demo transcript, would fix it.
- [ ] The facts card's own labels are still English in all four cultures (issue 061).

## Links

- `website/app/demo.js`, `website/components/wa-key-panel/v0/v0.1/v0.1.3/`
- `tests/integration/demo.test.mjs` (10 checks), `tests/integration/app-boot.test.mjs`
  (6 key-panel checks)
