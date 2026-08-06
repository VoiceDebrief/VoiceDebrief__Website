---
created: 2026-07-28T15:05:00Z
source: team/humans/dinis_cruz/briefs/07/28/v0.33.53__arch-brief__...md
priority: normal
estimated_effort: small
---

# Distribute secrets via the existing SG/Send capability

No new mechanism: send a secret directly (small hand-held cohort) or hand the user a URL that retrieves and installs it (the bridge to the deferred provisioning Lambda). Prefer single-use / short-lived links — the link inherits the properties of the secret behind it.

## Status 28 Jul (post-merge to dev)
Open, not started. Needed by first cohort onboarding.

## Status 6 Aug (review-pack group A)
Unchanged and correctly parked: a dependency of issue 010's rollout, which today's
D1/D2 decisions unblocked. Becomes active when the first seeded/provisioned key needs
delivering to a real user.
