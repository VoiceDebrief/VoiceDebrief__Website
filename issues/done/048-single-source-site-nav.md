---
created: 2026-08-07T10:30:00Z
source: Dinis, session instruction 7 Aug ("normalise the menus — one source (js web component) for all pages")
priority: normal
estimated_effort: small
---

# One nav, one source: wa-site-nav on every page

The header menu had drifted into five variants: the app page didn't link
Videos or Engineering, only the Versions page linked the App, the generated
templates differed from the landing page, and the engineering pages had their
own header entirely.

## Outcome 7 Aug 2026 — SHIPPED
- `wa-site-nav` v0.1.0: one dependency-free web component (no SgComponent, no
  tools-origin import, no extra fetches — the menu must render on pages that
  never load the engine and must not fail with it). Absolute URLs so any page
  depth works; active link derived from the path; `badge="BETA"` on the app
  page; on `/engineering/*` a second row carries the section links.
- All 12 surfaces migrated (10 static pages + the updates/videos templates);
  the dead header CSS stripped from every stylesheet.
- Render-verified on every page in headless Chromium: 9 links, correct active
  state, engineering sub-row, badge — no page errors. Live-QA checks the
  component file resolves on every deploy.
- Known tradeoff, recorded: nav links now render via JS (shadow DOM), so
  non-JS crawlers don't see them in raw HTML — discovery is covered by
  sitemap.xml, llms.txt and the plain-HTML footer links (issue 047). Mobile
  keeps the previous behaviour (nav hidden under 640px); a proper small-screen
  menu is a Designer follow-up.
