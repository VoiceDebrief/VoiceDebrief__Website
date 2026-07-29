# Designer Brief: The One-Motion Experience — Progress Is The Product

**version** v0.1.1 · **date** 29 July 2026 · **role** Designer · **type** Dev-pack brief
**status** PROPOSED — briefs only

---

## 1. The Experience Contract (from the 28 Jul brief, non-negotiable)

> "you just get the file, and then you get the visualisation that something is
> happening, then … the transcription, and then the summary document, and then the
> infographic."

- **Progress indication is a functional requirement, not polish.** Tens of seconds of
  silence reads as broken. Something must visibly happen from the moment the file
  lands until the last artefact renders.
- **Results stream in arrival order** — transcript (first, longest wait), summary,
  infographic (last, the delight). Never one atomic reveal; never hold the fastest
  artefact for the slowest.

## 2. The Page Flow

```
  [ hero: one drop zone. one sentence. nothing else above the fold ]
       |  file lands (drag, tap-to-browse on mobile)
       v
  [ file card: name, duration, size  +  options row:
      privacy mode (default: routed)   [x] infographic?   [ Go ] ]
       |
       v
  [ working: staged progress rail
      ● decoding audio → ● transcribing… (elapsed s) → ○ summarising → ○ infographic
      + Stop button (wired to cancelItem) ]
       |
       v
  [ results, appearing top-down as each lands:
      TRANSCRIPT   (card, copy + download .md)
      SUMMARY      (rendered markdown card, copy + download .md)
      INFOGRAPHIC  (streaming SVG renders progressively — it draws itself; that IS
                    the progress indication for this stage; save button)
      cost line: "this pass: £0.xx  ·  session: £0.yy" ]
```

One file at a time in v1. A second drop replaces the offer, not adds a queue.

## 3. Progress States (map 1:1 to engine events)

| Engine signal | What the user sees |
|---------------|--------------------|
| `at:item:added` | file card appears, options row slides in |
| `transcribe:started` | rail step 2 active, elapsed counter starts |
| `transcribe:progress` | keep the counter honest (no fake %) |
| `transcribe:complete` | transcript card renders immediately; rail advances |
| `ask()` in flight | step 3 active, "writing the summary…" |
| infographic streaming | the SVG drawing progressively is the state |
| `transcribe:error` etc. | rail step turns to the error state (§5) |

Elapsed time over fake percentages, always — we cannot know the total, so we do not
pretend to.

## 4. The Mode Selector (honesty is the design)

Compact selector on the options row, expanded copy on tap:

- **Routed (default)** — "Cheapest. Any of our model providers may process this
  recording — we can't promise which." ← this sentence is load-bearing; do not soften.
- **Restricted** — "Named providers only, enforced on the key server-side." Disabled
  with "coming with beta" until issue 014 lands.
- **Private (on-device)** — "Nothing leaves your device." Marked "coming later";
  never marketed as equivalent quality.

The mode selector and the price are the same axis — the design should make that
visible (mode chips carry their relative price marker: cheapest / higher / free-ish).

## 5. Error States (typed codes → human copy)

| Code | Copy direction |
|------|----------------|
| `not-audio`/`too-large`/`empty` | "That doesn't look like an audio file we can read." — keep the drop zone alive |
| `key-invalid` | "Our beta key wasn't accepted — paste your own OpenRouter key to continue." |
| `budget-exceeded`/`key-exhausted` | "The beta credits are used up. Thanks for stress-testing us — leave your email / paste your own key." |
| `rate-limited` | "Busy moment — retrying…" (one auto-retry, then honest failure) |
| `budget-cap` | "You've hit this session's spend cap (£x)." |
| generic | "Something failed on the model side. Nothing was stored — try again." |

Never a bare spinner-then-nothing; every failure names what happened and the next step.

## 6. Brand & Craft

- Same visual system as the landing page (`website/index.html`): navy `#0b1f3a`,
  WhatsApp-green accents, system font stack, self-contained CSS, no external fonts.
- The product page must feel like the landing page's promise kept: the hero sentence
  on the landing page and the drop zone on the app page use the same words.
- Footer carries the same `site-version` stamp; results carry nothing that overclaims
  (no "private" badges in routed mode).
- Mobile first in fact, not in name: the drop zone is a tap-to-browse; cards stack;
  the rail is vertical; test at 390px.
- Empty state (before any file): one sentence + the three-format hint
  (`.opus` / `.ogg` / `.m4a`) + a "where do I find my voice note?" disclosure for
  WhatsApp export paths (laptop download / Android export / iPhone forward).

## 7. What Not To Design

No accounts, no history list, no settings page, no model picker (privacy tier only —
the model choice is ours), no queue management, no dark/light toggle (one committed
look), no cookie banner (nothing tracked — say so in the footer).

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
