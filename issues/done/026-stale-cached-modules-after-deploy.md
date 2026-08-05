---
created: 2026-08-05T19:10:00Z
source: Dinis — ticked "also make me an infographic" on the live site; transcript+summary worked, no infographic appeared
priority: high
estimated_effort: small
---

# Ticking the infographic box did nothing on the live site (stale cached modules)

## Diagnosis
Not an infographic bug. The deployed bytes were correct (v0.1.15 served the full M2
code — verified by fetching `/app/app.js`, `/app/pipeline.js`, `/app/infographic.js`
from the live domain). The browser was running the PREVIOUS deploy's JavaScript against
the NEW HTML: GitHub Pages serves our unversioned modules with `cache-control:
max-age=600`, so for up to ten minutes after a deploy a returning visitor gets fresh
`index.html` (offering the checkbox) and cached `app.js`/`pipeline.js` (which know
nothing about it). The giveaway was in the screenshot: the summary rendered as one bold
blob — the `wa-result-card` v0.1.0 renderer that v0.1.1 replaced.

Our `wa-*` components are immune (IFD: immutable versioned paths). The app's own modules
were not versioned at all — that was the hole.

## Outcome
Done 5 Aug:
- `scripts/stamp_cache_busters.py` — CI appends `?v=<version>` to every same-origin JS
  import specifier and to the `<script>`/`<link>` URLs in the published artifact, so each
  deploy has distinct URLs and generations cannot mix. Upstream tools-origin URLs are
  deliberately untouched (already immutably versioned). Idempotent; tested; the stamped
  artifact was booted end-to-end with a real key and passed.
- Wired into `ci-pipeline.yml` between the version stamp and the Pages upload.
- `version.txt` fetched with `cache: 'no-store'` so the footer version is always the
  running one (it is our support signal).
- Infographic failures are now visible: the card shows an explanatory note instead of a
  silently-red rail step, and a reply that contains no drawable SVG says so.

## Note for the next report of this shape
Ask for the footer version first: it now always reflects the JS actually running.
