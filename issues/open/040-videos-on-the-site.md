---
created: 2026-08-06T09:30:00Z
source: Dinis — "do another mapping on the best way to add the videos that I have been creating in YouTube to the site … I would like to also create more (non shorts videos) with me showing the product and others with explanations of the product"
priority: high
estimated_effort: medium
blocked_on: one YouTube id (the 0:42 one-click recording clip); the other three are live
---

# Videos on the site

Mapping: [`library/dev_packs/v0.1.20__video-on-the-site/00__mapping.md`](../../library/dev_packs/v0.1.20__video-on-the-site/00__mapping.md).

## Shipped in v0.1.20
- **`content/videos/`** — one markdown file per video (`kind: demo|explainer|short`,
  `duration`, `youtube_id`, optional `version`), same atomic authoring model as posts.
- **`/videos/`** — the Videos page, grouped by kind, newest first, plus `videos.json`
  so any page can show the latest without hard-coded markup. Linked from every nav.
- **Privacy-preserving playback**: cards, not embeds. Nothing is requested from YouTube
  until the visitor presses play, and playback uses `youtube-nocookie.com`. A test
  asserts the served HTML contains no `<iframe>` — on a product that promises it does
  not track you, an auto-loading third-party player would be a quiet lie.
- **Three videos live** (Dinis supplied the ids the same day): the chat feature (2:23,
  v0.1.20), the QA site tour (2:52, v0.1.19) and the first MVP demo (1:11, v0.1.14),
  each written up from his own descriptions and tied to the release it shows.
  `kind` groups by editorial role rather than YouTube's format: these three are
  **quick looks**, leaving `demo` for the longer walkthroughs and `explainer` for the
  why-it-works-this-way videos still to be made.

## To unblock
One video remains a draft: the 0:42 "One-Click Recording, Transcription & Publishing"
clip, which had no id in the batch. Paste it into `content/videos/` and flip
`status: draft` → `published`. A published video without a valid 11-character id fails
the build rather than shipping a dead player.

## Then (proposed, in value order)
1. Landing-page hero card showing the newest `demo` (read from `videos.json`).
2. `video: <slug>` in an update post's frontmatter → the demo embeds in the release post.
3. Local poster frames committed to the repo (keeps the no-third-party-request promise
   that fetching thumbnails from `i.ytimg.com` would break).
4. Captions/transcripts beside each video — produced by running our own tool over our own
   videos, which is both accessibility and the most on-brand demo available.

## Status 7 Aug — a fourth video LIVE (the Journalist-agent short)
Dinis published https://www.youtube.com/shorts/A4Y1a0g9Tp4 ("How This AI Agent
Automatically Writes Our Product Updates" — the service using its own Journalist
routine on itself); added as `content/videos/journalist-agent-writes-updates.md`,
published. Four videos live. Still blocked on ONE id: the one-click
recording/transcription/publishing clip (`one-click-recording-and-publishing.md`
stays a draft until it arrives).
