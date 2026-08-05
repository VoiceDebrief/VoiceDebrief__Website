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

- M1-a spike harness: `website/m1-spike-test.html` runs the two candidate import cuts from
  [dev brief §2](library/dev_packs/v0.1.1__audio-transcribe-integration/03__dev__implementation-brief.md)
  — Attempt 1 (the `audio-transcribe-api.js` entry module) against Attempt 2 (the method-group
  builders registered on our own `SgToolApi`) — each in its own throwaway iframe, and reports
  which one publishes a `window.__tool` carrying the full contract surface. A developer harness,
  `noindex`, not part of the product; the spike's own deliverable (the note recording which
  attempt won) is still outstanding.
- The three product infographics are documented rather than merely present:
  `library/infographics/README.md` gains a section describing each one, the library
  contents table no longer reads "images pending", the reality doc gains a row for
  them, and `Technical-architecture.jpg.png` is renamed to
  `Technical-architecture.png` (it is a PNG). Dinis's seven from 28 July remain
  pending under issue 007.

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
