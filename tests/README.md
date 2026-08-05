# Tests

## Fixtures (`fixtures/`)
Two genuine WhatsApp voice notes (Opus in Ogg, mono, 48 kHz), recorded by Dinis on
5 Aug 2026 — the QA matrix's "laptop download" case. Android `.ogg` and
iPhone-forward `.m4a` fixtures still wanted.

## Playwright smoke (`playwright/app-smoke.mjs`)
Boots `website/app/` headless, asserts `tool:ready` → `window.__tool`
(`whatsapp-transcribe`, 18 actions), ingests fixture 1 through `addFiles`, and checks
the shadow-DOM components render. Run from a checkout with `playwright` installed:
`node tests/playwright/app-smoke.mjs` (expects a local CORS server for `website/` and,
in sandboxed environments, a mirror of the engine origin — see the script; in CI or on
a normal network, point it straight at dev.tools.sgraph.ai). A full transcription
round-trip additionally needs an OpenRouter key.
