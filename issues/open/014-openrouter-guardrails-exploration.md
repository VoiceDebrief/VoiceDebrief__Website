---
created: 2026-07-28T15:05:00Z
source: team/humans/dinis_cruz/briefs/07/28/v0.33.53__arch-brief__...md
priority: high
estimated_effort: medium
---

# Explore OpenRouter guardrails: enforce privacy tiers on the key

Guardrails can restrict a key by model, provider and data policy, not only spend — making the restricted privacy tier enforceable server-side rather than advisory in the client. Settle first: personal vs organisation account (determines who can set guardrails + automation); which models the app actually calls (the allowlist); whether guardrails can be set via the management API or only the dashboard. Source: https://openrouter.ai/docs/guides/features/guardrails

## Status 28 Jul (post-merge to dev)
Open, not started. Blocked-ish on personal-vs-organisation account decision (Dinis); exploration of automation via management API can start regardless.

## Status 6 Aug — UNBLOCKED by decision D1 (account: personal, for now)
The allowlist input is settled (AppSec review 08/06). Open questions narrow to:
which guardrail controls (model allowlist, provider restriction, data policy) the
**personal** dashboard actually exposes — OpenRouter documents some administration
as organisation-account features — and whether they can be set via the management
API alongside key creation. Dinis is configuring directly on OpenRouter; record
what the dashboard offers while doing so.
