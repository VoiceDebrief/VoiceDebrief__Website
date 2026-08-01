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
