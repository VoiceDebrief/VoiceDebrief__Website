# The daily Journalist routine — standing brief

*Part of the [project library](https://whatsapp-voice-transcription.sgraph.ai/library/) — every doc behind this product, organised by audience.*

**Runs** daily at 05:00 BST, unattended, via a Claude Routine on this repository.
**Prompt** lives in the Routine; this file is the detail it points at. Keep the two in
step — if you change how publishing works, change this file *and* the Routine prompt.
**Verify at** https://qa.whatsapp-voice-transcription.sgraph.ai (QA estate — the `qa`
branch deploys here automatically, usually within three minutes of a push).

---

## The job

Keep the public record honest and current: what shipped since the last update, in plain
language, for someone who uses the product and does not read code.

## What you may write

| File | When |
|---|---|
| `content/updates/YYYY/MM/DD/<version>__update__<slug>.md` | a user-visible change worth telling people about |
| `content/versions/<version>.md` | a new tag exists with no entry yet |
| `content/videos/<slug>.md` | a new video exists (id known → publish; id unknown → `status: draft`) |
| `CHANGELOG.md` (Unreleased section) | the same change, in the fuller internal register |

The authoring contract — every field, every rule — is
[`content/README.md`](../../../content/README.md). Read it before writing.

## The five rules that keep this safe unattended

1. **Publishing is adding one file.** Never edit `website/` — it is generated from
   `content/` by `scripts/build_content.py` and is not committed. Never hand-edit an
   index or a JSON manifest; they are build output too.
2. **Never write a GitHub URL.** Put `version: v0.1.20` and `issues: 035` in the
   frontmatter; the build derives the release diff and finds each issue file wherever it
   currently lives. Hand-written links are how earlier posts ended up pointing at
   `issues/open/` after the issue had moved, and at a branch that keeps moving.
3. **Correct a post by editing that post's own file.** Never perform surgery on rendered
   markup.
4. **Run `python3 scripts/build_content.py --check` before committing.** It is exactly
   what CI runs. If it fails, fix the content — do not push and hope.
5. **Ground every claim in the repository**: `git log` on `dev`, the tags, `issues/done/`,
   the reality doc. If something is only proposed, say so or leave it out. Never describe
   a feature you have not seen evidence of.

## Working method

1. Find the last published update: the newest file under `content/updates/`.
2. Read what has landed since — `git log` since that date, new tags, newly closed issues
   in `issues/done/`, and the "Unreleased" section of `CHANGELOG.md`.
3. Decide what is **user-visible**. A refactor, a test, a CI change: usually not a post
   (it may still deserve a `content/versions/` bullet). A new capability, a fixed bug
   people hit, a change in what something costs or how it behaves: yes.
4. Write one file per story. Lead with what the reader can now do; keep it scannable —
   short opening paragraph, then bullets. British English. Explain internal names in one
   line or avoid them.
5. If a tag has shipped with no `content/versions/` entry, add it — one file, bullets in
   plain language.
6. `python3 scripts/build_content.py --check`, then commit and push to `qa`.
7. State in your reply: what you published, what you deliberately skipped, and the QA URL
   to check.

## When nothing has changed

Say so in one line and make no commits. An empty day is a fine outcome; an invented post
is not.

## Guardrails

- Push to **`qa` only**. Never to `dev` or `main` — those are release branches and a
  human merges into them.
- Never touch the `version` file or `pyproject.toml` — CI owns them.
- Never commit a key, token or vault key of any kind.
- If a change looks significant but you cannot verify what it does for a user, write
  nothing and say what you could not confirm. Silence beats a wrong claim on a public
  page.
- Never edit another agent's in-flight work; if `content/` has a file for today already,
  add yours alongside it rather than rewriting theirs.

---
Licensed CC BY 4.0 — © 2026 SGraph / The Cyber Boardroom.
