# Tests

Three layers, wired into CI (`.github/workflows/ci-pipeline.yml`): **unit + integration
gate the release** (a failure means no tag and no deploy); **QA** checks the live site
after each deploy.

## Fixtures (`fixtures/`)
Genuine WhatsApp voice notes (Opus in Ogg, mono, 48 kHz), recorded by Dinis on
5 Aug 2026 — the "laptop download" and Android-export cases. Also served to users as
the app's clickable samples (`website/app/samples/`).

## Unit (`unit/`) — `node --test tests/unit/*.test.mjs`
Pure-module tests, no browser, no network: `audio-normalise` (the issue-025 sniffing
matrix against real fixture bytes), `config` (GBP formatting, `?origin=` override),
`debug-store` (exchange capture, pending→done folding, prompt overrides, the
transport-level transcription-prompt override). Node 20+ (File/Blob globals).

## Integration (`integration/app-boot.test.mjs`) — `node tests/integration/app-boot.test.mjs`
Boots the real app headless (Playwright) and exercises everything that works without
an OpenRouter key: engine import, the full `window.__tool` action contract from the
manifest, real-fixture ingest, sample chips, the debug pane's three views, prompt
override round-trip. Env knobs: `TOOLS_ORIGIN` (default dev.tools.sgraph.ai),
`MIRROR_DIR` (serve the origin from a local mirror in sandboxed environments),
`CHROMIUM_PATH`, `SITE_DIR`.

## QA (`qa/live-site-check.mjs`) — `node tests/qa/live-site-check.mjs`
Plain fetches against the LIVE site (`LIVE_URL` overridable): pages, `version.txt`
(waits for CDN propagation when CI passes `EXPECT_VERSION`), every `?v=`-stamped asset
resolves (the issue-026 class), manifest/prompts/samples reachable, engine origin up
with CORS `*`.

## Keyed end-to-end (in-session, not CI)
LLM round-trips cost real money, so they run in-session with a spend-capped key: the
full pass (transcript → summary → infographic), debug capture of all three exchange
kinds, OpenRouter generation/key/model lookups, and the prompt override verified on
the wire. `playwright/` keeps the earlier smoke + ogg-variant scripts.
