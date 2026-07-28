---
created: 2026-07-28T13:20:00Z
source: team/humans/dinis_cruz — session instructions, 28 July 2026
priority: high
estimated_effort: small
---

# CI pipeline step to auto-tag on dev and main

Auto-tag on push to dev (minor) and main (major); default branch is now dev.

## Outcome
Done 28 Jul: `.github/workflows/ci-pipeline.yml` using owasp-sbot git__increment-tag, same shape as Tools' deploy-tools.yml; root `version` file seeded at v0.1.0 (CI-owned from here). Test gating to be added when tests land.
