---
created: 2026-08-05T09:40:00Z
source: team/comms/dev-pack-code-review-feedback.md (gap 2 / action 4), approved by Dinis 5 Aug
priority: high
estimated_effort: medium
---

# Commission a v0.1.93-style verified capabilities guide for the infographic generator

M2-a (the infographic step) has no code-verified ground truth, unlike audio-transcribe
(v0.1.93 guide). Write one the same way: verified against the Tools repo source and the
live dev.tools.sgraph.ai origin — the component surface (sg-llm-infographic), inputs,
events, streaming SVG behaviour, key handling, and embedding contract. Gates M2-a.
