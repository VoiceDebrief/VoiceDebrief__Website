# 060 — Go-live: rename to VoiceDebrief, home redesign, and telling the truth

**Status** open · **Opened** 2026-08-08 · **From** Dinis

## Why

We are going live. Three things have to land together: the product becomes
**VoiceDebrief for WhatsApp** at **VoiceDebrief.ai**, the main workflow moves onto the
home page, and the site stops describing a product we do not have.

## Done in this commit

- **Design brief written** — `library/briefs/go-live/v0.1.23__design-brief__home-page-redesign-for-go-live.md`,
  for Claude Design. Covers all five requirements, the non-negotiable constraints
  (no backend, no SPA, tokens only, strict CSP, four cultures, phone-first, a11y),
  and asks for a list of every untrue claim on the current site.
- **The App link is no longer blue** — `wa-site-nav` v0.1.6. Wrapping it in
  `.i18n-link` for the locale flag (v0.1.3) took it out of `nav.main > a`, so it fell
  back to the browser default link colour on navy. Browser test compares computed
  colours; proven to fail with the selector reverted.

## Still to build (the go-live checklist)

- [ ] **Remove the three privacy chips** from the app and replace them with a plain
      statement that audio and transcripts go to OpenRouter, which routes them to a
      provider we cannot name and do not control. Two of the three chips do not exist;
      shipping a privacy *selector* implies a control we do not have.
- [ ] **The OpenRouter key guide page** — what it is, why we do not bill directly, how
      to sign up, create a key, set a spend cap, and revoke it. Reachable from the key
      field, not only from a menu.
- [ ] **A beta mark** (Gmail-style, persistent, beside the wordmark) and an **LLM
      caveat** — likely next to the transcript, where it is honest rather than
      decorative.
- [ ] **The rename**: 43 hardcoded "Voice Note Transcribe" strings plus the `title` key
      in all four locale files. Should become **one** `core.productName` key, recorded
      in the concept scheme as a concept with a scope note saying *not translated* —
      the concept layer paying for itself.
- [ ] **Decide `summary` → `debrief`** in the interface, now the product is named after
      the word. Four languages; the concept scheme already flags it.
- [ ] **The Pricing page** describes a credit product that does not exist. Make it an
      honest cost-on-your-own-key page, or remove it.
- [ ] Home page copy claims "an analysis" as a distinct output. There is no analysis
      step.

## Dependencies and notes

- The rename and the home redesign interact: doing the copy rewrite before the design
  comes back wastes the work. The **rename plumbing** (one string key) does not, and
  can go first.
- `WhatsApp` is Meta's trademark — usable descriptively ("for WhatsApp"), cannot lead
  the name, and our green is close enough to theirs to be worth a second look.
- Depends on issue 057 (the concept scheme) for the `summary`/`debrief` decision.
