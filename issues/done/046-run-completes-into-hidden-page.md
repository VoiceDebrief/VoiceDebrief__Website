---
created: 2026-08-07T09:30:00Z
source: Dinis, live on the QA estate (screenshot): flow panel showed a completed run, the page showed the start screen; refresh + retry worked
priority: high
estimated_effort: small
---

# A finished run could be invisible: page reset did not stop the machine

Symptom (Dinis, 7 Aug, QA estate): the flow panel showed the workflow completed
(all steps DONE, spend recorded) while the main page sat on the start screen —
no results, no error. A refresh and a new run behaved normally.

## Diagnosis
The only paths that produce exactly that state ("do another voice note" and the
file-remove ✕) reset the page but did NOT cancel an in-flight pass. The run
continued headless: transcript/summary events landed in hidden sections, the
trace completed truthfully, and the user saw nothing. Supporting evidence in
the screenshot: the infographic step "done" in 11.0s at £0.000 on the image
model — a run whose page had been torn down mid-flight.

## Outcome 7 Aug 2026 — FIXED, two layers
- `resetToStart()` (both reset paths) now cancels an active pass first — the
  page and the machine can no longer disagree about whether a run is happening.
- Self-healing guard on `wa:pass:complete`: if results exist but both the
  results and error sections are hidden, the results are re-shown — a finished
  run the user paid for must never be invisible, whatever path led there.
