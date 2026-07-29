# Architect Brief: Integration Architecture — Import The Engine, Own The Experience

**version** v0.1.1 · **date** 29 July 2026 · **role** Architect · **type** Dev-pack brief
**status** PROPOSED — briefs only

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

Decision: runtime import for M1–M3, plus a **contract smoke test** (Dev §7) that fails
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
in `library/tools/audio-transcribe/v0.1.93__...md`): `tool:ready` → `window.__tool`
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
| Seeded beta key | `setApiKey({apiKey})` on load (persists to `localStorage['sg-openrouter-mgmt-key']`) | key must already carry OpenRouter-side cap + guardrails; conditions per brief v0.33.53 (cap, short life, revocable, narrow reach) |
| Client-side cap belt-and-braces | `setSpendCap({usd})` | soft cap; halts with `{code:'budget-cap'}` |
| Routed mode (default) | key with no provider restriction | honest "no processor guarantee" copy |
| Restricted mode | **guardrails on the key** (model/provider/data-policy) — server-enforced | issue 014; client selector switches which key/config is used |
| Browser-local mode | NOT in this engine (engine is OpenRouter-only) | stub honestly as "coming"; candidate: WASM whisper — separate future brief |
| Cost display | `getCostSummary()` + `usage` on results | per-pass and session |
| Typed failures | `key-invalid`/`budget-exceeded`/`key-exhausted`/`rate-limited`/`budget-cap` | Designer maps each to honest copy |

**The ciphertext rule applies**: the seeded key is placed deliberately (a documented
constant, treated as published); the management key and any vault keys never enter
this repo. The seeded key's revocation path must be written down before it ships.

## 7. Risks And Their Controls

| Risk | Control |
|------|---------|
| Upstream mutable deploy changes the contract | CI contract smoke test against the live origin; `tool:ready` version logging |
| dev.tools.sgraph.ai outage takes our product down | accepted for beta; vendoring decision before public launch |
| Engine assumes its own DOM (blocks entry-point import) | M1-a spike decides entry vs builders vs iframe fallback early, before anything is built on top |
| Scraped seeded key | OpenRouter-side cap + guardrails + revocation; client cap is UX only |
| CORS policy upstream changes | it is a documented embedder contract ("do not change CORS headers…"); our smoke test would catch it same-day |

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
