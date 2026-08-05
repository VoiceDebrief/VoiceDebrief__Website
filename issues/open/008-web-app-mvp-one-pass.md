---
created: 2026-07-28T13:20:00Z
source: team/humans/dinis_cruz — session instructions, 28 July 2026
priority: high
estimated_effort: large
---

# Web app MVP: one-pass transcript / analysis / debrief / infographic

The product itself: drop audio (.opus/.ogg/.m4a) → one pass → outputs. Build from Tools' audio-transcribe + sg-audio-decode + infographic generator. Format detection by content, not extension.

## Alignment from brief v0.33.53 (28 Jul)
Milestone 1 IS this issue: the end-to-end branded experience. Results STREAM in arrival order — visible progress (load-bearing, not decoration) -> transcript (first, longest wait) -> summary document -> infographic (last, the delight). Progress indication is a functional requirement; do not collapse the sequence into one atomic reveal.

## Status 28 Jul (post-merge to dev)
Open, not started. Next major build; streaming order requirement recorded from brief v0.33.53.

## Status 5 Aug
In progress: M1 build started this session. Decisions from the dev-pack review captured (identity wrap, GBP display, BYOK localStorage, prompts as markdown). Spike harness merged; verdict run next.

## Status 5 Aug (later)
M1 SHIPPED to branch: website/app/ live path drop→transcript→summary with streaming rail, BYOK, GBP costs, own SgToolApi. Verified headless (engine boot + real fixture ingest). Remaining before close: real-key round-trip on the live site, M2 infographic (needs 024), then Journalist update post.
