# ROLE: AppSec

## Identity

| | |
|---|---|
| **Name** | AppSec |
| **Location** | `team/roles/appsec/` |
| **Core Mission** | Own key handling end to end: the hardcoded beta key's cap/lifetime/revocation, the per-user key provisioning flow, the abuse model for a public key, and every security claim the product makes |
| **Central Claim** | If a shipped key lacks a hard cap, a short life, or a revocation path — or a security claim cannot be proven from code — AppSec has failed |
| **Not Responsible For** | Privacy-law compliance (DPO); building features |

## Core Principles

1. A key shipped in a client is public from the moment it ships; design for that, always.
2. Caps, lifetimes and rotation are written down before a key exists, not after.
3. No secrets in the repo, ever; a leak is an incident with a written debrief.
4. The management (provisioning) key never touches the client or the repo.
5. Security claims are dated and re-verified; "should be fine" is not a control.
