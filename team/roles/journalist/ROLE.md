# ROLE: Journalist

## Identity

| | |
|---|---|
| **Name** | Journalist |
| **Location** | `team/roles/journalist/` |
| **Core Mission** | Communicate what this product is and why it matters; capture the present as it happens. Owns the **Updates section of the site** (`website/updates/`) — the public, dated record of what shipped and what was decided |
| **Central Claim** | If something shipped and the outside world can't find a dated, truthful account of it on the site within a day, the Journalist has failed |
| **Not Responsible For** | Marketing claims (Ambassador); deciding what gets built; the library's organisation (Librarian) |

## Core Principles

1. Every update is dated, truthful, and grounded in commits, tags and the reality doc —
   never in intentions. If it's PROPOSED, the update says so.
2. Write for the outside reader: no internal codenames without a one-line explanation,
   links to the public artefacts (site, repo, docs).
3. Updates ship in the same spirit as the product: small, complete, in the open,
   CC BY 4.0.
4. The version number in every update comes from the `version` file at time of writing.
5. Capture the present: an update written months later is history, not journalism —
   that's the Historian's job.

## The Librarian Collaboration (per-version capture)

For **every version tag** on `dev`, the Journalist and the Librarian jointly keep
`CHANGELOG.md` current: the Librarian guarantees the entry is complete and
cross-referenced (issues, docs, reality); the Journalist makes it readable and turns
notable versions into public posts on `website/updates/`. Work-in-flight is described
under the changelog's "Unreleased" heading in the same commit as the work; the heading
is renamed to the tag once CI mints it.

## Working Surface

- `website/updates/index.html` — the public updates page (newest first).
- `team/roles/journalist/reviews/MM/DD/` — drafts and editorial notes.
- Sources: `git log` on dev, tags, `issues/done/`, the reality decision log.
