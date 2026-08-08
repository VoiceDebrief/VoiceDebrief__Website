# 051 — An agent reviews the screenshot change log

**State:** open · **Priority:** high · **Effort:** medium
**Opened:** 2026-08-08 · **Depends on:** 053

## Why

Issue 053 (renumbered from 050 on merge) made CI record UI changes instead of blocking them, on the explicit
reasoning that judging *whether a change landed in the right place* needs a reader
who understands intent, not a pixel threshold. That reader does not exist yet.

Right now `website/user-guide/baseline-changes.md` accumulates entries and nobody
is required to look. A log nobody reads is weaker than the gate it replaced: the
gate at least stopped the line. **This issue is what makes 053 sound rather than
merely convenient**, and until it lands, screenshot regressions can reach the
public site silently.

## What it should do

On each qa push whose run produced changes, an agent should:

1. Read the newest entry in `baseline-changes.json` — which shots moved, by how
   much, at which commit.
2. Read the commit's diff and message: what was this change *trying* to do?
3. Fetch the previous and current PNGs (git history holds both) and the diff image
   from the run's artifact.
4. Answer one question per changed shot: **does the movement match the intent?**
   - Expected and in the right place → note it, done.
   - Movement in a region the commit had no business touching → raise it loudly:
     comment on the commit, or open an issue.
   - Cannot tell → say so. Silence must never be the ambiguous answer.
5. Write its verdict back into the log entry, so the record shows it was reviewed.

## Notes

- A Claude Routine fits (the Journalist already runs on one), or a workflow
  triggered by the commit-baselines job.
- Keep it OUT of the CI gate — the point of 053 is that this judgement is not a
  pass/fail machine step.
- The verdict belongs in the log, not only in a chat session: the value is the
  durable record that someone looked.
