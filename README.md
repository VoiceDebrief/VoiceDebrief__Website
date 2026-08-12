# SGraph-AI — WhatsApp Audio Transcription

![release](https://img.shields.io/badge/release-v0.1.25-blue) ![licence-docs](https://img.shields.io/badge/docs-CC%20BY%204.0-green) ![licence-code](https://img.shields.io/badge/code-Apache%202.0-blue)

The WhatsApp voice note transcription tool — the first SGraph product going to market.
One job, one pass: drop in the audio (`.opus` / `.ogg` / `.m4a`) → transcript, analysis,
short debrief, and an infographic only if asked. No backend; OpenRouter carries inference
and billing; privacy is a selectable mode.

Everything about this product — code, docs, design decisions, even the commercial
arrangement — is built in the open and published as it is produced.

## Map Of The Repo

| Where | What |
|-------|------|
| [`website/`](website/) | The MVP static site (GitHub Pages; version stamped by CI) |
| [`issues/`](issues/README.md) | The live work queue (Issues-FS-lite) — start here for status |
| [`library/`](library/README.md) | The knowledge base: brief pack, defining briefs, tool docs, guides |
| [`library/brief-pack/`](library/brief-pack/v0.1.0__00__README.md) | What we're building, why, architecture, commercial model |
| [`library/guides/v0.1.0__guide__tech-stack-and-workflow.md`](library/guides/v0.1.0__guide__tech-stack-and-workflow.md) | **New devs start here** — the stack and the working method |
| [`team/`](team/README.md) | The agentic team: roles, reality, human briefs/debriefs |
| [`team/roles/librarian/reality/index.md`](team/roles/librarian/reality/index.md) | What exists today vs PROPOSED |
| [`.claude/CLAUDE.md`](.claude/CLAUDE.md) | The rulebook every agent session follows |

## Working Here

- Default branch is **`dev`** — and for now it is production: it is the branch that
  publishes https://whatsapp-voice-transcription.sgraph.ai. `dev` and `main` go to
  the same place until a separate production estate is split out (decision, 6 Aug
  2026). CI auto-tags both and publishes the site after tagging.
- The `version` file (and the version in `pyproject.toml`) are **owned by CI** — never
  edit them by hand.
- Work is tracked in [`issues/`](issues/README.md); issue updates land in the same
  commit as the work they describe.
- Read the [tech stack & workflow guide](library/guides/v0.1.0__guide__tech-stack-and-workflow.md)
  before your first commit.

## Licence

Documentation is CC BY 4.0 (each doc carries its footer). Code is **Apache 2.0**
(decided 6 Aug 2026 — see [`LICENSE`](LICENSE)); this closes the contract draft's
licence open point.
