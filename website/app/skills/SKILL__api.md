# WhatsApp Voice Note Transcribe — JS API

Published as `window.__tool` (SgToolApi, name `whatsapp-transcribe`) after `tool:ready`.
Every action returns a Promise. Authoritative list: `../manifest.json` `api` section.

## wa-specific
| Action | params | returns |
|---|---|---|
| `runPass` | `{ file }` | `{ name, transcript, summary, usage }` — streams `wa:*` events per stage |
| `getResults` | `{}` | the current pass results object |

## Engine (replicates audio-transcribe v0.1.26 — see its SKILL__api for details)
`connect` · `setApiKey` (persists to localStorage `sg-openrouter-mgmt-key`) · `addFiles` ·
`getItems`/`getItem`/`removeItem`/`clearAll` · `listModels`/`setModel` · `transcribeItem` ·
`cancelItem` · `transcribeAll` · `getTranscript` · `getCostSummary` · `setSpendCap` · `ask`

## Events
`wa:pass:started` → `wa:ingested` → `wa:transcript` → `wa:summary` → `wa:pass:complete`;
`wa:summary:error` (summary failure degrades, transcript stands); engine `at:*` events pass
through. Meta surface (`__tool.meta.getManifest/getMethods/getSkills/getVersion/getEvents/
health/getLog`) comes with SgToolApi; keys are masked in the log.
