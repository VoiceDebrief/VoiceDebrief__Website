---
created: 2026-08-06T09:00:00Z
source: Dinis — after the first unattended Journalist routine run: "at the moment the update is happening on the html, which is really not how it should be … isn't it better to make each of these updates to be written in a markdown folder (blog style, with a folder per day), with a center json file coordinating it all? … propose a better way to organise this and make the changes by those agents as atomic and effective as possible"
priority: high
estimated_effort: medium
---

# Content architecture: markdown per post, generated pages, atomic agent writes

## The problem, seen live
The 5am Journalist routine did good editorial work — and to publish it had to splice an
`<article>` into a 145-line presentation file *and* perform surgery on an existing
article to drop a stale caveat. Unattended HTML editing with no validation, on a file
every future publish also touches. It had already produced two link bugs: a URL pointing
at `issues/open/` after the issue moved to `done/`, and one pointing at the moving `qa`
branch.

## Outcome (v0.1.20)
- **`content/`** is the source of truth: `updates/YYYY/MM/DD/*.md`, `versions/*.md`,
  `videos/*.md` — flat `key: value` frontmatter, markdown body, no YAML dependency.
- **`scripts/build_content.py`** (stdlib only) renders `website/updates/index.html`,
  `updates.json`, `feed.xml`, `videos/index.html`, `videos.json` and
  `versions/versions.json`. All six are **gitignored build output**; the two that were
  previously committed are removed from the repo.
- **Links are derived, never written**: `version:` → the diff against the previous
  *released tag*; `issues: 035` → the issue file wherever it currently lives. Both stale
  links above are now impossible to write.
- **The build validates and refuses**: missing/malformed date or version, folder
  disagreeing with frontmatter, duplicate slug, non-existent issue, unclosed fence,
  published video without a valid YouTube id. `--check` runs in the CI test gate on both
  workflows, so bad content fails *before* the tag and the deploy.
- **Ordering, ids, permalinks and markup are all derived** — an agent decides nothing
  about placement.
- `status: draft` holds a file back from the build.
- All 11 existing posts and 21 versions migrated with no content loss; the Versions page
  is untouched (it fetches the same JSON shape, now generated).
- Journalist ROLE rewritten around the new contract; reasoning captured in
  `library/guides/v0.1.20__guide__content-architecture-for-agents.md`.

## Verified
`tests/unit/content.test.mjs` — 10 checks that run the real build over the real content:
ordering, one article per post, permalinks, no moving-branch links, every issue link
resolving to a file that exists, versions.json shape, the RSS feed, and a deliberately
broken post proving the validator blocks a release. Both CI workflows build content
before the version stamp and the cache-buster.
