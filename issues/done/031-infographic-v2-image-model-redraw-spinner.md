---
created: 2026-08-05T21:40:00Z
source: Dinis — sample chips hid the infographic option; the infographic "worked but took ages and looked like it was stuck"; wanted redraw with model/prompt choice; and "why did we get an SVG instead of an infographic — gemini-3.1-flash-image-preview works really well"
priority: high
estimated_effort: medium
---

# Infographic v2: image model by default, redraw UX, progress heartbeat; samples keep their options

## What changed (all verified e2e with a real key)

1. **The "SVG instead of an infographic" answer**: it was the model. M2 used
   `google/gemini-3.5-flash`, a text model that can only *describe* a picture (SVG
   markup). The proven Infographic Generator tool uses
   **`google/gemini-3.1-flash-image-preview`**, an image model that returns a
   finished picture — now our default too, with the tool's own system prompt as the
   default `infographic-system` template. `sg-llm-request` v0.1.6 already accumulates
   streamed image deltas, so the request travels the same isolated LLM cell as
   everything else; the result renders as an `<img>` (~850 KB, publication quality).
2. **Model picker + redraw on the infographic card**: Gemini 3.1 Flash Image /
   Gemini 2.5 Flash Image / Gemini 3.5 Flash (drawn SVG), choice persisted; a
   `redraw` button regenerates just the infographic over the finished pass (new API
   action `redrawInfographic({model?, style?})`). A pass that skipped the
   infographic offers "draw infographic" afterwards. The system prompt is editable
   in the debug pane's Prompts tab (4th template, override wins on every path).
3. **Progress heartbeat**: an image takes 60–90s with nothing to stream, so the card
   now shows a spinner + live elapsed counter naming the model, and the debug pane
   (v0.1.1) ticks a live `⏳ Ns` on every in-flight call.
4. **Fixed: sample chips skipped the options screen** — they auto-ran the pass, so
   the infographic toggle was unreachable. A sample now loads into the same options
   screen as a dropped file.
5. Save button follows the format: `save .jpg/.png` for image results (extension
   from the data URL's actual MIME), `save .svg` for drawn ones.

Generation ids are now recovered from the SSE chunks for streamed calls, so the
debug pane's per-call "fetch openrouter generation record" works for infographics
too. Verified: full pass on the image model (spinner → image → save), then redraw
on the SVG model (svg → save .svg), 22 unit + 13 integration checks green.
