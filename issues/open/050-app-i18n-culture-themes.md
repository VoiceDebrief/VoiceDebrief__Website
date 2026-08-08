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

## Status 8 Aug — M2 first pass SHIPPED (four locales + the picker)

Per the M2 hand-off brief, and extended by Dinis to four locales.

**A note on the tag**: the request said `en-uk`, which is not a valid BCP-47
language tag — the UK's is `en-gb`, which we already had. The four are
**en-gb, en-us, pt-pt, pt-br**.

- **Four locale folders**, each `core.json` (33 keys) + `culture.json`.
  pt-PT and pt-BR are written as **different cultures, not spellings**:
  *ficheiro/arquivo*, *ecrã/tela*, *utilizador/usuário*, "estar a + infinitivo"
  vs the gerund — and the one that matters commercially, **a Brazilian says
  "áudio" where a Portuguese user says "nota de voz"**. That is what people
  actually search for, so the hero reads *"Solte aqui o seu áudio"* in pt-BR and
  *"Largue aqui a sua nota de voz"* in pt-PT.
- **en-US is honestly close to en-gb** — this copy has almost no -ise/-ize
  divergence. What genuinely differs is WhatsApp's own US wording ("voice
  message", not "voice note") and `intlLocale`. Inventing more differences to
  justify the folder would have been worse than saying so.
- **Culture packs**: all four declare GBP (`£`, 0.79) per the standing decision;
  only `intlLocale`, `language` and `tone` differ.
- **`wa-locale-picker` v0.1.0**: native-script names, **no flags** (a flag is a
  country and a language is not one — pt-PT and pt-BR would each want a
  different one, and English would have to pick a fight). Draft locales are
  visible and marked, not hidden: per-locale gating means someone who reads
  Portuguese can try it and tell us what reads wrong, which is how a draft
  becomes live. The list comes from the allowlist and nothing else.
- All three new locales are **key-complete** — verified by flipping them to
  `live` and re-running the checker — but stay `draft` until their screenshots
  are reviewed, per the brief. Draft is a review gate here, not a cover for holes.

### A bug the testing caught

`detect()` matched `navigator.languages` against **every** locale in the
allowlist, drafts included. A visitor with an en-US browser was silently served
the unreviewed `en-us` locale, with no way to know why. Automatic selection now
only considers LIVE locales; a draft is still pickable and the choice still
persists — chosen, never assigned. Verified across four browser languages, and
now gated in `app-boot.test.mjs`.

### The first intentional screenshot change

Adding the picker moved 8 of 8 shots (9.55% on `01-app-start`, 2.46% on
`03-options`, ±1px resizes elsewhere). That is the record-not-block policy
(issue 053) doing its job for the first time on a real change: the run stayed
green, the baselines updated, and `baseline-changes.md` names this commit so the
movement can be reviewed against the intent.

### Still open

Component strings (`chat`/`flow`/`debug`/`errors`, ~160 literals) — the picker
means the app now switches language with the *page* copy only; component text
stays English until those domains are extracted. Artefact language (item 4 of
the brief — `{{language}}`/`{{tone}}` into the prompts) is not built.

## Status 8 Aug (later) — M1b continues: the one-pass components localise

The five components of the one-pass flow now switch language with the page.

- **`applyIn(root)`** localises a shadow root using the same `data-i18n`
  attributes as the page, with one difference that matters: **the fallback is
  the text already in the template**. A component ships readable English markup
  and i18n only overrides it — so there is no second copy of the English to
  drift, and the component still renders correctly standalone (the browser
  harness, or any page that skips `initI18n()`).
  The original is stashed in `data-i18n-src` on first pass. Without that, the
  *second* locale switch would take the *first* switch's output as its fallback,
  and a missing key would strand the user in a language they had already left.
  Verified by round-tripping en-gb → pt-BR → pt-PT → en-US → pt-BR → en-gb and
  asserting the English comes back byte-exact.
- **Five components bumped** (published versions untouched): cost-line v0.1.1,
  result-card v0.1.3, progress-rail v0.1.3, drop-zone v0.1.2, key-panel v0.1.2.
  14 template strings keyed, 4 locales × 47 keys.
- The culture split reaches inside the shadow DOM: the progress rail reads
  **"a transcrever…"** in pt-PT and **"transcrevendo…"** in pt-BR — European
  progressive vs Brazilian gerund, not a respelling.
- Gated in `app-boot.test.mjs`: component shadow DOM localises, and switching
  back restores the original English exactly.
- **Visually unchanged in English**: `01`–`03` match baseline; the app looks
  identical to anyone who never touches the picker.

### Honestly still English

- **7 strings set from JS** inside these five (key-panel's saved/rejected status
  lines, result-card's copied confirmation, cost-line's assembled line). They
  are not in the template, so `applyIn` cannot reach them — each needs a `tOr()`
  call at its assignment.
- **The three big panels** — chat, flow, debug (~130 literals) — untouched. They
  are the `chat`/`flow`/`debug` domains, and they are where most of the
  remaining work is.
- **`errors.json`** not started.
- **Artefact language** (M2 brief item 4): `{{language}}`/`{{tone}}` into the
  prompts so the *summary* comes back in the user's language, not just the UI.
  Not built — and it is the half that SG/Send never had.

## Status 8 Aug (later still) — the picker moves into the nav, and the nav tells the truth about what is translated

Four UX corrections from Dinis, all on the same control.

- **Top right, in the nav** — `wa-locale-picker` v0.1.2 is now slotted into
  `wa-site-nav` v0.1.3 via `<slot name="locale">`, where sgraph.ai and every
  other product puts it. Slotted rather than built in, so the nav keeps working
  unchanged on the twelve pages that have no i18n at all.
- **Closed until asked.** v0.1.1 listed every culture inline; the panel now
  opens only on the caret, and closes on the caret, a click away, Escape or a
  selection.
- **A permanent way home.** Once a non-default locale is active a plain
  🇬🇧 **EN-GB** button appears *beside* the dropdown — no menu, one click, back
  to English. The dropdown then shows the locale you are actually in, so the two
  controls answer two different questions: *where am I* and *get me out*.
  Someone who lands on Portuguese by accident (a shared link, a mis-tap) should
  not have to operate a dropdown in a language they cannot read to undo it.
- **The nav says which pages follow your language.** `/app/` is the only
  translated surface today, so it is listed first with the active locale's flag
  beside it (🇵🇹 App when you are in Portuguese), and the English-only links sit
  behind a single 🇬🇧 marker rather than each carrying their own. As more pages
  localise they move across the marker; the set is one constant, `TRANSLATED`.

### Two things the work turned up

- **The trigger cannot show the native name.** "Português (Portugal) ▼" pushed
  the control onto a second row and dragged the panel off the left edge with it.
  The trigger shows the CODE (🇵🇹 PT-PT); full names stay in the panel, where
  there is room. Verified: picker at x=967–1170, panel at x=546–1170, both on
  the same row as the nav and fully on screen.
- **`wa-site-nav` had no `render()`.** The redraw hook I added for
  `wa:locale-changed` called `this.render?.()` — a silent no-op, and
  `attachShadow` would have thrown on a second run. `connectedCallback` is now a
  thin wrapper around a re-runnable `render()` that reuses `this.shadowRoot`.
  Without this the flag next to App would have been frozen at page-load locale.

`defaultLocale()` was added to `i18n.js` and to the `window.__waI18n` seam so the
picker knows which locale is "home" from the allowlist rather than a hardcoded
string. 19 files repointed to nav v0.1.3. Browser suite grows a test pinning the
flag behaviour (exactly one `.i18n-link`, pointing at `/app/`, carrying a
regional-indicator flag; one `.en-only` marker; the locale slot present).

Six qa-to-docs shots moved, `01-app-start` by 27.3% — the nav is in every shot,
so a change there is the widest change the pipeline can record. Logged against
the commit per the record-not-block policy; the movement is where the work was.

## Status 8 Aug (evening) — the picker was broken on a phone

Dinis opened the QA link on an iPhone. Two screenshots, one real bug and one
that only looked like a style choice.

**The panel opened off the left edge of the screen.** Reproduced at 390×664
before touching anything:

```
picker  x=20  r=225   ← mid-row, not at the right edge
panel   x=-131 r=225  ← 131px of the language names off-screen
        bot=724 vs vh=664   ← and 60px of the list below the fold
```

The cause is two bugs compounding:

1. **The header wrapped and split the controls.** `header > .wrap` is a
   `space-between` row; with `nav.main` hidden below 760px its remaining
   children were brand, the picker slot and the hamburger as three loose
   siblings. On a phone they do not fit, the row wraps, and `space-between`
   throws the picker to the far LEFT of row two and the hamburger to the far
   right. Two controls at opposite ends of an otherwise empty line read as two
   unrelated things.
2. **The panel was anchored to the button, not the screen.** `position:absolute;
   right:0` is only ever correct while the button is itself at the right edge.
   Once (1) moved it to x=20, the 356px panel hung off the left of the viewport.

**Fixed structurally, not by nudging numbers.** `wa-site-nav` v0.1.4 puts the
locale slot and the hamburger in one `.right` cluster (`margin-left:auto`,
`flex:0 0 auto`), so they stay adjacent and hard right whether they share the
brand's row or take their own; the brand shrinks and finally ellipses before
they do. `wa-locale-picker` v0.1.3 stops being a dropdown on phones: below 620px
the panel is `position:fixed` inset 10px from both screen edges with
`max-height:calc(100vh - 120px)` and scroll, and `place()` sets its top from the
trigger's rect at open time — the one value CSS cannot derive. A `resize`
listener re-places it rather than closing, so rotating the phone does not
discard what you were doing.

Below 560px both buttons go flag-only; the locale code moves into `title` and
`aria-label`, never only into the pixels.

Verified across four viewports, panel fully on screen and no horizontal scroll
in any of them:

```
iPhone14 390px pt-br  panel [10,380]  onScreen true   2 rows, picker 232-324, burger 332-370
iPhoneSE 320px pt-br  panel [10,310]  onScreen true   2 rows, picker 162-254, burger 262-300
iPhone14 390px en-gb  panel [10,380]  onScreen true
desktop 1280px pt-br  panel [558,1170] onScreen true  1 row, unchanged
```

### Two things worth writing down

- **The panel does NOT auto-open**, which the screenshot made ambiguous.
  `panelHidden: true` on load on every viewport — the open panel in the picture
  was a tap. Requirement 2 from this morning is intact.
- **The BETA badge stays.** Hiding it below 430px buys a single-row header on an
  iPhone, and I did that first and then undid it: what the badge says — this
  product is in beta, judge it accordingly — is worth more than 32px of header
  height. The bar takes two rows on a narrow phone, deliberately.

Pinned by a new browser test asserting the cluster is one element containing
both controls and sitting flush right — structure, because that is what the CSS
depends on. (The first version of that test asserted
`getComputedStyle(...).marginLeft === 'auto'`, which can never pass:
`getComputedStyle` resolves `auto` to a used pixel value. It now measures the
gap the margin exists to produce.)
