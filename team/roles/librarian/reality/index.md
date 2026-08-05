# Reality: What Exists Today

*Part of the [project library](https://whatsapp-voice-transcription.sgraph.ai/library/) — every doc behind this product, organised by audience.*


**maintained by** Librarian
**updated** 2026-08-03
**rule** If it is not in this document, it does not exist. Proposed items are labelled
`PROPOSED — does not exist yet`.

---

## EXISTS (verified in this repo)

| Item | Where | Since |
|------|-------|-------|
| Repo scaffold (README, LICENSE, .gitignore) | repo root | initial commit |
| Brief pack: session understanding, architecture, commercial model, task plan, source map | `library/brief-pack/` | 2026-07-28 |
| Agentic team wiring: rulebook, roster, 10 active ROLE files, humans/comms folders | `.claude/CLAUDE.md`, `team/` | 2026-07-28 |
| This reality document | `team/roles/librarian/reality/index.md` | 2026-07-28 |
| CI: auto-tag on `dev`/`main`, then Pages publish with version stamped into the site | `.github/workflows/ci-pipeline.yml` | 2026-07-28 |
| Issues tracking (issues-fs-lite style) | `issues/` | 2026-07-28 |
| Project library with imported source docs | `library/` | 2026-07-28 |
| MVP static site (footer shows `version`; published after tagging) | `website/` | 2026-07-28 |
| Tech stack & workflow guide for incoming devs | `library/guides/v0.1.0__guide__tech-stack-and-workflow.md` | 2026-07-29 |
| `pyproject.toml` (version CI-owned; unblocks increment-tag) + root README with release badge and repo map | repo root | 2026-07-29 |
| Issues READMEs: top-level table + per-folder views (maintained manually per commit) | `issues/*/README.md` | 2026-07-29 |
| Dev pack: audio-transcribe integration briefs (PROPOSED work, pack itself exists) | `library/dev_packs/v0.1.1__audio-transcribe-integration/` | 2026-07-29 |
| GH Pages + Route 53 DNS guide | `library/guides/v0.1.1__guide__github-pages-and-route53-dns.md` | 2026-07-29 |
| Custom domain LIVE: Route 53 CNAME + Pages claim, HTTPS enforced, HTTP 301s, version-stamped (issue 021 closed) | https://whatsapp-voice-transcription.sgraph.ai | 2026-07-29 |
| Journalist role (active): site Updates section with first three posts | `team/roles/journalist/`, `website/updates/` | 2026-07-29 |
| Public Library page (Librarian-maintained doc front door) | `website/library/` | 2026-07-29 |
| CHANGELOG.md + Librarian-Journalist per-version capture discipline | `CHANGELOG.md`, both ROLE files, `.claude/CLAUDE.md` | 2026-07-29 |
| Three product infographics (product overview, technical architecture, user journey) — created for this repo, distinct from the seven still pending under issue 007 | `library/infographics/` | 2026-07-31 |
| M1-a spike harness: browser page that runs Attempt 1 (entry module) vs Attempt 2 (builders on our own `SgToolApi`) in isolated iframes and reports the contract surface each publishes. Dev harness only — no product code, and the spike's verdict note is not written yet | `website/m1-spike-test.html` | 2026-08-03 |
| The product app (M1+, beta): drop → transcript → summary, streaming; BYOK key; GBP costs; own `whatsapp-transcribe` SgToolApi (18 actions, manifest, SKILLs). Verified headless vs mirrored engine + real fixture ingest; real-key round-trip pending | `website/app/`, `website/components/` | 2026-08-05 |
| Spike verdict recorded: Attempt 2 (dev pack brief 06); engine harness in `website/app/engine.js` | dev pack 06 | 2026-08-05 |
| Two genuine WhatsApp `.opus` fixtures (laptop-download case) + Playwright smoke script | `tests/` | 2026-08-05 |

All rows above are committed and pushed in-session on their stated date.

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

- The infographic stage of the one-pass (gated on issue 024); analysis/debrief beyond the summary document.
- iOS and Android targets; Chrome extension (deliberately later).
- OpenRouter per-user key provisioning; the key-provisioning Lambda; the beta hardcoded key.
- Privacy mode selector (routed / restricted / browser-local); browser-local engine.
- Credit purchase flow (Stripe), minimum top-up £5/£10; accounts (social login / local storage).
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
| 2026-07-28 | Terms with the partner agreed; work is open source and published as produced | brief v0.33.53 |
| 2026-07-28 | First milestone = the end-to-end branded experience; results stream in arrival order (progress → transcript → summary → infographic) | brief v0.33.53 |
| 2026-07-28 | Privacy tiers to be enforced server-side via OpenRouter guardrails on the issued key (model / provider / data policy), not client logic alone | brief v0.33.53 (finding) |
| 2026-07-28 | Hosting: GitHub Pages behind an AWS Route 53 domain | brief v0.33.53 |
| 2026-07-28 | Second administrative vault, separate from user-facing; the ciphertext rule added to `.claude/CLAUDE.md` and needs pre-commit enforcement | brief v0.33.53 |
| 2026-08-05 | `window.__tool` identity: our page always publishes its own `whatsapp-transcribe` SgToolApi; if the spike picks Attempt 1, the upstream engine handle is captured and wrapped (brief 05 wins; resolves review gap 1) | Dinis, session decision |
| 2026-08-05 | UI currency is GBP, converted from the engine's USD metering at a fixed versioned rate in app config, with a "metered in USD" note (resolves review gap 3) | Dinis, session decision |
| 2026-08-05 | M1 key entry: user pastes their own OpenRouter key on the page; stored in localStorage (BYOK; resolves review gap 4) | Dinis, session decision |
| 2026-08-05 | LLM prompts (summary, infographic) live as markdown files served from the site and fetched at runtime — editable without code changes (extends review action 4) | Dinis, session decision |
| 2026-08-05 | Scope confirmed: "tools.sgraph.ai parity" = the capabilities THIS product needs (the one-pass job, starting from a WhatsApp voice memo) — Live/TTS/Chat stay out of v1 | Dinis, session decision |
