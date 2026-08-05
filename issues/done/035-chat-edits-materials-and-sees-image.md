---
created: 2026-08-06T00:30:00Z
source: Dinis — a developer brief WRITTEN FROM INSIDE THE CHAT SESSION ITSELF (update_transcript/update_summary), plus two live findings; the assistant honestly reported it could not see the infographic image, and the suggestion chips wasted space mid-conversation
priority: high
estimated_effort: medium
---

# The chat can now edit the materials and SEE the infographic; suggestions tidy up

## 1. Write access for transcript and summary (the in-chat brief, implemented)
- `updateMaterial` / `restoreMaterial` API actions on the pipeline: overwrite the
  transcript or summary shown on the page, keeping the ORIGINAL the first time so an
  unsatisfactory edit is always reversible.
- Chat tools `update_transcript`, `update_summary`, `restore_original` (new tier:
  *changes materials*) delegate to them; the cards re-render immediately and an
  "✎ edited by the assistant · restore the original" note appears under the card.
- Covered by the scripted CI loop: "Translate the summary into Spanish" → tool call →
  the page shows the Spanish text → restore returns the original and hides the note.

## 2. The model can see the infographic (important workflow)
Two routes, both multimodal `image_url` parts on the same LLM cell:
- **Context row**: "The infographic image" appears in the composer once a finished
  image exists (off by default, size shown) — tick it and the picture travels with
  the question.
- **Tool**: `view_infographic` — the tool result carries the image itself, so
  "describe my infographic" works mid-conversation; the thread marks the row with
  "🖼 image attached". For SVG infographics the tool returns the source head instead.

## 3. Suggestion chips only on a blank thread (`wa-chat-panel` v0.1.1)
They were eating screen space after the conversation started; now they disappear with
the first message and return on "new chat".

Registry is now 13 tools. Issue 034 closed alongside — Dinis validated the chat live
("it worked perfectly"), including having it author this very brief.
