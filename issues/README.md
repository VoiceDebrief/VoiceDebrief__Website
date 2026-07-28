# Issues — Issues-FS-lite

Task tracking for this repo using **Issues-FS-lite** (spec:
`SGraph-AI__App__Send/team/humans/dinis_cruz/briefs/05/06/email-fs-lite-v0.6.md` §7,
adapted from the per-agent `mail/.../issues/` layout to a single repo-level queue).

## Layout

```
issues/
├── open/       ← active tasks           NNN-kebab-slug.md
├── blocked/    ← waiting on something external
└── done/       ← completed tasks
```

## Task file format

Markdown with frontmatter. Required: `created` (UTC ISO 8601), `priority`
(low/normal/high/urgent). Recommended: `source` (what generated the task),
`estimated_effort` (small/medium/large), `blocked_on` (if blocked), `parent`.
Body: what needs doing, how it will be approached, acceptance criteria.

## The four operations

- **OPEN** — write a file in `open/` with the next sequence number.
- **BLOCK** — `mv` to `blocked/`, add `blocked_on:` and note the blocker in the body.
- **UNBLOCK** — `mv` back to `open/`, append a note that the blocker resolved.
- **CLOSE** — `mv` to `done/`, append an outcome summary.

Issue updates land **in the same commit** as the work they describe, so each commit
reads as: what arrived → what was planned → what was done. Sequence numbers are global
to this repo; next free number = highest existing + 1 across all three folders.
