---
created: 2026-08-06T11:00:00Z
source: library/review-packs/v0.1.20__project-review/v0.1.20__06__proposal__open-engineering-hub.md (Dinis, session instruction 6 Aug)
priority: high
estimated_effort: medium
---

# Open engineering hub: public /engineering/ pages for the NFRs

A public view of the project's admin/engineering side — CI, testing (unit /
integration / QA), documentation (architecture, security, runbooks), the issue queue,
the team — serving both collaboration (one page answering "what state is everything
in?") and marketing ("the journey is the story"; target reader: the GenAI
entrepreneur who vibe-coded a service and needs to grow it up).

Shape (full proposal in the review pack doc 06): `/engineering/` hub + five section
pages (pipeline, testing, docs, security, team), all static, rendered client-side
from JSON that CI emits at deploy time (`status.json`, `issues.json`, `docs.json`) —
the proven `/versions/` pattern, no backend. Each page: the principle → the live view
→ the receipts. The security page states the ciphertext-rule public/private boundary
and doubles as the trust surface. On top: the "You vibe-coded a service. Now what?"
series via Updates.

Milestones: M-hub-1 status.json + hub page + rendered issue queue (one session);
M-hub-2 the five section pages; M-hub-3 the entrepreneur series (Journalist cadence).

Precondition: the record fixes (review pack doc 07 group A) land first, so the hub
renders a record that is true.

## Status 6 Aug (created)
Open, not started. Proposal accepted into the queue from the v0.1.20 review pack.

## Status 6 Aug (later) — M-hub-1 and M-hub-2 SHIPPED, M-hub-3 partially
- **M-hub-1 done**: `scripts/emit_engineering_json.py` writes `status.json`
  (version, commit, branch, deploy target, per-layer test results passed from the
  test job via artifact), `issues.json` (the whole queue parsed from `issues/`) and
  `docs.json` (the library/team doc inventory, `team/humans/` excluded); both
  workflows wired (collect → artifact → emit before cache-bust). `/engineering/`
  renders the status strip + full issue queue.
- **M-hub-2 done**: the five section pages (pipeline, testing, docs, security,
  team), each principle → live view → receipts. The security page carries the
  S1–S5 state honestly (2 shipped / 3 open) and the ciphertext-rule table — it
  doubles as the interim trust page until the DPO privacy notice ships.
- **M-hub-3 partial**: OG tags on landing/updates/hub, RSS feed
  (`website/updates/feed.xml`, Journalist-maintained per post). The
  "You vibe-coded a service. Now what?" series itself remains open — Journalist
  cadence, one instalment per week.
- Live-QA extended: all six hub pages + the three JSON files checked per deploy.
- The record precondition was met first (group A landed earlier today).
