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

## Status 8 Aug — M1b foundation + M1c SHIPPED (core domain done; components remain)

Strings and culture are now data, and the machinery to serve them exists.

- **`website/app/i18n.js`** — the whole runtime, deliberately tiny: key lookup,
  one-hop fallback to en-gb, `data-i18n` rendering, `setLocale()` re-rendering in
  place (no reload, so a pass in flight and the chat thread survive a language
  switch), and `wa:locale-changed`. No framework, and none coming.
  - `t()` returns **the key itself** on a miss, not an empty string: a visible
    `core.go` in the UI is a bug report, a blank is a hole nobody notices.
  - Selection may only name a locale in `locales/index.json` — never a URL,
    never a query parameter. The issue-041 rule, applied before anyone asks
    for `?locale=`.
- **`locales/index.json` + `en-gb/{core,culture}.json`** — one folder per locale,
  per-domain files. `files` is the support statement: a locale ships `core.json`
  while `chat.json` is still absent, and the missing keys fall back one at a time.
- **`app/index.html`**: 28 elements wired, 31 keys. Text, HTML fragments, and
  attributes (`title`, `placeholder`, `aria-label`, `content`, and the component
  `label` attribute) all localise.
- **M1c — money is culture data.** `fmtGbp` now delegates to `fmtMoney`, which
  reads `currency`/`symbol`/`usdRate` from the active locale's `culture.json`.
  GBP is declared for every locale for now (Dinis, 8 Aug), so the day payments
  want EUR or BRL is a data change. `fmtGbp` is kept as the compatibility name —
  the flow panel, chat meter and cost line call it and renaming them is churn.
  **Format is byte-identical**, including the three-decimals-under-10p rule;
  `Intl.NumberFormat` was deliberately NOT used, because it renders `£0.79`
  where this renders `£0.790` and M1 may not change a rendered price.
- **`scripts/check_locales.py`** in both pipelines: keys ⊆ en-gb; a LIVE locale
  must be key-complete (a live language showing English mid-sentence reads worse
  than not offering it) while a DRAFT locale may have holes; declared files must
  exist and existing files must be declared; every `data-i18n` key in the markup
  must resolve. Negative-tested in both directions rather than assumed.
- **11 new unit tests** (72 total), including two that break the checkers on
  purpose — a checker that cannot fail is worse than none, since it reports
  success either way.

**Verified no visible change**: qa-to-docs after the wiring is identical to
before, including `03-options` at 0.000% — the screen whose chip labels were
re-wrapped in spans to make them translatable.

### Remaining in M1b

The component internals: `chat.json`, `flow.json`, `debug.json`, `errors.json`,
plus the user-facing strings in `app.js` itself (~72 literals, many of which are
selectors and keys rather than copy, so they need reading not sed). The eight
`wa-*` components hold roughly 160 more literals between them and each needs a
`t()` import and a `wa:locale-changed` listener. That is the bulk of M1b and it
is mechanical but not blind — it is the natural next slice.

## Status 8 Aug (later) — a hole the checker did not see

Merging `qa` brought `wa-site-nav` (issue 054), which sits on **every page** of
the site. It had 26 hardcoded colours and read zero tokens — so a theme swap
would have restyled the whole app *except its header*, and `check_themes.py`
reported "themes ok" throughout.

The gate only scanned components `app.js` imports. `wa-site-nav` loads from a
page `<script>` instead, so it was invisible to the check. A gate that only
looks where you remembered to point it is not a gate.

- `check_themes.py` now scans **both routes** a component arrives by — imported
  by `app.js`, and referenced from any page or template's markup — and reads
  inline styles in `.js` as well as sibling `.css`.
- `wa-site-nav` v0.1.1 → **v0.1.2**, 26 colours tokenised, each keeping its
  literal as the `var(--wa-x, #hex)` fallback: the nav ships on library,
  versions and engineering pages that do NOT load `themes/default.css`, and must
  look identical there. One new token, `--wa-navy-hover`. 15 pages/templates
  repointed.
- Verified invisible: `01-app-start` (the shot that shows the nav) unchanged at
  0.046%, `02`/`03` at 0.000%.
