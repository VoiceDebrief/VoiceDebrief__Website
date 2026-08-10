---
created: 2026-08-09T09:00:00Z
source: Dinis — "have those 6 new designs/modes available (in that live+synthetic data mode) in separate pages (all linked from one A/B testing page) so that we can easily see them in action and ask for opinion"
priority: high
estimated_effort: medium
---

# The design candidates go live at /design/, runnable by anyone

The two hand-off packs (issue 052's three themes; issue 050's four culture
packs) were reviewed and accepted but only openable by someone who could unzip
them locally. Opinions need URLs.

## Outcome 9 Aug 2026 — DONE

**`/design/` is the A/B hub**, linking seven runnable candidates: three themes
(Studio / Console / Card) and four culture packs (en-gb / en-us / pt-pt /
pt-br, each a shareable `#code=` link into the same prototype, plus
`#view=diff` for the comparison matrix). Every page runs the real flow with no
key — scripted fixtures at realistic speed — and the identical code path with a
key saved. The hub states what we are asking people to judge.

**The prototypes are byte-identical to the hand-off.** They are `.dc.html`
files written against a runtime (`support.js`) that was not in the zip, so
rather than hand-port 1,300 lines of final reviewed markup — risking fidelity
drift in the very artefacts we are asking people to judge — `website/design/support.js`
implements the contract they were written against: `{{ }}` interpolation,
`<sc-if>`, `<sc-for>`, `on*` bindings, `ref`, `style-hover`, `<helmet>`, and a
React-shaped component base (`state` / `setState` / `forceUpdate` /
`componentDidMount`). When a design is re-exported we drop the new file in.

**This is prototype infrastructure, not product code.** It lives under
`/design/` and nothing in `website/app/` may import it; the product stays
vanilla JS + Web Components with no framework. An arm that WINS gets ported
properly — which is when its tokens and strings join `themes/` and `locales/`.

## Two real bugs found by building it

1. **The comparison matrix was invisible.** The culture pack puts `<sc-for>`
   inside `<table>/<tbody>/<tr>`, and the HTML parser's foster-parenting rules
   eject unknown elements out of table context — so a template read from the
   live DOM silently lost the ten-row matrix that is the pack's best idea. The
   runtime now re-reads the page source and parses the `<x-dc>` fragment as XML
   (the fragments carry no entities and close every tag), which preserves the
   tree exactly; it falls back to the DOM template with a console warning if a
   future prototype is not well-formed.
2. **The hub's "compare all four" link pointed at `#view=compare`** when the
   state key is `view: 'diff'` — a wrong preset fails silently, showing the
   ordinary app. Caught by testing the link rather than eyeballing it.

## Kept honest

- The designer's own cross-links use the original hand-off filenames
  (`Theme 1 - Studio.dc.html`); three redirect stubs make them resolve without
  editing the prototypes.
- `#key=value` seeds STATE only — it can never decide what code loads, which is
  the issue-041 rule this estate holds to.
- Pages are `noindex` and absent from the sitemap; the hub is listed in
  `llms.txt` (the same-commit discipline) as prototypes, clearly labelled.
- `tests/design/render-check.mjs` drives every prototype through a real demo
  pass and checks every hub link resolves — in both pipelines. If `support.js`
  breaks, the A/B pages become a blank screen, and nobody notices until someone
  opens one to give an opinion.

## Noted, not changed

The live `wa-locale-picker` uses flag emoji; the culture prototypes use none.
That is a *deliberate* documented reversal by the component's author (our unit
is a culture = language + country, so every entry names exactly one country,
and 🇵🇹 vs 🇧🇷 is the distinction being drawn), not drift — but it means the
prototype picker and the live nav picker look different, which anyone comparing
the two will notice.
