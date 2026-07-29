# Dev Brief: Implementation Plan — Wire The Engine, Bind The Events, Ship Thin

**version** v0.1.1 · **date** 29 July 2026 · **role** Dev · **type** Dev-pack brief
**status** PROPOSED — briefs only; code sketches are sketches, not shipped code

---

## 1. Where The Code Goes

```
website/
  index.html                      existing landing page (unchanged)
  app/
    index.html                    the product page ("drop your voice note")
    app.js                        bootstrap: import engine, wire UI
    pipeline.js                   the one-pass orchestration (transcript→summary→infographic)
    prompts/
      summary-prompt.js           OUR versioned prompt for the summary document
      infographic-prompt.js       OUR versioned prompt (if the two-call shape wins)
    ui/                           our branded components (drop zone, progress, results)
    app.css
```

Plain ES modules, no build step — the same deploy path as the landing page (CI
publishes `website/` after tagging; version stamp available in `version.txt`).

## 2. M1-a: The Import Harness (the spike that decides the cut)

Try in this order; stop at the first that works cleanly:

```js
const ORIGIN = 'https://dev.tools.sgraph.ai';

// Attempt 1 — entry module (gives window.__tool + tool:ready for free):
window.addEventListener('tool:ready', e => start(window.__tool), { once: true });
await import(`${ORIGIN}/en-gb/audio-transcribe/api/audio-transcribe-api.js`);
// Works only if the entry runs without the tool's shell DOM (it calls mountShell —
// check whether mount failure is fatal or catchable; if fatal → Attempt 2).

// Attempt 2 — builders on our own SgToolApi (engine only, no UI expectations):
const { SgToolApi }             = await import(`${ORIGIN}/core/sg-tool-api/v0/v0.1/v0.1.0/sg-tool-api.js`);
const { createState }           = await import(`${ORIGIN}/en-gb/audio-transcribe/ui/state.js`);
const { buildSourceMethods }    = await import(`${ORIGIN}/en-gb/audio-transcribe/api/api-source.js`);
const { buildTranscribeMethods }= await import(`${ORIGIN}/en-gb/audio-transcribe/api/api-transcribe.js`);
const { buildBatchMethods }     = await import(`${ORIGIN}/en-gb/audio-transcribe/api/api-batch.js`);
// register groups, activate → window.__tool (mirror what audio-transcribe-api.js does,
// minus mountShell). Read that file first; keep our harness under ~100 lines.

// Attempt 3 — iframe + postMessage bridge (Architect §3b). Last resort.
```

Deliverable of the spike: a one-page note in this pack's folder recording which
attempt won and why (future sessions must not re-derive it).

## 3. M1-b: Drop → Transcript

```js
const { added, rejected } = await __tool.setApiKey({ apiKey }) // seeded or BYOK
  .then(() => __tool.addFiles({ files }));                      // .opus/.ogg/.m4a ok
for (const r of rejected) showRejection(r);                     // {name, code}
const item = added[0];
const res  = await __tool.transcribeItem({ id: item.id });      // {text, latencyMs, usage, generationId}
renderTranscript(res.text, res.usage);
```

- The engine ingests WhatsApp `.opus` natively (sg-audio-decode: pass-through →
  decodeAudioData → WASM opus; never-fail). **Do not write any format detection —
  it exists.** Content-based detection is already the engine's behaviour.
- Multiple files: same flow via `transcribeAll({concurrency})` — but v1 UI accepts
  one file (one motion); keep the batch path unwired.
- Cancel: `cancelItem({id})` aborts the in-flight fetch — wire the Stop button to it.

## 4. M2: Summary + Infographic + Export

```js
// Summary (default context = the done transcripts):
const summary = await __tool.ask({ text: SUMMARY_PROMPT });     // {text, usage}
renderMarkdown(summary.text);   // the tool ships markdown.js; import or write ~30 lines

// Infographic — only if the user asked:
// M2-a spike: import the infographic components from the same origin
//   (sg-llm-infographic / the infographic-generator tool's modules) and reuse the
//   same key; streaming SVG renders progressively. Record one-call vs two-call.

// Export: copy button (navigator.clipboard), download .md (Blob URL),
//         download/save the SVG. downloadZip() exists if we want "everything".
```

Prompts live in `prompts/` with a version header comment — they are product voice,
reviewed by the Designer, and changed via PR like code.

## 5. Errors — Bind The Typed Codes, Never String-Match

| `err.code` | UI behaviour (Designer §5 has the copy) |
|------------|------------------------------------------|
| `not-audio` / `too-large` / `empty` | rejection note on the drop zone |
| `key-invalid` (401) | "key not accepted" + BYOK input |
| `budget-exceeded` (402) / `key-exhausted` (403) | beta credits exhausted state |
| `rate-limited` (429) | auto-retry once with backoff, then say so |
| `budget-cap` | session cap reached (our own cap via `setSpendCap`) |
| `cancelled` | quiet reset to ready |
| anything else | generic failure + provenance hint (`getExchanges()`) |

## 6. Progress & Events (the streaming reveal)

Bind `at:*` window events (all carry `instanceId`):
`at:item:added` → show file card; `at:transcribe:started/progress/complete/error` →
progress states; `at:llm:exchange` → optional provenance panel; batch events unused
in v1. The reveal order is a hard requirement: transcript renders the moment it
completes; summary and infographic each appear when done; nothing waits for the
slowest stage.

## 7. Tests (CI-gating, no mocks)

- **Contract smoke** (Playwright, runs in CI before publish): load our app page,
  assert `tool:ready` fires, `__tool.getItems()` returns an array, `addFiles` with a
  real fixture `.opus` ingests, and — with a key present in CI secrets — one
  `transcribeItem` round-trip completes OR skips cleanly when no key is configured.
- **Fixtures**: real files in `tests/fixtures/` — laptop `.opus`, Android `.ogg`,
  iPhone-forward `.m4a` (Dinis supplies; QA owns the matrix).
- When tests land, add `run-tests` to ci-pipeline.yml and gate `increment-tag` on it
  (`needs: [run-tests]`) — as the sibling repos do.

## 8. Explicitly Not Now

Live/mic mode, TTS, Chat UI, batch UI, sendViaSgSend, samples/tones — the engine has
them; the product doesn't (yet). Do not surface. Do not fork engine files to strip
them either — import and ignore.

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
