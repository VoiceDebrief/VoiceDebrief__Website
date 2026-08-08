# Strategy: The App In Many Languages, Many Cultures, Many Designs

**version** v0.1.22
**date** 7 August 2026
**from** Claude (build session agent), grounded in the SG/Send record (see §1 sources)
**to** Dinis, Dev, Architect, Designer, QA — and the Claude Design brief the other agent is writing
**status** STRATEGY — nothing in here exists yet; implementation is issue 050
**scope** the app page only (`/app/`) — the pages that tell the story localise later; the page that does the work localises first
**revised** 8 August 2026 per Dinis's voice memo: folder per locale, a SET of
per-domain files instead of one big file per locale (the single-file approach
*backfired* at Send — token explosion, every small change touches a massive
file), first locales pt-PT + pt-BR, and currency standardised to GBP across all
locales for now — declared in the locale's culture data, never hardcoded

*Part of the [project library](https://whatsapp-voice-transcription.sgraph.ai/library/) — every doc behind this product, organised by audience.*

---

## Why now

A Claude Design brief is in flight that will produce multiple designs to A/B test.
A design you cannot cheaply swap is a design you cannot test; a language you cannot
cheaply add is a market you cannot enter. The app just went through exactly this
move for its *behaviour* — the one-pass became a declared JSON state machine
(issue 042) and the code shrank to machinery that executes a declaration. This
strategy is the same move for the app's *presentation*: *what the app says*, *how
it says it*, and *how it looks* each become data the machinery renders — three
files, not three rewrites.

SG/Send walked this road first, shipped 17 locales, then deliberately switched
them off. Both halves of that story are instructions.

## 1. What SG/Send settled, so we don't re-litigate it

Everything below is on the record in `the-cyber-boardroom/SGraph-AI__App__Send`
(read-only clone studied 7 Aug; paths cited are in that repo).

**Decisions we inherit as-is:**

- **Culture is the unit, not language** — lowercase `language-country` codes
  (`pt-pt`, `pt-br`, `de-ch`), each a complete first-class locale, never a
  "spelling variant" (decision D-2026-03-02-003,
  `team/roles/historian/reviews/03/02/v0.10.6__review__decision-log-cloudfront-i18n-ui-alignment.md`;
  the Translator role: *"pt-BR and pt-PT are different cultures, not just
  different spellings"*, `team/villager/roles/translator/ROLE.md`).
- **One-hop fallback to `en-gb`, no chains** — a missing `de-ch` key falls to
  `en-gb`, not to `de-de`. Recorded as acceptable
  (`team/roles/architect/reviews/03/02/v0.10.13__review__payment-pipeline-and-translation-architecture.md`).
- **Flat dotted-key JSON, one file per locale** — `upload.drop_zone.label`-style
  keys, `_`-prefixed keys as comments; 856 keys serve their whole marketing site.
- **The three UI primitives** (Dinis, 11 Jun 2026, brief v0.33.21): *"Theme: font,
  colours, light, dark, high contrast. Layout: literally different layouts…
  cultural and user differences. And language… language and country… a matrix of
  languages"* — and the enabler: *"all the content should move from being inside
  the HTML to standard files."*
- **Design tokens on `:root` pierce shadow DOM** — Send's `design-tokens.css`
  records this explicitly as the way to theme Web Components without breaking
  encapsulation. Our nine `wa-*` components have the same shape; this is our
  theming substrate too.
- **Translate keys, not pages** (briefs 03/01 `translation-scaling-strategy` and
  03/07 `translation-engineering-babel`): translation cost multiplies pages ×
  languages; the fix is a key-diff pipeline that touches only missing keys
  (*"use the LLM to write the script, not to do the work"* — a recorded 40×
  token reduction). Their agents hung translating whole files; ours won't.
- **Designer rules that were decided and still stand**: language names in native
  script, **no flags** (one flag ≠ one language; flags exclude diaspora
  speakers — `team/roles/designer/reviews/03/02/v0.10.14__design__vault-pure-javascript-multicultural.md`
  §3.6 — a decision Send recorded and then never implemented; we implement it);
  text-expansion budgets (German +108% on "Decryption key" — no fixed-width
  buttons); logical CSS properties from day one so RTL is a locale file, not a
  rewrite; `Intl.NumberFormat`/`Intl.DateTimeFormat` keyed on the locale, never
  hand-formatted; a culturally neutral palette.

**Why theirs is off, and what that teaches:**

- The website's 16 non-English locales are ~97% key-complete and CI still
  regenerates them on every deploy — yet the picker says SOON on all of them.
  The recorded reason (24 Apr, commit `19f7911`): *"i18n architecture ready,
  content not"* — machine translations without human review were judged not
  shippable. **Lesson: gate per locale on review, so one reviewed locale can be
  live while ten drafts stay dark. Never a global off-switch that rots.**
- The v0.4.x app UIs dropped locale generation entirely to simplify a major
  release (`team/roles/architect/reviews/05/10/v0.27.29__plan__v0.4.0-major-release.md`:
  *"only en-gb/ ships in v0.4.x… i18n returns in a future release"*), and the
  old `/pt-pt/` URLs 404 to this day. **Lesson: i18n bolted on after the
  components exist is the first thing cut under release pressure. Extraction
  has to land while the component set is small — ours is nine components and
  ~2,000 lines. It will never be cheaper than now.**
- Their machinery gotchas, all verified in code, none to be imported: two
  divergent i18n runtimes deployed at once; a generator that silently no-ops
  when its `i18n/` dir is missing; duplicate canonical/hreflang tags on every
  generated page; a `data-i18n` regex that breaks on nested same-name tags and
  skips void elements; an `i18n-prerendered` marker written but never read
  (so runtime re-fetches and re-writes what the build already did); `.gitignore`
  covering 3 of 16 generated locale trees; zero tests on the two generators
  that run in production. **Lesson: our generator-equivalents get tests and a
  `--check` gate like `build_content.py` already has, or they don't merge.**

## 2. What is different about our app (why this isn't a port)

1. **The app is one URL doing work, not twenty pages telling a story.** Send's
   architecture pre-renders locale *pages* for SEO; an app behind a drop zone
   has no SEO to win and real in-memory state to lose (an in-flight pass, a
   BYOK key). So for `/app/` the runtime dictionary is the primary mechanism
   and pre-rendered locale paths are a later, content-pages-only concern.
   Send's own record points the same way: their one genuine SPA (the vault)
   uses exactly this hybrid.
2. **We have a fourth language surface Send doesn't: the artefacts.** The
   product's output — summary, infographic, chat — is written by models under
   English prompts (`app/prompts/*.md`). "The app in Portuguese" must mean the
   *debrief* is Portuguese, not just the buttons. Language therefore enters the
   **workflow declaration** (`options.language` riding through
   `workflows/standard.json` into the prompt templates), not just the DOM.
   The transcript stays in the language the voice note was spoken in; the
   artefact language is a user choice defaulting to the UI locale.
3. **Culture already bites us in code.** `config.js` hardcodes `£` and
   `USD_TO_GBP = 0.79` (`fmtGbp`); Vault-style `toLocaleDateString('en-GB')`
   patterns are one refactor away from spreading. Currency display, number and
   date formats move into a culture pack on day one.
4. **We already own the review loop Send lacked.** Their locales stalled on
   "content not reviewed". Our QA-to-docs harness screenshots every journey on
   every build — run per locale, those shots *are* the translator's and
   designer's review surface, and the diff gate pins each locale/theme once
   blessed. Send never had this; it is our unfair advantage here.
5. **We have a hard rule Send doesn't need**: issue 041 removed `?origin=`
   because *a URL parameter must not choose what code runs beside the key*.
   Theme and locale selection therefore load only **committed, allowlisted**
   packs — a name looked up in a manifest, never a URL to fetch from.

## 3. The target architecture: three declarations, one machinery

```
website/app/
  locales/            one FOLDER per locale — everything that locale needs, in one place
    index.json          the allowlist: locales that exist, which are LIVE vs draft,
                        and the file-set each one ships
    en-gb/              source of truth — a SET of per-domain files, not one blob
      core.json           the one-pass chrome: drop zone, options, results
      chat.json           the chat panel
      flow.json           the flow panel + workflow step names
      debug.json          the advanced/debug pane
      errors.json         every error message (they deserve their own review pass)
      culture.json        currency, intlLocale, date/number style, tone/formality
                          notes the prompts read — culture data lives IN the locale
    pt-pt/              what exists here is what pt-pt supports — incremental by
      core.json           construction: a locale can ship core.json LIVE while
      culture.json        chat.json is still draft or absent (falls back per key)
    pt-br/              same language, different culture — different folder, and
      …                   room for things only this culture has (samples, imagery)
  themes/             DESIGN — how it looks (cross-cutting, not per-locale)
    index.json          the allowlist: theme name → token sheet (+ layout class)
    default.css         every colour/font/space/radius as --wa-* tokens on :root
    <candidate>.css     one file per Claude Design candidate = one A/B arm
  i18n.js             t(key, params), locale detect/persist, wa:locale-changed
  prompts/*.md        gain {{language}} / {{tone}} placeholders (culture-fed)
```

Why a folder per locale, and many small files (Dinis, 8 Aug — revising this
doc's first draft): Send's one-file-per-locale **backfired** — 850-key files
meant every change, however small, re-processed the whole file, and translation
agents drowned in tokens (the 03/01 scaling brief's "agent paralysis", relived).
Per-domain files make the unit of work "translate chat.json for pt-br" (~30
keys), the unit of review one domain, and the unit of support one file: **the
files that exist are the support you have.** A locale's folder is also the home
for everything culture-specific that isn't a string — sample voice notes,
imagery, culture-specific UI affordances — so maturity can vary honestly per
locale without a global switch. The domain split follows the app's component
seams, so a component's strings and its translation file move together.

- **Locale resolution**: `navigator.languages` matched against the allowlist
  (with Send's prefix fallback map, `pt → pt-pt`) → overridden by the picker →
  persisted in `localStorage` (fixing Send's recorded gap: their choice never
  persisted). No URL parameter selects anything; a `/pt-pt/app/` *path* may come
  later for the content estate, exactly as Send routes, and the app ignores it
  until then.
- **Rendering**: static page copy via `data-i18n` attributes on `index.html`;
  component-rendered strings via `t()` inside the nine `wa-*` components;
  components re-render on `wa:locale-changed` (no full-page reload — the flow
  panel and an in-flight pass survive a language switch).
- **Culture in the pipeline**: `fmtGbp` generalises to `fmtMoney(usd)` reading
  the active locale's `culture.json`; dates/counts via `Intl.*` with its
  `intlLocale`; the culture's `tone` strings flow into the prompt templates
  beside `{{language}}`. **Currency decision (Dinis, 8 Aug): every locale's
  `culture.json` declares GBP for now** — `{code:"GBP", symbol:"£",
  usdRate:0.79}` in pt-pt and pt-br too. Standardising on one currency
  sidesteps exchange-rate and pricing-parity problems while payments are
  unsettled; because it is declared per locale rather than hardcoded, the day
  payments want € or R$ is a data change, not a refactor. (This is Send's £/€
  inconsistency lesson answered from the other side: one currency everywhere,
  on purpose, in data.)
- **Themes**: after the token extraction, a theme is one CSS file of `:root`
  custom properties (+ an optional `data-layout` class for genuinely different
  arrangements — Send's third primitive). Selection: `data-theme` attribute set
  from the allowlist, persisted like the locale; A/B assignment is a
  deterministic client-side hash over a stored anonymous id, so both arms ship
  in the same deploy and the choice is stable per visitor. (Measurement with no
  backend is an open question — §6.)
- **The picker**: one control, native-script names, no flags, LIVE locales
  clickable, draft locales visible but marked — per-locale gating, not Send's
  global SOON.

**Translation pipeline** (agents, not heroics): `locales/en-gb/` is canonical;
a key-diff script reports missing/stale keys **per domain file** per locale, so
a translation job is "translate chat.json for pt-br with this culture's tone
note" — a ~30-key task, never a whole-locale blob (the unit of work that made
Send's translation agents hang). LIVE gating is per locale, and support is per
file: a domain file a locale doesn't ship yet simply falls back to en-gb key by
key. The LIVE bit flips only after human review of that locale's qa-to-docs
screenshots. CI check (extending `--check` discipline): every locale file's
keys ⊆ its en-gb counterpart's, every LIVE locale's shipped files 100%
key-complete, every theme's tokens ⊆ default's — parity failures fail the
build, the way Send's generators never did.

**Testing**: browser unit tests (issue 049) grow modules for `t()` fallback,
culture formatting, and theme-token completeness; qa-to-docs runs its journeys
per LIVE locale × candidate theme (masks already hide the nondeterminism), so
every language and every design candidate has pinned, reviewed screenshots on
every build.

## 4. Sequencing (issue 050)

- **M1 — Extract (no visible change).** Tokens out of `app.css` + nine shadow
  styles into `themes/default.css`; strings out of HTML/JS into the
  `locales/en-gb/` domain files; money/dates through `en-gb/culture.json`
  (GBP declared, not hardcoded). All existing tests stay green; the app looks
  identical. *This alone unblocks the Claude Design A/B work — a candidate
  design becomes one token sheet.*
- **M2 — pt-PT and pt-BR together, end to end (Dinis, 8 Aug).** Two folders,
  same language, genuinely different cultures — the pair proves the
  language/culture split is real from day one and gives us something to *show*
  (different tone, even different UI affordances, per culture). Picker,
  persistence, artefact language through the workflow options and prompts,
  per-locale qa-to-docs shots, the per-file parity `--check`. Both stay GBP.
- **M3 — Design candidates as A/B arms** (Claude Design token sheets), plus
  whichever next locale the pt pair's experience says is cheapest.
- **M4 — Content-estate localisation** (`/pt-pt/` paths, hreflang, sitemap) —
  Send's generator architecture applies almost verbatim there; adopt it minus
  its recorded gotchas.

## 5. What we explicitly do NOT build

- No i18n framework/library; `i18n.js` stays in the spirit of the workflow
  split — generic data format, minimal machinery (Send's runtime is ~200 lines;
  ours should be smaller).
- No fallback chains (`de-ch → de-de → en-gb`); one hop, straight to en-gb —
  revisit only when a real locale pair hurts (pt-pt/pt-br will be the first
  evidence either way).
- No runtime translation fetching from third parties, no CDN dictionaries —
  packs are committed, allowlisted, CSP-clean.
- No flags in the picker. Recorded once at Send, done here.
- Klingon only when it stops being effort (it's a good edge-case test; it is
  not M1).

## 6. Decisions taken, questions still open

**Decided (Dinis, voice memo, 8 Aug 2026):**

1. **Locale layout** — a folder per locale, a set of per-domain files inside
   it, incremental support by file existence (§3, revised accordingly). The
   single-file-per-locale pattern is rejected on Send's own evidence: it
   caused the token explosion it was meant to manage.
2. **First locales** — **pt-PT and pt-BR together**: distinctly different
   cultures sharing a language, the strongest possible proof of the split,
   with visible culture differences (tone, even UI) to show.
3. **Currency** — **GBP everywhere for now**, declared in each locale's
   `culture.json`, never hardcoded. Protects against exchange-rate/pricing
   problems until payments are sorted; switching a locale's currency later is
   a data edit.

**Still open:**

1. **A/B measurement without a backend** — self-reported (a "which did you
   prefer" prompt), OpenRouter-key-level cohorting, or defer measurement and
   use A/B only for internal review via qa-to-docs shots?
2. **Artefact language default** — UI locale (current proposal) or the detected
   language of the voice note itself?

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
