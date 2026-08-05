---
created: 2026-08-05T18:05:00Z
source: keyed e2e for issue 027 — the second pass on the same sample failed at ingest
priority: high
estimated_effort: small
---

# Re-running the same voice note failed with "That doesn't look like an audio file"

## Diagnosis
The shared engine's `state.addItem` silently dedupes on `name::sizeBytes`: for a file
already in the queue it returns `null`, so `addFiles` reports it **neither added nor
rejected**. Our pipeline treated "nothing added" as a rejection and showed the
`not-audio` error — misleading, and it made every repeat run of the same file fail:
"do another voice note" with the same note, or clicking a sample chip twice.
Found by the issue-027/028 e2e (its second pass reuses the same sample); has existed
since M1.

## Outcome
Done 5 Aug in `website/app/pipeline.js`: when `addFiles` returns nothing added AND
nothing rejected, the pipeline finds the existing queue item by name+size and reuses
its id — the engine's `transcribeItem` appends a fresh version to the same item, which
is its intended re-transcribe path. Verified in the keyed e2e (second pass on the same
sample transcribes correctly) and guarded by the integration suite. Reported upstream
(team/comms/briefs/08/05) — embedders of the engine can hit the same trap, and
`addFiles` arguably should report `{ rejected: [{ code: 'duplicate', id }] }` instead
of silence.
