---
created: 2026-07-29T13:30:00Z
source: CI failure on dev (run 30454663682, commit 266e86f)
priority: high
estimated_effort: small
---

# Fix CI: increment-tag failed without pyproject.toml

The git__increment-tag action's "Update Version in pyproject.toml" step runs
`sed -i ... pyproject.toml` unconditionally and exits 2 when the file does not
exist, skipping the commit-and-push and tag steps. Both sibling repos have a
pyproject.toml, so the assumption never surfaced there.

## Outcome
Done 29 Jul: minimal pyproject.toml added (version field CI-owned, matching the
root version file). Release badge added to the root README so the action's
badge-update step has its target too. Next push to dev should complete the full
chain: bump -> commit -> tag v0.1.1 -> Pages publish with stamped version.
