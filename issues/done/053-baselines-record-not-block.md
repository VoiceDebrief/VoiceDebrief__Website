# 053 (renumbered from 050 on merge; that number was taken by the i18n strategy) — Screenshot baselines record UI change, they do not block it

**State:** done · **Priority:** high · **Effort:** medium
**Opened:** 2026-08-08 · **Closed:** 2026-08-08
**Supersedes:** issue 038's M-qtd-1 blocking-gate policy

## The problem

M-qtd-1 shipped a pixel-diff gate that FAILED the build when a screenshot moved,
and M-qtd-2 armed it. Together those created a trap: the first legitimate UI
change would go red, and the only sanctioned way back to green
(`UPDATE_BASELINES=1`) existed solely as a local env var — which the baseline
policy forbids, because a laptop's font rendering differs from CI's. There was no
CI path to refresh. Arming the gate before building the refresh path was the
sequencing error.

## The decision (Dinis, 7 Aug)

> "the default behaviour should be to overwrite on change and document those
> changes on a file that can be linked to the version.commit (since we can keep
> an eye on those changes and use them to detect regressions) — since after all,
> UX changes are to be expected, what we need to keep an eye on is if the change
> happened in the correct place, but that needs to be done via an agent and not
> a CI pipeline"

A pixel threshold can only say that something moved. It cannot say whether the
movement is the feature or the regression — that judgement needs a reader who
knows what the commit was trying to do. So CI records; an agent reviews.

## What changed

- `tests/qa-to-docs/run.mjs`: a changed shot writes to `output/updated/`, records
  an entry in `output/changes.json`, emits its diff image as an artifact, and
  **passes**. Dimension changes are recorded as `resized` (no percentage is
  meaningful). Nothing about the run fails on a picture moving.
- `scripts/record_baseline_changes.py` (new): copies new + changed shots over the
  baselines and appends to `website/user-guide/baseline-changes.md` (human) and
  `.json` (agent), each entry naming the date, CI run, **commit and commit URL**,
  and the base version — so the diff that explains a change is one click away.
  Append-only; git history holds the old pixels, the log holds the narrative.
- `commit-baselines` job rewritten to update-and-log. Still qa-only, still pushed
  with `GITHUB_TOKEN` (no workflow re-trigger), still `paths-ignore` guarded.
- The user guide links the change log.
- Six unit tests in `tests/unit/baseline-changes.test.mjs` covering: a change is
  recorded not refused; the entry names commit and run; successive runs append
  newest-first; a no-move run writes nothing; a run with no verdict fails loudly
  rather than committing stray pixels; a resize records geometry.

## Verified

Locally against the CI-produced baselines the run reported 5 changed shots
(0.115%–1.101%) and stayed green, writing diff images and `changes.json` while
leaving the committed baselines untouched — only the recorder script writes those.

## Follow-on

Issue 051: the agent that reads the log and asks whether each change landed where
the work intended. Without it this is a record nobody reads.
