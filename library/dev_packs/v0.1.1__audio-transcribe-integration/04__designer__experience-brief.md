# Designer Brief: The One-Motion Experience — Progress Is The Product

**version** v0.1.1 · **date** 29 July 2026 · **role** Designer · **type** Dev-pack brief
**status** PROPOSED — briefs only

*Part of the dev pack [v0.1.1__audio-transcribe-integration](README.md) — see the [pack README](README.md) for scope, ground truth and definition of done.*

---

## 1. The Experience Contract (from the [28 Jul brief](../../../team/humans/dinis_cruz/briefs/07/28/v0.33.53__arch-brief__sg-send-voice-note-tool-build-status-first-milestone-experience-deliberately-leaked-key-guardrails-enforce-privacy-tiers-two-vaults-ciphertext-rule-send-secrets.md), non-negotiable)

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
      cost line: "this pass: £0.xx  ·  session: £0.yy"  (metered in USD note) ]
```

One file at a time in v1. A second drop replaces the offer, not adds a queue.

## 2.1 Screen Mockups (ASCII)

**State A — landing / empty (desktop ~1280px)**

```
+--------------------------------------------------------------------------+
| (o) Voice Note Transcribe          How it works  Privacy  Pricing  Open  |
|     by SGraph - Simple. Private. Portable.                               |
+--------------------------------------------------------------------------+
|                                                                          |
|   Your WhatsApp voice note, turned into a transcript, a summary          |
|   and an infographic - in one pass.                                      |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   |                                                                  |   |
|   |                  [ drop your voice note here ]                   |   |
|   |                       or tap to browse                           |   |
|   |                                                                  |   |
|   |                    .opus  /  .ogg  /  .m4a                       |   |
|   +------------------------------------------------------------------+   |
|                                                                          |
|   > where do I find my voice note?   (laptop download / Android          |
|     export / iPhone forward)                                             |
|                                                                          |
+--------------------------------------------------------------------------+
|  (c) SGraph - CC BY 4.0  -  nothing tracked  -  v0.1.1                   |
+--------------------------------------------------------------------------+
```

**State B — file landed, options row**

```
+--------------------------------------------------------------------------+
|   +------------------------------------------------------------------+   |
|   |  [audio] voice-note-2026-07-29.opus     1m 49s   142 KB    [x]   |   |
|   +------------------------------------------------------------------+   |
|                                                                          |
|   privacy:  (o) Routed - cheapest   ( ) Restricted*   ( ) On-device*     |
|             any provider may process this - we can't promise which       |
|             *coming with beta          *coming later                     |
|                                                                          |
|   [x] also make me an infographic                                        |
|                                                                          |
|                        +------------------+                              |
|                        |  Transcribe  ->  |                              |
|                        +------------------+                              |
+--------------------------------------------------------------------------+
```

**State C — working (the streaming rail)**

```
+--------------------------------------------------------------------------+
|   voice-note-2026-07-29.opus  -  1m 49s                       [ Stop ]   |
|                                                                          |
|   (#) decoding audio          done                                       |
|   (#) transcribing...         12s elapsed                                |
|   ( ) writing the summary                                                |
|   ( ) drawing the infographic                                            |
|                                                                          |
|   ..........  something is always visibly happening  ..........          |
+--------------------------------------------------------------------------+
```

**State D — results, streaming in top-down (transcript first)**

```
+--------------------------------------------------------------------------+
|   TRANSCRIPT                                    [ copy ] [ download.md ] |
|   +------------------------------------------------------------------+   |
|   |  "...so the idea is that we agree the terms this week and       |   |
|   |   start publishing from the first of August..."                 |   |
|   +------------------------------------------------------------------+   |
|                                                                          |
|   SUMMARY                                       [ copy ] [ download.md ] |
|   +------------------------------------------------------------------+   |
|   |  ## Key points                                                   |   |
|   |  - Terms agreed; 90-day term from 1 Aug ...                      |   |
|   +------------------------------------------------------------------+   |
|                                                                          |
|   INFOGRAPHIC                                              [ save.svg ]  |
|   +------------------------------------------------------------------+   |
|   |     (svg draws itself progressively -- that IS the progress)     |   |
|   +------------------------------------------------------------------+   |
|                                                                          |
|   this pass: £0.18   -   session: £0.31        [ do another voice note ] |
+--------------------------------------------------------------------------+
```

**State E — typed error (example: beta credits exhausted)**

```
+--------------------------------------------------------------------------+
|   (#) transcribing...  x  failed                                         |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   |  The beta credits are used up.                                   |   |
|   |  Thanks for stress-testing us - two ways to continue:            |   |
|   |    [ leave your email ]   [ paste your own OpenRouter key ]      |   |
|   +------------------------------------------------------------------+   |
+--------------------------------------------------------------------------+
```

**Mobile (~390px) — same states, stacked**

```
+----------------------------+
| (o) Voice Note Transcribe  |
+----------------------------+
| Your voice note ->         |
| transcript, summary,       |
| infographic. One pass.     |
|                            |
| +------------------------+ |
| |  tap to choose your    | |
| |  voice note            | |
| |  .opus / .ogg / .m4a   | |
| +------------------------+ |
|                            |
| privacy: [Routed v]        |
| [x] infographic            |
| [    Transcribe ->     ]   |
|                            |
| (#) transcribing... 12s    |
| ( ) summary                |
| ( ) infographic            |
|                            |
| TRANSCRIPT        [copy]   |
| +------------------------+ |
| | "...agree the terms    | |
| |  this week..."         | |
| +------------------------+ |
| SUMMARY           [copy]   |
| +------------------------+ |
| | ## Key points ...      | |
| +------------------------+ |
|                            |
| this pass: £0.18           |
+----------------------------+
```

**Decisions (5 Aug, from the review):** costs display in **GBP**, converted from the
engine's USD at a fixed versioned rate in app config, with a small "metered in USD"
disclosure. And **key entry is a primary affordance**: a "paste your OpenRouter key"
field appears with the options row the first time (stored in localStorage; the engine
persists it under `sg-openrouter-mgmt-key`), not only in the error state.

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

- Same visual system as the landing page ([`website/index.html`](../../../website/index.html)): navy `#0b1f3a`,
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
