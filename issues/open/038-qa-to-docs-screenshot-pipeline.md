---
created: 2026-08-06T11:40:00Z
source: library/review-packs/v0.1.20__project-review/v0.1.20__08__proposal__qa-to-docs.md (pattern briefed by Dinis, 6 Aug — proven on prior sites)
priority: high
estimated_effort: medium
---

# QA-to-docs: journey tests that QA the features AND maintain the user docs

A dedicated Playwright test set in CI (GH Actions) with two functions per run:
(a) final QA of the key user workflows — the one pass, key setup, infographic v2,
chat with materials, debug pane; (b) capture of named screenshots that create and
maintain the user-facing docs (`website/user-guide/`, embedding by manifest id).

The load-bearing piece is an **image-diff gate** (pixelmatch/odiff, per-shot
thresholds + masks over dynamic regions): below threshold = pixel noise, ignored;
above = a caught visual regression (fail, side-by-side diff artifact) or an intended
change acknowledged by refreshing the committed baseline in the same branch — which
updates the docs in the same motion.

Foundations already in place: the deterministic mock-OpenRouter chat-loop harness
(stable LLM output = stable screenshots), CI that commits back (version bump), a
static site that serves committed images. Rule: baselines are only ever produced in
CI, never locally.

Milestones (full design in review pack doc 08): M-qtd-1 harness + diff gate + two
journeys; M-qtd-2 full journey set + user-guide pages; M-qtd-3 intended-change
refresh flow + engineering-hub surfacing (with issue 036).

## Status 6 Aug (created)
Open, not started. Proposal accepted into the queue from review pack doc 08.

## Status 6 Aug (later) — M-qtd-1 SHIPPED (gate arming on first CI run)
- `tests/qa-to-docs/run.mjs` + `journeys.json` (manifest: shot ids, captions,
  user-guide slots, per-shot masks and thresholds) + `mock-openrouter.mjs` (the
  chat-loop test's deterministic playbook, extracted). Two journeys, 7 shots:
  the one pass (arrival → key save → options → results with drawn-SVG
  infographic) and the chat (open → tool call → edit/restore).
- Determinism proven in-session: two runs, 0.000% pixel diff on all 7 shots.
  Gate proven both ways: a perturbed baseline fails at 0.954% ≥ 0.1% and writes
  `<id>.current.png` + `<id>.diff.png` reports.
- Both workflows run the journeys in the test job (gating), upload
  candidates/diff reports as the `qa-to-docs` artifact, and count the layer
  into `test-results.json` → the hub's testing page shows it.
- **Baseline bootstrap** (the policy: baselines only ever produced in CI —
  laptop font rendering differs): baselines are NOT yet committed. The first CI
  run will pass with "candidate captured" warnings and upload 7 candidates;
  review them and commit to `website/user-guide/screenshots/` to arm the diff
  gate. `UPDATE_BASELINES=1` is the refresh flow for intended UI changes.
- M-qtd-2 (full journey set + user-guide pages embedding the shots) and
  M-qtd-3 (intended-change auto-refresh + richer hub surfacing) remain open.
