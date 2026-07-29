---
created: 2026-07-29T16:40:00Z
source: Dinis Route 53 setup + live checks, 29 Jul 2026
priority: high
estimated_effort: small
---

# Finish the custom domain: HTTPS enforcement + org domain verification

whatsapp-voice-transcription.sgraph.ai: DNS (CNAME -> sgraph-ai.github.io) resolves
and the repo serves the site over HTTP for the hostname. Remaining:

1. Wait for the Let's Encrypt certificate to provision, then tick
   Settings -> Pages -> Enforce HTTPS. (If stuck >24h: re-add the domain; check
   sgraph.ai CAA records include letsencrypt.org.)
2. Recommended once per org: verify sgraph.ai (org Settings -> Pages -> verified
   domains, TXT record in Route 53) to close the subdomain-takeover window.
3. Smoke: curl -I https://whatsapp-voice-transcription.sgraph.ai -> 200; HTTP 301s;
   version.txt matches latest tag. Then update reality + the guide's state table.

Guide: library/guides/v0.1.1__guide__github-pages-and-route53-dns.md

## Outcome
Done 29 Jul: HTTPS live and enforced (HTTP 301s to HTTPS; verified in-session), site serving version-stamped releases. Remaining recommendation (not blocking): org-level verified domain TXT for sgraph.ai — recorded in the Pages/Route 53 guide §4.
