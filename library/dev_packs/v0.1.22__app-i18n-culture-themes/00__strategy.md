# Strategy: The App In Many Languages, Many Cultures, Many Designs

**version** v0.1.22
**date** 7 August 2026
**from** Claude (build session agent), grounded in the SG/Send record (see §1 sources)
**to** Dinis, Dev, Architect, Designer, QA — and the Claude Design brief the other agent is writing
**status** STRATEGY — nothing in here exists yet; implementation is issue 050
**scope** the app page only (`/app/`) — the pages that tell the story localise later; the page that does the work localises first

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
  locales/            LANGUAGE — what the app says
    index.json          the allowlist: which locales exist + which are LIVE vs draft
    en-gb.json          source of truth, flat dotted keys (Send convention)
    pt-pt.json          complete file per locale, one-hop fallback to en-gb
  cultures/           CULTURE — how it says numbers, money, dates, tone
    en-gb.json          { currency: {code,symbol,usdRate}, intlLocale, tone, … }
    pt-pt.json          culture keys the prompts also read (formality, sign-off)
  themes/             DESIGN — how it looks
    index.json          the allowlist: theme name → token sheet (+ layout class)
    default.css         every colour/font/space/radius as --wa-* tokens on :root
    <candidate>.css     one file per Claude Design candidate = one A/B arm
  i18n.js             t(key, params), locale detect/persist, wa:locale-changed
  prompts/*.md        gain {{language}} / {{tone}} placeholders (culture-fed)
```

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
  the active culture pack; dates/counts via `Intl.*` with the pack's
  `intlLocale`; the culture's `tone` strings flow into the prompt templates
  beside `{{language}}`.
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

**Translation pipeline** (agents, not heroics): `en-gb.json` is canonical; a
key-diff script reports missing/stale keys per locale; translation jobs are
"translate these 12 keys with this culture's tone note", never "translate this
file". Each locale's LIVE bit flips only after human review of its qa-to-docs
screenshots. CI check (extending `--check` discipline): every locale file's keys
⊆ en-gb's, every LIVE locale 100% key-complete, every theme's tokens ⊆
default's — parity failures fail the build, the way Send's generators never did.

**Testing**: browser unit tests (issue 049) grow modules for `t()` fallback,
culture formatting, and theme-token completeness; qa-to-docs runs its journeys
per LIVE locale × candidate theme (masks already hide the nondeterminism), so
every language and every design candidate has pinned, reviewed screenshots on
every build.

## 4. Sequencing (issue 050)

- **M1 — Extract (no visible change).** Tokens out of `app.css` + nine shadow
  styles into `themes/default.css`; strings out of HTML/JS into
  `locales/en-gb.json`; money/dates through `cultures/en-gb.json`. All existing
  tests stay green; the app looks identical. *This alone unblocks the Claude
  Design A/B work — a candidate design becomes one token sheet.*
- **M2 — Second locale end to end.** `pt-pt` (language + culture + artefact
  language through the workflow options and prompts), the picker, persistence,
  per-locale qa-to-docs shots, the parity `--check`. Two locales prove the
  matrix; seventeen is then translation work, not engineering.
- **M3 — Culture variants + design candidates.** `pt-br` (same language,
  different culture — the proof the split is real); Claude Design token sheets
  as A/B arms.
- **M4 — Content-estate localisation** (`/pt-pt/` paths, hreflang, sitemap) —
  Send's generator architecture applies almost verbatim there; adopt it minus
  its recorded gotchas.

## 5. What we explicitly do NOT build

- No i18n framework/library; `i18n.js` stays in the spirit of the workflow
  split — generic data format, minimal machinery (Send's runtime is ~200 lines;
  ours should be smaller).
- No fallback chains (`de-ch → de-de → en-gb`); one hop, complete files —
  revisit only when a real locale pair hurts.
- No runtime translation fetching from third parties, no CDN dictionaries —
  packs are committed, allowlisted, CSP-clean.
- No flags in the picker. Recorded once at Send, done here.
- Klingon only when it stops being effort (it's a good edge-case test; it is
  not M1).

## 6. Open questions for Dinis

1. **First non-English locale** — pt-PT (your call on the record at Send was
   "start with a couple")? And is pt-BR the right M3 culture-split proof?
2. **Currency policy** — does culture drive display currency (pt-PT shows €,
   converted at a committed rate), or does the product keep a single pricing
   currency with locale-formatted numbers? (Send's record shows the half-way
   house failing: £0.01 hardcoded inside translated sentences.)
3. **A/B measurement without a backend** — self-reported (a "which did you
   prefer" prompt), OpenRouter-key-level cohorting, or defer measurement and
   use A/B only for internal review via qa-to-docs shots?
4. **Artefact language default** — UI locale (current proposal) or the detected
   language of the voice note itself?

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
