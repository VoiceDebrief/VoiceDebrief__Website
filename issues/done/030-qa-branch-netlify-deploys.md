---
created: 2026-08-05T18:40:00Z
source: Dinis — "as part of our qa workflow I would like to have a new qa branch that you can push to to deploy automatically on commits … can you add a new CI action to publish to netlify?"
priority: high
estimated_effort: small
---

# QA branch with automatic Netlify deploys

**CLOSED 5 Aug 2026.** Dinis created the Netlify site
(https://silver-melba-d8d883.netlify.app) and added the two secrets; run #2 of the
QA workflow then went end to end: tests → real Netlify publish (28s) → live check.
Verified: the deployed site serves `version.txt` = `v0.1.14-qa.cbd4382` and passes
all 16 live checks (pages, stamped assets, samples, prompts, engine origin + CORS).
Along the way run #20 on dev exposed a bug in the QA script itself — the CORS check
did a bare server-side fetch, and the tools-origin CDN only sends
`access-control-allow-origin` when the request carries an `Origin` header (as
browsers always do). Fixed by sending one; green against both estates.

## What exists (pushed, workflow live on the `qa` branch)

- **`qa` branch** — the QA estate. Push to it and
  **`.github/workflows/qa-deploy.yml`** runs:
  1. **test** — the same unit + integration gate as the release pipeline;
  2. **deploy-netlify** — stamps the build as `<version>-qa.<short-sha>` into the
     footer and `version.txt` (the `version` file itself stays CI-owned on dev/main —
     no tagging happens on qa), cache-busts the assets, publishes `website/` with
     `netlify-cli deploy --prod`;
  3. **qa-live** — runs `tests/qa/live-site-check.mjs` against the deployed Netlify
     URL with the expected QA version.
- GitHub Pages stays the dev estate (one Pages site per repo); Netlify is the QA one.
- Until the secrets exist the deploy step skips with a workflow warning instead of
  failing, so the test gate still reports on every qa push.

## To unblock (Dinis)

1. Create a Netlify site for this repo (any name, e.g.
   `sgraph-whatsapp-transcribe-qa` → `https://sgraph-whatsapp-transcribe-qa.netlify.app`).
   No build command needed — CI deploys a prebuilt directory.
2. Add two repository secrets (GitHub → Settings → Secrets and variables → Actions):
   - `NETLIFY_AUTH_TOKEN` — a Netlify personal access token (User settings →
     Applications → New access token);
   - `NETLIFY_SITE_ID` — the site's API ID (Site settings → General).
3. Re-run the QA workflow (or push anything to `qa`); the deploy + live check should
   go green. Then this issue moves to done.
