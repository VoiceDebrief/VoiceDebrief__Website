# WhatsApp Voice Note Transcribe — JS API

Published as `window.__tool` (SgToolApi, name `whatsapp-transcribe`) after `tool:ready`.
Every action returns a Promise. Authoritative list: `../manifest.json` `api` section.

## wa-specific
| Action | params | returns |
|---|---|---|
| `runPass` | `{ file, infographic?, style? }` | `{ name, transcript, summary, svg, usage }` — streams `wa:*` events per stage |
| `getResults` | `{}` | the current pass results object |

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
