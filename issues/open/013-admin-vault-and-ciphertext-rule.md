---
created: 2026-07-28T15:05:00Z
source: team/humans/dinis_cruz/briefs/07/28/v0.33.53__arch-brief__...md
priority: high
estimated_effort: medium
---

# Administrative vault + the ciphertext rule (with enforcement)

Second vault, separate from anything user-facing, for admin logic, key management and secrets. Rule: the encrypted vault MAY live in the public repo; the vault key, any plaintext secret, the management API key MUST NOT. Needs a pre-commit control / scanner, not just documentation. Separate repos or at minimum separate directories with different handling rules.

## Status 28 Jul (post-merge to dev)
Open, not started. Ciphertext rule documented in .claude/CLAUDE.md; enforcement (pre-commit control) and vault creation pending.
