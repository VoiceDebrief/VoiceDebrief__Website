# Conductor Brief: Scope, Milestones, And The Decisions That Gate Them

**version** v0.1.1 · **date** 29 July 2026 · **role** Conductor · **type** Dev-pack brief
**status** SHIPPED — the work this brief proposed landed as M1–M2 (issues 008/024, Aug 2026)

*Part of the dev pack [v0.1.1__audio-transcribe-integration](README.md) — see the [pack README](README.md) for scope, ground truth and definition of done.*

---

## Scope Of This Pack

IN: importing the audio-transcribe engine into our site; the one-pass experience
(transcript → summary → infographic); progress + streaming reveal; cost display;
spend-capped key wiring; privacy-mode selector (routed tier working, restricted tier
UI + key-guardrail hook, browser-local tier stubbed honestly as "coming").

OUT (tracked elsewhere): iOS/Android wrappers ([issue 011](../../../issues/open/011-ios-android-targets.md)), key-provisioning Lambda,
credit purchase (Stripe), CRM ([issue 016](../../../issues/open/016-crm-on-vault-substrate.md)), Live/mic mode, TTS/Voice, Chat UI
(the engine supports them — we deliberately do not surface them in v1; the product
is one job in one pass).

## The Three Milestones

**M1 — Engine wired, end-to-end thin.**
Our page imports the engine from dev.tools.sgraph.ai, accepts a dropped file, runs
`transcribeItem`, renders the transcript with visible progress. Definition of done:
a real WhatsApp `.opus` from a laptop download transcribes on the GitHub Pages site
with a pasted key (BYOK), progress visible, errors readable.

**M2 — The one-pass pipeline.**
After the transcript: `ask()` produces the summary document (markdown, rendered);
the infographic step is wired to the existing infographic generator components and
runs only when the user asked for it. Results stream in arrival order — transcript
first, never held back for later stages. Export: copy + download markdown; save
infographic. Cost summary shown per pass.

**M3 — Modes and the seeded key.**
Privacy-mode selector with honest labelling; the seeded (deliberately leaked) beta key
wired via `setApiKey` + `setSpendCap`, with its written-down cap/lifetime/revocation;
restricted tier enforced by key guardrails once the account decisions land. BYOK stays
available as the fallback path.

Ship each milestone to dev (CI tags + publishes automatically). Do not batch.

## Decision Gates (who is blocking what)

| # | Decision | Owner | Blocks |
|---|----------|-------|--------|
| 1 | Personal vs organisation OpenRouter account | Dinis | M3 guardrails automation ([issue 014](../../../issues/open/014-openrouter-guardrails-exploration.md)) |
| 2 | Which models the app calls (the allowlist; engine default + fallbacks) | Dinis + Architect | M3 guardrails; M1 model default is safe to start with the engine's default |
| 3 | Seeded key parameters (cap, reset, lifetime, revocation trigger) | Dinis + AppSec | M3 key seeding ([issue 010](../../../issues/open/010-openrouter-key-flow-beta.md)) |
| 4 | Where the summary + infographic prompts live (our repo, versioned) | Architect | M2 |
| 5 | Domain/cert (Route 53) | Dinis | nothing technical — Pages URL works meanwhile |

Nothing gates M1. Start there.

## Task Decomposition For The Implementing Team

1. M1-a: import harness + `tool:ready` handshake on our page ([Dev brief](03__dev__implementation-brief.md) §2).
2. M1-b: drop-zone → `addFiles` → `transcribeItem` → transcript render ([Dev](03__dev__implementation-brief.md) §3).
3. M1-c: progress states + typed-error surfaces ([Designer](04__designer__experience-brief.md) §3, [Dev](03__dev__implementation-brief.md) §5).
4. M2-a: summary via `ask()` with a versioned prompt ([Dev](03__dev__implementation-brief.md) §4).
5. M2-b: infographic step behind the option toggle ([Dev](03__dev__implementation-brief.md) §4, [Architect](02__architect__integration-architecture.md) §5).
6. M2-c: exports + cost summary ([Dev](03__dev__implementation-brief.md) §4, §6).
7. M3-a: mode selector UI + honest copy ([Designer](04__designer__experience-brief.md) §4).
8. M3-b: seeded key + spend cap + kill-switch documentation ([Architect](02__architect__integration-architecture.md) §6).
9. Each task closes its issue in the same commit; reality updated per milestone.

## Working Rules Reminders

- This is Explorer-stage: ship thin, label honestly, capture everything.
- No feature that erodes the one-motion default path (the engine has many — resist).
- The 90-day clock started 1 August; M1 is worth more than M2+M3 planned.

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
