---
created: 2026-08-05T17:30:00Z
source: Dinis — "we also need CI pipeline tests (unit, integration and QA) so that we can confirm that versions are good on every release and there are no breaking changes"
priority: high
estimated_effort: medium
---

# CI pipeline tests: unit + integration gate the release, QA checks the live site

## Outcome
Done 5 Aug. The pipeline now reads test → tag → publish → QA; a test failure stops the
release (no tag, no deploy).

- **Unit** (`tests/unit/`, `node --test`, 22 tests): `audio-normalise` (the issue-025
  sniffing matrix against the real fixture bytes), `config` (GBP formatting, origin
  override), `debug-store` (exchange log, pending→done folding, prompt overrides, the
  transport-level transcription override incl. no-mutation and no-audio pass-through).
- **Integration** (`tests/integration/app-boot.test.mjs`, Playwright): boots the real
  app headless against the live engine origin (or a local mirror via `MIRROR_DIR` in
  sandboxed runs), asserts the full 26-action contract, real-fixture ingest, sample
  chips, the debug pane's three views, and the prompt-override round-trip — everything
  that works without a key. 11 checks.
- **QA** (`tests/qa/live-site-check.mjs`, plain fetches): after the Pages deploy,
  waits for the CDN to serve the fresh `version.txt` (max-age=600 lag), then checks
  pages, the version stamp, that every `?v=`-stamped asset resolves (the issue-026
  class), manifest/prompts/samples reachability, and the engine origin + its CORS
  header. CI passes `EXPECT_VERSION=$(cat version)` from the bump commit.
- **`ci-pipeline.yml`**: new `test` job (Node 22 + Playwright Chromium) that
  `increment-tag` and `build-pages` now require; new `qa-live` job after
  `deploy-pages`.

Not covered by CI (deliberate): LLM round-trips need a spend-capped key — run
in-session with the keyed e2e; a repo-secret key can be added later if wanted.
