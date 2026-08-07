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

- **Fixed: a finished run could be invisible (issue 046, found live by Dinis)**
  — "do another voice note" and remove-file reset the page but did not cancel
  an in-flight pass, which then completed headless into hidden sections (the
  flow panel truthfully showed a completed run the page never displayed). Both
  reset paths now cancel the active pass, and a completing pass re-shows its
  results if the page lost them — a finished run the user paid for can no
  longer be invisible.
- **LLM-friendly + SEO (issue 047)** — `/llms.txt` indexes the site's
  agent-facing surfaces (the `window.__tool` skills docs, action manifest, the
  declared workflow, and every CI-emitted JSON manifest); `build_content.py`
  now also generates `/sitemap.xml` (lastmod from content dates);
  canonical tags on every page point at production; JSON-LD on the landing
  (SoftwareApplication) and Updates (Blog) pages; the QA estate is noindexed
  at deploy so the preview never competes with production in search; live-QA
  checks the new surfaces on every deploy.
- **Each estate's derived links now point at itself** — `build_content.py` gains
  `--ref`: the qa build links `blob/qa/...`, the dev build `blob/dev/...`. The
  live-QA link check caught the gap (its first real save): three 7-Aug posts
  linked issues 041/042/043 at `blob/dev/` while those files existed only on
  the qa branch — three honest 404s on the QA estate.
- **Every CI job now carries an explicit `timeout-minutes`** (test 10, deploys
  10, tag 5, live-QA 15 — sized from healthy runs) so a genuine hang fails fast
  with an honest "timed out" instead of running toward GitHub's 6-hour default.
  Investigated after two qa runs died at exactly ~15m: those never executed a
  step at all — the jobs sat queued with no runner assigned (runner_id 0, empty
  logs) and GitHub cancelled them at its own queue limit; a hosted-runner
  capacity blip, not a test hang, and not something a job timeout governs.
- **The workflow is now a declared state machine (issues 042–043, human brief
  v0.33.56)** — the one-pass executes from `website/app/workflows/standard.json`:
  each step declares what it requires and produces, its pinned model, its
  **spending ceiling**, its permitted transitions and its failure behaviour.
  A validator refuses declarations that lie (unknown transitions, unreachable
  steps, missing failure paths); the runner enforces the budget at every step
  boundary — a run that overruns is stopped, and the overrun itself is recorded,
  never absorbed. The maximum cost is quoted on the options screen before
  anything runs ("max cost for this run ≈ £0.21" — the sum of the declared
  ceilings for the chosen options). A new **🧭 flow panel** (third right-edge
  tab) renders the declaration before a run and the live execution trace during
  and after — per-step status, actual cost against ceiling, durations, the
  skipped branch dimmed — the "what actually happened" provenance record, which
  also rides on `results.trace`. Deleting the declaration breaks the tool: there
  is deliberately no code fallback. One declared-behaviour fix: infographic
  failures now genuinely degrade (the code claimed they did, but aborted).
  Consensus transcription (two models, disagreement marked not resolved) is
  issue 044, blocked on a second audio-model family (D2 amendment); named
  purchasable workflows are issue 045. Dev pack:
  `library/dev_packs/v0.1.21__workflow-state-machine/`.

- **The qa branch merged in** (two same-day workstreams converged): the qa side's
  issues 036/037/038 were minted in parallel with dev's and collided — renumbered
  on merge to **039** (content architecture), **040** (videos page) and **041**
  (`?origin=`; both branches independently allow-listed the same vulnerability
  the same day, then Dinis called the better fix — remove the parameter entirely,
  see the 041 bullet). The qa bullets below appear under their new numbers.
- **The record caught up (review-pack group A)**: the changelog's Unreleased block
  split into its real tag headings (v0.1.12–v0.1.21 below), `versions.json` caught up,
  the Updates page's dead/moving links fixed and pinned to tags, reality-doc and
  issue-README contradictions resolved, open-issue status notes re-dated, and the
  landing page copy corrected (privacy-mode step removed, pricing labelled
  PROPOSED, beta tense fixed). Outbound link-checking of the site's Updates and
  Library links added to the live-QA job so dead links cannot recur silently.
- **Security hardening, first slice (issue 037, items 1–2)** — the `?origin=`
  query parameter was validated against an allowlist, closing the review pack's
  highest-priority finding (S1, key-exfiltration via a crafted link) — later the
  same day superseded by 041's removal of the parameter altogether; and the app
  page carries a meta Content-Security-Policy pinning `script-src` and
  `connect-src` to the origins the app actually uses (S2) — verified against
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
  RSS feed of Updates (superseded on merge by `build_content.py`'s generated
  feed); the chat post's stale "live-key run pending" tag corrected.
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
- **Security: `?origin=` is gone (issue 041)**. The parameter chose which server the
  transcription engine was imported from — so a URL parameter decided which JavaScript
  ran inside the page, beside the user's OpenRouter key in localStorage. A link on our
  own trusted domain (`…/app/?origin=https://somewhere-else`) was enough to run someone
  else's code and take the key. It was first fixed with an allow-list (independently on
  the review-pack branch too, as its issue 037); the version that shipped **removes the
  parameter entirely** — Dinis's call, and the better one, since it existed only for
  development and development never needed it (the tests reach a local engine by
  intercepting requests to the real origin, not by rewriting it). `ORIGIN` is now a
  constant, and a test asserts `config.js` never reads the query string at all, because
  an allow-list can be widened by a later edit while deleted code cannot. Briefing:
  `library/guides/v0.1.20__guide__the-origin-parameter.md`.

- **Publishing is now adding one file (issue 039)**. The Updates page was being edited
  as raw HTML — a fragile job for a person and a worse one for the 5am Journalist
  routine, which had to splice an `<article>` into a 145-line file and perform surgery
  on another to drop a stale caveat. Now `content/updates|versions|videos/*.md` are the
  source of truth and `scripts/build_content.py` generates the pages,
  `updates.json`, `videos.json`, `feed.xml` and `versions.json` (all gitignored build
  output). Links are **derived** — `version:` gives the diff against the previous
  released tag, `issues: 035` finds the issue file wherever it now lives — which retires
  the whole class of stale-link bugs the routine had to fix by hand. The build validates
  and refuses (bad date, duplicate slug, missing issue, dead video id…), gating both CI
  workflows before the tag and the deploy. 11 posts and 21 versions migrated with no
  content loss.
- **A Videos page (issue 040)**: `/videos/`, grouped into demos, explainers and shorts,
  fed by `content/videos/*.md`. Cards, not embeds — **nothing is requested from YouTube
  until you press play**, and playback uses `youtube-nocookie.com`; a test asserts the
  served HTML contains no iframe, because on a product that promises not to track you an
  auto-loading third-party player would be a quiet lie. Three of Dinis's videos are live on it —
  the chat feature, the QA site tour and the first MVP demo, each tied to the release it
  shows — with a fourth held as a draft until its id arrives. Mapping for what comes next (landing-page card,
  videos inside release posts, local posters, transcripts of our own videos made with our
  own tool) in `library/dev_packs/v0.1.20__video-on-the-site/`.

- **Updates + Versions caught up through v0.1.20 (Journalist)**: a new post on
  `website/updates/` for issue 035 (the chat rewriting the transcript/summary with the
  original one click away, seeing the finished infographic as a real image, and the
  suggestion-chip tidy); the M3 chat post's "live-key run pending" caveat resolved
  (Dinis validated it live) and its issue link repointed to `issues/done/`; the Versions
  post now links to the released `v0.1.18...v0.1.19` diff instead of the QA branch; and
  `website/versions/versions.json` gains the v0.1.19 and v0.1.20 entries so the public
  per-version list matches the tags CI has minted (now `content/versions/*.md`;
  v0.1.21 added on merge).

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
  Verified end to end (all 16 live checks) — now at
  https://qa.whatsapp-voice-transcription.sgraph.ai; the live-check wiring
  fixes followed in v0.1.18.
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
