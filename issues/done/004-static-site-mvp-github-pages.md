---
created: 2026-07-28T13:20:00Z
source: team/humans/dinis_cruz — session instructions, 28 July 2026
priority: high
estimated_effort: medium
---

# MVP static site published to GitHub Pages

First public face of the WhatsApp transcription service. Dinis wires the domain.

## Approach
Static site in `website/`, no framework, telling the user-journey story (land → upload → results in seconds → export), privacy modes and pricing honestly stated; Pages deploy workflow using actions/deploy-pages with enablement via configure-pages.

## Acceptance criteria
Site builds as pure static files; workflow publishes on push to dev; looks credible on mobile and desktop.

## Outcome
Done 28 Jul: website/ (index, 404, robots, .nojekyll) + deploy-pages.yml (publishes on push to dev; Pages enablement via configure-pages). Domain wiring left to Dinis.

## Status 28 Jul (post-merge to dev)
Merged to dev. Publishing moved into ci-pipeline.yml after the tag step (issue 017); awaiting first Pages deploy on next dev push, then domain wiring (Dinis, Route 53).
