# Extract audio from a video — for people

Drop in a video, get the sound out of it, then transcribe it.

- **Nothing is uploaded.** The video is opened and processed inside this browser
  tab. There is no server here to send a 400 MB film to, which is why this works
  on files that would be impractical to upload.
- **It is free.** No key, no model, nothing to pay — unlike the rest of the site,
  no part of this touches a paid service.
- **The first go downloads about 32 MB.** That is FFmpeg itself, arriving as
  WebAssembly. Your browser caches it, so it only happens once. Just opening this
  page downloads none of it.
- **You get an `.m4a`.** Play it here, download it, or press *Transcribe this in
  VoiceDebrief* to hand it straight to the app — no trip through your downloads
  folder.
- **Usually nothing is re-encoded.** The soundtrack is lifted out untouched, so
  it is fast and loses no quality. A screen recording or a web download often
  cannot be copied that way, so it is converted to AAC instead — the result says
  which happened.
- **If it says there is no audio track,** the video genuinely has no sound in it.

---

*This document is licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).*
