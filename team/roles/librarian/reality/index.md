# Reality: What Exists Today

**maintained by** Librarian
**updated** 2026-07-28
**rule** If it is not in this document, it does not exist. Proposed items are labelled
`PROPOSED — does not exist yet`.

---

## EXISTS (verified in this repo)

| Item | Where | Since |
|------|-------|-------|
| Repo scaffold (README, LICENSE, .gitignore) | repo root | initial commit |
| Brief pack: session understanding, architecture, commercial model, task plan, source map | `docs/brief-pack/` | 2026-07-28 |
| Agentic team wiring: rulebook, roster, 10 active ROLE files, humans/comms folders | `.claude/CLAUDE.md`, `team/` | 2026-07-28 |
| This reality document | `team/roles/librarian/reality/index.md` | 2026-07-28 |
| CI auto-tag on `dev` and `main` | `.github/workflows/` | 2026-07-28 |
| Issues tracking (issues-fs-lite style) | `issues/` | 2026-07-28 |
| Project library with imported source docs | `library/` | 2026-07-28 |
| MVP static site + GitHub Pages workflow | `site/`, `.github/workflows/` | 2026-07-28 |

(Entries dated 2026-07-28 land in this same session; a row here is valid only once its
files are actually in the tree — the Librarian removes any row whose work was reverted.)

## EXISTS (in sibling repos, reused not rewritten)

| Item | Where |
|------|-------|
| Audio-transcribe tool (working against the models) | `SGraph-AI__Tools/sgraph_ai_tools__static/tools/.../en-gb/audio-transcribe/` |
| sg-audio-decode core | `SGraph-AI__Tools/sgraph_ai_tools__static/core/sg-audio-decode/` |
| Infographic generator (OpenRouter, key in localStorage, live users) | `SGraph-AI__Tools` / tools.sgraph.ai |
| LLM component library (`sg-llm-*`), sg-layout | `SGraph-AI__Tools` |
| Google social login implementation | prior SGraph project (per 27 Jul arch brief) |
| Mobile deployment path incl. Apple/Android signing | prior SGraph project (per 27 Jul arch brief) |

## PROPOSED — does not exist yet

- The product web app itself (one-pass upload → transcript/analysis/debrief/infographic).
- iOS and Android targets; Chrome extension (deliberately later).
- OpenRouter per-user key provisioning; the key-provisioning Lambda; the beta hardcoded key.
- Privacy mode selector (routed / restricted / browser-local); browser-local engine.
- Credit purchase flow (Stripe), minimum top-up £5/£10; accounts (social login / local storage).
- The domain wiring for the GitHub Pages site (Dinis, pending).
- Everything else in the 27 July arch brief's open-questions table.

## Decision Log

| Date | Decision | Source |
|------|----------|--------|
| 2026-07-27 | No backend; static hosting (GitHub Pages / S3+CloudFront) | 27 Jul arch brief |
| 2026-07-27 | OpenRouter carries inference and billing; margin = key credit limit | 27 Jul arch brief |
| 2026-07-27 | Privacy as three selectable modes | 27 Jul arch brief |
| 2026-07-27 | 90-day term from 1 Aug 2026; 25% of net; 50/50 profit split | 27 Jul strategy brief / contract draft |
| 2026-07-28 | Default branch is `dev`; two-branch CI with auto-tag | Dinis, session instruction |
| 2026-07-28 | Team/library/CI conventions mirrored from `__App__Send` and `__Tools` | Dinis, session instruction |
