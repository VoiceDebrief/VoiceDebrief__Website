# Spike Note: M1-a Import Harness — Attempt 2 Wins

**version** v0.1.13 · **date** 5 August 2026 · **type** Spike verdict (the deliverable [brief 03](03__dev__implementation-brief.md) §2 required)

*Part of the dev pack [v0.1.1__audio-transcribe-integration](README.md).*

---

## Verdict

**Attempt 2 — the method-group builders registered on our own `SgToolApi` — is the
implemented cut.** Attempt 1 (bare import of the entry module) is not viable, and the
reason is structural, not a flaky DOM issue: `audio-transcribe-api.js` exports
`init(manifest)` and **self-executes nothing** — on the tool page it is *called by
manifest-loader* after the loader phases complete. A bare `import()` therefore loads
the module graph and then nothing happens: no `activate()`, no `tool:ready`, no
`window.__tool`. (Calling `init()` ourselves was considered and rejected: with no
`#audio-transcribe-root` host it silently degrades to a stub transport —
`async () => ({content:''})` — and with a host it drags the entire tool UI in.)

## Evidence

Run 5 Aug 2026, via the merged harness (`website/m1-spike-test.html`, headless
Chromium). Sandbox networking cannot reach the live origin from this environment, so
the harness ran against a **local mirror of the live modules** — 43 files downloaded
from `https://dev.tools.sgraph.ai` that day (so the bytes tested are the deployed
bytes); the live origin's CORS (`Access-Control-Allow-Origin: *`) was verified
separately by direct request. Results:

- **Attempt 1**: module imported cleanly (345 ms) → `tool:ready` never fired →
  `window.__tool` absent. FAIL (structural, per above).
- **Attempt 2**: all five modules imported; `createState({})` → 22 keys;
  `buildSourceMethods` / `buildTranscribeMethods` / `buildBatchMethods` returned their
  full method groups; 17 methods registered on our own `SgToolApi`; `activate()` →
  `tool:ready` fired from **our** instance; `window.__tool` published. The only
  misses were `setApiKey`, `ask`, `setSpendCap` — which live in the entry module, not
  the builders.

## Consequences (implemented in `website/app/engine.js`)

1. The three entry-module-only methods are **replicated faithfully** from
   `audio-transcribe-api.js` v0.1.26 (~40 lines): `connect`/`setApiKey` (same
   localStorage key `sg-openrouter-mgmt-key`), `ask` (chat over done transcripts),
   `setSpendCap` (state-backed). The transport is the engine's own
   `makeIsolatedTransport` on our own hidden `[data-llm-bus]` host, with the
   `sg-llm-request` component imported for its custom-element definition.
2. The identity decision (5 Aug) is satisfied **natively**: `window.__tool` is
   `whatsapp-transcribe` from birth — no wrapping needed, since the engine never
   publishes its own identity under this cut.
3. Contract-drift exposure is **narrower than brief 02 §4 assumed**: we depend on the
   builders' signatures + four replicated functions, not on the entry module's
   behaviour. The CI contract smoke still applies.
4. Re-run the harness against the live origin from any normal browser
   (`/m1-spike-test.html`, origin field pre-filled) whenever upstream bumps its
   version — the harness ships with the site.

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
