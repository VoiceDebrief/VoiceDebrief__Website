# 052 — Three alternative designs, shipped alongside the current one, for A/B testing

**State:** open · **Priority:** high · **Effort:** large
**Opened:** 2026-08-08
**Brief:** [`library/briefs/ux-experiments/v0.1.22__design-brief__three-alternative-designs-for-ab-testing.md`](../../library/briefs/ux-experiments/v0.1.22__design-brief__three-alternative-designs-for-ab-testing.md)

## Why

The product works. We do not know whether the shape we happened to build first is
anywhere near the best one available, and scaling acquisition against an
unvalidated design is expensive. Three serious alternatives, built well enough to
put in front of users, is the cheapest way to find out.

Dinis, 8 Aug: *"we can change everything here, what matters is to be able to find
the best UX, layout, flow and experience for the users"*.

## Scope

Four variants live side by side (current + three). Each new one is a genuinely
different bet, not a re-skin; each ships a working prototype under
`website/design/<variant>/` against the real `window.__tool` API, at desktop and
phone widths, and gets its own QA-to-docs journeys so its screenshots and guide
pages generate like the current one's.

Fixed: no backend, BYOK, privacy honesty, the engine API, vanilla JS + Web
Components with no build step, the CSP. Everything else is on the table.

## The blocking open question

**How do we measure an A/B test on a site that promises "nothing tracked, nothing
stored server-side"?** The brief sets out three options — local-only telemetry,
opt-in anonymous beacon, or qualitative-only — with their real costs. This is
Dinis's call, not the designer's. Designs must work under any of the three and
must not bake measurement hooks into the core flow before it is decided.

Until it is answered, we can build and look at the variants but cannot honestly
claim one "won".
