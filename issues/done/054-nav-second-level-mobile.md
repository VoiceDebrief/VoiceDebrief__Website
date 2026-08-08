---
created: 2026-08-08T15:00:00Z
source: Dinis, with screenshots — mid-width wrap orphaned "Engineering" onto its own line, and under 640px the menu vanished entirely ("the menu is lost completely"); "I think we need a 2nd level of menu navigation"
priority: high
estimated_effort: small
---

# The nav gets a second level and stops abandoning small screens

v0.1.0 of `wa-site-nav` had ten flat links and this CSS:
`@media (max-width:640px){nav{display:none}}` — on a phone the menu was not
adapted, it was discarded.

## Outcome 8 Aug 2026 — DONE, wa-site-nav v0.1.1

- **Second level**: ten flat links → six primary (How it works, Privacy,
  Pricing, App, User guide, Library) + two groups — **News ▾** (Updates,
  Versions, Videos) and **Engineering ▾** (the six sections). Dropdowns are
  CSS-only (`:hover` + `:focus-within`, keyboard included); the group parent is
  a real link to its landing page, so the dropdown is a shortcut, never a gate.
- **Small screens**: ≤760px shows a hamburger (`aria-expanded` managed) opening
  a grouped panel with every page reachable. Nothing is hidden without a way in.
- Mid-width wrapping tidied (row-gap; no orphan link lines).
- IFD discipline: new immutable version folder `v0/v0.1/v0.1.1/`; all 17
  references (12 pages, 3 templates, browser tests, live-QA) flipped in one
  commit.
- Tests: browser suite grew to 12 — the two-level structure pinned (6 primary /
  2 groups / 9 grouped pages) and the hamburger toggle exercised with real
  clicks. The qa-to-docs screenshots will change with the new header — which is
  exactly what the record-not-block policy (issue 053) is for; this is its
  first real customer.

## Amendment (Dinis, same day): five items, three groups
"Move How it works, Privacy and User guide to the Library (as sub menus)" —
top level is now **App · Pricing · Library ▾ · News ▾ · Engineering ▾**; the
Library dropdown holds User guide, How it works, Privacy. The mobile panel
gained each group's landing page (All documents / Updates / Overview) so no
page is desktop-only. Noted for later: if "How it works"/"Privacy" (pitch
anchors, not documents) ever feel mislabelled under Library, relabel the group
"Learn" — a one-line change.
