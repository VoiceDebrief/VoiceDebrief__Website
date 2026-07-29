---
created: 2026-07-28T16:10:00Z
source: Dinis, session instruction (28 Jul, post-merge)
priority: high
estimated_effort: small
---

# CI: publish Pages after auto-tag, display version on the site

Reorder the pipeline so the GitHub Pages publish happens after the auto-tag step,
and use the CI-owned version file to display the version number on the site.

## Outcome
Done 28 Jul: deploy-pages.yml merged into ci-pipeline.yml as build-pages + deploy-pages
jobs with needs: [increment-tag]; the build pulls the bump commit, copies version ->
website/version.txt and stamps <span id="site-version"> in the footer. First real run
happens on the next push to dev.
