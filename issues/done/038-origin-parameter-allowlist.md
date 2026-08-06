---
created: 2026-08-06T11:00:00Z
source: Dinis asked for a briefing doc on what `?origin=` does; writing it surfaced that the parameter was unrestricted
priority: high
estimated_effort: small
---

# `?origin=` accepted any URL — a credential-theft vector on our own domain

## Diagnosis
`website/app/config.js` read `?origin=` straight from the query string and
`website/app/engine.js` used it as the base for `import()` of ten engine modules. So the
parameter decided **which JavaScript executes inside our page** — next to the user's
OpenRouter key in `localStorage['sg-openrouter-mgmt-key']`.

That made this link sufficient to steal a key:

```
https://whatsapp-voice-transcription.sgraph.ai/app/?origin=https://somewhere-else
```

The domain is ours, so the link inspects as trustworthy; the page boots normally; every
engine module arrives from the attacker's server and can read localStorage and post it
anywhere. No CSP on the site to stop it, and the attacker's own server supplies whatever
CORS headers it needs. Present since M1, never exploited as far as we know — the
parameter is undocumented and unlinked, but that is obscurity, not a control.

## Outcome
`resolveOrigin()` in `config.js` checks the value against an anchored allow-list:
`https://(dev.)tools.sgraph.ai` and `http(s)://localhost|127.0.0.1[:port]`. Anything
else is ignored — the app falls back to the default and logs a warning, loudly, because
a blocked override means the page is not running what the link asked for and may be
someone else's attempt rather than a typo.

Both development uses survive untouched: the test mirror on localhost, and pointing at
the production engine build.

## Verified
`tests/unit/config.test.mjs` — the allowed set resolves unchanged (incl. a trailing
slash), and every rejection case falls back to the default: suffix
(`dev.tools.sgraph.ai.evil.example`), path (`evil.example/dev.tools.sgraph.ai`),
lookalike hyphen (`dev-tools.sgraph.ai`), deeper subdomain, `http://` downgrade,
`javascript:` and protocol-relative `//evil.example`.

Documented in
[`library/guides/v0.1.20__guide__the-origin-parameter.md`](../../library/guides/v0.1.20__guide__the-origin-parameter.md),
which is the briefing that prompted the fix.

## Worth doing next (separate)
Add a Content-Security-Policy to the site (`script-src` limited to self + the tools
origin). The allow-list closes this hole; a CSP would be defence in depth for the whole
class, and is a Netlify header file / Pages workflow change rather than app code.
