# The Agentic Team — WhatsApp Audio Transcription

This repo is developed in the open by an agentic team plus humans, following the working
method of `SGraph-AI__App__Send` and `SGraph-AI__Tools`. The master rulebook is
`.claude/CLAUDE.md`; this file is the team roster and map.

## Layout

```
team/
  roles/{role}/                 role definitions and role output
      ROLE.md                   identity, mission, principles
      reviews/MM/DD/            versioned role output: v{X.Y.Z}__{type}__{slug}.md
  roles/librarian/reality/      what exists today (the reality tree) — start at index.md
  humans/dinis_cruz/
      briefs/MM/DD/             human input — READ-ONLY for agents, no exceptions
      debriefs/MM/DD/           team output summaries back to the human
      claude-code-web/MM/DD/    agent session artefacts
  comms/                        inter-team briefs and changelog (as the repo grows)
```

## The Roster

This repo is at Explorer stage: a core team is active, the rest of the 18-role model from
the sibling repos joins as the product matures. Full role definitions live in each
`roles/{role}/ROLE.md`.

| Role | Status | One line |
|------|--------|----------|
| Conductor | active | Orchestrates work across roles; routes every task; keeps priorities aligned |
| Architect | active | Guards the load-bearing decisions (no backend, key-as-billing, privacy modes); owns boundaries and contracts |
| Dev | active | Builds the product front end from the existing SGraph tools; pragmatic, code-grounded |
| Designer | active | Owns the one-motion experience — form, function and intention, not just UI |
| DevOps | active | Owns the two-branch CI, auto-tagging, GitHub Pages and future store pipelines |
| Librarian | active | Keeps reality vs proposed honest; owns `reality/index.md`, the library, the public Library page and the master index |
| QA | active | Owns test strategy; the audio-format matrix (Opus/Ogg, AAC/M4A) is test surface #1 |
| AppSec | active | Owns key handling: caps, rotation, revocation, the public-beta-key abuse model |
| DPO | active | Owns the privacy-mode claims — routed / restricted / browser-local must be true, UK GDPR lens |
| Ambassador | active | Owns growth and positioning: sell the availability gap, honestly |
| Journalist | active | Captures the present: owns the site's Updates section and, with the Librarian, the per-version CHANGELOG |
| Sherpa | joining | User journey and friction, once there are users to guide |
| Historian, Cartographer, Advocate, GRC, Alchemist, CISO | joining | As in the sibling repos, when the product's maturity warrants them |

## Working Rules (the short version)

1. Read `.claude/CLAUDE.md` and `roles/librarian/reality/index.md` before doing anything.
2. If it is not in the reality doc, it does not exist; label proposals `PROPOSED`.
3. Version-prefix every team document from the root `version` file; bucket by `MM/DD/`.
4. Human brief folders are read-only for agents.
5. Track work as issues in `issues/` (issues-fs-lite); close them in the commit that
   completes them.
