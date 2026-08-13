---
created: 2026-08-12T21:00:00Z
source: Dinis — "can you look at the attached brief and see if you have everything to add a tool to this site that extracts the audio from a video (and makes it easy to continue in our main VoiceDebrief UX)"
priority: normal
estimated_effort: medium
parent: 064
---

# Extract audio from a video — the second tool, and the front of the pipeline

Capability debrief from SGraph-AI__Tools (17 Jun), verified before use rather
than taken on trust — the last capability doc had three claims that did not hold.

## What the brief got right

`core/video/sg-video.js` v1.0.1 is live on **both** `tools.sgraph.ai` and
`dev.tools.sgraph.ai`, 30 KB, `Access-Control-Allow-Origin: *` — confirmed with
an `Origin: https://voicedebrief.ai` request. `extractAudio(ffmpeg, file)` runs
exactly `-vn -c:a copy` and returns `audio/mp4`. The cross-origin Worker really
is solved (same-origin blob worker), the single-threaded core really does avoid
COOP/COEP, and the core really is ~32 MB (32,129,114 bytes, measured).

One correction: it returns `{ blob, filename }`, not "name/size".

## Three things the brief understates, and what was done about them

**1. `-c:a copy` fails on WebM, and the error lies.** The brief calls
Opus-in-WebM "rare". It is not: phone and WhatsApp video is AAC and copies
perfectly, but **every screen recording and most web downloads are Opus in WebM**,
which has no place in an MP4 container. The module then throws *"the file may not
contain an audio stream"* — false, and it sends people looking for a fault in
their file.

Fixed on our side, without waiting for the tools repo: the failure is caught and
retried as `-c:a aac` against the FFmpeg instance's own public surface
(`writeFile`/`exec`/`readFile`), and the result carries `reencoded: true` so both
the page and an agent know a re-encode happened.

**2. The FFmpeg core comes from `unpkg.com`, hardcoded.** `FFMPEG_CORE_BASE` is a
`const` and `loadFFmpeg()` takes only `onProgress` — there is no override, so the
32 MB cannot be self-hosted without a change in `sg-video.js`. **Dinis's call:
allow it on this page only.** See the AppSec note below.

**3. It could not be proved end to end here.** This sandbox's browser has no
outbound network, so the module, its signature, CORS and the payload sizes are
verified, but a real extraction has not run. First live run is on QA.

## AppSec note — unpkg.com, scoped to one page (issue 037's territory)

The estate's CSP allowlist was `sgraph.ai` + `openrouter.ai`. This page adds
`https://unpkg.com` to `script-src`/`connect-src`, plus `blob:` (the same-origin
worker FFmpeg needs) and `'wasm-unsafe-eval'` (compiling the module).

What that origin can and cannot reach: it serves executable WASM into this page,
so it is a genuine supply-chain dependency and is named as one in the manifest.
It receives **nothing** — no key (there is none), and not the video, which never
leaves the tab. No other page on the estate gains the origin. Moving the core to
`tools.sgraph.ai` remains the better end state and needs `sg-video.js` to accept
a `coreBase` override; worth raising with the tools repo.

## The hand-off — the "continue in our UX" half

`sniffAudio` already reads `ftyp` as an MP4/AAC container, so an extracted
`.m4a` is a first-class input to the app with no teaching required.

`website/shared/handoff.js`: a **single-slot, same-origin IndexedDB baton**. The
tool stashes the file; the app takes it exactly once, on arrival, and says who
sent it. A Blob cannot travel in a URL and a multi-megabyte base64 string would
blow sessionStorage's quota, so IndexedDB is the only honest option — and it
keeps the promise that the audio never leaves the browser. **No URL parameter is
consulted**: issue 041's rule holds, because nothing here switches on a link.

Two bugs found and fixed while building it:

- the pickup was first placed **after `await bootEngine()`**, which made a purely
  local capability inherit a remote origin's availability — the exact lesson
  issue 064's diagnostic taught. It now runs before the engine boots.
- the FFmpeg instance was cached in a module-level variable that never
  invalidated. It is now keyed to the engine object it came from.

## Tests

Eight browser tests: the copy path, the re-encode fallback (asserting the exact
`-c:a aac` argv), a genuinely silent file, synchronous API publication, the baton
being taken exactly once, and the receiving half — including that receiving
*nothing* is the normal case and does nothing at all. All with **no download, no
network and no spend**, behind a `window.__sgVideo` seam.

The receiving logic lives in `shared/handoff.js` rather than in `app.js`
precisely so it can be tested: the app's components import `SgComponent` from the
engine origin at module level, so the app cannot boot in a sandbox at all.

## Still open

- A real extraction on QA — the one thing this environment cannot prove.
- `sendToApp` currently navigates; a "stay here" option may be wanted once the
  chain (video → audio → transcript → re-voice) is used in anger.
- Ask the tools repo for a `coreBase` override so the 32 MB can come from
  `tools.sgraph.ai` and the CSP can be tightened back.


## 13 Aug — reopened briefly: the worker was refused, and the drop zone overstayed

Both from Dinis, on QA.

### FFmpeg never loaded: `worker-src` was one origin short

Four console errors, a progress bar that never moved, and no 32 MB download —
because nothing got as far as fetching it.

`sg-video.js` cannot let FFmpeg create its own worker: FFmpeg does
`new Worker(new URL('./worker.js', import.meta.url))`, and when the module came
from a CDN that URL is cross-origin, which `new Worker()` refuses outright. So
the engine fetches `worker.js`, rewrites its relative imports to absolute unpkg
URLs (a blob has no path to resolve `./const.js` against) and passes the blob as
`classWorkerURL`. That part is correct and already shipped.

What was missed is what happens next: **a blob worker inherits the creating
page's CSP**, and the module imports it then makes are checked against that
inherited policy. This page allowed `https://unpkg.com` in `script-src` and
`connect-src` but not in `worker-src`, so the worker's own import of
`const.js` was refused and the load died there.

Verified by construction rather than by reading the spec — the same blob-worker
shape built against a local stand-in CDN is **refused** without the origin in
`worker-src` and **loads** with it. `tests/unit/csp.test.mjs` now asserts it,
with the reasoning in the test, and the page's CSP comment says why the origin
appears twice.

### The drop zone now gives way to the file

A target still reading "drop a video here" while a video sits under it offers a
decision already made, and pushes the extract button — the only thing that
matters at that point — further down the page. Choosing a file hides the zone and
shows the file with a **Change** control; Change is the only way back, so the
state is never ambiguous.

Change also clears the input's `value`. Without that, picking the *same* file
again fires no `change` event at all and the page would sit there looking broken
for the second most likely thing a person does.

`tests/integration/extract-audio-page.test.mjs` gates both, and one thing nobody
had checked: **nothing is fetched from the CDN by loading the page or choosing a
file**. A tool that downloaded 32 MB on arrival would cost every visitor that
whether or not they used it.
