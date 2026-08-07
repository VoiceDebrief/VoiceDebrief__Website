---
created: 2026-08-07T14:30:00Z
source: Dinis — "do we have browser based unit tests… in the past I used qunit which also provided a nice visual way to see the test's execution"
priority: high
estimated_effort: small
---

# Browser unit tests: the app modules under real browser semantics, watchable by anyone

The Node unit suite (`tests/unit/`) is fast but runs against shims — Node has no
real `File`, no `localStorage`, no custom-element upgrade. The modules that most
deserve testing (the declared workflow machine, audio sniffing from a genuine
`File`, the debug store's localStorage round-trips, `wa-site-nav`) earn a second
gate in a REAL browser — and per Dinis's request, with QUnit's visual runner so
a human can watch the execution.

## Outcome 7 Aug 2026 — DONE

- **`website/tests/browser/`** — the suite ships WITH the site (Dinis: linked
  from the site, runnable manually). One page, three ways to run it:
  - **live**: `https://<estate>/tests/browser/` — against the very modules that
    deploy serves (linked from `/engineering/testing/`)
  - **local**: `python3 -m http.server 8130 -d website` → `/tests/browser/`
  - **CI**: `node tests/browser/run.mjs` — headless Chromium drives the same
    page, reports ok/FAIL per test, in both workflows before the deploy jobs
- 11 tests / 35 assertions across 5 modules: workflow (validate, quote, run,
  degrade/abort/budget-gate), config (hardcoded ORIGIN + a source scan proving
  nothing reads the query string, fmtGbp), audio-normalise (real `File`
  mislabelled `.ogg` → renamed; bytes beat names), debug-store (real
  localStorage), wa-site-nav (real custom-element upgrade, nine links).
- QUnit 2.24.1 vendored (MIT — `website/tests/browser/vendor/README.md` has the
  provenance); no CDN at test time, ever.
- Gotcha pinned in the page itself: `tests.mjs` top-level-awaits the workflow
  declaration, so `QUnit.config.autostart = false` + explicit `QUnit.start()` —
  autostart would report "no tests were run".
- Results surface as `browser-unit` in `test-results.json` → the engineering
  hub's status strip and `/engineering/testing/`.
