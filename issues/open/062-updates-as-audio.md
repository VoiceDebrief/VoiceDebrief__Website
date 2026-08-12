---
created: 2026-08-11T10:00:00Z
source: Dinis — "add support for the creating of voice memos audio files (news story style) from the updates written by the Journalist every day, leveraging the TTS support and code we already have in the tools.sgraph.ai CORS enabled site"
priority: normal
estimated_effort: medium
---

# The Updates, read aloud — a voice memo of each post

Brief: `library/briefs/updates-as-audio/v0.1.24__brief__the-updates-read-aloud.md`.
**Nothing is built.** The brief is grounded against the real module, not the
capabilities doc alone.

A tool that turns voice notes into writing, publishing its own news as voice
notes. Uses `core/sg-tts-openrouter` (`synthesizeOpenRouter` → WAV, BYOK,
headless-capable) from the engine origin we already pin.

## Three findings that change the implementation
1. **`tools.sgraph.ai` 403s** for that module path; `dev.tools.sgraph.ai` serves
   it 200 with CORS `*` — the origin `config.js` already pins.
2. **Node cannot import from an https URL** (`ERR_UNSUPPORTED_ESM_URL_SCHEME` on
   Node 22) — the doc's Node example fails as written. Vendor the module, with
   provenance, as QUnit is vendored; do not eval remote code in a process
   holding an API key.
3. **No `ffmpeg` in this environment** — WAV is ~2.9 MB/min, too big to commit,
   so the encode step must be explicit and fail loudly rather than fall back.

## The shape proposed
- The **Journalist writes a `## Spoken` section** in the post's markdown — the
  news style comes from the script, and the words a synthetic voice says in our
  name get reviewed in the diff like everything else. No section → no audio.
- **`scripts/build_audio.mjs`, run deliberately** (not on deploy): declared
  `--max-usd` ceiling, `sha256(script+voice+model)` hash-skip via a manifest,
  key from the environment.
- Published as MP3 next to the post; `updates.json` gains an `audio` block, the
  RSS gains an `<enclosure>` (the feed becomes a podcast), the page gains a
  player, and everything says plainly that the voice is synthetic.
- Testable with **no key and no spend**: `synthesizeOpenRouter` takes
  `fetchImpl`, so the pipeline drives against a scripted fetch exactly as the
  chat-loop suite already does.

## Blocked on Dinis (brief §Decisions)
Voice (`onyx`/`echo`), where it runs (local key vs CI secret), how much back
catalogue, and whether the MP3s are committed or parked in object storage — the
last one is the only part that does not scale quietly.

## Status 11 Aug — the PANEL shipped first (Dinis's call), publishing still open

Dinis: *"what about if we start with a side panel, like the one we did for the
chat, debug and flow, that allows the creation of those voice memos on demand
using the key that we already have."* That inverts the brief's order, and it
dissolves three of its four blockers outright:

- **no CI secret** — the key is already in this browser under the same name the
  app uses (`sg-openrouter-mgmt-key`);
- **no committed audio and no ffmpeg** — you listen in the pane and download
  only what is worth keeping, so WAV's 2.9 MB/min never has to be solved;
- **no vendoring** — the Node https-import limitation does not apply in a
  browser, so the module loads straight from the engine origin (CORS `*`).

And it answers the one thing a pipeline could not: *does the voice sound right.*

**`wa-voice-panel` v0.1.0** on `/updates/`: a 🎙 right-edge pane (joining the
one-pane-at-a-time protocol) that lists the published posts from the same
`updates.json` the page and feed are built from, pre-fills an editable
**news-style script**, offers the six voices, synthesises, plays, and offers the
`.wav` for download. It reports the **real** cost by looking the `generationId`
up against OpenRouter rather than repeating "a fraction of a penny".

Deliberately dependency-free and one file: the Updates page loads no engine, a
reader who never opens the pane fetches nothing extra (the TTS module is
imported on first synthesis), and a sibling `.css` fetched unstamped could
outlive a deploy — the trap issue 050 recorded.

Four browser tests, 16 assertions, **no key, no network, no spend**:
`panel.synthesize` is an injectable seam, the same shape as the module's own
`fetchImpl`. Live-QA fetches the component so a broken path cannot ship quietly.

### Still open (the publishing half)
The `## Spoken` script in the post's markdown, the deliberate generator with its
USD ceiling and hash-skip, MP3 encoding, the RSS `<enclosure>`, and the player
on the page. The panel is now the authoring tool that makes those worth doing —
and the storage decision (commit vs object storage) is still the only part that
does not scale quietly.
