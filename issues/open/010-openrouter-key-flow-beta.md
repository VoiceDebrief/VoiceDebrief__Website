---
created: 2026-07-28T13:20:00Z
source: team/humans/dinis_cruz — session instructions, 28 July 2026
priority: high
estimated_effort: medium
---

# OpenRouter key flow for beta

Hardcoded capped key for first beta users (hard cap, short life, revocable, treated as public — AppSec conditions written down BEFORE the key ships). Key-provisioning Lambda deferred until strangers arrive.

## Alignment from brief v0.33.53 (28 Jul)
The seeded ("deliberately leaked") key is safe only via its properties, written down BEFORE it ships: hard spend cap, short life, easy revocation, and NARROW REACH via OpenRouter guardrails (model + provider + data-policy restriction — see issue 014). Also decide the transition point at which the seeded key stops being acceptable (cohort size, public indexing, or a date). Reuse the existing OpenRouter admin console.

## Status 28 Jul (post-merge to dev)
Open, not started. Waiting on account-type and model-allowlist decisions (brief v0.33.53 settle-first items 1-3).

## Status 6 Aug — UNBLOCKED by decisions D1/D2
Account decided: **personal, for now**. Model allowlist decided and verified in code
(five models — see `team/roles/appsec/reviews/08/06/v0.1.20__appsec-review__model-allowlist-and-guardrails.md`);
guardrails to restrict keys to it (Dinis also configuring directly on OpenRouter).
Remaining before any key ships: the seeded-key conditions doc (cap value, lifetime,
revocation trigger + drill, transition point) — the next AppSec deliverable.
