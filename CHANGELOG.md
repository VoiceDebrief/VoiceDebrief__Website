# Changelog

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

- Journalist role joins the active roster — owns the site's **Updates** section;
  first three updates published (`website/updates/`).
- Public **Library** page (`website/library/`) — Librarian-maintained front door to
  the repo's docs, by audience (start-here / dev / defining briefs / agentic team).
- This `CHANGELOG.md` + the Librarian–Journalist per-version capture discipline.
- Landing page nav gains Library and Updates links.
- Issue 021 closed: custom domain fully live (HTTPS enforced, verified from session).

## v0.1.4 — 29 Jul 2026

- Dev pack brief 05: Web Components (SgComponent base) + full SgToolApi/manifest/SKILL
  compliance from day one.
- ASCII screen mockups (Designer brief) and system/sequence/key-flow diagrams
  (Architect brief).
- GitHub Pages + Route 53 DNS guide; custom domain verified working; issue 021 opened
  for the HTTPS finish.

## v0.1.3 — 29 Jul 2026

- Dev pack navigation: `00__README.md` → `README.md`, full relative cross-linking
  between the briefs, issues, guides and workflows.

## v0.1.2 — 29 Jul 2026

- Dev pack `v0.1.1__audio-transcribe-integration` (Conductor / Architect / Dev /
  Designer briefs): import the proven audio-transcribe engine cross-origin, build the
  branded one-pass experience on top. Briefs only — implementation is issue 008.
- Reality index table fix.

## v0.1.1 — 29 Jul 2026

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
