# Architect Brief: Integration Architecture — Import The Engine, Own The Experience

**version** v0.1.1 · **date** 29 July 2026 · **role** Architect · **type** Dev-pack brief
**status** SHIPPED — the work this brief proposed landed as M1–M2 (issues 008/024, Aug 2026)

*Part of the dev pack [v0.1.1__audio-transcribe-integration](README.md) — see the [pack README](README.md) for scope, ground truth and definition of done.*

---

## 1. The Strategy In One Line

**Import the engine (`api/` modules + versioned cores) directly from
`dev.tools.sgraph.ai` at runtime; do not import the UI; build our branded one-motion
UI on our page.** This is the `live-transcribe` pattern — a different experience on the
same engine — applied cross-origin, which the tool's CORS policy explicitly supports
("a vault frame can import() the components"; verified live 29 Jul).

## 2. Why Runtime Import Beats Copying (for now)

| | Runtime import (chosen) | Vendored copy |
|---|---|---|
| Upstream fixes | arrive automatically | manual re-import |
| Drift risk | page is mutable → contract could shift under us | zero |
| Effort | near-zero | fork maintenance from day 1 |
| Offline/apex independence | depends on dev.tools.sgraph.ai uptime | independent |

Decision: runtime import for M1–M3, plus a **contract smoke test** ([Dev](03__dev__implementation-brief.md) §7) that fails
loudly if upstream changes shape. Revisit vendoring (or a pinned tools deploy under our
own domain) before public launch — recorded as an open question, not decided here.

## 3. What Exactly We Import (the seams)

Two workable entry points, in order of preference:

**(a) Engine-only import (preferred).** Import the tool's entry module
`https://dev.tools.sgraph.ai/en-gb/audio-transcribe/api/audio-transcribe-api.js`
after providing the DOM it expects, or — cleaner — import the method-group builders
(`api-source.js`, `api-transcribe.js`, `api-batch.js`) + `ui/state.js` and register
them on our own `SgToolApi` instance from
`/core/sg-tool-api/v0/v0.1/v0.1.0/sg-tool-api.js`. All absolute-path dependencies
(`/core/sg-audio-decode/...`, `/components/llm/sg-llm-request/...`) resolve against
dev.tools.sgraph.ai automatically. The implementing team must spike which cut is
cleanest (entry vs builders) in M1-a — both are legitimate; the deciding factor is
whether the entry module can run without the tool's shell DOM present.

**(b) Iframe fallback.** Embed `/en-gb/audio-transcribe/` in an iframe and drive
`window.__tool` via postMessage bridge. More isolation, uglier integration, brand
seams visible. Keep as fallback only if (a) hits a hard dependency on the tool's DOM.

**Contract we code against** (authoritative: `manifest.json` `api` section; documented
in the [integration & capabilities guide](../../tools/audio-transcribe/v0.1.93__audio-transcribe__integration-and-capabilities.md)): `tool:ready` → `window.__tool`
with `setApiKey`, `addFiles`, `getItems/getItem`, `transcribeItem`, `transcribeAll`,
`cancelItem`, `getTranscript`, `ask`, `getCostSummary`, `setSpendCap`, typed error
codes, and `at:*` events. **We must not depend on anything not in that surface** —
UI internals are explicitly unstable.

## 4. Version Pinning Posture

- Versioned cores (`/core/sg-audio-decode/v0/v0.1/v0.1.0/...`) are immutable — pin them.
- The tool page tree (`/en-gb/audio-transcribe/api/...`) is a **mutable** "latest"
  deploy. Accepted for beta (it's how upstream fixes reach us), defended by the
  contract smoke test in CI and the typed `tool:ready {version}` check (log + warn on
  version change). Do not silently absorb a major bump.

## 5. The One-Pass Pipeline On Top Of The Engine

```
  addFiles({files})            engine ingests .opus/.ogg/.m4a; decode via
        |                      sg-audio-decode (3-tier, never-fail, WASM opus)
        v
  transcribeItem({id})    -->  TRANSCRIPT   (render as it lands)
        v
  ask({text: SUMMARY_PROMPT})  -->  SUMMARY DOCUMENT (markdown; default context
        |                           is already "the done transcripts")
        v   only if asked
  infographic step        -->  INFOGRAPHIC
```

The infographic step reuses the existing generator components from the same origin
(`sg-llm-infographic.js` / the infographic-generator tool's modules — same OpenRouter
key, streaming SVG). Open question for the spike: one call (component) vs two
(generate prompt → render) — resolve in M2-a, record the answer in reality.

The summary + infographic **prompts are ours**: versioned files in our repo (they are
product voice, not engine).

## 6. Keys, Spend, Privacy Modes (mapping to engine seams)

| Product concept | Engine seam | Note |
|-----------------|-------------|------|
| Seeded beta key | `setApiKey({apiKey})` on load (persists to `localStorage['sg-openrouter-mgmt-key']`) | key must already carry OpenRouter-side cap + guardrails; conditions per [brief v0.33.53](../../../team/humans/dinis_cruz/briefs/07/28/v0.33.53__arch-brief__sg-send-voice-note-tool-build-status-first-milestone-experience-deliberately-leaked-key-guardrails-enforce-privacy-tiers-two-vaults-ciphertext-rule-send-secrets.md) (cap, short life, revocable, narrow reach) |
| Client-side cap belt-and-braces | `setSpendCap({usd})` | soft cap; halts with `{code:'budget-cap'}` |
| Routed mode (default) | key with no provider restriction | honest "no processor guarantee" copy |
| Restricted mode | **guardrails on the key** (model/provider/data-policy) — server-enforced | [issue 014](../../../issues/open/014-openrouter-guardrails-exploration.md); client selector switches which key/config is used |
| Browser-local mode | NOT in this engine (engine is OpenRouter-only) | stub honestly as "coming"; candidate: WASM whisper — separate future brief |
| Cost display | `getCostSummary()` + `usage` on results | per-pass and session |
| Typed failures | `key-invalid`/`budget-exceeded`/`key-exhausted`/`rate-limited`/`budget-cap` | Designer maps each to honest copy |

**The ciphertext rule applies**: the seeded key is placed deliberately (a documented
constant, treated as published); the management key and any vault keys never enter
this repo. The seeded key's revocation path must be written down before it ships.

## 7. Diagrams: System, Modules, Data Flow

**7.1 The three origins (who serves what, who talks to whom)**

```
   OUR ORIGIN (GitHub Pages)          TOOLS ORIGIN (dev.tools.sgraph.ai)      OPENROUTER
   sgraph-ai.github.io /  domain      CORS: Access-Control-Allow-Origin: *    openrouter.ai
   +---------------------------+      +-------------------------------+      +-----------------+
   | website/app/index.html    |      | /en-gb/audio-transcribe/api/* |      | /api/v1/chat/.. |
   |   manifest.json (ours)    |      |   (the ENGINE: state, source, |      |  audio-in chat  |
   |   app.js  pipeline.js     |      |    transcribe, batch, errors) |      |  models         |
   |   prompts/*  skills/*     |      | /core/sg-tool-api/...        |       | /api/v1/key     |
   | website/components/wa-*   |      | /core/sg-audio-decode/...    |       |  (key stats)    |
   |   (OUR UI, SgComponent    |      | /core/manifest-loader/...    |       | /api/v1/        |
   |    subclasses)            |      | /components/base/...          |      |  generation     |
   +---------------------------+      | /components/tokens/sg-tokens  |      |  (exact cost)   |
        |        |                    | /components/llm/sg-llm-*      |      +-----------------+
        |        |  import() by       | /components/sg-llm-infographic|            ^
        |        |  full URL          +-------------------------------+            |
        |        +---------------------------^                                     |
        |    (modules' own /core/.. imports resolve back to the tools origin)      |
        |                                                                          |
        +---- user's audio + prompts + Authorization: Bearer <user key> -----------+
              (audio NEVER touches our origin's server - there is no server;
               the only network hops are static fetches + the OpenRouter calls)
```

**7.2 One pass, as a sequence (with the streaming reveal)**

```
  user          our page (wa-* UI + pipeline.js)      engine (imported)         OpenRouter
   |  drop file        |                                   |                        |
   |------------------>|  addFiles({files})                |                        |
   |                   |---------------------------------->|  decode (sg-audio-     |
   |                   |   at:item:added                   |  decode, in-browser)   |
   |   [file card]     |<==================================|                        |
   |  press Go         |  transcribeItem({id})             |                        |
   |------------------>|---------------------------------->|  POST chat/completions |
   |                   |   at:transcribe:started           |----------------------->|
   |   [rail: 12s..]   |<==================================|                        |
   |                   |   at:transcribe:complete {text}   |<-----------------------|
   |   TRANSCRIPT      |<==================================|   usage + generationId |
   |   renders NOW     |                                   |                        |
   |                   |  ask({text: SUMMARY_PROMPT})      |                        |
   |                   |---------------------------------->|  POST chat/completions |
   |   SUMMARY         |<==================================|<---------------------->|
   |   renders NOW     |                                   |                        |
   |                   |  infographic step (only if asked) |                        |
   |                   |---------------------------------->|  streaming SVG         |
   |   INFOGRAPHIC     |<== svg draws progressively =======|<---------------------->|
   |                   |  getCostSummary()                 |                        |
   |   [cost line]     |<==================================|  (deferred exact cost  |
   |                   |                                   |   via /generation)     |
```

**7.3 Key and money flow (no backend anywhere)**

```
   OPERATOR (admin console, manual for beta)
     | mints capped key: spend cap + guardrails (models/providers/data policy)
     v
   SEEDED KEY  --(shipped in client, treated as published)-->  user's browser
     |                                                    localStorage['sg-openrouter-mgmt-key']
     |  every request: Authorization: Bearer <key>
     v
   OPENROUTER  meters each call -> deducts key balance -> rejects at cap
     ^                                    |
     |   revoke/rotate (kill switch)      +--> usage/cost back to the page
   OPERATOR                                    (per pass + session display)
```

**7.4 Component tree on our page (everything below the page is a Web Component)**

```
   app/index.html
   ├── <sg-site-header>          imported (tools origin, pinned)   [maybe: ours later]
   ├── <wa-drop-zone>            ours   - SgComponent subclass
   ├── <wa-file-card>            ours
   ├── <wa-mode-selector>        ours   - privacy tier == price axis
   ├── <wa-progress-rail>        ours   - binds at:* + wa:* events
   ├── <wa-transcript-card>      ours
   ├── <wa-summary-card>         ours   - renders markdown
   ├── <sg-llm-infographic>      imported (tools origin, pinned)
   ├── <wa-cost-line>            ours   - getCostSummary() + at:llm:exchange
   └── window.__tool             OUR SgToolApi ('whatsapp-transcribe') - brief 05
```

## 8. Risks And Their Controls

| Risk | Control |
|------|---------|
| Upstream mutable deploy changes the contract | CI contract smoke test against the live origin; `tool:ready` version logging |
| dev.tools.sgraph.ai outage takes our product down | accepted for beta; vendoring decision before public launch |
| Engine assumes its own DOM (blocks entry-point import) | M1-a spike decides entry vs builders vs iframe fallback early, before anything is built on top |
| Scraped seeded key | OpenRouter-side cap + guardrails + revocation; client cap is UX only |
| CORS policy upstream changes | it is a documented embedder contract ("do not change CORS headers…"); our smoke test would catch it same-day |

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
