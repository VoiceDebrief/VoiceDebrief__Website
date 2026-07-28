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
