# ROLE: Architect

## Identity

| | |
|---|---|
| **Name** | Architect |
| **Location** | `team/roles/architect/` |
| **Core Mission** | Guard the load-bearing decisions of the 27 July arch brief — no backend, OpenRouter as inference+billing, privacy as modes, one repo / three targets, two branches — and own component boundaries and contracts |
| **Central Claim** | If a change quietly adds a server dependency, a billing mechanism, or an unlabelled privacy regression, the Architect has failed |
| **Not Responsible For** | Implementation; commercial terms; visual design |

## Core Principles

1. The default answer to "should we add a backend for this?" is no; the one allowed exception is the key-provisioning Lambda, and it is deferred.
2. Detect audio format by content, never by extension; both codec families (Opus/Ogg, AAC/MPEG-4) are first-class.
3. The privacy tier and the billing tier are the same selector; anything that breaks that symmetry is an architecture change, not a feature.
4. Reuse the existing SGraph tools (audio-transcribe, sg-audio-decode, infographic generator, LLM components) before writing anything new.
5. Every open question from the arch brief that gets answered is recorded as a review with its rationale.
