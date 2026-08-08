# Handoff: three themes for the core transcription flow

Repo: `sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription`, branch `dev`.
Destination: `website/design/studio/`, `website/design/console/`, `website/design/card/`.

**Scope is deliberately narrow.** These three cover the *core UX only*:

> drop a voice note (or run a free demo) → consent to routed mode → key → run → transcript + summary

Chat, flow and debug panes are **out of scope** here on purpose. Do not add them, and
do not port the edge-tab pattern into these pages. Infographic is also out of scope —
these run `runPass({infographic: false})`.

They are a **theme and layout A/B**, distinct from the earlier structural A/B
(Thread / Proof / Steps). Every one of these three runs the *same* flow; what differs
is the visual system and how the user is told what is happening and what comes next.
None of them uses the live site's navy `#0b1f3a` or WhatsApp green `#25d366` — that is
the point, so the test measures theme rather than familiarity.

| Theme | Slug | Look | How it guides the user |
|---|---|---|---|
| 1 — Studio | `studio` | Warm cream, Georgia serif, terracotta | Roman-numeral crumb line in the header + a plain-English "next:" line under every action |
| 2 — Console | `console` | Near-black, monospace, teal + amber | Persistent left rail showing all five pipeline steps with `[ok]` / `[now]` / `[  ]`, plus a live spend meter |
| 3 — Card | `card` | Light violet, rounded cards, phone-app posture | Four-pill stepper at the top + one sticky bottom button that is always the only next action |

---

## About the design files

`prototypes/*.dc.html` are **design references written as single-file HTML
prototypes**, not production code. Each opens directly in a browser and is fully
interactive — real drag-and-drop, real file picker, real state machine.

Recreate them in the repo's fixed environment:

- **Vanilla JS + Web Components. No SPA framework, no build step.**
- Immutable versioned asset paths: `website/components/<name>/v0/v0.1/v0.1.0/`.
- **Strict CSP**: no external scripts, no CDN fonts, no remote images. The prototypes
  already comply — fonts are `Georgia` (web-safe), `system-ui` and `ui-monospace`
  only, and there are no remote assets of any kind.
- Static hosting, no backend.

Reading the format: markup inside `<x-dc>…</x-dc>` is the template,
`class Component extends DCLogic` is the logic. `{{ name }}` is a value returned from
`renderVals()`, `<sc-for list>` is a repeat, `<sc-if value>` is a conditional. All map
to ordinary DOM. Styling is inline in the prototypes for streaming reasons; in the
repo it should become shadow-DOM stylesheets per component. Every value used is in the
token tables below.

**Fidelity: high.** Colours, type, spacing, radii, copy and interaction states are
final. The transcript and summary bodies are fixture text — the real ones come from
the pass.

---

## The engine seam

All three talk to the engine through `prototypes/tool-adapter.js`. **Keep this seam.**
It is why these are demoable with no key and still the same code path when one exists.

```
isLive()                    → !!(window.__tool && localStorage['sg-openrouter-mgmt-key'])
runPass({file, infographic, onStage, variant})
getKey / saveKey / clearKey
bump(event, variant) / sessionLog()
gbp(usd)                    → '£x.xx'   (USD_TO_GBP = 0.79, per website/app/config.js)
```

Live mode maps to `window.__tool.runPass({file, infographic})` and its `wa:*` events
(`wa:ingested`, `wa:transcript`, `wa:summary`, `wa:pass:complete`).

`onStage(stage, payload)` normalises both modes to one vocabulary:

```
ingest → transcribe → chunk(partialString) → transcript → summarise → summary → complete
```

`chunk` only exists in fixture mode today. **All three themes are built around
watching words arrive** — Studio's live paragraph, Console's `OUTPUT — LIVE` panel,
Card's streaming card. Without a real partial-transcript event they degrade to a
spinner and lose their best moment.

> **Engine request — streaming transcript.** A partial-transcript event during
> `transcribe`, or a token stream on `runPass`. This is the single highest-value
> engine change for all three themes.

Note on the fixture streamer: it is driven by a `setTimeout` tick that computes
progress from **elapsed time**, with a hard deadline that emits the full string and
resolves. Do not "improve" it to `requestAnimationFrame` — rAF is paused outright in a
hidden tab and the pass then never completes.

---

## Shared flow and state

State machine, identical in all three:

```
idle ──drop/browse──▶ privacy ──agree──▶ key ──save──▶ running ──▶ done ──▶ idle
  └──run demo───────────────────────────────────────▶ running (no key, no consent)
```

- `key` is **skipped** when `getKey()` already returns a key, or in demo mode.
- `reset()` must clear the demo flag as well as the materials — otherwise a real file
  dropped after a demo skips the key screen and the cost line lies about a run that
  charged nothing. (This was a real bug caught in review; keep the guard.)
- The demo path shows `£0.000 — cached, nothing was called` and must stay honestly
  labelled as a demo in every theme.

State per theme: `phase`, `source` (`own|demo`), `demo`, `fileName`, `stages[]` (or
`done{}` in Console), `transcript`, `summary`, `keyDraft`, `copied`, `over`
(drag-over), `phone`.

### The drop zone — the thing all three lead with

Common behaviour, styled differently per theme:

- The whole box is the click target (`onClick` → hidden `<input type="file">`).
- `onDragOver` **must** `preventDefault()`; `onDragLeave` and `onDrop` clear the state.
- `accept=".opus,.ogg,.m4a,audio/*"`.
- Drag-over changes border colour, background and the headline copy — the change is
  substantial, not a subtle tint, so it reads as "yes, let go".
- Directly beneath it, a **free demo button** that needs no key at all. This is the
  second most important element on the idle screen and should never be a text link.
- A line stating the file stays on the device until the user confirms.

### Privacy and cost — same content, three treatments

Every theme states, adjacent to the button that acts on it: what routed mode means
(a third-party provider processes the recording, we can't promise which), that we
store nothing, that the key never leaves the browser, the **expected cost £0.014**,
the **ceiling £0.055**, and who is billed. Never a footer, never quieter than this.

*(Those figures are hardcoded from `standard.json` budgets — transcribe £0.05 /
summarise £0.02 ceilings converted at 0.79. A real per-step quote from
`getWorkflow({options})` would be better.)*

### Telemetry — local-only (option a)

`bump(event, variant)` appends to `localStorage['wa-design-session-log']`. **Nothing
is sent anywhere.** Events: `arrival`, `note:chosen`, `demo:run`, `routed:accepted`,
`key:saved`, `pass:started`, `pass:complete`. Do not add beacon hooks to the flow; if
the decision later moves to option (b), these are the right coarse events to attach to.

### Responsive

Each prototype has a phone/desktop toggle in the header that constrains the shell —
same page, not a mockup, so the phone claim can be checked. In the port this becomes
media queries; the 390px rendering is the spec for the narrow breakpoint.

---

## Theme 1 — Studio

**File:** `prototypes/Theme 1 - Studio.dc.html` · **Feel:** printed, calm, unhurried.

```
bg              #f6f1e7   warm cream
surface         #fffdf8   raised (drop zone, cards)
ink             #211d18   headings, body
ink-soft        #4a4238   running transcript
muted           #6f6558   secondary copy
muted-2         #9a8f7e   meta, mono details
muted-3         #c4bbab   pending step numbers
line            #e4dbca   hairlines
line-2          #ddd3c2   inputs, panels
drop-line       #c9bda8   drop zone at rest
accent          #b6543a   terracotta — current step, primary button, links
accent-dark     #8f3d27   hover
accent-wash     #f3e3db   drag-over background
```

Type: **Georgia, 'Times New Roman', serif** for h1, drop-zone headline, step labels,
cost figures and the transcript body. `system-ui` for UI and secondary copy.
`ui-monospace` for file details and cost lines. Radius **3px** throughout — sharp,
editorial. No shadows anywhere; separation is done with hairlines only.

**Layout.** Single 760px column (390px phone), sticky header carrying the crumb line.
Drop zone is a 2px dashed rectangle with 64px vertical padding. Below it, the demo
button sits between two hairlines with "haven't got one to hand?" — a deliberate
editorial aside.

**Guidance mechanism.** Header crumbs `I the note · II what it costs · III the words`;
current item in ink with a terracotta numeral, past items muted, future items faint.
Every primary action has a `next:` line under it in plain words ("next: about ten
seconds of listening, then the words"). Running screen is a numbered serif list where
the active line pulses.

**Done screen.** Transcript at Georgia 1.1rem / 1.85 line-height under a rule; summary
below; cost line and "Another voice note" on a hairline footer.

---

## Theme 2 — Console

**File:** `prototypes/Theme 2 - Console.dc.html` · **Feel:** a tool that shows its work.

```
bg              #0e1113   page
panel           #161a1d   rail rows, headers, inputs
panel-2         #12171a   output panels, drop zone
line            #262c31   borders
line-2          #2f373d   inputs, buttons
text            #dfe6e9   body
text-bright     #ffffff   headings, current step
text-soft       #cfe9e3   transcript body
muted           #8a969d   secondary
muted-2         #4d585f   labels, meta
muted-3         #39434a   pending markers
teal            #35d0ba   done, spend, primary button, links
teal-hi         #7ee8d8   hover
teal-wash       rgba(53,208,186,.08)
amber           #f0b429   "waiting on you", current step, consent notice
amber-edge      #4a3a12   consent panel border
amber-wash      rgba(240,180,41,.07)
```

Type: **monospace throughout** (`ui-monospace, SFMono-Regular, Menlo, Consolas`).
Radius 4–8px. Primary button teal on `#062b26`.

**Layout.** `278px 1fr` grid (single column at phone width). Left rail is **sticky**
and always visible.

**Guidance mechanism — the rail is the whole idea.** Five rows: `voice note`,
`consent`, `key`, `transcribe`, `summarise`. Each carries a marker — `[ok]` teal,
`[now]` amber with an amber left edge and wash, `[  ]` dim — plus a right-aligned note
(`loaded`, `skipped`, `£0.011`). Below it a **spend meter**: figure, `/ ceiling`, a
5px progress bar and a one-line explanation. The main column's status tag reinforces
it: `READY — NOTHING SENT`, `WAITING ON YOU — STEP 2 OF 5`, `RUNNING — NOTHING TO DO`,
`COMPLETE`. Every action button has a `next → …` line beneath.

**Running.** An `OUTPUT — LIVE` panel with a blinking teal `█` cursor.

---

## Theme 3 — Card

**File:** `prototypes/Theme 3 - Card.dc.html` · **Feel:** a phone app, on any screen.

```
bg              #f5f4fc   page
surface         #ffffff   cards
surface-2       #faf9ff   input fill
ink             #201c2e   text, and the summary card's background
ink-soft        #3b3550   running transcript
muted           #6d6784   secondary copy
muted-2         #9a94b0   meta
muted-3         #b3aecb   pending
violet          #6a4df4   primary, stepper, labels, links
violet-dark     #583ce0   hover
violet-soft     #ece8ff   secondary buttons, chips, icon tiles
violet-soft-2   #ded7ff   hover / drag-over ring
violet-tint     #f2effe   drop ring at rest
violet-light    #b9adff   label on the dark summary card
success         #12a37f   completed step dot
warn-bg         #fff8ec   consent card
warn-ink        #b8781a   consent label
warn-body       #4a3d22   consent body
divider         #e3e0f2   stepper track
shadow          0 4px 16px rgba(60,40,140,.06) · 0 6px 24px rgba(60,40,140,.07)
                primary button: 0 6px 18px rgba(106,77,244,.28)
```

Type: `system-ui` throughout, weights 700–800 for headings. Radius **18–26px** on
cards, **999px** on pills. 560px column (390px phone).

**Guidance mechanism.** A four-pill stepper across the top (`Note`, `OK to send`,
`Working`, `Done`) — 5px bars plus labels, filled violet up to the current step. Then
a **sticky bottom button** that is always the single next action, with a helper line
under it ("Next: your key, then about ten seconds"). Copy is the warmest of the three
("Happy for it to be heard?", "Pop your key in").

**Drop zone.** White card, 2px dashed violet-soft border, containing a **120px
circular target** with a `♪` glyph; on drag-over the ring animates outward
(`cd-ring`, 1s ease-out infinite), the glyph becomes `↓` and the headline becomes
"Drop it!". Below the card, the free demo as a full-width violet-soft button.

**Done screen.** White transcript card, then the summary on a **dark `#201c2e` card**
labelled `THE SHORT VERSION` — the one strong inversion in the design, so the useful
part is what your eye lands on.

---

## Animations

```
Studio    st-in     .3s ease           section enter
          st-pulse  1.4s infinite      active step (opacity .4↔1)
Console   cn-blink  1s infinite        output cursor
Card      cd-in     .3s ease           section enter
          cd-pulse  1.2s infinite      active step dot
          cd-ring   1s ease-out inf.   drag-over ring, scale(1)→scale(1.35) fade
```

No libraries, no external assets.

---

## What is not designed yet

- **Error states.** `wa:summary:error` degrades (transcript stands) — that path needs
  a pass per theme before these go live. Flagging rather than guessing.
- **The site nav.** All three drop the ten-item nav entirely. That is a decision, not
  an oversight, but it is one to make deliberately rather than inherit.
- **Second-run behaviour.** All three return to an empty idle screen. Whether a
  returning user with a saved key should land somewhere different is untested.

## What to measure

Headline, as agreed: **arrivals that reach a completed transcript.** These three
differ mainly in how clearly the next step reads, so the useful secondary measures are
drop-off at the consent screen, and how many take the free demo before their own note.

---

## Files

```
prototypes/Theme 1 - Studio.dc.html
prototypes/Theme 2 - Console.dc.html
prototypes/Theme 3 - Card.dc.html
prototypes/tool-adapter.js          engine seam + fixtures + local telemetry
```

Open any of them directly in a browser. With no key saved they run scripted fixtures
at realistic speed; save a real OpenRouter key and the same code path calls
`__tool.runPass` instead.

Grounded in: `website/app/skills/SKILL__api.md`, `website/app/workflows/standard.json`,
`website/app/config.js`, `website/app/app.css`, and the eight user-guide screenshots.
