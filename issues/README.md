# Issues — Issues-FS-lite

*Part of the [project library](https://whatsapp-voice-transcription.sgraph.ai/library/) — every doc behind this product, organised by audience.*


Task tracking for this repo using **Issues-FS-lite** (spec:
[`SGraph-AI__App__Send/.../email-fs-lite-v0.6.md`](https://github.com/the-cyber-boardroom/SGraph-AI__App__Send/blob/dev/team/humans/dinis_cruz/briefs/05/06/email-fs-lite-v0.6.md) §7 (local copy: [`library/guides/email-fs-lite-v0.6.md`](../library/guides/email-fs-lite-v0.6.md)),
adapted from the per-agent `mail/.../issues/` layout to a single repo-level queue).

## Current Issues (all folders)

Maintained manually — update this table and the folder READMEs **in the same commit**
as any issue change. Last updated: 2026-08-06 (qa branch merged into dev's line:
its parallel 036–038 renumbered to 039–041; 041 = ?origin= removed entirely,
superseding both branches' allow-list fixes; 007 closed as superseded — Dinis).

| # | Title | State | Priority | Effort |
|---|-------|-------|----------|--------|
| [037](open/037-app-security-hardening.md) | App security hardening: CSP shipped; chat prompt-tool gating, SVG sanitisation, key hygiene open (S1 closed by 041's removal) | open | **urgent** | medium |
| [036](open/036-open-engineering-hub.md) | Open engineering hub: public /engineering/ pages for the NFRs | open | high | medium |
| [038](open/038-qa-to-docs-screenshot-pipeline.md) | QA-to-docs: journey tests that QA features AND maintain the user docs (image-diff gate) | open | high | medium |
| [040](open/040-videos-on-the-site.md) | Videos on the site — three live; one clip awaiting its YouTube id | **blocked** (on one id) | high | medium |
| [010](open/010-openrouter-key-flow-beta.md) | OpenRouter key flow for beta (seeded key conditions) | open | high | medium |
| [013](open/013-admin-vault-and-ciphertext-rule.md) | Administrative vault + ciphertext rule enforcement | open | high | medium |
| [014](open/014-openrouter-guardrails-exploration.md) | OpenRouter guardrails: enforce privacy tiers on the key | open | high | medium |
| [009](open/009-privacy-mode-selector.md) | Privacy mode selector: routed / restricted / browser-local | open | normal | medium |
| [011](open/011-ios-android-targets.md) | iOS and Android targets from this repo | open | normal | large |
| [015](open/015-secret-distribution-via-send.md) | Distribute secrets via the existing SG/Send capability | open | normal | small |
| [016](open/016-crm-on-vault-substrate.md) | CRM built on the vault substrate | open | low | large |
| [007](done/007-infographic-images-into-library.md) | Add the shared infographics to library/infographics/ | done (closed as superseded) | normal | small |
| [001](done/001-brief-pack-understanding-architecture-tasks.md) | Create and push the detailed brief pack | done | high | medium |
| [002](done/002-wire-up-agentic-team.md) | Wire up the agentic team for this repo | done | high | medium |
| [003](done/003-ci-auto-tag-dev-main.md) | CI pipeline step to auto-tag on dev and main | done | high | small |
| [004](done/004-static-site-mvp-github-pages.md) | MVP static site published to GitHub Pages | done | high | medium |
| [005](done/005-issues-fs-lite-todo-list.md) | Create the todo list with issues-fs-lite | done | normal | small |
| [006](done/006-create-library-import-docs.md) | Create the project library and move relevant docs into it | done | high | medium |
| [012](done/012-completion-report-and-debrief.md) | Session completion report + debrief | done | high | small |
| [017](done/017-ci-publish-after-tag-version-on-site.md) | CI: publish Pages after auto-tag, display version on the site | done | high | small |
| [018](done/018-fix-increment-tag-pyproject.md) | Fix CI: increment-tag failed without pyproject.toml | done | high | small |
| [019](done/019-tech-stack-workflow-guide.md) | Tech stack & workflow guide for incoming devs | done | high | medium |
| [020](done/020-dev-pack-audio-transcribe-integration.md) | Dev pack: audio-transcribe integration briefs (Conductor/Architect/Dev/Designer) | done | high | medium |
| [021](done/021-domain-https-and-org-verification.md) | Custom domain live: HTTPS enforced (org TXT verification recommended) | done | high | small |
| [022](done/022-journalist-role-updates-section.md) | Journalist role + Updates section + per-version CHANGELOG | done | high | medium |
| [023](done/023-public-library-page.md) | Public Library page (Librarian-maintained) | done | high | medium |
| [008](done/008-web-app-mvp-one-pass.md) | Web app: the one-pass COMPLETE (transcript → summary → infographic), verified e2e | done | high | large |
| [024](done/024-infographic-generator-capabilities-guide.md) | sg-llm-infographic verified capabilities guide | done | high | medium |
| [025](done/025-ogg-mime-hallucinated-transcript.md) | `.ogg` returned hallucinated transcripts (silent) — fixed by content sniffing | done | **urgent** | medium |
| [026](done/026-stale-cached-modules-after-deploy.md) | Stale cached modules after deploy (infographic box did nothing) — CI cache-busting | done | high | small |
| [027](done/027-debug-advanced-views-and-samples.md) | Debug/advanced views: LLM exchange log, OpenRouter details, prompt customisation, samples | done | high | large |
| [028](done/028-ci-pipeline-tests.md) | CI tests: unit + integration gate the release, QA checks the live site | done | high | medium |
| [029](done/029-repeat-pass-same-file-not-audio.md) | Re-running the same voice note failed ("not-audio") — engine silent dedupe, reused item | done | high | small |
| [030](done/030-qa-branch-netlify-deploys.md) | QA branch auto-deploys to Netlify — live and verified (qa.whatsapp-voice-transcription.sgraph.ai) | done | high | small |
| [031](done/031-infographic-v2-image-model-redraw-spinner.md) | Infographic v2: image model default, redraw UX + model picker, progress heartbeat, samples keep options | done | high | medium |
| [032](done/032-disabled-key-shows-failed-to-fetch.md) | Disabled key read as "Failed to fetch" — now diagnosed via /api/v1/key and named | done | high | small |
| [033](done/033-versions-page-and-sitewide-version.md) | Versions page (per-tag changes + diffs); version chip on every page; QA stamped with next version | done | high | small |
| [034](done/034-chat-with-materials.md) | M3: chat with the materials + tool-driven workflow — live-validated by Dinis | done | high | large |
| [035](done/035-chat-edits-materials-and-sees-image.md) | Chat edits transcript/summary (revertible), SEES the infographic image, tidy suggestions | done | high | medium |
| [039](done/039-content-architecture-markdown-per-post.md) | Content architecture: markdown per post, generated pages/manifests, atomic agent writes | done | high | medium |
| [041](done/041-remove-origin-parameter.md) | `?origin=` removed entirely — the engine origin is hardcoded | done | **high** | small |

## Layout

```
issues/
├── open/       ← active tasks           NNN-kebab-slug.md
├── blocked/    ← waiting on something external
└── done/       ← completed tasks
```

Each folder has its own README with the same view filtered to that state.

## Task file format

Markdown with frontmatter. Required: `created` (UTC ISO 8601), `priority`
(low/normal/high/urgent). Recommended: `source` (what generated the task),
`estimated_effort` (small/medium/large), `blocked_on` (if blocked), `parent`.
Body: what needs doing, how it will be approached, acceptance criteria.

## The four operations

- **OPEN** — write a file in `open/` with the next sequence number.
- **BLOCK** — `mv` to `blocked/`, add `blocked_on:` and note the blocker in the body.
- **UNBLOCK** — `mv` back to `open/`, append a note that the blocker resolved.
- **CLOSE** — `mv` to `done/`, append an outcome summary.

Issue updates land **in the same commit** as the work they describe, so each commit
reads as: what arrived → what was planned → what was done. Sequence numbers are global
to this repo; next free number = highest existing + 1 across all three folders.
