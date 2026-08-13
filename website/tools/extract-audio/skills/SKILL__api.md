# Extract audio from a video — JS API

Published as `window.__tool` on <https://voicedebrief.ai/tools/extract-audio/>
(name `extract-audio`). Every action returns a Promise. Authoritative list:
`../manifest.json` `api` section.

**Free.** No key, no model, no spend — FFmpeg runs as WebAssembly in the tab and
the video never leaves it.

## When it is available

`window.__tool` is assigned **while the page's module evaluates** — before load
completes, without waiting for any network. `window.__toolStatus` always exists
and states the mode (`local` → `sg-tool-api` after the shared primitive loads).

```js
await page.waitForFunction(() => window.__tool)   // not document.readyState
```

## The first call costs 32 MB

FFmpeg's WASM core is fetched on demand from `unpkg.com` the first time you
extract, then cached by the browser. Nothing is downloaded by simply opening the
page. Call `prepare()` if you would rather pay it up front and time the
extraction separately.

| Action | params | returns |
|---|---|---|
| `extractAudio` | `{ file, withAudio?, onProgress? }` | `{ filename, mime, bytes, sourceName, sourceBytes, reencoded, tookMs }`, plus `base64` when `withAudio: true` |
| `prepare` | `{}` | `{ ready }` — loads the core up front |
| `isSupported` | `{}` | `{ supported }` — WebAssembly available |
| `probe` | `{ file }` | duration and dimensions, without loading FFmpeg |
| `getLastAudio` | `{}` | the last result's metadata, or `null` |
| `saveLastAudio` | `{ filename? }` | a real download — `page.waitForEvent('download')` captures it |
| `sendToApp` | `{}` | hands the audio to `/app/` for transcription (same-origin storage) |

Events: `extract:done`. Typed errors: `no-file`, `no-audio`, `no-wasm`.

**Audio is opt-in.** A soundtrack can be tens of megabytes and base64 adds a
third again, so `extractAudio` returns metadata unless you ask for the bytes.

## `reencoded` is the field to read

The audio is **stream-copied** (`-vn -c:a copy`): lossless, fast, and correct for
AAC — which is what a phone or WhatsApp video contains. **Opus in WebM** (screen
recordings, most web downloads) cannot be copied into an `.m4a`, so the tool
re-encodes to AAC and sets `reencoded: true`. Without that fallback the
underlying module reports *"the file may not contain an audio stream"*, which is
false: it has one, it just cannot be copied.

## Playwright

```js
await page.goto('https://voicedebrief.ai/tools/extract-audio/')
await page.waitForFunction(() => window.__tool)

await page.setInputFiles('#file', 'holiday.mp4')
const r = await page.evaluate(() => window.__tool.extractAudio({
    file: document.getElementById('file').files[0], withAudio: true,
}))
await writeFile('holiday.m4a', Buffer.from(r.base64, 'base64'))
console.log(r.reencoded ? 're-encoded to AAC' : 'copied losslessly')
```

## Testing without the 32 MB

`window.__sgVideo = { isWasmSupported: () => true, loadFFmpeg: async () => ffmpegStub,
extractAudio: async (ff, file) => ({ blob, filename }), getVideoInfo: async () => ({…}) }`
replaces the engine module entirely. The estate's own browser tests use it — no
download, no network, and the copy-fails-then-re-encode path is exercised by a
stub that throws once.

---

*This document is licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).*
