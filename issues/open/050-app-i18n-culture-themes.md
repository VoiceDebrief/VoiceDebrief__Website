---
created: 2026-08-07T16:30:00Z
source: Dinis — "a strategy to refactor the app so that we can have it in multiple languages, cultures, themes/designs… why it is so critical to have an architecture that can easily change language, locale/culture and design" (A/B designs coming from a Claude Design brief)
priority: high
estimated_effort: large
---

# The app in many languages, cultures and designs — three declarations, one machinery

Strategy: `library/dev_packs/v0.1.22__app-i18n-culture-themes/00__strategy.md`,
grounded in the SG/Send record (their 17-locale system, the decisions behind it,
and why it is currently switched off — both halves are instructions).

The move mirrors issue 042 (behaviour as data): what the app **says** becomes
`locales/*.json` (flat dotted keys, culture = language+country, one-hop fallback
to en-gb), how it says **numbers/money/dates/tone** becomes `cultures/*.json`
(kills the hardcoded `£`/`USD_TO_GBP` in config.js), and how it **looks** becomes
`themes/*.css` token sheets on `:root` (pierce the nine wa-* components' shadow
DOM). Language also rides the workflow declaration into the prompts — the
artefacts (summary, infographic, chat) localise, not just the chrome. Selection
is committed-allowlist only (issue-041 rule: no URL parameter chooses what
loads); per-locale LIVE gating, not a global SOON; qa-to-docs screenshots per
locale×theme are the review surface Send never had.

## Decisions (Dinis, voice memo, 8 Aug 2026 — strategy §6 revised)
- **Folder per locale, per-domain files inside** (`locales/pt-pt/{core,chat,culture,…}.json`)
  — the single-file-per-locale pattern is rejected on Send's own evidence
  (token explosion; every small change re-processes a massive file). Support
  is incremental by file existence; maturity can vary per locale honestly.
- **First locales: pt-PT and pt-BR together** — different cultures, shared
  language: the strongest proof of the language/culture split, with visible
  differences (tone, even UI) to show.
- **Currency: GBP everywhere for now**, declared in each locale's
  `culture.json`, never hardcoded — payments sorts currencies later as a data
  edit.

## Milestones
- **M1 — Extract** (tokens, strings into en-gb domain files, culture formatting;
  zero visible change; unblocks Claude Design A/B — a candidate design = one
  token sheet)
- **M2 — pt-PT + pt-BR together, end to end** (picker, persistence, artefact
  language, per-file parity --check; both GBP)
- **M3 — design candidates as A/B arms** (+ next locale as experience dictates)
- **M4 — content-estate locale paths** (Send's generator architecture, minus its
  recorded gotchas)

Still open (strategy §6): A/B measurement without a backend; artefact-language
default (UI locale vs detected voice-note language).

## Status 8 Aug — M1a SHIPPED (token extraction; strings and culture still to do)

The design is now one swappable sheet. `website/app/themes/default.css` declares
all 45 `--wa-*` tokens on `:root`; `app.css` and all eight live component
stylesheets read them and declare no colour of their own.

- **151 + 6 literals replaced** across nine files (31 distinct colours, 12
  overlays/rings, 2 monospace stacks). Before: only 3 of 8 components read
  `--wa-*` at all — a theme sheet would have reached under half the UI.
- **Proven pixel-identical.** Captured all eight qa-to-docs shots before and
  after the change and compared them directly: **0.0000% difference on every
  shot**. "No visible change" is measured here, not asserted.
- **Proven to actually theme.** Overriding `--wa-green` in a single `:root`
  rule changes the computed value inside the shadow root of all eight
  components — the mechanism the A/B arms depend on works.
- **`scripts/check_themes.py`** guards both directions and runs in both
  pipelines: every token the app reads must be declared (or the design has a
  hole where a component keeps its old colour), and every non-default theme
  must declare exactly default's set (or an A/B arm ships half-styled and the
  result is unreadable — you cannot tell whether it lost on its design or on
  the parts that never applied). It found three real problems on first run.
- **`themes/index.json`** is the allowlist. Selection may only name a key from
  it — never a URL, never a query parameter (the issue-041 rule).

### Version bump (IFD immutability)

Seven components changed, so seven were bumped rather than edited in place:
chat-panel v0.1.1→v0.1.2, debug-panel v0.1.2→v0.1.3, drop-zone v0.1.0→v0.1.1,
flow-panel v0.1.0→v0.1.1, key-panel v0.1.0→v0.1.1, progress-rail v0.1.1→v0.1.2,
result-card v0.1.1→v0.1.2. (`wa-cost-line` was already fully tokenised.) The
published versions are byte-for-byte untouched.

This is not ceremony. Components fetch their stylesheet at runtime from the
versioned path, and `stamp_cache_busters.py` only stamps `.js` and `.html` — so
a returning visitor holding a cached `v0.1.1/wa-chat-panel.css` would keep its
hardcoded colours and silently ignore the theme. That is precisely the failure
the token extraction exists to prevent, arriving through the cache instead of
the code.

**Deliberately NOT done: radius, spacing and type scale.** They cannot be
extracted the way colour was — the app uses 7/8/9/10/12/14px radii that a scale
would have to collapse, and collapsing them moves pixels. That is a design
decision with a visible diff, not a mechanical lift, so it gets its own reviewed
change rather than riding in on a refactor that promised to change nothing.
Until then a candidate theme restyles colour and type; shape stays.

Also noted, not fixed: `wa-drop-zone.css` falls back to `#8fa8cd` for
`--wa-line` (whose real value is `#dbe3ec`). Harmless while the token is always
declared, but the fallback is wrong and would show if the sheet ever failed.

Remaining in M1: **M1b** strings out of HTML/JS into `locales/en-gb/` domain
files + `i18n.js`; **M1c** culture (`culture.json`, `fmtGbp` → `fmtMoney` with
GBP declared, not hardcoded).
