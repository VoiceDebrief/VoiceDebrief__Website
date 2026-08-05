---
created: 2026-08-05T22:50:00Z
source: Dinis — "add a version page that captures all the changes that have been made on each new version … for the QA you can assume the next minor version number … this version number should be visible in all pages"
priority: high
estimated_effort: small
---

# Versions page + the version number on every page; QA builds stamped with the next version

## Outcome
Done 5 Aug:

- **`website/versions/`** — a timeline of every CI tag (v0.1.0 → v0.1.18): date,
  headline, the changes it carried, and a link to its full GitHub diff against the
  previous tag. Data lives in `versions.json`, maintained by the Librarian +
  Journalist in the same commit as `CHANGELOG.md` (the changelog is the full
  record, this is the per-version site view). The page banner shows which version
  the visitor is currently running (live from `/version.txt`).
- **The version chip is on every page footer** (landing, app, library, updates,
  versions), linking to the Versions page; both CI workflows now stamp every HTML
  file, and non-app pages also fetch `/version.txt` (`no-store`) at runtime.
- **QA builds are stamped with the NEXT version**: the qa workflow reads the
  latest `v*` tag via `git ls-remote` (branch copies of the `version` file lag
  dev), bumps the last component, and stamps `<next>-qa.<short-sha>` — e.g.
  `v0.1.19-qa.<sha>` while dev sits at v0.1.18.
- QA live check covers the new page and `versions.json`.
