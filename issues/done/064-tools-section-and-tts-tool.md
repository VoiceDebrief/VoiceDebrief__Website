---
created: 2026-08-12T09:00:00Z
source: Dinis — "that worked amazingly :) in fact so good that what I think we should do is a) move it away from this page b) create a new tools section, where we can start to add tools like this c) in the page for this tool add the generic workflow to create audio from text d) add JS API support for it (do you know about this?) so that it is easy for agents to use these capabilities (via playwright)"
priority: normal
estimated_effort: medium
parent: 062
---

# A Tools section — and text to speech as its first tool, with a JS API

The 🎙 pane shipped on `/updates/` (issue 062) did its job: it proved the voice
sounds right and that BYOK synthesis in the browser needs no backend, no CI
secret, no vendoring and no ffmpeg. It was also in the wrong place — a general
capability bolted to one page, reachable only by readers of the news.

**Shipped.** Four parts, one commit.

## a) Off the Updates page

`wa-voice-panel` v0.1.0 is **retired and deleted**, not left dangling: its whole
job now belongs to a page, and two implementations of one thing is how a codebase
starts lying. The Updates page keeps a plain sentence pointing at the tool, which
still offers every published post as a starting script — the convenience survives
the component.

## b) `/tools/` — a section, not a page

`website/tools/index.html`: what is available now, what already exists elsewhere
on the site that is tool-shaped (the app, the design candidates), and — the part
that matters for the next tool — **what makes something a tool here**: one job
one page, no backend, the caller's own key, an API and not just a UI, honest
about cost. In the nav as **Tools ▾** (`wa-site-nav` **v0.1.8**), in `llms.txt`,
in the sitemap, in live-QA.

## c) The generic workflow, on the tool's own page

`/tools/text-to-speech/` reads whatever text you give it — the news-style read
is one script, not a mode. The page states the whole workflow with nothing
hidden: the text stays local until the button, the module loads **on first use**
(a visitor who only reads the page fetches none of it), one HTTPS call to
OpenRouter with the caller's key at `openai/gpt-audio`, and the cost **read back**
from the generation id rather than estimated. Audio output must stream and the
only streamable format is pcm16 @24 kHz, so the WAV is assembled in the page.

## d) The JS API — `window.__tool`, the same primitive the app publishes

Not a second contract: `SgToolApi` from the engine origin, `activate()` → the
instance on `window.__tools`, the `window.__tool` alias, `tool:ready`, a
`manifest.json` with an `api` section, and `skills/SKILL__api.md`. Actions:
`synthesize`, `getVoices`, `setApiKey`, `hasApiKey`, `getLastAudio`,
`saveLastAudio`, `newsScriptFor`.

Two decisions worth keeping:

- **base64, not a Blob** — a Blob does not survive `page.evaluate`, which is how
  an agent drives this. `saveLastAudio` exists for the other case: it triggers a
  real download that `page.waitForEvent('download')` captures.
- **One implementation, two consumers.** `speak()` is what the button calls and
  what the API registers. There is no "API version" of the tool to drift.

## Tests, and the cost of running them

Six browser tests, 30 assertions, **no key, no network, no spend**:
`window.__ttsSynthesize` and `window.__ttsLookupCost` are seams of the same shape
the module's own `fetchImpl` offers. `wirePage({ root, postsUrl })` takes a
fixture and a blob-URL feed, so the tests drive the real page logic rather than a
copy of it, and `generate()` is returned so a test can await what a click starts.

Verified beyond the suite, with the real `sg-tool-api` bytes served to a headless
browser: `window.__tool` publishes with all seven actions, the manifest resolves
through `meta.getManifest()`, `synthesize` returns base64, and `saveLastAudio`
produces a download Playwright captures as `memo.wav`.

## Two traps avoided

- **The page's logic is a FILE** (`tts-page.js`), not an inline module: CI's
  cache-buster stamps `src=` and relative imports inside `.js`, but cannot reach
  an import written inline in HTML — a page whose bootstrap is inline keeps
  loading last deploy's module for as long as the CDN caches it (issue 026's trap,
  found again in component CSS by issue 050).
- **Blob URLs, not `data:`,** for the player and the download. Base64 is the
  API's currency; a multi-megabyte `data:` URI in an `href` is not.

## Still open — the publishing half of 062

Unchanged by this: the `## Spoken` script in a post's markdown, the deliberate
generator with a USD ceiling and hash-skip, MP3 encoding, the RSS `<enclosure>`
and a player on the post. The tool is now the authoring surface that makes those
worth doing, and an agent can drive it — which is the piece that was missing.
