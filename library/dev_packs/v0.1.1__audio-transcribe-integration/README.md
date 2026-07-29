# Dev Pack: Leveraging The Existing Audio-Transcribe Tool To The Max

**version** v0.1.1
**date** 29 July 2026
**from** Conductor, Architect, Dev, Designer (agent team session)
**to** The implementing agentic team
**type** Dev pack — briefs only, nothing here is implemented yet
**status** PROPOSED — this pack describes work that does not exist yet

---

## The Core Idea

Achieve the same functionality as the current SGraph tools site — the shipped
**audio-transcribe v0.1.26** at https://dev.tools.sgraph.ai/en-gb/audio-transcribe/
(source: `SGraph-AI__Tools` [`sgraph_ai_tools__static/tools/v0/v0.1/v0.1.60/en-gb/audio-transcribe/`](https://github.com/the-cyber-boardroom/SGraph-AI__Tools/tree/dev/sgraph_ai_tools__static/tools/v0/v0.1/v0.1.60/en-gb/audio-transcribe))
— inside **our** branded site, by importing the existing code directly rather than
rebuilding it.

**The one fact that makes this cheap**: `dev.tools.sgraph.ai` serves everything with
`Access-Control-Allow-Origin: *` (verified live, 29 Jul 2026, from an
`Origin: https://sgraph-ai.github.io` request). The tool's engine is a set of ES
modules whose absolute-path imports (`/core/...`, `/components/...`) resolve against
their own origin — so our page can `import()` the engine by full URL and the entire
dependency tree follows automatically, cross-origin, with no build step and no copies.

**The precedent that proves the pattern**: `live-transcribe` is already "a different
experience on the same engine" — it reuses audio-transcribe's `api/` modules with its
own minimal UI. Our product is the same move with our branding and the one-pass
pipeline (transcript → summary → infographic).

## What Is In This Pack

| File | Role | Contents |
|------|------|----------|
| [`01__conductor__scope-milestones-decisions.md`](01__conductor__scope-milestones-decisions.md) | Conductor | Scope, three milestones, decision gates, task decomposition for the implementing team |
| [`02__architect__integration-architecture.md`](02__architect__integration-architecture.md) | Architect | The import strategy, the `SgToolApi` contract, version pinning, key & spend-cap handling, privacy-mode mapping, ASCII system/data-flow diagrams, risks |
| [`03__dev__implementation-brief.md`](03__dev__implementation-brief.md) | Dev | Concrete file plan, the exact APIs and events to bind, code sketches, error handling, testing |
| [`04__designer__experience-brief.md`](04__designer__experience-brief.md) | Designer | The one-motion experience, streaming reveal order, ASCII screen mockups (desktop+mobile), progress states, mode selector, error/empty states |
| [`05__dev__web-components-and-js-api.md`](05__dev__web-components-and-js-api.md) | Dev + Architect | The SgComponent base class (Shadow DOM, js/html/css triplets), our `wa-*` component layout, design tokens, and full `SgToolApi`/manifest/SKILL compliance from day one |

## Ground Truth (read before implementing)

- [`library/tools/audio-transcribe/v0.1.93__audio-transcribe__integration-and-capabilities.md`](../../tools/audio-transcribe/v0.1.93__audio-transcribe__integration-and-capabilities.md)
  — the code-verified embedding contract (the `window.__tool` API, events, error codes).
- [`library/briefs/first-product-to-market/`](../../briefs/first-product-to-market/) — the product architecture (27 Jul).
- [`team/humans/dinis_cruz/briefs/07/28/v0.33.53__arch-brief__...md`](../../../team/humans/dinis_cruz/briefs/07/28/v0.33.53__arch-brief__sg-send-voice-note-tool-build-status-first-milestone-experience-deliberately-leaked-key-guardrails-enforce-privacy-tiers-two-vaults-ciphertext-rule-send-secrets.md) — the build-session
  brief: milestone = experience; results stream; seeded-key conditions.
- The tool's own docs: `.../audio-transcribe/README.md`, `manifest.json` (authoritative
  API), `skills/SKILL__{human,browser,api}.md` in the Tools repo.

## Definition Of Done (for the whole pack)

A user on **our** site drops a WhatsApp voice note (`.opus`/`.ogg`/`.m4a`) and, with
visible progress throughout, receives a transcript, then a summary document, then (if
asked) an infographic — all client-side, via the imported engine, with cost visible,
a spend-capped key, and honest privacy-mode labelling. Feature parity with what the
tools-site page can do for that job, in our branding.

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
