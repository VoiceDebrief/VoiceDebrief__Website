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

## Status 7 Aug — M-qtd-2 SHIPPED (the docs half; baselines now arm themselves)

The gap M-qtd-1 left, found by Dinis reading the green runs: *"both qa and dev
pipelines executed, but I don't see the files"*. Correct — the captures were
uploaded as an artifact and died with the container. `website/user-guide/` did
not exist, `tests/qa-to-docs/output/` is gitignored, and the harness's own
"commit it to arm the gate" line was an instruction to a human who would have had
to download a zip. **Nothing in CI could ever write a baseline**, so the gate
could not arm and the guide had no pictures. Two green runs proved the QA half
and delivered none of the docs half.

- **`commit-baselines` job** (`qa-deploy.yml`, qa pushes only, `contents: write`):
  downloads the run's `qa-to-docs` artifact and commits **only shots with no
  existing baseline**. A shot whose baseline exists and differs is the gate
  firing — the test job is red, this job never runs, and nothing overwrites the
  evidence. Auto-blessing a diff would turn the gate into a recorder that files
  every regression as the new truth. Intended changes stay deliberate
  (`UPDATE_BASELINES=1`, M-qtd-3).
- **No CI loop**: the push uses `GITHUB_TOKEN`, whose pushes do not start
  workflows — the property the version bump on dev/main already depends on —
  plus `paths-ignore: website/user-guide/screenshots/**` as a second guard that
  survives someone swapping in a PAT. `deploy-netlify` pulls the commit so the
  shots ship in the same run (the pattern `build-pages` uses for the version bump).
- **The guide itself**: `scripts/build_user_guide.py` +
  `scripts/templates/user-guide.html` render `/user-guide/` from `journeys.json`
  and the committed baselines — three sections (getting started / the one pass /
  chatting with your materials), one figure per shot, captions from the manifest.
  A shot with no baseline renders an honest placeholder, never a broken image, so
  the page builds on the very first run. Generated, not committed (gitignored);
  `guide.json` published alongside for agents. Linked from every page's nav and
  checked by the live-QA job. Six unit tests in `tests/unit/user-guide.test.mjs`.
- **Per-shot framing** (`clip` in `journeys.json`): `viewport`, a page section, or
  a panel inside the shadow DOM (`wa-chat-panel .wa-chat__panel` — the custom
  element host has no layout box, its children are fixed-position, so clipping to
  the host times out). Full-page captures buried the subject under the hero and
  made the entire page the diff surface. Done before any baseline was armed, so
  nothing needed re-arming. 8 shots: 1280x800 → 148–940px tall, framed on subject.

M-qtd-3 (intended-change refresh flow + richer hub surfacing) remains open. The
first qa push after this lands arms all 8 baselines and the guide gains its
pictures on the same deploy.
