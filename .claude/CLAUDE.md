# CLAUDE.md — SGraph-AI__SaaS__WhatsApp__Audio__Transcription

Single source of truth for all agents and roles working in this repository.
Modelled on the conventions of `SGraph-AI__App__Send` and `SGraph-AI__Tools`,
right-sized for a repo at the start of its life.

## The Product

The WhatsApp voice note transcription tool — the first SGraph product going to market.
One job, one pass: drop in the audio (`.opus` / `.ogg` / `.m4a`) → transcript, analysis,
short debrief, and an infographic only if asked.

Canonical architecture: `library/brief-pack/v0.1.0__02__architecture.md` and the 27 July
arch brief in `SGraph-AI__App__Send` (see the brief pack's source map). Load-bearing
decisions, do not casually revisit:

1. **No backend.** Everything runs in the front end; hosting is static (GitHub Pages,
   S3 + CloudFront where needed). The only server-side code ever planned is one
   key-provisioning Lambda, currently deferred.
2. **OpenRouter carries inference and billing.** Per-user keys with spend caps; the
   margin is the issued key's credit limit. No billing system is built here.
3. **Privacy is a mode, not a disclaimer**: routed (default) / restricted / browser-local.
4. **One repo, three targets**: web, iOS, Android (Chrome extension deliberately later).
5. **Two branches, two estates**: `dev` → dev estate, `main` → production.

## Repository Rules

- **Default branch is `dev`.** Feature branches: `claude/{description}-{session-id}`.
  `main` is production. At session start: `git fetch origin dev && git merge origin/dev`.
- **Version file**: `version` at repo root. **NEVER touch it — it is owned exclusively
  by the CI pipeline** (auto-tag on push to `dev` and `main`).
- **File naming**: `v{MAJOR}.{MINOR}.{PATCH}__{type}__{kebab-slug}.md`, double-underscore
  separated, version taken from the `version` file at time of writing. Date-bucketed
  folders use `MM/DD/`.
- **Licence**: docs are CC BY 4.0 (each ends with the standard licence footer);
  code licence per the partnership contract (open source; MIT or Apache 2.0, TBD).
- **Never commit secrets**: no OpenRouter keys (management or per-user), no access
  tokens, no vault keys. A leaked key is a security incident. The beta hardcoded key,
  when it arrives, is added deliberately, capped, and documented — never by accident.

## Reality Discipline

- The Librarian's reality document is `team/roles/librarian/reality/index.md`.
  **If it is not in the reality doc, it does not exist.** Proposed features must be
  labelled `PROPOSED — does not exist yet`. Briefs are aspirations, not facts.
- Update reality in the same commit as the code change it describes.
- No MEMORY.md — all persistent knowledge lives in the repo, maintained by the Librarian.

## Team Structure

Three-team Wardley model as in the sibling repos. This repo is currently an
**Explorer-stage** project (Genesis → Custom-Built): move fast, capture everything,
label maturity honestly.

- Roles live in `team/roles/{role}/` — see `team/README.md` for the roster.
- Role output → `team/roles/{role}/reviews/MM/DD/{version}__{type}__{slug}.md`.
- **`team/humans/dinis_cruz/briefs/` is HUMAN-ONLY — read-only for agents, no exceptions.**
- Agent session artefacts → `team/humans/dinis_cruz/claude-code-web/MM/DD/`.
- Session/debrief summaries → `team/humans/dinis_cruz/debriefs/MM/DD/`.
- Work tracking uses issues-fs-lite under `issues/` (see `issues/README.md`).

## Session Start Checklist

1. Read this file.
2. Read `team/roles/librarian/reality/index.md` (what exists today).
3. Read the latest brief in `team/humans/dinis_cruz/briefs/` (newest MM/DD).
4. Read the latest debrief in `team/humans/dinis_cruz/debriefs/`.
5. Check open issues in `issues/`.

## Stack Rules (as they become relevant)

- Front end: static HTML + vanilla JS + Web Components, IFD-style immutable versioned
  assets (`v0/v0.1/v0.1.0/...`) as in the sibling repos. No SPA frameworks by default.
- Reuse before rebuild: the audio-transcribe tool, sg-audio-decode, LLM components and
  the infographic generator already exist in `SGraph-AI__Tools` — build from them.
- Python (if/when needed, e.g. the key-provisioning Lambda): Type_Safe from osbot-utils,
  osbot-aws (never raw boto3), pytest with no mocks and no patches.
- Tests accompany what they test; CI tags only after tests pass.
