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
