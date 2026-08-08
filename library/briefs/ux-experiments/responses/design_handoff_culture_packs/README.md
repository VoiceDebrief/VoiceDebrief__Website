# Brief pack: four culture packs for the app page

Repo: `sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription`, branch `dev`.
Answers `00__strategy.md` (v0.1.22, included as `source-strategy.md`) — implementation
is issue 050, milestones M1 and M2.

Locales designed: **`en-gb` · `en-us` · `pt-pt` · `pt-br`**.

One prototype, `prototypes/Culture Packs - four locales.dc.html`, contains all four
as switchable packs running the real core flow, plus the explanation layer.

---

## What this is answering

The strategy asks for three declarations and one machinery: **what the app says**
(locale strings), **how it says it** (culture data — tone, money, dates, numbers) and
**how it looks** (theme tokens). This pack designs all three for four cultures, and
adds a fourth thing the strategy implies but does not specify: **a way to show the
differences and argue the reasons**, so the split can be defended to anyone who thinks
`pt` would have been enough.

Two languages, four cultures — chosen precisely because en-gb/en-us and pt-pt/pt-br
each prove the same point inside one language.

---

## About the design files

`prototypes/*.dc.html` is a **design reference written as a single-file HTML
prototype**, not production code. It opens directly in a browser and is fully
interactive: pick a locale and the whole app re-themes and re-words in place.

Recreate it in the repo's fixed environment: **vanilla JS + Web Components, no
framework, no build step**, versioned asset paths, **strict CSP** (no CDN fonts — the
prototype uses only `Georgia`, `system-ui` and `ui-monospace`, all safe).

Reading the format: markup inside `<x-dc>…</x-dc>` is the template,
`class Component extends DCLogic` is the logic. `{{ name }}` is a value from
`renderVals()`, `<sc-for>` repeats, `<sc-if>` conditions. The four packs are the
`PACKS` object at the top of the logic class — **that object is the deliverable**;
it maps one-to-one onto the file layout below.

**Fidelity: high.** Colours, type, radii, all copy in four languages, and every
formatted number are final.

---

## How `PACKS` maps onto the repo

```
website/app/locales/
  index.json          allowlist + LIVE/draft per locale
  en-gb/
    core.json         PACKS['en-gb'].t          ← the one-pass chrome
    culture.json      PACKS['en-gb'].culture    ← currency, intlLocale, tone
  en-us/  core.json · culture.json
  pt-pt/  core.json · culture.json
  pt-br/  core.json · culture.json
website/app/themes/
  index.json          theme name → token sheet
  en-gb.css           PACKS['en-gb'].theme as --wa-* custom properties on :root
  en-us.css · pt-pt.css · pt-br.css
```

The prototype holds theme tokens inline per pack because it has to switch them at
runtime in one page. **In the repo they are `:root` custom properties in a CSS file**
— which is the whole point of the M1 extraction, and is what lets the tokens pierce
the shadow DOM of the nine `wa-*` components without breaking encapsulation.

`chat.json`, `flow.json`, `debug.json`, `errors.json` are **not** designed here —
this pack covers the core one-pass chrome only. A locale shipping `core.json` while
`chat.json` is still absent is exactly the incremental-by-file-existence behaviour the
strategy describes, and this design assumes it.

---

## The four packs

Every pack carries: a theme token set, a full `core.json` string set, and a
`culture.json` (currency + formatting + tone). All four quote **GBP**, declared per
locale, never hardcoded — per Dinis's 8 Aug decision.

### en-gb — source of truth

```
pageBg #f3f2ef   surface #ffffff   panelBg #eeece7   ink #1b1f23
muted  #5a6169   muted2  #8b9299   hairline #dcd9d2
accent #7a2230 (claret)  onAccent #ffffff  accentWash #f3e4e6
barBg  #1b1f23   barFg #f3f2ef   barAccent #a33344   onBarAccent #ffffff
invBg  #1b1f23   invFg #f0efec   invLabel #c9a1a8
warn   bg #f7f2e6  edge #a67c1f  ink #7a5a12  body #4a412c
dropLine #cbc6bb   shadow none   radius 4px / 4px / 4px
headFont Georgia serif @400        uiFont system-ui
culture  £0.014 · £0.055 · "218 words" · 8 August 2026 · 1,234.5
tone     understated, polite, indirect
```

Restraint is the cultural signal: serif headings, near-zero radius, no shadows at all.

### en-us

```
pageBg #ffffff   surface #ffffff   panelBg #f6f8fb   ink #0d1219
muted  #4d5866   muted2  #8592a3   hairline #e1e7ef
accent #1657d0   onAccent #ffffff  accentWash #e6eefc
barBg  #0d1219   barFg #ffffff   barAccent #3d7ef0   onBarAccent #04101f
invBg  #0d1219   invFg #f2f5f9   invLabel #93b4f0
warn   bg #fff6e8  edge #e08c14  ink #96590a  body #4a3a1e
dropLine #c3d3ea   shadow 0 4px 14px rgba(13,18,25,.07)   radius 14px / 10px / 14px
headFont system-ui @800            uiFont system-ui
culture  £0.014 · £0.055 · "218 words" · August 8, 2026 · 1,234.5
tone     direct, benefit-first, warm
```

Headline states the outcome and the time ("transcribed in 10 seconds") where en-gb
states the object. Same language, different culture.

### pt-pt

```
pageBg #f6f4ee   surface #ffffff   panelBg #efece3   ink #16202e
muted  #556072   muted2  #8b93a1   hairline #ddd8ca
accent #1f4788 (azulejo)  onAccent #ffffff  accentWash #e4eaf6
barBg  #16202e   barFg #f6f4ee   barAccent #4a7ec4   onBarAccent #0a1420
invBg  #16202e   invFg #eef1f5   invLabel #9fb6da
warn   bg #f9ede3  edge #b5642f  ink #8a4a20  body #4a3626
dropLine #c7c8bb   shadow 0 2px 10px rgba(22,32,46,.06)   radius 8px / 8px / 8px
headFont Georgia serif @400        uiFont system-ui
culture  0,014 £ · 0,055 £ · "218 palavras" · 8 de agosto de 2026 · 1 234,5
tone     formal, third person, precise
```

Azulejo blue on limewashed white. Symbol **after** the amount, comma decimal, narrow
space as thousands separator. Vocabulary: **ficheiro · dispositivo · ecrã · utilizador**.

### pt-br

```
pageBg #fbf7f0   surface #ffffff   panelBg #f5efe4   ink #1c2b26
muted  #54655e   muted2  #8b9a93   hairline #e6ddcd
accent #0e7c66   onAccent #ffffff  accentWash #dff1ec
barBg  #0e7c66   barFg #ffffff   barAccent #ffd9a0   onBarAccent #12352c
invBg  #1c2b26   invFg #eef5f2   invLabel #8fd6c4
warn   bg #fdf0dc  edge #dd8a1c  ink #96590a  body #4a3c22
dropLine #d8cbb4   shadow 0 6px 20px rgba(28,43,38,.08)   radius 22px / 16px / 50%
headFont system-ui @800            uiFont system-ui
culture  £ 0,014 · £ 0,055 · "218 palavras" · 8 de agosto de 2026 · 1.234,5
tone     informal, first person plural
```

Deep green on warm cream, the softest shapes of the four, and a **circular** drop
target where pt-PT has a square one — the locale folder holds culture-specific
affordances, not only strings. Vocabulary: **arquivo · celular · tela · usuário**.

> **Note on `barAccent`.** pt-BR's bar is its accent colour, so a selected pill painted
> in `accent` disappeared against it. Every pack therefore declares an explicit
> `barAccent` / `onBarAccent` pair for selected top-bar chrome. Keep this token pair —
> it is not decoration, it is what stops the picker's active state vanishing.

---

## The picker

One control, four pills, **native-script names, no flags anywhere**
(`English (UK)`, `English (US)`, `Português (Portugal)`, `Português (Brasil)`).
The recorded reasons: one flag never equals one language, and flags exclude diaspora
speakers. LIVE locales clickable, drafts visible but marked — gated per locale, never
Send's global SOON.

Switching re-themes and re-words **in place** — no reload, so an in-flight pass and a
saved key both survive it (`wa:locale-changed`). No URL parameter selects anything,
per issue 041.

---

## The explanation layer — the part that isn't in the strategy doc

Two modes, both in the same file.

**1 · Reasons on** (default). Numbered markers ①–⑦ sit on the elements that differ,
with a side panel giving, per marker: **what changed**, **why**, and an **evidence
line** citing the decision it comes from. The notes are *different for each locale* —
en-gb's marker ③ is about British product vocabulary, pt-pt's is about
`ficheiro` vs `arquivo`, pt-br's ⑥ is about `Resumão` having no pt-PT equivalent.
Switching locale switches the argument.

**2 · Compare all four →** A ten-row matrix across the packs — accent colour,
typography, shape language, register, vocabulary, currency, numbers, dates, artefact
language, fallback — each with a **why it matters** column. Below it, four principle
cards: culture-not-language, native names/no flags, GBP declared-not-hardcoded, and
"a file, not a locale" as the unit of work.

This layer is the answer to *"why are we doing four packs instead of two languages?"*
and should survive into whatever the team ships internally — as a library page, if
nothing else. It is the argument, not decoration.

---

## Two decisions worth flagging back

1. **We reversed a recorded rule on purpose.** Send's designer review specifies a
   *culturally neutral palette*. This pack deliberately does the opposite: each culture
   gets its own identity in colour, type and shape. That was the ask, and it is
   defensible, but it is a documented rule being overridden — record it as a decision
   rather than letting it look like an oversight.
2. **No flags — that rule we kept, strictly.** Nothing in the prototype renders a flag
   glyph in any locale.

## Open questions this design touches

- **Artefact language default** (strategy §6.2). The prototype assumes *UI locale* —
  marker ⑥ in every pack says so, and the summary is described as being in that
  culture's Portuguese/English. If the default becomes *detected language of the voice
  note*, that marker's copy changes in all four packs.
- **A/B measurement without a backend** (§6.1). Nothing here depends on measurement;
  the prototype emits only local-only counters (`localStorage`, never sent).

## Not designed yet

- `chat.json`, `flow.json`, `debug.json`, `errors.json` for any locale.
- Error states in any pack.
- RTL. Logical CSS properties should still be used from day one so the first RTL locale
  is a pack rather than a rewrite.
- Draft-locale presentation in the picker (visible but marked) — specified, not drawn.

---

## Files

```
source-strategy.md                                  the strategy this answers
prototypes/Culture Packs - four locales.dc.html     all four packs + both explanation modes
prototypes/tool-adapter.js                          engine seam, fixtures, local-only counters
```

Open the prototype directly in a browser. With no OpenRouter key saved it runs scripted
fixtures; with a key the same code path calls `__tool.runPass`. Note the fixture
streamer is time-driven with a hard deadline — do not convert it to
`requestAnimationFrame`, which is paused outright in hidden tabs.
