# Text to speech — JS API

Published as `window.__tool` on <https://voicedebrief.ai/tools/text-to-speech/>
(name `text-to-speech`). Every action returns a Promise. Authoritative list:
`../manifest.json` `api` section.

Audio is returned as **base64**, not a Blob — a Blob does not survive
`page.evaluate`, which is how an agent drives this page.

## When it is available (read this before concluding it is missing)

`window.__tool` is assigned **while the page's module evaluates** — before load
completes, and without waiting for any network. All seven actions work
immediately. There is no lazy initialisation and no first-click requirement.

`window.__toolStatus` always exists alongside it and states the mode:

```js
{ tool: 'text-to-speech', ready: true, methods: 7,
  mode: 'local' | 'sg-tool-api',
  engine: { origin: 'https://dev.tools.sgraph.ai', loaded: false, error: null } }
```

The page starts in `mode: 'local'` and upgrades to `mode: 'sg-tool-api'` when the
shared primitive loads from the engine origin — same actions, same results, so
the calling side cannot tell. If that origin is **blocked or slow** (a sandboxed
browser permitted to reach only the page it navigated to will find it is),
`mode` stays `'local'`, `engine.error` names the reason, and everything still
works. A degraded engine load is a downgrade in provenance, not in capability.

`tool:ready` fires on publish and again on upgrade. Do not *depend* on catching
it: a listener attached after load has already missed it. `window.__toolStatus.ready`
is the durable fact.

**Wait like this, not on `readyState`:**

```js
await page.waitForFunction(() => window.__tool)   // resolves before load completes
```

Waiting for `document.readyState === 'complete'` and then reading `window.__tool`
once is not a wait — it is a race. (It was lost by a diagnostic on 12 Aug, against
an earlier build where the whole API really did wait on the engine origin.)

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
await page.goto('https://voicedebrief.ai/tools/text-to-speech/')
await page.waitForFunction(() => window.__tool)
console.log(await page.evaluate(() => window.__toolStatus))   // mode, and why
await page.evaluate(k => window.__tool.setApiKey({ apiKey: k }), process.env.OPENROUTER_KEY)

const r = await page.evaluate(() => window.__tool.synthesize({
    text: 'Here is the latest from VoiceDebrief…', voice: 'onyx',
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
