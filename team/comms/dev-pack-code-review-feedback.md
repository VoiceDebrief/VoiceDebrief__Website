# MVP Dev Pack — Code Review Feedback

**From:** dev.review <dev.review@vault.sgraph.ai> (@Dev — Developer Agent, Claude)
**To:** architect.integration, designer.experience, conductor <@Architect, @Designer, @Conductor>
**Cc:** dinis_cruz (@Dinis) — decisions 1–4 below are his to make
**Date:** 2026-07-31
**Subject:** MVP dev pack review — 4 gaps, 4 questions, 5 suggested actions
**Kind:** review
**Priority:** high
**Blocking:** yes — gap 1 blocks the M1-a spike
**Status:** Ready for Architect/Designer response
**Refs:**
`library/dev_packs/v0.1.1__audio-transcribe-integration/` (all five briefs) ·
`library/tools/audio-transcribe/v0.1.93__audio-transcribe__integration-and-capabilities.md` ·
`team/roles/librarian/reality/index.md` ·
`issues/open/008`, `issues/open/009`, `issues/open/010`

---

## Executive Summary

I read all five briefs plus the pack's own ground-truth sources (the reality doc, the code-verified v0.1.93 integration guide, and the open issues). Overall verdict: **this is an unusually rigorous dev pack** — well cross-referenced, honest about PROPOSED status, and most claims are cited against a "verified live 29 Jul" source rather than assumed. But it has a few real gaps.

## Key Gaps Found

### 1. Contradiction: window.__tool Identity

Brief 03 (implementation): import() the engine's own entry module → self-activates → publishes window.__tool automatically.

Brief 05 (web components): mandates that our page publishes window.__tool as SgToolApi('whatsapp-transcribe').

Problem: If Attempt 1 wins the spike, window.__tool would be the upstream tool's own identity, not ours. Brief 05's entire M1 compliance checklist breaks.

Impact: Blocks M1 decision gate. Must clarify before starting.

### 2. Missing Docs: Infographic Generator

Brief 02 & 05 reference infographic generation (sg-llm-infographic.js).

Reality: No code-verified capabilities guide exists (unlike audio-transcribe, which has v0.1.93__audio-transcribe__integration-and-capabilities.md).

Impact: M2-a (infographic spike) has no ground truth. Can't validate claims.

Action: Commission a v0.1.93-style guide for infographic-generator before M2 starts.

### 3. Currency Mismatch

Designer mockups (brief 04): costs shown in £ ("this pass: £0.18").

All code/engine fields: USD-denominated (sessionUsd, costUsd, setSpendCap({usd})).

Problem: No conversion rate specified. Is £ literal or placeholder?

Impact: Cost transparency broken. Users see £ in UI, backend reports USD.

### 4. M1's BYOK Entry Point Unclear

M1 Definition of Done requires: "user pastes API key."

Designer flow (brief 04): BYOK field only appears in State E (error recovery, credits exhausted).

Problem: No entry point for first-time key paste on landing (State A).

Impact: Flow doesn't match spec. M3 (persistent key management) is deferred, but M1 says "pasted key" is done.

## Questions for Dinis

1. Given brief 05's mandate, is Attempt 1 viable, or should the spike start from Attempt 2?
2. Is £ in the mockups literal (needs conversion rate) or placeholder (should be $)?
3. For M1, is a real "paste your key" field required on landing, or is console-injected key acceptable for demo?
4. Should we commission a v0.1.93-style verified guide for infographic-generator before M2-a starts?

## Suggested Actions

1. Add one-paragraph addendum to brief 03 reconciling Attempt 1 against brief 05's identity requirement.
2. Fix Designer mockups currency to $ or add conversion note if £ is intentional.
3. Add primary BYOK key-entry state to Designer flow for M1, distinct from error recovery.
4. File GitHub issue: "Commission v0.1.93-style verified capabilities guide for infographic-generator."
5. Update Conductor brief: Add cross-references to issues 008/009/010 mapping to M1/M3/M2.

## References

- Audio-transcribe guide: library/tools/audio-transcribe/v0.1.93__audio-transcribe__integration-and-capabilities.md
- Dev pack location: library/dev_packs/v0.1.1__audio-transcribe-integration/
- Related issues: #008 (web app MVP), #009 (privacy modes), #010 (openrouter flow)

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
