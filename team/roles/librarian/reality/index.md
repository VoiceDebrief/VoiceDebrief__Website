# Reality: What Exists Today

*Part of the [project library](https://whatsapp-voice-transcription.sgraph.ai/library/) — every doc behind this product, organised by audience.*


**maintained by** Librarian
**updated** 2026-08-06
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
| Dev pack: audio-transcribe integration briefs (the work they proposed shipped as M1–M2, issues 008/024) | `library/dev_packs/v0.1.1__audio-transcribe-integration/` | 2026-07-29 |
| GH Pages + Route 53 DNS guide | `library/guides/v0.1.1__guide__github-pages-and-route53-dns.md` | 2026-07-29 |
| Custom domain LIVE: Route 53 CNAME + Pages claim, HTTPS enforced, HTTP 301s, version-stamped (issue 021 closed) | https://whatsapp-voice-transcription.sgraph.ai | 2026-07-29 |
| Journalist role (active): owns the public record — 11 Updates posts, the Versions list and the Videos page, all authored as markdown under `content/` (one file per post; see issue 039) | `team/roles/journalist/`, `content/updates/` | 2026-07-29 (posts current to 2026-08-06) |
| Public Library page (Librarian-maintained doc front door) | `website/library/` | 2026-07-29 |
| CHANGELOG.md + Librarian-Journalist per-version capture discipline | `CHANGELOG.md`, both ROLE files, `.claude/CLAUDE.md` | 2026-07-29 |
| Three product infographics (product overview, technical architecture, user journey) — created for this repo. The seven strategy-level ones from 28 Jul never landed; issue 007 closed as superseded (Dinis, 6 Aug) | `library/infographics/` | 2026-07-31 |
| M1-a spike harness: browser page that runs Attempt 1 (entry module) vs Attempt 2 (builders on our own `SgToolApi`) in isolated iframes and reports the contract surface each publishes. Dev harness only — no product code, and the spike's verdict note is not written yet | `website/m1-spike-test.html` | 2026-08-03 |
| The product app (beta): THE FULL ONE-PASS — drop → transcript → summary → infographic (streamed SVG via reused `sg-llm-infographic`, save .svg), BYOK key, GBP costs, own `whatsapp-transcribe` SgToolApi. Verified e2e 5 Aug (real key + real note): transcript 5.3s, summary 14.7s, infographic 53s, £0.003/pass, zero errors. Issues 008+024 closed | `website/app/`, `website/components/` | 2026-08-05 |
| sg-llm-infographic verified capabilities guide (one-call shape, cell wiring, surface, sanitisation) | `library/tools/infographic-generator/` | 2026-08-05 |
| Content-based audio normalisation (`OggS`/`OpusHead` sniffing) closing the `.ogg` hallucination bug — issue 025, verified across six file/MIME variants; upstream reported to the Tools team | `website/app/audio-normalise.js`, `team/comms/briefs/08/05/` | 2026-08-05 |
| CI cache-busting: every deploy stamps `?v=<version>` onto same-origin JS/CSS so a browser cannot run last deploy's modules against new HTML (issue 026); infographic failures now surface a message | `scripts/stamp_cache_busters.py`, `.github/workflows/ci-pipeline.yml` | 2026-08-05 |
| Spike verdict recorded: Attempt 2 (dev pack brief 06); engine harness in `website/app/engine.js` | dev pack 06 | 2026-08-05 |
| Two genuine WhatsApp `.opus` fixtures (laptop-download case) + Playwright smoke script | `tests/` | 2026-08-05 |
| Advanced/debug pane: `wa-debug-panel` v0.1.0 (resizable right-edge pane — LLM exchange log with full request/response, OpenRouter key/model/generation lookups, editable prompt templates with localStorage overrides incl. the engine's transcription prompt via our transport wrapper); capture layer `debug-store.js`; 8 new API actions; verified e2e with a real key (issue 027) | `website/app/debug-store.js`, `website/app/openrouter.js`, `website/components/wa-debug-panel/` | 2026-08-05 |
| Sample voice notes clickable in the UI (load + auto-run with a saved key) | `website/app/samples/`, app page chips | 2026-08-05 |
| CI test gate: unit (22, node --test) + integration (11-check Playwright app boot) before tag/publish; post-deploy live-site QA job (issue 028) | `tests/unit/`, `tests/integration/`, `tests/qa/`, `ci-pipeline.yml` | 2026-08-05 |
| Repeat-pass fix: same-file rerun reuses the engine's deduped queue item instead of failing "not-audio" (issue 029; upstream reported) | `website/app/pipeline.js`, `team/comms/briefs/08/05/` | 2026-08-05 |
| QA estate LIVE: `qa` branch → Netlify (test gate → stamped `-qa.<sha>` build → netlify-cli publish → 16-check live verification). Secrets in place; verified serving v0.1.14-qa.cbd4382 (issue 030 closed) | `.github/workflows/qa-deploy.yml`, branch `qa`, https://qa.whatsapp-voice-transcription.sgraph.ai | 2026-08-05 |
| Infographic v2 (issue 031): default model `google/gemini-3.1-flash-image-preview` returns a finished image; model picker + redraw on the card (`redrawInfographic` action); editable infographic system prompt (4th debug-pane template); spinner + elapsed heartbeat in main UX and debug pane v0.1.1; samples load into the options screen. Verified e2e (image ~850KB + SVG redraw, real key) | `website/app/infographic.js`, `website/components/wa-debug-panel/v0/v0.1/v0.1.1/` | 2026-08-05 |
| Disabled-key diagnosis (issue 032): network-shaped LLM failures re-checked via GET /api/v1/key; rejected keys named in the error card and on the key panel | `website/app/app.js` | 2026-08-05 |
| Versions page (issue 033): per-tag timeline with diffs (`versions.json` kept in step with CHANGELOG); version chip on every page footer; QA builds stamped `<next-version>-qa.<sha>` from the tags | `website/versions/`, both workflows | 2026-08-05 |
| M3 chat LIVE (issue 034): 💬 `wa-chat-panel` + `chat.js`/`chat-tools.js` — context composer, fenced-block tool loop (typed registry, 3 budgets), debug-audited; validated live by Dinis (tool-driven exchanges, and the chat authored the issue-035 brief) | `website/app/chat*.js`, `website/components/wa-chat-panel/` | 2026-08-05 |
| `?origin=` REMOVED (issue 041): the engine origin is a hardcoded constant; the parameter previously let any URL decide which JavaScript ran in the page beside the user's OpenRouter key. Tests assert `config.js` never reads the query string. Briefing guide kept | `website/app/config.js`, `library/guides/v0.1.20__guide__the-origin-parameter.md` | 2026-08-06 |
| Content architecture (issue 039): `content/updates|versions|videos/*.md` are the source of truth; `scripts/build_content.py` renders the Updates + Videos pages, `updates.json`, `videos.json`, `feed.xml` and `versions.json` as gitignored build output; links derived from `version:`/`issues:`; validation gates both CI workflows | `content/`, `scripts/build_content.py`, `scripts/templates/` | 2026-08-06 |
| Videos page + content type (issue 040): `/videos/`, grouped by kind, click-to-load players (no third-party request before play, asserted by test); three real videos published (chat feature, QA tour, first MVP), a fourth held as a draft pending its id | `website/videos/` (generated), `content/videos/` | 2026-08-06 |
| Chat material edits + image vision (issue 035): `updateMaterial`/`restoreMaterial` actions, `update_transcript`/`update_summary`/`restore_original`/`view_infographic` tools (13 total), revert note under the cards, infographic image as a multimodal part (composer row + tool attachment), suggestions only on a blank thread (`wa-chat-panel` v0.1.1) | `website/app/pipeline.js`, `chat*.js`, panel v0.1.1 | 2026-08-06 |
| Review pack v0.1.20: full project review (code/security, testing+CI, docs, live site) + two proposals — the open engineering hub (doc 06) and QA-to-docs screenshot-verified user docs (doc 08, pattern from Dinis); issues 036 (hub), 037 (security hardening, urgent) and 038 (QA-to-docs) opened from it | `library/review-packs/v0.1.20__project-review/` | 2026-08-06 |
| Security hardening, first slice (issue 037): meta CSP on the app page pinning script/connect sources — verified against the full real decode chain and both integration gates. (Item 1's `?origin=` allowlist was superseded same-day by issue 041's removal of the parameter; the CSP's localhost allowances went with it) | `website/app/index.html`, `website/app/config.js` | 2026-08-06 |
| Engine mirror builder for the integration tests' MIRROR_DIR mode (sandboxed/pinned runs — review E4): crawls the app's tools-origin imports recursively, 32 modules | `scripts/mirror_engine.mjs` | 2026-08-06 |
| Live-QA outbound link check: GitHub + same-origin links on Updates/Library must resolve (third-party hosts warn only) | `tests/qa/live-site-check.mjs` §6 | 2026-08-06 |
| The open engineering hub (issue 036, M-hub-1+2): `/engineering/` + five section pages (pipeline/testing/docs/security/team) rendering CI-emitted `status.json`/`issues.json`/`docs.json`; both workflows emit at deploy (test results travel by artifact); hub pages in the live-QA check | `website/engineering/`, `scripts/emit_engineering_json.py`, both workflows | 2026-08-06 |
| Story-travel plumbing (M-hub-3 slice): OG/Twitter tags on landing, Updates and the hub; RSS feed of Updates posts (Journalist-maintained per post) | `website/updates/feed.xml`, page heads | 2026-08-06 |
| The workflow DECLARED (issue 042, human brief v0.33.56): `runPass` executes from `website/app/workflows/standard.json` — a JSON state machine (requires/produces/model/budget/next/on_failure per step) with a validator, quote maths and a runner enforcing budget entry gates; the quotable max shown pre-run; execution trace on `results.trace` + `wa:workflow:*` events; deleting the file breaks the tool (no code fallback). 7 unit tests | `website/app/workflow.js`, `website/app/workflows/`, `tests/unit/workflow.test.mjs` | 2026-08-06 |
| The 🧭 flow panel (issue 043): third right-edge tab rendering the declaration (steps, models, ceilings, branch, quote) and the live execution trace (status, cost vs ceiling, durations, overruns flagged); joins the one-pane protocol; app-boot checks + qa-to-docs shot 08-flow-run | `website/components/wa-flow-panel/v0/v0.1/v0.1.0/` | 2026-08-06 |
| Workflow dev pack: the v0.33.56 human brief grounded in this codebase — generic format / minimal machinery split, honest budget semantics, the D2 constraint on consensus (needs a second audio-model family) | `library/dev_packs/v0.1.21__workflow-state-machine/` | 2026-08-06 |
| Single-source site nav (issue 048): `wa-site-nav` v0.1.0 — dependency-free web component, all 12 pages/templates, path-derived active state, engineering sub-row, BETA badge on the app; the five drifted header variants retired | `website/components/wa-site-nav/` | 2026-08-07 |
| Run-visibility fix (issue 046): page resets cancel an in-flight pass; a completed pass re-shows its results if the sections were hidden — found live by Dinis via the flow panel's trace outliving the page state | `website/app/app.js` | 2026-08-07 |
| LLM-friendly + SEO (issue 047): `/llms.txt` (skills docs, manifest, workflow declaration, all machine-readable surfaces indexed), generated `/sitemap.xml`, canonicals to production on every page, JSON-LD (SoftwareApplication + Blog), QA estate noindexed at deploy, live-QA coverage | `website/llms.txt`, `scripts/build_content.py`, page heads, `qa-deploy.yml` | 2026-08-07 |
| QA-to-docs harness (issue 038, M-qtd-1): 2 journeys / 7 manifest-named shots with masks, deterministic scripted-OpenRouter replay, pixelmatch diff gate (0.000% self-diff verified; perturbation caught at 0.954%); gating in both workflows with candidates/diffs as the `qa-to-docs` artifact. Baselines NOT yet committed — first CI run produces the candidates (CI-only baseline policy) | `tests/qa-to-docs/`, both workflows | 2026-08-06 |

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

- Analysis/debrief outputs beyond the summary document (if ever wanted — the arch brief's fuller set).
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
| 2026-08-06 | OpenRouter account: personal, for now | Dinis, review-pack decision D1 |
| 2026-08-06 | Model allowlist fixed to the five models the app calls (gemini-3.5-flash, the two gemini image models, claude-sonnet-4.5, gpt-5-mini); key guardrails to restrict to it — Dinis also configuring directly on OpenRouter | Dinis, review-pack decision D2; AppSec review 08/06 |
| 2026-08-06 | Licences settled: code Apache 2.0 (LICENSE canonical), written material CC BY 4.0 — closes the contract draft's licence open point | Dinis, review-pack decision D3 |
| 2026-08-06 | Branch topology: `dev` and `main` go to the same place for now; `dev` is treated as production (it publishes the live domain). A separate `main` estate is a future split | Dinis, review-pack decision D4 |
| 2026-08-06 | Issue 007 closed as superseded: the seven 28-Jul strategy infographics never landed (files' whereabouts unknown) and the three 31-Jul product infographics cover the library's needs | Dinis, session decision |
| 2026-08-06 | `?origin=` removed rather than allow-listed — "the solution is not to have that feature at all, since we can hardcode that origin"; two branches had independently allow-listed it the same day | Dinis, session decision (issue 041) |
