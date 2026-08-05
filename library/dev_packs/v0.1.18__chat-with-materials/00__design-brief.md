# M3 design brief — chat with the materials, drive the tool from the chat

*Part of the [project library](https://whatsapp-voice-transcription.sgraph.ai/library/) — every doc behind this product, organised by audience.*

**status** PROPOSED — does not exist yet. This brief is the study output; implementation is issue 034.
**source** Dinis, 5 Aug 2026: "add the ability to 'chat' with the materials created and to
control the tool workflow from the chat environment (via tools)" — one of the strongest
commercial opportunities for the product.
**reference** the chat UX in Dinis's vault-delivered demo app (SG/Send vault, cloned
read-only in-session on 5 Aug; per the ciphertext rule its key lives only in that
conversation, never in this repo). All patterns below were read from its
`src/chat/*.js`, `src/chat-tools.js` and `ARCHITECTURE.md`.

---

## 1. What the reference app proves

The vault app ("talk to this register") has a chat panel that is not a bolt-on chatbot —
it is a governed surface with five load-bearing patterns:

1. **The context composer is the honesty mechanism.** Every contributor to the prompt is
   a row: label, sub-line, token estimate, a checkbox. The checkbox list the user sees
   and the outgoing request are built from the *same row list*, so the panel cannot show
   one thing and send another. Deliberately, not everything defaults on.
2. **App-owned tool calling — no native function-calling.** The model is told it may act
   by replying with ONE fenced block: ` ```tool {"action":"…","params":{…}} ``` `. The
   app parses the first balanced JSON object (tolerant of sloppy fencing), dispatches
   against a **typed registry** (each tool: params signature, description, tier label),
   pushes a `TOOL RESULT (action): …` user message back, and loops.
3. **Three budgets, told to the model.** Steps (runaway guard), writes (mutations), and
   spend ($) per exchange — and every TOOL RESULT carries a "BUDGET: n steps, m changes
   left, $x of $y" line so the model plans instead of getting truncated mid-task. On a
   cap, the transcript shows "not run — this exchange reached its limit"; the
   conversation carries on in the next exchange.
4. **Every tool call is visible in the transcript** (action, params, outcome), and a
   reply that was only machinery is marked `toolOnly` so it never re-enters history as
   prose. The model never supplies a path/identifier that could escape — only names that
   are slugged/validated app-side.
5. **Progress runs on a 200 ms timer, not stream deltas** (deltas are not guaranteed);
   the panel is resizable via a grip; model choice is resolved by regex against the live
   catalogue and an unavailable family renders *disabled with the reason*, never
   silently substituted; per-reply cost and a running spend meter are always visible;
   the system prompt is itself a readable, editable file.

## 2. Mapping to this product

Our advantage: the whole app already speaks through `window.__tool` (27 actions,
manifest, SKILL files). The chat panel is *just another API consumer* — the same
architecture rule the debug pane follows.

- **Panel**: `wa-chat-panel` (SgComponent, IFD-versioned) — a resizable right-side pane
  with a 💬 toggle, sibling to the ⚙ debug pane. Mobile: full-width.
- **Context rows** (built from `getResults()` + `getExchanges()` + `getPrompts()`):
  the transcript · the summary · infographic status · this session's costs/models ·
  prior chat turns. Each a ticked row with a token estimate; the request is built from
  the rows, verbatim.
- **Tool registry** (each entry delegates to an existing `window.__tool` action —
  the registry adds typing, tiers and guards, never new capability):
  | tool | tier | delegates to |
  |---|---|---|
  | `run_sample` | spends money | `runPass` on a bundled sample |
  | `redraw_infographic {model?, style?}` | spends money | `redrawInfographic` |
  | `set_prompt {kind, text}` / `reset_prompt` | changes settings | `setPrompt` / `resetPrompt` |
  | `set_infographic_model {model}` | changes settings | the card's picker |
  | `get_exchanges` / `get_costs` | read | `getExchanges` / `getCostSummary` |
  | `fetch_generation {id}` | read | `fetchGeneration` |
  | `save_transcript` / `save_summary` | read | existing download paths |
- **Budgets**: 8 steps, 2 money-spending tool calls, $0.25 per exchange (the summary
  ask + chat calls are metered through the existing cost pipeline; GBP display as
  everywhere). Budget line included in every TOOL RESULT.
- **Transport**: the existing isolated LLM cell (`busTransport`) with a new `chat`
  action — full message array in, exchange recorded in the debug store (`kind: 'chat'`),
  so the debug pane audits the chat exactly like every other call.
- **Models**: regex-matched against the live OpenRouter catalogue (we already fetch it):
  Gemini Flash (default, cheap), Claude Sonnet, GPT, one open-weight family. Disabled
  with reason when unavailable.
- **System prompt**: a site-served markdown file (`prompts/chat-prompt.md`), editable in
  the debug pane like the other four templates.
- **The commercial line**: the deterministic pass results are already paid for; the chat
  is *metered conversation on top of your own materials* — the panel shows the price
  before send and the actual cost after, exactly as the reference app does.

## 3. Boundaries carried over

- The chat can only call registry verbs — a persuaded model still has only these tools.
- Everything the model reads from the materials is data, never system content.
- No secrets in the panel or the repo: the OpenRouter key stays in localStorage;
  the reference vault's key stays out of this repository (ciphertext rule).

---
Licensed CC BY 4.0 — © 2026 SGraph / The Cyber Boardroom.
