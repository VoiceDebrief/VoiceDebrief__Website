# WhatsApp Voice Note Transcribe — JS API

Published as `window.__tool` (SgToolApi, name `whatsapp-transcribe`) after `tool:ready`.
Every action returns a Promise. Authoritative list: `../manifest.json` `api` section.

## wa-specific
| Action | params | returns |
|---|---|---|
| `runPass` | `{ file, infographic?, infographicModel?, style? }` | `{ name, transcript, summary, svg, image, usage }` — streams `wa:*` events per stage |
| `getResults` | `{}` | the current pass results object |
| `redrawInfographic` | `{ model?, style? }` | regenerate just the infographic over the current pass (image models return `image` as a PNG data URL; the SVG model returns `svg`) |

## Chat (issue 034 — the wa-chat-panel consumes only these)
| Action | params | returns |
|---|---|---|
| `chat` | `{ messages, model?, label? }` | one raw model call over a full message array; recorded in the exchange log (`kind: chat`) |
| `getChatContext` | `{}` | the context-composer rows (id, label, text, token estimate, default tick) — the panel's checkboxes and the request are built from these same rows |
| `chatExchange` | `{ text, rowsOn?, model? }` | one user turn: bounded model/tool loop (8 steps, 2 money-spending calls, $0.25) — the model acts via fenced ```tool blocks against a typed registry that delegates to existing actions; emits `wa:chat:update` per message |
| `getChatHistory` | `{}` | `{ messages, busy, spendUsd, spendGbp, calls }` — tool calls appear as visible `role: "tool"` entries |
| `clearChat` | `{}` | start a new conversation |
| `getChatTools` | `{}` | the registry: action, tier (`read` / `changes settings` / `changes materials` / `spends money`), params, description |
| `updateMaterial` | `{ what: "transcript"\|"summary", text }` | overwrite a material on the page (the original is kept; a "restore the original" link appears) — the chat's `update_transcript`/`update_summary` tools delegate here |
| `restoreMaterial` | `{ what }` | undo the assistant's edit |

## The declared workflow (issue 042 — the wa-flow-panel consumes only these)
| Action | params | returns |
|---|---|---|
| `getWorkflow` | `{ options? }` | `{ definition, maxUsd, quoteUsd }` — the state machine `runPass` executes (`app/workflows/standard.json`) and the quotable budget ceiling for the given options |
| `getWorkflowTrace` | `{}` | the current/last run's execution trace (per-step status, cost vs declared budget, duration — the provenance record; also on `results.trace`); `null` before any run. Live stream: `wa:workflow:started` / `wa:workflow:step` / `wa:workflow:complete` |

## Debug / advanced (issue 027 — the wa-debug-panel consumes only these)
| Action | params | returns |
|---|---|---|
| `getExchanges` | `{ kind?, status?, limit? }` | every LLM exchange this session — full request + response (audio bytes summarised by size) |
| `clearExchanges` | `{}` | `{ ok }` |
| `getPrompts` | `{}` | the three prompt templates (`transcribe`/`summary`/`infographic`) with default, override and active text |
| `setPrompt` | `{ kind, text }` | saves an override (localStorage `wa-prompt-override:{kind}`); applies from the next pass |
| `resetPrompt` | `{ kind }` | removes the override |
| `fetchGeneration` | `{ id }` | the OpenRouter billed record for a generation id (GET /api/v1/generation, user's key) |
| `getKeyStatus` | `{}` | what OpenRouter reports about the saved key (GET /api/v1/key) |
| `getModelDetails` | `{ ids? }` | public catalogue entries (GET /api/v1/models), all models if no ids |

## Engine (replicates audio-transcribe v0.1.26 — see its SKILL__api for details)
`connect` · `setApiKey` (persists to localStorage `sg-openrouter-mgmt-key`) · `addFiles` ·
`getItems`/`getItem`/`removeItem`/`clearAll` · `listModels`/`setModel` · `transcribeItem` ·
`cancelItem` · `transcribeAll` · `getTranscript` · `getCostSummary` · `setSpendCap` · `ask`

## Events
`wa:pass:started` → `wa:ingested` → `wa:transcript` → `wa:summary` →
(`wa:infographic:started` → `wa:infographic`) → `wa:pass:complete`;
`wa:summary:error` / `wa:infographic:error` (either failure degrades, transcript stands);
`wa:debug:exchange` / `wa:debug:cleared` / `wa:debug:prompt-changed` announce debug-log and
prompt-override changes; engine `at:*` events pass through. Meta surface (`__tool.meta.getManifest/getMethods/getSkills/getVersion/getEvents/
health/getLog`) comes with SgToolApi; keys are masked in the log.
