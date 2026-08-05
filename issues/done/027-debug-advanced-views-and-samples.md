---
created: 2026-08-05T17:30:00Z
source: Dinis — "add a number of debug/advance views where we expose as much as we can to the more advanced user … capture and visualise the entire llm requests … full details of the OpenRouter models used … expose (and allow user customisation of) the system prompts … add our sample files to the UI"
priority: high
estimated_effort: large
---

# Debug/advanced views: LLM exchange log, OpenRouter details, prompt customisation, sample files

## What was asked
1. Capture and visualise the **entire LLM requests** (request AND response data), in a
   resizable pane toggled from the right-hand side of the screen.
2. The same area gives **full OpenRouter detail**: the models used and the request data
   fetchable from the generation id.
3. The same area **exposes and lets the user customise** the system prompts / prompt
   templates for audio transcription, summary creation and infographic generation.
4. **Sample voice notes in the UI** — click to load and trigger the workflow.

## Outcome
Done 5 Aug, verified end-to-end with a real key (two passes, all three exchange kinds):

- **`website/app/debug-store.js`** — singleton capture layer. Every LLM exchange
  (transcription via the engine's `onExchange` hook, summary `ask`, infographic call)
  lands in one session log with full request + response, folded pending→done per call.
  Also owns the prompt-override registry (localStorage `wa-prompt-override:{kind}`).
- **Transcription prompt override** — the engine hardcodes its instruction, so the
  override is applied in the one place we own: the transport wrapper in `engine.js`
  swaps the text part of any message carrying a `binary_file` before it reaches the
  LLM bus. Verified on the wire: second pass's recorded request carried the override.
- **`website/app/openrouter.js`** — read-only lookups with the user's key:
  `GET /api/v1/generation?id=` (billed record, with retry for lag), `GET /api/v1/key`,
  `GET /api/v1/models` (cached catalogue).
- **Eight new API actions** on `window.__tool`: `getExchanges`, `clearExchanges`,
  `getPrompts`, `setPrompt`, `resetPrompt`, `fetchGeneration`, `getKeyStatus`,
  `getModelDetails` — manifest + SKILL__api updated. New events: `wa:debug:exchange`,
  `wa:debug:cleared`, `wa:debug:prompt-changed`.
- **`wa-debug-panel` v0.1.0** — fixed "⚙ debug" tab on the right edge; resizable
  (drag the left edge, width persisted), three views: **LLM calls** (expandable rows,
  pretty request/response JSON, audio bytes summarised by size, per-row "fetch
  openrouter generation record"), **OpenRouter** (key status, models-used detail,
  generation lookup by id), **Prompts** (three editors, save override / reset to
  default, override badge). The pane consumes ONLY the published API — it is just
  another embedder.
- **Samples**: the three genuine fixtures published under `website/app/samples/`;
  chips under the drop zone load the file into the normal flow and auto-run the pass
  when a key is saved.

Verified: 11/11 keyless integration checks and the full keyed e2e (transcribe + summary
+ infographic captured; generation record, key status and catalogue entry fetched;
override round-trip on the wire; £0.004 for the two-pass run). Related fix: issue 029.
