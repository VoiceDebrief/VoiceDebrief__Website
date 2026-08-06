# Changelog

*Part of the [project library](https://whatsapp-voice-transcription.sgraph.ai/library/) — every doc behind this product, organised by audience.*


What each version changed — captured jointly by the **Librarian** (accuracy,
cross-references) and the **Journalist** (readable account, public updates).

**How this file is maintained** (the Librarian–Journalist collaboration):
work lands on a branch with its changes described under **Unreleased**; when the
merge to `dev` is tagged by CI, the next commit renames that heading to the actual
tag. Notable versions become public posts on the site's
[Updates page](website/updates/index.html) — the changelog is the complete record,
the Updates page is the story. One entry per tag, newest first, grounded in
`git log` and [`issues/done/`](issues/done/README.md).

---

## Unreleased (next tag)

- **The record caught up (review-pack group A)**: the changelog's Unreleased block
  split into its real tag headings (v0.1.12–v0.1.21 below), `versions.json` caught up,
  the Updates page's dead/moving links fixed and pinned to tags, reality-doc and
  issue-README contradictions resolved, open-issue status notes re-dated, and the
  landing page copy corrected (privacy-mode step removed, pricing labelled
  PROPOSED, beta tense fixed). Outbound link-checking of the site's Updates and
  Library links added to the live-QA job so dead links cannot recur silently.
- **Security hardening, first slice (issue 037, items 1–2)** — the `?origin=`
  query parameter is now validated against an allowlist (`dev.tools.sgraph.ai`,
  `tools.sgraph.ai`, localhost) before anything is imported from it, closing the
  review pack's highest-priority finding (S1, key-exfiltration via a crafted
  link); the app page carries a meta Content-Security-Policy pinning `script-src`
  and `connect-src` to the origins the app actually uses (S2) — verified against
  the full real decode chain (WASM opus decoder included) and both integration
  gates. New `scripts/mirror_engine.mjs` builds a local engine mirror for the
  integration tests' `MIRROR_DIR` mode (review E4).
- **The open engineering hub (issue 036, M-hub-1 + M-hub-2)** — `/engineering/`
  and five section pages (pipeline, testing, docs, security, team), each
  principle → live view → receipts, rendered client-side from JSON CI emits at
  deploy (`scripts/emit_engineering_json.py`: status, issue queue, doc
  inventory; per-layer test results travel from the test job by artifact). The
  security page carries the S1–S5 hardening state honestly and the
  ciphertext-rule table, doubling as the interim trust page. Landing nav gains
  Engineering; live-QA checks all six pages + the three JSON files. Plus the
  story-travel slice of M-hub-3: OG/Twitter tags on the share targets and an
  RSS feed of Updates (`website/updates/feed.xml`); the chat post's stale
  "live-key run pending" tag corrected.
- **QA-to-docs, first slice (issue 038, M-qtd-1)** — `tests/qa-to-docs/`: the
  key user journeys (the one pass; the chat) replayed deterministically against
  the scripted OpenRouter and screenshotted at 7 manifest-named story moments
  (masks over the version chip, costs and latencies), with a pixelmatch
  image-diff gate against committed baselines — pixel noise ignored, real UI
  change fails the run with side-by-side diff reports, and the same screenshots
  become the user docs' images. Verified in-session: 0.000% self-diff across
  all shots on rerun; a perturbed baseline caught at 0.954%. Both workflows
  gate on it and upload candidates/diffs as an artifact; baselines arm on the
  first CI run per the CI-only baseline policy. The hub's testing page shows
  the journey layer.
- **Issue 007 closed as superseded (Dinis)** — the seven strategy-level
  infographics from 28 Jul never landed (the source files' whereabouts are
  unknown) and the three 31-Jul product infographics cover the library's
  visual needs. The queue's only blocked issue; `issues/blocked/` is now empty.
## [v0.1.21](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.20...v0.1.21) — 6 Aug 2026

- **The four review-pack decisions, decided and landed (Dinis, 6 Aug)** — D1: the
  OpenRouter account is personal for now (issues 010/014 unblocked). D2: the model
  allowlist is the five models the app actually calls, verified in code and recorded
  in the first AppSec review (`team/roles/appsec/reviews/08/06/`), with key
  guardrails to restrict to it. D3: licences settled — code **Apache 2.0** (LICENSE
  canonical), written material **CC BY 4.0**; README, CLAUDE.md and the tech-stack
  guide updated, closing the contract draft's licence open point. D4: `dev` and
  `main` go to the same place for now and `dev` is treated as production (it
  publishes the live domain) — the rulebook, README and guide now say so.
- **Review pack v0.1.20 (`library/review-packs/v0.1.20__project-review/`)** — a full
  project review commissioned by Dinis: state of the project, code + security
  findings, testing/CI assessment, documentation-estate audit, live-site review, and
  the **open engineering hub proposal** (public `/engineering/` pages rendering the
  CI/testing/docs/security/team estate from CI-emitted JSON — the NFRs made visible,
  aimed at collaborators and at GenAI entrepreneurs growing up a vibe-coded service).
  A second proposal (doc 08, pattern briefed by Dinis): **QA-to-docs** — Playwright
  journeys in CI that QA the key user workflows AND capture the screenshots that
  maintain the user docs, with an image-diff gate telling pixel noise from real
  UI/UX change. Issues opened from the pack: **036** (the hub), **037** (app
  security hardening — urgent: `?origin=` allowlist, CSP, chat prompt-tool gating)
  and **038** (QA-to-docs). The pack also
  documents that this changelog's tag-heading discipline is behind since v0.1.11 and
  `versions.json` is two tags stale — the record fixes are its group-A
  recommendation.
## [v0.1.20](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.19...v0.1.20) — 6 Aug 2026

- **The chat can now EDIT the materials and SEE the infographic (issue 035)** — built
  from a developer brief the chat itself wrote during Dinis's live session.
  `update_transcript` / `update_summary` / `restore_original` tools rewrite the page
  (clean-ups, translations) with the original always one click away ("✎ edited by
  the assistant · restore the original" under the card); the finished infographic
  travels as a real picture — a "The infographic image" composer row and a
  `view_infographic` tool whose result attaches the image, so "describe my
  infographic" genuinely works. Suggestion chips now only show on a blank thread
  (`wa-chat-panel` v0.1.1). Registry: 13 tools. All covered by the scripted CI loop
  (Spanish-translation edit → page updates → restore verified).
- **M3: chat with your materials, and drive the tool from the chat (issue 034)** —
  the 💬 pane. A context composer whose checkboxes ARE the request rows (transcript,
  summary, infographic status, session costs, prior turns — each with a token
  estimate); the model can act through fenced ` ```tool ` blocks against a typed
  9-tool registry that only delegates to existing `window.__tool` actions (redraw
  the infographic, run a sample, change prompts, read costs/exchanges/generations);
  three budgets per exchange (8 steps, 2 money-spending calls, $0.25) told to the
  model on every turn; every tool call visible in the thread AND audited in the
  debug pane's exchange log; per-reply model/latency/cost, running GBP spend meter,
  choice of three chat models, suggestions, and the chat system prompt as the fifth
  editable template. Built to the study of the reference vault app
  (`library/dev_packs/v0.1.18__chat-with-materials/`). Verified by a new
  deterministic CI test that scripts OpenRouter through the whole loop — including
  the tool call REALLY redrawing the infographic; live-validated by Dinis in the
  browser ("it worked perfectly").
- **Updates page caught up (Journalist)**: five new posts on `website/updates/`
  covering everything since the 5 Aug "product is live" post — the debug pane,
  sample notes and the stale-JavaScript/re-run fixes (v0.1.16–v0.1.17); the
  infographic becoming a finished image, on by default, with model picker, redraw
  and a progress heartbeat (v0.1.18); the disabled-key diagnosis (issue 032); the
  Versions page and the site-wide version chip, including what the `-qa` suffix
  means to a reader on the QA estate (issue 033); and the M3 chat panel (issue 034
  — its "live keyed run pending" caveat has since been resolved: Dinis validated
  the chat live).
## [v0.1.19](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.18...v0.1.19) — 5 Aug 2026

- **The Versions page (issue 033)**: `website/versions/` lists every CI tag with
  its date, headline and changes, each linking to its full GitHub diff — the
  changelog stays the complete record, the page is the per-version site view
  (data: `versions.json`, maintained in the same commit as this file). The version
  chip now sits on **every** page footer (linking to the page), both CI workflows
  stamp all HTML files, and QA builds are stamped with the **next** version number
  read from the tags (`v0.1.19-qa.<sha>` while dev is at v0.1.18).
- **Fixed: a disabled OpenRouter key read as a network error (issue 032)** — the
  browser gets no CORS headers on that rejection, so the app saw "Failed to fetch"
  and blamed the model side. Network-shaped LLM failures now trigger a key check
  (`GET /api/v1/key`): a rejected key is named in the error card AND flagged on the
  key panel; a healthy key gets an honest "OpenRouter could not be reached". Found
  live by Dinis via the debug pane's exchange log — its first real save.
- The "also make me an infographic" option is now ticked by default (Dinis, 5 Aug —
  "for now"), so a plain run produces the full set: transcript, summary, infographic.
- M3 design brief filed (`library/dev_packs/v0.1.18__chat-with-materials/`) — the
  study of the reference vault app that issue 034's build was made to.

## [v0.1.18](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.17...v0.1.18) — 5 Aug 2026

- **The infographic is now a finished image (issue 031)**: the default model is
  `google/gemini-3.1-flash-image-preview` — the one the proven Infographic Generator
  tool uses — returning a publication-quality picture instead of a drawn SVG (that
  was the answer to "why did we get an SVG": the old default was a text model). The
  card gains a **model picker** (two image models + the drawn-SVG option) and a
  **redraw** button that regenerates just the infographic over the finished pass
  (API: `redrawInfographic`); a pass without an infographic offers "draw
  infographic" afterwards; the system prompt is the debug pane's fourth editable
  template. Long generations get a heartbeat — spinner + live elapsed counter on
  the card, and live `⏳ Ns` tickers on in-flight calls in the debug pane (v0.1.1).
- **Fixed: sample chips skipped the options screen** (issue 031) — they auto-ran
  the pass, making the infographic toggle unreachable. A sample now loads into the
  same options screen as a dropped file.
- Issue 030 closed: the QA Netlify estate verified live end to end; the QA live
  check moved inside the deploy job (the secret-derived URL is dropped from
  cross-job outputs), and the QA CORS check now sends an `Origin` header like a
  browser would — it had failed on a green site (dev run #20).

## [v0.1.17](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.16...v0.1.17) — 5 Aug 2026

- **QA estate live: the `qa` branch auto-deploys to Netlify (issue 030)**. GitHub
  Pages is the dev estate (one Pages site per repo), so `.github/workflows/qa-deploy.yml`
  gives `qa` its own: push → the same unit+integration test gate → Netlify publish
  (build stamped `<version>-qa.<short-sha>`, cache-busted; the `version` file stays
  owned by the dev/main pipeline) → the live-site QA check against the Netlify URL.
  Verified end to end at https://silver-melba-d8d883.netlify.app (all 16 live
  checks); the live-check wiring fixes followed in v0.1.18.
- **The advanced/debug pane (issue 027)**: a "⚙ debug" tab on the right edge opens a
  resizable side pane with three views — **LLM calls** (every request and response the
  page makes, verbatim, audio bytes summarised by size; each row can fetch its billed
  OpenRouter generation record), **OpenRouter** (key status, full catalogue detail for
  the models used, generation lookup by id), and **Prompts** (the transcription,
  summary and infographic templates — editable, overrides persisted in the browser and
  applied from the next pass; the engine-hardcoded transcription prompt is overridden
  at our transport layer). Everything flows through eight new `window.__tool` actions
  (`getExchanges`/`clearExchanges`/`getPrompts`/`setPrompt`/`resetPrompt`/
  `fetchGeneration`/`getKeyStatus`/`getModelDetails`) — the pane is just another API
  consumer. New capture layer `website/app/debug-store.js`; component
  `wa-debug-panel` v0.1.0.
- **Sample voice notes on the app page (issue 027)**: three genuine fixtures served
  from `website/app/samples/`, clickable chips under the drop zone — load the file
  into the normal flow and auto-run the pass when a key is saved.
- **CI now tests every release (issue 028)**: a `test` job (22 unit tests + an
  11-check Playwright integration boot of the real app) gates the tag and the deploy;
  a `qa-live` job checks the live site after the deploy (version stamp, cache-busted
  assets resolve, samples/prompts reachable, engine origin + CORS). Test failure ⇒
  no tag, no publish.
- **Fixed (issue 029): re-running the same voice note failed** with "That doesn't look
  like an audio file". The engine silently dedupes an identical name+size (neither
  added nor rejected); the pipeline now reuses the existing queue item — the engine's
  own re-transcribe path. Found by the new e2e; reported upstream alongside the `.ogg`
  MIME report.

## [v0.1.16](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.15...v0.1.16) — 5 Aug 2026

- **Fixed: after a deploy the browser could run the previous release's JavaScript**
  (issue 026 — reported as "the infographic checkbox did nothing"). GitHub Pages serves
  our modules with `max-age=600`, and the app's own modules were the one part of the
  site not versioned by path, so fresh HTML could pair with ten-minute-old JS. CI now
  stamps `?v=<version>` onto every same-origin import, script and stylesheet in the
  published artifact (`scripts/stamp_cache_busters.py`); upstream tools-origin URLs are
  left alone. The footer version is now fetched with `no-store`, so it always names the
  code actually running — ask for it first when triaging.
- Infographic failures are no longer silent: the card explains what happened (and says
  so when a reply contains no drawable SVG) instead of only turning a rail step red.

## [v0.1.15](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.14...v0.1.15) — 5 Aug 2026

- **Fixed a silent data-integrity bug (issue 025, urgent)**: a `.ogg` voice note whose
  OS MIME is `application/ogg` or `video/ogg` reached the model undecodable and came
  back as a *hallucinated* transcript — fluent, confident, and about audio the user
  never recorded (different fabrication per run; reproduced 4/4 with a real key). Cause:
  the shared engine picks its decode path from the filename extension before the MIME,
  so `.ogg` skipped the decoder that identical `.opus` bytes always take. Fix:
  `website/app/audio-normalise.js` sniffs the leading bytes and hands the engine a File
  whose name and type tell the truth — the 27 Jul arch brief's "detect by content, not
  by extension" rule enforced where it matters. All six variants now transcribe
  correctly; regression test `tests/playwright/ogg-variant-matrix.mjs`; reported
  upstream so the live tools.sgraph.ai tool and other embedders can fix it too.

- **The one-pass is complete (M2)**: the infographic stage ships — one streamed LLM
  call rendered live by the reused `sg-llm-infographic` component (the SVG drawing
  itself is the progress), behind the "also make me an infographic" toggle, with
  save-.svg. Verified end-to-end (real key, real note): transcript 5.3s → summary
  14.7s → infographic 53s, £0.003. Issues 008 and 024 closed.
- `sg-llm-infographic` capabilities guide (v0.1.93-style, code-verified) in
  `library/tools/infographic-generator/` — answers M2-a: one call, component as
  renderer + style-prompt supplier.
- Component updates (IFD: new versions, old immutable): `wa-progress-rail` v0.1.1
  (fourth rail step), `wa-result-card` v0.1.1 (proper heading/bullet rendering —
  fixes the inline-bold summary glitch).

## [v0.1.14](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.13...v0.1.14) — 5 Aug 2026

- **M1 shipped: the product app** — drop a voice note → transcript (about five
  seconds) → structured summary, streaming in arrival order; bring-your-own
  OpenRouter key, stored only in your browser; costs shown in GBP. Built by
  importing the proven audio-transcribe engine cross-origin onto our own
  `whatsapp-transcribe` API (the M1-a spike's Attempt-2 verdict). Issue 008.
- Repo debrief covering the 29 Jul – 5 Aug contributions; the 5 Aug build decisions
  captured; review + spike branches merged; issue 024 opened.
- M1-a spike harness: `website/m1-spike-test.html` runs the two candidate import cuts from
  [dev brief §2](library/dev_packs/v0.1.1__audio-transcribe-integration/03__dev__implementation-brief.md)
  — Attempt 1 (the `audio-transcribe-api.js` entry module) against Attempt 2 (the method-group
  builders registered on our own `SgToolApi`) — each in its own throwaway iframe, and reports
  which one publishes a `window.__tool` carrying the full contract surface. A developer harness,
  `noindex`, not part of the product; the spike's own deliverable (the note recording which
  attempt won) is still outstanding.
## [v0.1.13](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.12...v0.1.13) — 1 Aug 2026

- The three product infographics are documented rather than merely present:
  `library/infographics/README.md` gains a section describing each one, the library
  contents table no longer reads "images pending", the reality doc gains a row for
  them, and `Technical-architecture.jpg.png` is renamed to
  `Technical-architecture.png` (it is a PNG). Dinis's seven from 28 July remain
  pending under issue 007.
- The infographics labelled as early-stage visions rather than current architecture.

## [v0.1.12](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.11...v0.1.12) — 1 Aug 2026

- CHANGELOG brought up to date through v0.1.11.

## [v0.1.11](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.10...v0.1.11) — 31 Jul 2026

- Product overview infographic settled at `library/infographics/Product-overview.png`.
- v0.1.7–v0.1.11 are the product infographics landing one file per push; CI tags every
  push to `dev`. Subsequent image work goes on a branch and merges once.

## [v0.1.10](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.9...v0.1.10) — 31 Jul 2026

- `User-journey.png` renamed to the product overview infographic (the file added in
  v0.1.8 was labelled user-journey in error).

## [v0.1.9](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.8...v0.1.9) — 31 Jul 2026

- User journey infographic added (`User-journey.jpeg`).

## [v0.1.8](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.7...v0.1.8) — 31 Jul 2026

- Infographic added as `User-journey.png` — superseded by the v0.1.10 rename.

## [v0.1.7](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.6...v0.1.7) — 31 Jul 2026

- Technical architecture infographic added (`Technical-architecture.jpg.png`).

## [v0.1.6](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.5...v0.1.6) — 29 Jul 2026

- Navigation sweep: brief-pack README table and cross-refs are now relative links;
  library folder table linked; docs the Library page targets carry an absolute
  back-link to it; changelog headings and Updates version chips link to GitHub
  compare views (delta per version).

## [v0.1.5](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.4...v0.1.5) — 29 Jul 2026

- Journalist role joins the active roster — owns the site's **Updates** section;
  first three updates published (`website/updates/`).
- Public **Library** page (`website/library/`) — Librarian-maintained front door to
  the repo's docs, by audience (start-here / dev / defining briefs / agentic team).
- This `CHANGELOG.md` + the Librarian–Journalist per-version capture discipline.
- Landing page nav gains Library and Updates links.
- Issue 021 closed: custom domain fully live (HTTPS enforced, verified from session).

## [v0.1.4](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.3...v0.1.4) — 29 Jul 2026

- Dev pack brief 05: Web Components (SgComponent base) + full SgToolApi/manifest/SKILL
  compliance from day one.
- ASCII screen mockups (Designer brief) and system/sequence/key-flow diagrams
  (Architect brief).
- GitHub Pages + Route 53 DNS guide; custom domain verified working; issue 021 opened
  for the HTTPS finish.

## [v0.1.3](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.2...v0.1.3) — 29 Jul 2026

- Dev pack navigation: `00__README.md` → `README.md`, full relative cross-linking
  between the briefs, issues, guides and workflows.

## [v0.1.2](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.1...v0.1.2) — 29 Jul 2026

- Dev pack `v0.1.1__audio-transcribe-integration` (Conductor / Architect / Dev /
  Designer briefs): import the proven audio-transcribe engine cross-origin, build the
  branded one-pass experience on top. Briefs only — implementation is issue 008.
- Reality index table fix.

## [v0.1.1](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/compare/v0.1.0...v0.1.1) — 29 Jul 2026

First successfully tagged release; includes the bootstrap merge (PR #1) whose own tag
run had failed on the missing `pyproject.toml`:

- **Bootstrap (28 Jul)**: brief pack (understanding / architecture / commercial model /
  task plan / source map / completion report), agentic team wiring (rulebook + ten
  roles + reality discipline), issues-fs-lite queue, curated library with imported
  source docs, MVP site + Pages deploy, session debrief.
- Brief v0.33.53 filed and actioned (streaming milestone, guardrails finding,
  ciphertext rule, issues 013–016).
- CI reordered: Pages publish **after** auto-tag, version stamped into the site
  footer + `version.txt`; increment-tag fixed via minimal `pyproject.toml`.
- Issue-view READMEs, root README with release badge, tech stack & workflow guide.

## v0.1.0 — 28 Jul 2026

- Repo scaffold (README, LICENSE, .gitignore); tag created by the first CI run on
  the newly created `dev` branch.
