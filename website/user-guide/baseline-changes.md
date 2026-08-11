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

## 2026-08-11 11:08 UTC — run [#64](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/actions/runs/31485184982) · commit [`893039c`](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/commit/893039c9b14e8e01fbff99637092f6dd4161eda5) · base v0.1.23

| Shot | Taught at | What moved |
|---|---|---|
| `04-results` | one-pass/results | resized 820x1044 → 820x1088 |
| `08-flow-run` | one-pass/workflow | 9.34% of pixels (threshold 0.1%) |
| `07-chat-edited` | chat/edit-restore | resized 820x1072 → 820x1116 |

*Review question: does that movement match what this commit set out to change?*

---

## 2026-08-10 10:55 UTC — run [#55](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/actions/runs/31381130273) · commit [`e4ea8ee`](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/commit/e4ea8ee7f810a721eba4fa952248428ef3b65c69) · base v0.1.23

| Shot | Taught at | What moved |
|---|---|---|
| `01-app-start` | getting-started/arrival | 0.212% of pixels (threshold 0.1%) |

*Review question: does that movement match what this commit set out to change?*

---

## 2026-08-10 10:44 UTC — run [#54](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/actions/runs/31380373991) · commit [`fc03a82`](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/commit/fc03a82eef6b0bc9da4c47e0a4f96e5e9c700bc5) · base v0.1.23

| Shot | Taught at | What moved |
|---|---|---|
| `01-app-start` | getting-started/arrival | 16.464% of pixels (threshold 0.1%) |

*Review question: does that movement match what this commit set out to change?*

---

## 2026-08-08 17:41 UTC — run [#50](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/actions/runs/31270016868) · commit [`1089d5c`](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/commit/1089d5cd2cc3dfbe2d14b4017b98d58a17520afe) · base v0.1.23

| Shot | Taught at | What moved |
|---|---|---|
| `01-app-start` | getting-started/arrival | 0.26% of pixels (threshold 0.1%) |

*Review question: does that movement match what this commit set out to change?*

---

## 2026-08-08 16:13 UTC — run [#48](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/actions/runs/31266364039) · commit [`a2a8585`](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/commit/a2a85856fe0a0a8f01d21ab81fce9610b6ca3f1c) · base v0.1.23

| Shot | Taught at | What moved |
|---|---|---|
| `01-app-start` | getting-started/arrival | 27.638% of pixels (threshold 0.1%) |
| `02-key-saved` | getting-started/key | 8.743% of pixels (threshold 0.1%) |
| `03-options` | one-pass/options | 4.613% of pixels (threshold 0.1%) |
| `04-results` | one-pass/results | 1.133% of pixels (threshold 0.1%) |
| `07-chat-edited` | chat/edit-restore | 14.152% of pixels (threshold 0.1%) |

*Review question: does that movement match what this commit set out to change?*

---

## 2026-08-08 15:51 UTC — run [#47](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/actions/runs/31265356777) · commit [`d255b7b`](https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/commit/d255b7bd69486264a27b692082e069dfb28beae5) · base v0.1.23

| Shot | Taught at | What moved |
|---|---|---|
| `01-app-start` | getting-started/arrival | 2.404% of pixels (threshold 0.1%) |
| `02-key-saved` | getting-started/key | resized 820x149 → 820x148 |
| `03-options` | one-pass/options | resized 820x285 → 820x346 |
| `04-results` | one-pass/results | resized 820x911 → 820x1044 |
| `08-flow-run` | one-pass/workflow | 25.336% of pixels (threshold 0.1%) |
| `07-chat-edited` | chat/edit-restore | resized 820x939 → 820x1072 |

*Review question: does that movement match what this commit set out to change?*

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
