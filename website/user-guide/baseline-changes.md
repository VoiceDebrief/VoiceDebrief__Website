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

## 2026-08-08 15:02 UTC — run [#45](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/actions/runs/31263409054) · commit [`d457e00`](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/commit/d457e00141d409c78add83afbedf1604287cda42) · base v0.1.23

| Shot | Taught at | What moved |
|---|---|---|
| `01-app-start` | getting-started/arrival | 9.509% of pixels (threshold 0.1%) |
| `02-key-saved` | getting-started/key | resized 820x148 → 820x149 |
| `03-options` | one-pass/options | 2.459% of pixels (threshold 0.1%) |
| `04-results` | one-pass/results | resized 820x912 → 820x911 |
| `07-chat-edited` | chat/edit-restore | resized 820x940 → 820x939 |

*Review question: does that movement match what this commit set out to change?*

---

## 2026-08-08 14:21 UTC — run [#37](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/actions/runs/31261694414) · commit [`fae2845`](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/commit/fae28451fb1639dbfd9d3f2059ba7790e028ec02) · base v0.1.23

| Shot | Taught at | What moved |
|---|---|---|
| `01-app-start` | getting-started/arrival | 0.148% of pixels (threshold 0.1%) |

*Review question: does that movement match what this commit set out to change?*

---

## 2026-08-08 13:50 UTC — run [#35](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/actions/runs/31260439726) · commit [`fe5dc98`](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/commit/fe5dc98fb54e764a36c3b719a1aa2c4506cf1fcd) · base v0.1.23

| Shot | Taught at | What moved |
|---|---|---|
| `01-app-start` | getting-started/arrival | 14.857% of pixels (threshold 0.1%) |
| `02-key-saved` | getting-started/key | 2.736% of pixels (threshold 0.1%) |
| `03-options` | one-pass/options | 2.15% of pixels (threshold 0.1%) |
| `04-results` | one-pass/results | 0.401% of pixels (threshold 0.1%) |
| `07-chat-edited` | chat/edit-restore | resized 820x939 → 820x940 |

*Review question: does that movement match what this commit set out to change?*

---

*Nothing has moved yet — every committed screenshot still matches its baseline.*
