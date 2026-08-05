---
created: 2026-08-05T18:00:00Z
source: user report via Dinis — ".ogg files didn't work (the other file types worked great)"
priority: urgent
estimated_effort: medium
---

# .ogg voice notes returned HALLUCINATED transcripts (silent data-integrity bug)

## What the user saw
`.opus` and `.m4a` worked; `.ogg` "didn't work". Investigation showed something worse
than a failure: for `.ogg` files the OS labels `application/ogg` or `video/ogg`, the app
returned a fluent, confident transcript **of audio the user never recorded**, with no
error shown.

## Reproduction (5 Aug, real key, real voice note, same bytes each time)
| File.type | Result |
|---|---|
| `audio/ogg` | correct transcript, every run |
| `application/ogg` | "There was a sound of footsteps in the corridor." / "The government has spent up to 13 million pounds…" |
| `video/ogg` | "The current system is not capable of handling these requests." / "The government has approved a change in planning rules…" |

Different fabrication per run — the model hallucinating over undecodable input.

## Root cause
Upstream engine decides its decode path from the FILENAME EXTENSION: `needsDecode()`
short-circuits on `ext in OR_SUPPORTED` before considering the MIME, so `.ogg` skipped
the decoder, and `toSupportedDataUrl()` then built `data:application/ogg;base64,…` — a
non-audio MIME wrapping Opus bytes. The provider accepted it and the model invented text.
`.opus` (identical bytes) always decodes to WAV, which is why it worked.

## Outcome
Fixed 5 Aug in our layer (no engine fork): `website/app/audio-normalise.js` sniffs the
leading bytes (`OggS` + `OpusHead` etc.) and hands the engine a File whose name and type
tell the truth — Opus-in-Ogg is routed through the proven decode-to-WAV path, and any
audio container wearing a non-audio MIME gets the correct one. This is the 27 Jul arch
brief's "detect by content, not by extension" rule, finally enforced where it matters.
Verified: all six variants (.opus / .ogg × audio-ogg, application-ogg, video-ogg, empty
/ .oga) now return the correct transcript. Regression test:
`tests/playwright/ogg-variant-matrix.mjs`. Upstream reported:
`team/comms/briefs/08/05/v0.1.14__bug-report__ogg-mime-passthrough-causes-hallucinated-transcripts.md`.
