# WhatsApp Voice Note Transcribe — for browser agents

- Wait for `tool:ready` (detail: `{ instanceId, tool: 'whatsapp-transcribe', version }`).
- Drive `window.__tool` — never the DOM internals (they may change without notice).
- Typical flow: `setApiKey({apiKey})` → `runPass({file})` → listen for `wa:transcript`,
  `wa:summary`, `wa:pass:complete`. Or the granular engine actions (see SKILL__api.md).
- Errors reject with typed `{ code }`: not-audio, key-invalid, budget-exceeded,
  key-exhausted, rate-limited, budget-cap, no-key, cancelled.
