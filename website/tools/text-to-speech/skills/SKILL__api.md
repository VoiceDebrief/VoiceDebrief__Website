# Text to speech — JS API

Published as `window.__tool` (SgToolApi, name `text-to-speech`) after `tool:ready`,
on <https://whatsapp-voice-transcription.sgraph.ai/tools/text-to-speech/>.
Every action returns a Promise. Authoritative list: `../manifest.json` `api` section.

Audio is returned as **base64**, not a Blob — a Blob does not survive
`page.evaluate`, which is how an agent drives this page.

| Action | params | returns |
|---|---|---|
| `synthesize` | `{ text, voice?, model?, apiKey? }` | `{ base64, mime, bytes, durationMs, generationId, costUsd, voice, model, tookMs }` |
| `getVoices` | `{}` | `{ voices: [onyx, echo, alloy, fable, nova, shimmer], default, model }` |
| `setApiKey` | `{ apiKey }` | `{ saved }` — stored in this browser only (`sg-openrouter-mgmt-key`) |
| `hasApiKey` | `{}` | `{ present }` |
| `getLastAudio` | `{}` | the last result (base64 included), or `null` |
| `saveLastAudio` | `{ filename? }` | triggers a real browser download — Playwright captures it with `page.waitForEvent('download')` |
| `newsScriptFor` | `{ post }` | `{ script }` — a news-read draft from an `updates.json` post |

Events: `tts:done` (the result, minus the base64).

Typed errors: `no-text`, `no-key`, `bad-voice`, plus the module's own
`tts-http` (provider refused — message included), `tts-no-audio`, `tts-no-stream`.

## Playwright

```js
await page.goto('https://whatsapp-voice-transcription.sgraph.ai/tools/text-to-speech/')
await page.waitForFunction(() => window.__tool)
await page.evaluate(k => window.__tool.setApiKey({ apiKey: k }), process.env.OPENROUTER_KEY)

const r = await page.evaluate(() => window.__tool.synthesize({
    text: 'Here is the latest from Voice Note Transcribe…', voice: 'onyx',
}))
await writeFile('memo.wav', Buffer.from(r.base64, 'base64'))
console.log(r.durationMs, r.costUsd)   // what it made, what it actually cost
```

## Cost, keys and limits

- **BYOK**: the key is the caller's, kept in the browser, sent only to
  OpenRouter, billed to its owner. There is no backend and no server-side store.
- `costUsd` is read back from the generation id after the call. It is `null`
  when OpenRouter has not finished accounting — a missing number, never a
  guessed one.
- Audio models cap the length of a single call. Split long scripts into
  paragraphs, synthesize each, and join the PCM (strip each WAV's 44-byte
  header, concatenate, re-wrap) — the module exports `pcm16ToWav` for that.
- Output is WAV, 24 kHz mono 16-bit — roughly 2.9 MB per minute. Convert
  outside the browser if you need MP3 or Opus.

## Testing without spending anything

`window.__ttsSynthesize = async (text, opts) => ({ blob, durationMs, generationId })`
replaces the real call — the same seam the module itself offers through
`fetchImpl`. The estate's own browser tests use it: no key, no network, no cost.
