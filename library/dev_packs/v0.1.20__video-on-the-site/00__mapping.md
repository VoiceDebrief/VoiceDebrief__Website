# Mapping: putting the YouTube videos on the site

*Part of the [project library](https://whatsapp-voice-transcription.sgraph.ai/library/) — every doc behind this product, organised by audience.*

**status** Substrate EXISTS (issue 040): `content/videos/`, a Videos page and
`videos.json` ship in v0.1.20, with Dinis's four existing videos staged as drafts.
Everything marked PROPOSED below is design, not code.
**source** Dinis, 6 Aug 2026 — four shorts published, wanting longer demos and
explainers next.

---

## 1. The decision that shapes everything: no third-party player until asked

This product's pitch is *"everything runs in your browser, nothing is tracked"*. A page
of ordinary YouTube embeds would quietly break that promise on the most-visited pages —
each `<iframe>` contacts Google before the visitor has done anything, on a site whose
whole argument is that it does not.

So the Videos page renders **cards, not embeds**. A card is inert markup; pressing play
swaps it for a `youtube-nocookie.com` iframe with `autoplay=1`. One click, one player,
and nothing before it. A test asserts the served HTML contains no `<iframe>` at all —
this is the kind of property that erodes silently, so it is nailed down.

The same rule applies wherever a video appears: card first, player on demand.

## 2. Where videos should live

| Placement | What goes there | Status |
|---|---|---|
| **`/videos/`** | The library: everything, grouped by kind, newest first | EXISTS |
| **Landing page hero** | One card — the current best demo. "See it work" beats "read what it does" for a cold visitor | PROPOSED |
| **The app page** | A small "watch a 2-minute demo" card near the drop zone, for someone who arrived without a voice note to hand | PROPOSED |
| **Update posts** | `video: <slug>` in a post's frontmatter embeds that video's card in the post — the release note and its demo, together | PROPOSED |
| **Versions page** | A ▶ marker on releases that have a video | PROPOSED |

The manifest (`videos.json`) is what makes the last four cheap: any page can fetch it and
pick the newest demo without anything being hard-coded.

## 3. The three kinds, and what each is for

| `kind` | Length | Job | Where it earns its place |
|---|---|---|---|
| `short` | < 1 min | One idea, vertical, made for the feed | Social; the Videos page keeps them as a group |
| `demo` | 1–3 min | The product doing the job, screen-recorded | Landing page, app page, release posts |
| `explainer` | 3–10 min | Why it is built this way — no backend, your own key, what it costs | Library, pricing/privacy sections, and for partners |

Your four existing videos map to: one `short` (the 0:42 workflow test) and three `demo`s.
The ones you want to add next are `explainer`s — that is the gap in the catalogue.

## 4. Publishing a video (the workflow you actually run)

1. Upload to YouTube as you already do.
2. Add **one file**, `content/videos/<slug>.md`:

```markdown
---
title: Chat with Your WhatsApp Voice Memos & Infographics
date: 2026-08-06
kind: demo
duration: 2:23
youtube_id: dQw4w9WgXcQ      # the 11 chars after watch?v=
version: v0.1.20             # optional, ties it to a release
status: published
---

One or two sentences on what the viewer will see.
```

3. Push. CI validates, builds and deploys.

That is the whole thing — same atomic shape as an update post, because it *is* the same
system. An id that isn't 11 valid characters fails the build rather than shipping a dead
player.

**Your four videos are already written up** in `content/videos/`, as drafts, waiting on
one thing each: the YouTube id. Paste four ids, flip `status: draft` → `published`, and
they are live. I did not invent ids, and a published video without a real one cannot get
past CI.

## 5. What the Journalist can do with this

Once a video exists in the manifest, the daily routine can:

- notice a release that shipped without a demo and flag it,
- add `video:` to the update post covering that release (once §2's post-embed lands),
- keep the landing-page card pointed at the newest `demo` — automatically, because it
  reads `videos.json` rather than hard-coded markup.

## 6. Worth doing, in order

1. **The four ids** (yours — two minutes) → four videos live.
2. **Landing-page card** — the highest-value placement; a cold visitor sees the product
   work before reading a word.
3. **`video:` in update posts** — pairs each release note with its demo.
4. **Local poster frames** — today a card is a styled gradient; a real still would sell
   the click harder. Committing thumbnails to the repo keeps the no-third-party-request
   promise (fetching them from `i.ytimg.com` would break it).
5. **Captions/transcripts** — we are a transcription product. Running our own tool over
   our own videos and publishing the transcript beside each one is both good accessibility
   and the most on-brand demonstration available.

Point 5 is the one I would push for beyond the obvious: the Videos page is the natural
place to show the product being used on the product.

---
Licensed CC BY 4.0 — © 2026 SGraph / The Cyber Boardroom.
