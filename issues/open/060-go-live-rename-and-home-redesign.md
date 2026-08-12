# 060 — Go-live: rename to VoiceDebrief, home redesign, and telling the truth

**Status** open · **Opened** 2026-08-08 · **From** Dinis

## Why

We are going live. Three things have to land together: the product becomes
**VoiceDebrief** at **VoiceDebrief.ai**, the main workflow moves onto the home page, and
the site stops describing a product we do not have.

> **Name change, 12 Aug (Dinis).** The product is **VoiceDebrief**, plain — not
> "VoiceDebrief for WhatsApp". WhatsApp is one of several ways audio arrives here, not
> the product. Everything below is written against that.

## Done (8 Aug)

- **Design brief written** — `library/briefs/go-live/v0.1.23__design-brief__home-page-redesign-for-go-live.md`,
  for Claude Design. Covers all five requirements, the non-negotiable constraints
  (no backend, no SPA, tokens only, strict CSP, four cultures, phone-first, a11y),
  and asks for a list of every untrue claim on the current site.
- **The App link is no longer blue** — `wa-site-nav` v0.1.6. Wrapping it in
  `.i18n-link` for the locale flag (v0.1.3) took it out of `nav.main > a`, so it fell
  back to the browser default link colour on navy. Browser test compares computed
  colours; proven to fail with the selector reverted.

## Done (12 Aug) — the claims audit worked end to end

Claude Design returned `design_handoff_homepage`, whose `06-claims-audit.md` lists
thirteen untrue claims. All thirteen are addressed.

- [x] **The three privacy chips are gone** — app page. Two of the three never existed and
      shipped disabled with an asterisk, and a privacy *selector* implies a control we do
      not have. What replaces them is `core.routingHonest`: a statement, placed where a
      file could still leave the device, and deliberately **not** styled as a warning —
      framing integrity as a hazard invites the reader to dismiss it.
- [x] **The LLM caveat** — `core.modelCaveat`, revealed *with* the transcript on
      `wa:transcript`, never before the thing it qualifies exists.
- [x] **The privacy-modes section and its table are gone** from the home page, replaced
      by `#privacy` "Where your audio goes", which says plainly that we do not know which
      provider handles a recording.
- [x] **The pricing claims are gone** — `#pricing` is now "What it costs": no plan, no
      credit, no card, we add no margin, and we do not set the price.
- [x] **The hero, the pipeline diagram and the cards** name the four real artefacts
      (transcript / translation / debrief / infographic). There is no "analysis" step.
      "and it works every time", "in seconds", "browser or app", "your files and your
      credits stay with you" and "Made for WhatsApp audio" are all gone.
- [x] **A six-source "Getting the audio" section** with the Meta non-affiliation line.
- [x] **The OpenRouter key guide page** — `/openrouter-key/`: why bring-your-own-key, five
      numbered steps with *set a spend limit* called out as the one that matters,
      checking/capping/revoking, a never-paste-it-elsewhere warning, and the three
      failures people actually hit. Linked from the key panel itself, the nav, the hero
      badge, the pricing section, the footer, `llms.txt` and the sitemap.
- [x] **BETA is persistent chrome** — `wa-site-nav` v0.1.8 defaults the badge on; a page
      may change the word, never omit the fact. The hero's "BETA — LIVE NOW" pill is gone:
      a beta mark made of hero copy scrolls away, and "LIVE NOW" is marketing register
      that `en-gb/culture.json` rules out.
- [x] **The rename** — VoiceDebrief everywhere the site serves. The only survivors are
      frozen component versions (IFD: published paths are immutable), and no page loads
      them.
- [x] **The key is asked for at run time, not on arrival** (build-order task 5). A
      stranger can load a file, set both options and read the quoted maximum without ever
      meeting a password field; pressing Transcribe asks for the key and the pass resumes
      by itself once it is saved. Gated in `app-boot.test.mjs` on the *computed* display
      of `#key-section`, not on its `hidden` attribute — that attribute has lied here
      before.

## Still to build

- [ ] **One `core.productName` key.** The name is currently spelled out in `core.title`
      and hardcoded in the nav component. It should be one key, recorded in the concept
      scheme with a scope note saying *not translated*.
- [ ] **Decide `summary` → `debrief`** in the interface, now the product is named after
      the word. Four languages; the concept scheme flags it and the drift gate will force
      the concept to be revisited with the strings.

## Deliberately NOT done

- **"Language picker to text labels, no flags"** (audit item 6, build-order task 2).
  Rejected: this product's locale *is* a culture, not a language — en-GB/en-US and
  pt-PT/pt-BR differ by country, and a flag is the accurate signifier for exactly that
  distinction. The general rule ("flags are not languages") is right about products that
  select a language; it is wrong about one that selects a culture. Dinis approved the
  current picker on 10 Aug.
- **A blind `--wa-*` → `--vd-*` rename** (build-order task 1's literal instruction).
  Renaming the tokens *inside* every component would mean a new immutable version of each
  one for no behaviour change, and the frozen versions could never be renamed at all. What
  shipped instead achieves the same end from the other side: the new names are the source,
  and the old names are **derived from them** in `vd-tokens.css`. Every component repaints
  without being touched, and layer B can be deleted in one edit when the last `--wa-*`
  reader is retired. See "12 Aug — M1" below.

## Dependencies and notes

- `WhatsApp` is Meta's trademark — usable descriptively, cannot lead the name. The
  non-affiliation line is on the home page.
- Depends on issue 057 (the concept scheme) for the `summary`/`debrief` decision. The
  privacy-mode scheme was *removed* from `concepts.json` as part of this work: the pass
  had marked two of its chips `decide`, and the sign-off deleted the control rather than
  relabelling it. `_resolved` in the file records why.

## 12 Aug — the domain cut over, and 39 files were still naming the old one

`voicedebrief.ai` and `qa.voicedebrief.ai` are live and serving. The old hosts
(`whatsapp-voice-transcription.sgraph.ai` and its `qa.` sibling) have **no DNS at
all** — not a redirect, not a 404: nothing resolves. That turned every absolute
URL naming them into a dead link, and the rename pass had swept the brand but not
the address.

Swept across the **published surface**, its generators and its gates:

- every `<link rel="canonical">`, `og:url` and JSON-LD `url` on every page;
- **`llms.txt`** — the file the CLAUDE.md discipline requires to resolve on the
  deployed estates, and which was pointing every agent at a host with no DNS;
- **`sitemap.xml` and `robots.txt`** (the `Sitemap:` line, and the crawler note);
- **the RSS feed's per-post `<link>`s and `<channel><link>`** — generated by
  `build_content.py`, so a reader following any of the 24 posts got nothing;
- the generators themselves (`build_content.py`, `build_locale_pages.py`'s `PROD`
  used for `hreflang` alternates, `record_baseline_changes.py`), the three page
  templates, `updates.json`, and the skills docs an agent reads;
- `live-site-check.mjs`'s default `LIVE_URL` — the post-deploy gate was pointed at
  a host that cannot answer;
- the operating documents that state it as fact: `.claude/CLAUDE.md`, `README.md`,
  the reality doc, `team/README.md`, the Journalist's ROUTINE.

**Deliberately not swept:** the dated record — `library/`, `team/` reviews,
debriefs and comms, `issues/done/`, `CHANGELOG.md`. Those describe what was true
on the day they were written; rewriting them is not a link fix. The one exception
is the 29 July Updates post, which is a *live page* — a URL there is an address
for a page that still exists, so it now points at where that page actually is.


## 12 Aug — M1 of the design: the colour system actually landed

Dinis asked for the visual design to ship, in the order proposed: tokens, then the home
page, then the workflow panel. This is the first.

**`website/vd-tokens.css` is now the only place a colour is written on this site**, and
that is enforced rather than asserted. It holds the design pack's five schemes
(Signal/Night/Paper/Blueprint/Ember) and derives from them both the 46 `--wa-*` names the
shipped components read and the twelve `--navy`/`--ink`/… names each static page used to
carry its own copy of. One file, linked from all 34 pages, repaints the whole site —
including through eight shadow roots, because custom properties cross the shadow
boundary. `themes/default.css` is gone: a scheme is one attribute on `<html>`, not
another sheet.

Two things were added that the pack does not have, both named as ours in the file: a
**chrome group** (`--vd-k*`), because the design has no dark chrome at all while the app
and the engine room still do, and mapping those onto ink would invert them the moment a
dark scheme was selected; and `--vd-scrim`.

`check_themes.py` now has four rules, and every one of them is broken on purpose in
`tests/unit/i18n.test.mjs` — a gate nobody has watched fail is a gate nobody knows the
shape of. Writing those tests found **two real holes in the gate itself**:

1. its CSS parser required a trailing semicolon, so a scheme whose last declaration
   omitted one was skipped silently — it reported "themes ok" about a block it had not
   read;
2. rule 4 tested whether the string `vd-tokens.css` appeared in a page, which a *comment*
   satisfies. The home page shipped un-themed while the rule reported it linked. It now
   matches the `<link>` element. Same lesson as the locale panel and the summary prompt
   before it: assert the thing the browser acts on, never the text that was supposed to
   cause it.

`wa-site-nav` v0.1.9 is colour only — ten literal `rgba()` overlays became token reads, so
the one component on every page stops being the exception. `m1-spike-test.html`, a public
leftover from the very first spike, is deleted.

**Verified by measurement, not by looking:** `data-vd-theme` set on `<html>` changes the
computed background *inside the nav's shadow root*, and all five schemes resolve to five
distinct values. The qa-to-docs run moved all seven screenshots by 0.2–3.5% of pixels with
**no geometry change on any of them** — which is the signature of a palette moving under an
untouched layout, and the evidence that this step changed colour and nothing else.

**Deliberately still true after M1:** the site has its old *shape*. The header is still
dark, the home page is still the previous layout. That is M2.
