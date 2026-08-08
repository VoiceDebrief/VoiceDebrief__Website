# Screenshot baseline changes

*Part of the [user guide](https://whatsapp-voice-transcription.sgraph.ai/user-guide/) —
the record of every time the product's pictures moved.*

Written by CI (`scripts/record_baseline_changes.py`) on each `qa` push whose
QA-to-docs journeys produced a different picture from the committed baseline.

**A change here is not a failure.** The UI is expected to move; what matters is
whether it moved *where the work was supposed to move it*. That question is for a
reviewing agent, not for a pixel threshold — which is why CI records rather than
blocks. Each entry names the commit that caused the change, so the diff that
explains it is one click away, and the previous pixels are in git history.

Newest first.

---

*Nothing has moved yet — every committed screenshot still matches its baseline.*
