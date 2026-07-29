# Issues — Issues-FS-lite

Task tracking for this repo using **Issues-FS-lite** (spec:
`SGraph-AI__App__Send/team/humans/dinis_cruz/briefs/05/06/email-fs-lite-v0.6.md` §7,
adapted from the per-agent `mail/.../issues/` layout to a single repo-level queue).

## Current Issues (all folders)

Maintained manually — update this table and the folder READMEs **in the same commit**
as any issue change. Last updated: 2026-07-29 (added 021).

| # | Title | State | Priority | Effort |
|---|-------|-------|----------|--------|
| [021](open/021-domain-https-and-org-verification.md) | Finish the custom domain: HTTPS + org verification | open | high | small |
| [008](open/008-web-app-mvp-one-pass.md) | Web app MVP: one-pass transcript / analysis / debrief / infographic (streams in arrival order) | open | high | large |
| [010](open/010-openrouter-key-flow-beta.md) | OpenRouter key flow for beta (seeded key conditions) | open | high | medium |
| [013](open/013-admin-vault-and-ciphertext-rule.md) | Administrative vault + ciphertext rule enforcement | open | high | medium |
| [014](open/014-openrouter-guardrails-exploration.md) | OpenRouter guardrails: enforce privacy tiers on the key | open | high | medium |
| [009](open/009-privacy-mode-selector.md) | Privacy mode selector: routed / restricted / browser-local | open | normal | medium |
| [011](open/011-ios-android-targets.md) | iOS and Android targets from this repo | open | normal | large |
| [015](open/015-secret-distribution-via-send.md) | Distribute secrets via the existing SG/Send capability | open | normal | small |
| [016](open/016-crm-on-vault-substrate.md) | CRM built on the vault substrate | open | low | large |
| [007](blocked/007-infographic-images-into-library.md) | Add the shared infographics to library/infographics/ | **blocked** (on image files) | normal | small |
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
