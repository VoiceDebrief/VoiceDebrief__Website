---
created: 2026-08-06T09:30:00Z
source: Dinis — "do another mapping on the best way to add the videos that I have been creating in YouTube to the site … I would like to also create more (non shorts videos) with me showing the product and others with explanations of the product"
priority: high
estimated_effort: medium
blocked_on: four YouTube ids (see "To unblock") — everything else is built
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
- **Dinis's four existing videos written up as drafts**, each needing only its id. A
  published video without a valid 11-character id fails the build rather than shipping a
  dead player.

## To unblock (Dinis, ~2 minutes)
For each file in `content/videos/`, paste the 11 characters after `watch?v=` into
`youtube_id:` and change `status: draft` to `status: published`. Push — CI does the rest.
Titles were read from the channel screenshot and are truncated in places; correct them in
the same edit if needed.

## Then (proposed, in value order)
1. Landing-page hero card showing the newest `demo` (read from `videos.json`).
2. `video: <slug>` in an update post's frontmatter → the demo embeds in the release post.
3. Local poster frames committed to the repo (keeps the no-third-party-request promise
   that fetching thumbnails from `i.ytimg.com` would break).
4. Captions/transcripts beside each video — produced by running our own tool over our own
   videos, which is both accessibility and the most on-brand demo available.
