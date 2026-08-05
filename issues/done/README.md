# Done Issues

Completed tasks, newest first. Maintained manually, in the same commit as any
issue change. Last updated: 2026-07-29.

| # | Title | Outcome |
|---|-------|---------|
| [031](031-infographic-v2-image-model-redraw-spinner.md) | Infographic v2: image model, redraw, heartbeat | gemini-3.1-flash-image-preview default; model picker + redraw; spinner/elapsed; samples keep options |
| [030](030-qa-branch-netlify-deploys.md) | QA branch auto-deploys to Netlify | `qa-deploy.yml` verified e2e → silver-melba-d8d883.netlify.app |
| [029](029-repeat-pass-same-file-not-audio.md) | Repeat pass on same file failed ("not-audio") | pipeline reuses the deduped item + upstream report |
| [028](028-ci-pipeline-tests.md) | CI tests gate the release | `tests/{unit,integration,qa}/` + test/qa-live jobs in `ci-pipeline.yml` |
| [027](027-debug-advanced-views-and-samples.md) | Debug/advanced views + sample files | `wa-debug-panel`, `debug-store.js`, `openrouter.js`, `website/app/samples/` |
| [026](026-stale-cached-modules-after-deploy.md) | Stale modules after deploy | `scripts/stamp_cache_busters.py` + CI step |
| [025](025-ogg-mime-hallucinated-transcript.md) | `.ogg` hallucinated transcripts (urgent) | `website/app/audio-normalise.js` + upstream report |
| [008](008-web-app-mvp-one-pass.md) | The one-pass, complete + verified e2e | `website/app/` — transcript → summary → infographic |
| [024](024-infographic-generator-capabilities-guide.md) | sg-llm-infographic capabilities guide | `library/tools/infographic-generator/` |
| [023](023-public-library-page.md) | Public Library page | `website/library/` |
| [022](022-journalist-role-updates-section.md) | Journalist role + Updates + CHANGELOG | `team/roles/journalist/`, `website/updates/`, `CHANGELOG.md` |
| [021](021-domain-https-and-org-verification.md) | Custom domain live, HTTPS enforced | whatsapp-voice-transcription.sgraph.ai |
| [020](020-dev-pack-audio-transcribe-integration.md) | Dev pack: audio-transcribe integration briefs | `library/dev_packs/v0.1.1__audio-transcribe-integration/` (00-04) |
| [019](019-tech-stack-workflow-guide.md) | Tech stack & workflow guide | `library/guides/v0.1.0__guide__tech-stack-and-workflow.md` |
| [018](018-fix-increment-tag-pyproject.md) | Fix CI: increment-tag failed without pyproject.toml | Minimal `pyproject.toml` added (version CI-owned); root README release badge added |
| [017](017-ci-publish-after-tag-version-on-site.md) | CI: publish Pages after auto-tag + version on site | `ci-pipeline.yml` chain increment-tag → build-pages → deploy-pages; footer stamped |
| [012](012-completion-report-and-debrief.md) | Session completion report + debrief | Brief pack 06 + `debriefs/07/28/` |
| [006](006-create-library-import-docs.md) | Project library with imported docs | `library/` with provenance |
| [005](005-issues-fs-lite-todo-list.md) | issues-fs-lite todo list | This `issues/` queue |
| [004](004-static-site-mvp-github-pages.md) | MVP static site + Pages | `website/` + CI publish; merged to dev |
| [003](003-ci-auto-tag-dev-main.md) | CI auto-tag on dev/main | First tag v0.1.0 created; superseded by 017/018 refinements |
| [002](002-wire-up-agentic-team.md) | Agentic team wiring | `.claude/CLAUDE.md`, `team/` (10 roles, reality) |
| [001](001-brief-pack-understanding-architecture-tasks.md) | Brief pack | `library/brief-pack/` 00–06 |
