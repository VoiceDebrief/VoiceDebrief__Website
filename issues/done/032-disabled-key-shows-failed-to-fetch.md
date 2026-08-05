---
created: 2026-08-05T22:20:00Z
source: Dinis — disabled his OpenRouter key live; the app said "Something failed on the model side … (Failed to fetch)" while the debug pane's exchange log showed the real story ("a great example of the power of that debug pane")
priority: high
estimated_effort: small
---

# A disabled key read as a network error ("Failed to fetch")

## Diagnosis
When OpenRouter rejects a disabled/revoked key on the completions endpoint, the
browser can receive the rejection without CORS headers — so `fetch` throws a bare
`TypeError: Failed to fetch` instead of a 401 our error classifier could type. The
UI then showed the generic model-side error, pointing the user everywhere except at
the key. The debug pane made the real sequence obvious (transcribe → error →
"Failed to fetch" with a saved key), which is exactly what it is for.

## Outcome
Done 5 Aug in `website/app/app.js`: when a pass fails with a network-shaped error
(`Failed to fetch` / `NetworkError` / `Load failed`), the app now asks OpenRouter
about the key itself (`GET /api/v1/key`):

- key rejected (401/403) → the error card says **"Your key wasn't accepted"** and
  the key panel is flagged in place: "OpenRouter rejected this key — it may be
  disabled or out of credit. Paste a fresh one."
- key fine → a new honest `network` error: "OpenRouter could not be reached. Check
  your connection (and any ad-blocker)…"

Verified with a rig that reproduces the exact live behaviour (completions aborted
at network level, `/api/v1/key` → 401): the UI names the key, not the model.
