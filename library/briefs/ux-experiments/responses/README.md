# Design responses (received 8 Aug 2026, via Dinis)

Two hand-off packs from the Claude Design sessions, answering the two design
asks in flight. Full review: `team/roles/architect/reviews/08/08/v0.1.23__review__design-responses-culture-packs-and-themes.md`
(verdict: both accepted for implementation; grounding verified against the real
app). Implementation belongs to the agent on the design/i18n workstream.

| Pack | Answers | Contents |
|---|---|---|
| `design_handoff_culture_packs/` | issue 050 (i18n strategy M1/M2) — **four cultures**: en-gb, en-us, pt-pt, pt-br | One interactive prototype with all four packs switchable in place, an explanation layer (per-culture reason markers + a ten-row compare matrix), full token sets, `core.json` strings and `culture.json` data per culture, `PACKS` object mapping 1:1 onto `website/app/locales/` + `themes/` |
| `design_handoff_themes/` | issue 052 — **three A/B themes** for the core flow: Studio, Console, Card | Three interactive single-file prototypes (fixture mode with no key, real `__tool.runPass` with one), shared `tool-adapter.js` engine seam, full token tables, state machine, local-only telemetry |

The `.dc.html` files are design references, not production code — open directly
in a browser. Recreate in the repo's fixed environment (vanilla JS + Web
Components, no build step, strict CSP, versioned asset paths).

Review flags to resolve during implementation (recorded 8 Aug):
1. **Theme-per-locale vs themes-as-separate-axis** — the culture pack binds a
   token sheet to each locale (`themes/en-gb.css`…); shipped M1 keeps themes
   and locales as independent allowlists. Reconcile by having a locale's
   `culture.json` *name a preferred theme* from the theme allowlist, so the
   axes stay independent and A/B can still cross them.
2. The culture pack **deliberately reverses** Send's culturally-neutral-palette
   rule (each culture gets its own identity) — record as a decision, as the
   pack itself requests.
3. The three themes **drop the site nav** — deliberate, but decide it (they are
   A/B arms under `/design/`, not estate pages; noindex them and keep them out
   of the sitemap; llms.txt only if they become public surfaces).
4. Engine request from the themes pack: **a partial-transcript streaming event**
   — the single highest-value engine change for all three; route upstream via
   `team/comms/briefs/` to the Tools team.
5. `en-us` appears as a fourth culture — the strategy's M2 named pt-PT + pt-BR;
   en-us arriving "free" with the pack is a bonus, gated like any draft locale.
