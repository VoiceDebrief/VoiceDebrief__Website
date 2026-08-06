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
