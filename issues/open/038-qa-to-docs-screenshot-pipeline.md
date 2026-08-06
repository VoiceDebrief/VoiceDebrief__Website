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
