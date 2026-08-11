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
