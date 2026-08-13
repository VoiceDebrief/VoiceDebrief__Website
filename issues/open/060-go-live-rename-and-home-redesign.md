# 060 — Go-live: rename to VoiceDebrief, home redesign, and telling the truth

**Status** open · **Opened** 2026-08-08 · **From** Dinis

## Why

We are going live. Three things have to land together: the product becomes
**VoiceDebrief** at **VoiceDebrief.ai**, the main workflow moves onto the home page, and
the site stops describing a product we do not have.

> **Name change, 12 Aug (Dinis).** The product is **VoiceDebrief**, plain — not
> "VoiceDebrief for WhatsApp". WhatsApp is one of several ways audio arrives here, not
> the product. Everything below is written against that.

## Done (8 Aug)

- **Design brief written** — `library/briefs/go-live/v0.1.23__design-brief__home-page-redesign-for-go-live.md`,
  for Claude Design. Covers all five requirements, the non-negotiable constraints
  (no backend, no SPA, tokens only, strict CSP, four cultures, phone-first, a11y),
  and asks for a list of every untrue claim on the current site.
- **The App link is no longer blue** — `wa-site-nav` v0.1.6. Wrapping it in
  `.i18n-link` for the locale flag (v0.1.3) took it out of `nav.main > a`, so it fell
  back to the browser default link colour on navy. Browser test compares computed
  colours; proven to fail with the selector reverted.

## Done (12 Aug) — the claims audit worked end to end

Claude Design returned `design_handoff_homepage`, whose `06-claims-audit.md` lists
thirteen untrue claims. All thirteen are addressed.

- [x] **The three privacy chips are gone** — app page. Two of the three never existed and
      shipped disabled with an asterisk, and a privacy *selector* implies a control we do
      not have. What replaces them is `core.routingHonest`: a statement, placed where a
      file could still leave the device, and deliberately **not** styled as a warning —
      framing integrity as a hazard invites the reader to dismiss it.
- [x] **The LLM caveat** — `core.modelCaveat`, revealed *with* the transcript on
      `wa:transcript`, never before the thing it qualifies exists.
- [x] **The privacy-modes section and its table are gone** from the home page, replaced
      by `#privacy` "Where your audio goes", which says plainly that we do not know which
      provider handles a recording.
- [x] **The pricing claims are gone** — `#pricing` is now "What it costs": no plan, no
      credit, no card, we add no margin, and we do not set the price.
- [x] **The hero, the pipeline diagram and the cards** name the four real artefacts
      (transcript / translation / debrief / infographic). There is no "analysis" step.
      "and it works every time", "in seconds", "browser or app", "your files and your
      credits stay with you" and "Made for WhatsApp audio" are all gone.
- [x] **A six-source "Getting the audio" section** with the Meta non-affiliation line.
- [x] **The OpenRouter key guide page** — `/openrouter-key/`: why bring-your-own-key, five
      numbered steps with *set a spend limit* called out as the one that matters,
      checking/capping/revoking, a never-paste-it-elsewhere warning, and the three
      failures people actually hit. Linked from the key panel itself, the nav, the hero
      badge, the pricing section, the footer, `llms.txt` and the sitemap.
- [x] **BETA is persistent chrome** — `wa-site-nav` v0.1.8 defaults the badge on; a page
      may change the word, never omit the fact. The hero's "BETA — LIVE NOW" pill is gone:
      a beta mark made of hero copy scrolls away, and "LIVE NOW" is marketing register
      that `en-gb/culture.json` rules out.
- [x] **The rename** — VoiceDebrief everywhere the site serves. The only survivors are
      frozen component versions (IFD: published paths are immutable), and no page loads
      them.
- [x] **The key is asked for at run time, not on arrival** (build-order task 5). A
      stranger can load a file, set both options and read the quoted maximum without ever
      meeting a password field; pressing Transcribe asks for the key and the pass resumes
      by itself once it is saved. Gated in `app-boot.test.mjs` on the *computed* display
      of `#key-section`, not on its `hidden` attribute — that attribute has lied here
      before.

## Still to build

- [ ] **One `core.productName` key.** The name is currently spelled out in `core.title`
      and hardcoded in the nav component. It should be one key, recorded in the concept
      scheme with a scope note saying *not translated*.
- [ ] **Decide `summary` → `debrief`** in the interface, now the product is named after
      the word. Four languages; the concept scheme flags it and the drift gate will force
      the concept to be revisited with the strings.

## Deliberately NOT done

- **"Language picker to text labels, no flags"** (audit item 6, build-order task 2).
  Rejected: this product's locale *is* a culture, not a language — en-GB/en-US and
  pt-PT/pt-BR differ by country, and a flag is the accurate signifier for exactly that
  distinction. The general rule ("flags are not languages") is right about products that
  select a language; it is wrong about one that selects a culture. Dinis approved the
  current picker on 10 Aug.
- **A blind `--wa-*` → `--vd-*` rename** (build-order task 1's literal instruction).
  Renaming the tokens *inside* every component would mean a new immutable version of each
  one for no behaviour change, and the frozen versions could never be renamed at all. What
  shipped instead achieves the same end from the other side: the new names are the source,
  and the old names are **derived from them** in `vd-tokens.css`. Every component repaints
  without being touched, and layer B can be deleted in one edit when the last `--wa-*`
  reader is retired. See "12 Aug — M1" below.

## Dependencies and notes

- `WhatsApp` is Meta's trademark — usable descriptively, cannot lead the name. The
  non-affiliation line is on the home page.
- Depends on issue 057 (the concept scheme) for the `summary`/`debrief` decision. The
  privacy-mode scheme was *removed* from `concepts.json` as part of this work: the pass
  had marked two of its chips `decide`, and the sign-off deleted the control rather than
  relabelling it. `_resolved` in the file records why.

## 12 Aug — the domain cut over, and 39 files were still naming the old one

`voicedebrief.ai` and `qa.voicedebrief.ai` are live and serving. The old hosts
(`whatsapp-voice-transcription.sgraph.ai` and its `qa.` sibling) have **no DNS at
all** — not a redirect, not a 404: nothing resolves. That turned every absolute
URL naming them into a dead link, and the rename pass had swept the brand but not
the address.

Swept across the **published surface**, its generators and its gates:

- every `<link rel="canonical">`, `og:url` and JSON-LD `url` on every page;
- **`llms.txt`** — the file the CLAUDE.md discipline requires to resolve on the
  deployed estates, and which was pointing every agent at a host with no DNS;
- **`sitemap.xml` and `robots.txt`** (the `Sitemap:` line, and the crawler note);
- **the RSS feed's per-post `<link>`s and `<channel><link>`** — generated by
  `build_content.py`, so a reader following any of the 24 posts got nothing;
- the generators themselves (`build_content.py`, `build_locale_pages.py`'s `PROD`
  used for `hreflang` alternates, `record_baseline_changes.py`), the three page
  templates, `updates.json`, and the skills docs an agent reads;
- `live-site-check.mjs`'s default `LIVE_URL` — the post-deploy gate was pointed at
  a host that cannot answer;
- the operating documents that state it as fact: `.claude/CLAUDE.md`, `README.md`,
  the reality doc, `team/README.md`, the Journalist's ROUTINE.

**Deliberately not swept:** the dated record — `library/`, `team/` reviews,
debriefs and comms, `issues/done/`, `CHANGELOG.md`. Those describe what was true
on the day they were written; rewriting them is not a link fix. The one exception
is the 29 July Updates post, which is a *live page* — a URL there is an address
for a page that still exists, so it now points at where that page actually is.


## 12 Aug — M1 of the design: the colour system actually landed

Dinis asked for the visual design to ship, in the order proposed: tokens, then the home
page, then the workflow panel. This is the first.

**`website/vd-tokens.css` is now the only place a colour is written on this site**, and
that is enforced rather than asserted. It holds the design pack's five schemes
(Signal/Night/Paper/Blueprint/Ember) and derives from them both the 46 `--wa-*` names the
shipped components read and the twelve `--navy`/`--ink`/… names each static page used to
carry its own copy of. One file, linked from all 34 pages, repaints the whole site —
including through eight shadow roots, because custom properties cross the shadow
boundary. `themes/default.css` is gone: a scheme is one attribute on `<html>`, not
another sheet.

Two things were added that the pack does not have, both named as ours in the file: a
**chrome group** (`--vd-k*`), because the design has no dark chrome at all while the app
and the engine room still do, and mapping those onto ink would invert them the moment a
dark scheme was selected; and `--vd-scrim`.

`check_themes.py` now has four rules, and every one of them is broken on purpose in
`tests/unit/i18n.test.mjs` — a gate nobody has watched fail is a gate nobody knows the
shape of. Writing those tests found **two real holes in the gate itself**:

1. its CSS parser required a trailing semicolon, so a scheme whose last declaration
   omitted one was skipped silently — it reported "themes ok" about a block it had not
   read;
2. rule 4 tested whether the string `vd-tokens.css` appeared in a page, which a *comment*
   satisfies. The home page shipped un-themed while the rule reported it linked. It now
   matches the `<link>` element. Same lesson as the locale panel and the summary prompt
   before it: assert the thing the browser acts on, never the text that was supposed to
   cause it.

`wa-site-nav` v0.1.9 is colour only — ten literal `rgba()` overlays became token reads, so
the one component on every page stops being the exception. `m1-spike-test.html`, a public
leftover from the very first spike, is deleted.

**Verified by measurement, not by looking:** `data-vd-theme` set on `<html>` changes the
computed background *inside the nav's shadow root*, and all five schemes resolve to five
distinct values. The qa-to-docs run moved all seven screenshots by 0.2–3.5% of pixels with
**no geometry change on any of them** — which is the signature of a palette moving under an
untouched layout, and the evidence that this step changed colour and nothing else.

**Deliberately still true after M1:** the site has its old *shape*. The header is still
dark, the home page is still the previous layout. That is M2.


## 12 Aug — M2 of the design: the home page is the design's home page

The layout, not just the palette. `website/index.html` is rebuilt on the pack's
structure and its copy deck: the 0.86/1.14 hero grid with the panel beside the headline
(and **first** under 1000px — the recording is the point, the explanation is second), the
one-recording → four-artefacts diagram, six source cards with the trademark line, the
two-surfaces section, three cost rows, and a light footer. There is not one hex in the
file.

**`wa-site-nav` v0.1.10 is the design's header**, which means every page gets it: page
colour, one hairline, no navy bar. The wordmark is type only — **Voice** in ink,
**Debrief** in the accent — so there is no image to go stale and it survives all five
schemes. The green dot is gone with the navy: on a white bar it read as a service status
light, which is a claim we were not making. This is also the first component to read
`--vd-*` directly rather than through the bridge, and the gate noticed immediately —
`--wa-navy-hover` and `--vd-kh` lost their last reader and were removed. Layer B is
already shrinking, which was the point of building it that way.

**Workbench** (design decision 9) is now the name of the `/app/` surface, in the menu and
on the home page. "Advanced" describes the user and implies this page is Basic; Workbench
names a place you go to work a recording. **The URL does not move** — renaming a
published address breaks links for no gain, and the address is not the name.

### The dead link that returns 200

Rewriting the sections from `#how`/`#privacy`/`#pricing` to `#sources`/`#workbench`/`#cost`
broke four published anchors — three in the shipped nav and one on the key guide. Nothing
would have caught it: `/#privacy` fetches the home page and reports **200** whether or not
anything on it carries that id, so the live-QA link check passes and the reader just
assumes they misread the menu.

Two of those anchors are older than the redesign and are published elsewhere, so they are
kept alive on the sections that now do the job rather than dropped. `tests/unit/home-anchors.test.mjs`
is the gate: every `/#…` the nav names must exist on the home page, and every same-page
anchor **any** page writes must exist on the page it points at. Proven to fail by pointing
the nav at an id that is not there.

The live-QA marker for `/` was `Voice`, which matched the old page and the new one alike —
it proved the page answered, not that the page shipped. It is now `Getting the audio`.

**Left for M3:** the panel is the design's frame, its state header and its welded routing
statement, but the body is an honest entry point rather than a mock of a workflow that
would not run — the button goes to the surface that does. `vd-workflow` replaces the
contents, not the frame.


## 12 Aug — M3: the workflow runs on the home page

The original brief's first requirement, and the last of the three the design was split
into. `<vd-workflow>` owns the `empty → ready → key → running → results` machine from
`04-states.md`; `website/home.js` owns the engine and drives it with **the app's own
modules** — `bootEngine()`, `createPipeline()`, the declared workflow, the demo path. A
pass on the home page is not a second implementation of the pass, and the integration
test asserts that by matching the trace: `normalise → ingest → transcribe → classify →
translate(skipped) → summary`.

The three rules the design says must never be traded away are asserted **by measurement**,
not from markup:

- **No key before run.** A stranger loads a recording, sets both options and reads the
  quoted maximum with no password field anywhere on the page; pressing run is what asks.
  Checked on the panel's state *and* on whether the field is painted.
- **The routing statement is welded to the panel** — asserted to be inside the panel's
  bounding box, above the fold at 1100×1000, at ≥14px, and **not** wearing the caveat's
  amber. The last one matters: framing integrity as a hazard invites the reader to
  dismiss it.
- **The caveat replaces it in results**, never before a transcript exists.

### Two things the first run of the panel got wrong

1. **The declaration 404'd from `/`.** `pipeline.js` fetched `./workflows/standard.json`
   *relative to the page* — fine while the only page that ran a pass lived at `/app/` and
   was pinned there with `<base href>`, and dead the moment the home page ran the same
   pipeline from the root. The prompts had the same shape and would have failed a step
   later. They now resolve against `import.meta.url`, so they follow the code that reads
   them wherever it is imported from, and no longer depend on `<base>` at all.
2. **A scripted result shipped with no DEMO stamp.** The workbench stamps every demo
   artefact; the new panel did not, so a scripted debrief about a fictional company could
   have been read as the visitor's own recording — the one thing this feature must never
   do. The stamp is now at the top of the panel, above the artefacts, and the test drives
   it **through the button a person presses** rather than through `runPass({demo:true})`,
   because calling the API behind it would have tested everything except the stamp.

Also fixed on the way: the debrief and transcript are markdown, and the first version
rendered them as source — `## Key points` and `**Nakamura contract:**` on the product's
front page. The panel renders a deliberately tiny grammar (headings, lists, bold, code),
escaping first, because the text came back from a model and is never trusted as markup.

`/#privacy` now rides on the `<vd-workflow>` element rather than on the statement inside
it: the block lives in a shadow root, and a fragment anchor cannot address anything in
there. Scrolling to the panel lands the reader on it, which is what that published link
has always meant.

`check_themes.py` gained one more thing it was not looking at: a page can reach a
component through its own **module**, not only by naming the path in its markup. The home
page loads `/home.js`, which imports `vd-workflow` — invisible to the walk until it
followed module entry points. Third time this gate has been widened, same lesson each
time.


## 13 Aug — the running state could not tell the truth, and had no way out

From QA, with a screenshot: *"looks like it hanged in that step"*, and *"we need to show
the user what has been done on each phase … at the moment the UX is just stuck"*.

**What was actually wrong.** The screenshot shows *Translating into your language* still
spinning while *Writing the debrief* had already ticked. `vd-workflow` v0.1.0 kept its
**own** list of steps and advanced it by guessing — mark one done, promote the next. A run
does not work like that. A step can be **skipped** (translate, when the recording is
already in the reader's language), **degraded** (it failed and the pass carried on), or
**blocked** (the budget gate stopped it), and none of those emit the completion event the
guess was waiting for. So a row sat spinning for something that had already been decided
against, and the panel's account of the run disagreed with the run's own.

It was not, in that screenshot, actually hung: the infographic step was still drawing, and
an image model takes 60–90 seconds. But a panel that shows nothing moving for a minute and
a half is indistinguishable from a broken one, which is the same defect wearing a
different hat.

**v0.1.1, three changes with one cause:**

1. **The step list IS the trace.** `setTrace()` renders whatever the declared workflow
   says — every status, including the three a guess cannot infer — and every status has a
   WORD beside its mark, so a reader learns *why* translate was skipped rather than
   inferring it from a dash. One source for what happened, and it is the executing one.
2. **Artefacts appear as they arrive.** The transcript is readable while the infographic is
   still drawing. The caveat follows the transcript rather than the state, because rule 3
   is about what is on screen, not about which state we are in.
3. **There is a way out.** *Stop this pass* cancels the run and keeps whatever it had
   already produced — after a stop, clearing the panel would be actively misleading,
   because the reader asked the run to end, not the results to vanish. A stopped or failed
   run offers *Run it again*.

Every running row carries its own elapsed seconds, so slow and stuck stop looking the
same. And the run record **outlives the run**: a folded *What ran* on every finished pass,
open by default when something did not go cleanly.

## 13 Aug — the five schemes, offered

`website/vd-theme.js` is a classic script, loaded before paint on every page — a module is
deferred by definition, so a module would paint Signal and then flip. It is also why this
is `script-src 'self'` rather than an inline snippet: the app and home pages ship a CSP
with no `'unsafe-inline'`, and adding it to switch a colour would be a poor trade. The
stored value is checked against the allowlist before it reaches the DOM (the issue-041
rule) — localStorage is writable by anything on this origin.

`wa-site-nav` v0.1.11 puts the picker beside the language picker. Each swatch shows its
own scheme's accent, which means reading a token from a scheme that is not active — done
with a scoped throwaway element rather than a hardcoded hex.

**The workbench pins itself to Signal**, and says so in the picker. Its nine `wa-*`
components still read colour through the `--wa-*` bridge, where one name does two jobs — a
card SURFACE (39 reads) and ink on the dark chrome (98 reads). That conflation is
invisible while both are near-white and unreadable the moment a dark scheme separates
them. Rather than ship a workbench that goes dark-on-dark in Night, that page stays light
and explains why. The lock comes off one component at a time, as each is ported to
`--vd-*` — the nav is already across.


## 13 Aug — the infographic never ran, and the console said why twice over

Three findings from QA, two of them ours.

### 1. The infographic step ran for 86 seconds and made no request

`home.js` handed the pipeline `document.createElement('div')` as its infographic
mount — **a node that was never attached to the document**. The renderer appends
`<sg-llm-request>` into that mount and waits for it to do the work, and a custom
element in a DETACHED tree never upgrades: it never connects, never calls
anything, and the promise it is awaited on never settles. The step sat at
`running` with nothing behind it. The app page has always passed a real node
(`#infographic-mount`), which is why this only showed up on the home page.

The mount is now a light-DOM node **slotted into the panel's Infographic tab**
(`vd-workflow` v0.1.2). Light DOM because it must stay connected across the
panel's re-renders — the shadow tree is rebuilt on every trace update, and
`innerHTML` would tear a half-drawn SVG out from under the renderer. And in the
tab because a 60–90 second image model should be watched where it will be read:
the tab now exists from the moment a run asks for one, with a line saying what it
is waiting for.

Gated in `home-workflow.test.mjs` against the scripted OpenRouter the screenshot
suite uses — the mount is asserted `isConnected`, and an infographic is actually
drawn. Nothing short of drawing one would have caught this.

A second, latent bug fell out of writing that test: `home.js` read
`window.__tool.getResults()` **without awaiting it**. A registered action returns
a promise whether or not it was declared async, so `.summary` was always
undefined — masked only because the event stream had already supplied the same
values. `app.js` has always awaited it.

### 2. "Executing inline script violates … script-src 'self'"

The home page's version stamp was an inline `<script>`, written long before that
page had a CSP. M3 gave it the workbench's policy — no `'unsafe-inline'` — and
the stamp went dead with nothing failing anywhere a test could see it. It is now
in `home.js`. Loosening the policy so a version number could print would have
been the wrong trade, and `tests/unit/csp.test.mjs` now fails the build on any
inline script in a page whose own CSP forbids it (and checks that both pages
which reach OpenRouter actually name it in `connect-src`).

### 3. The two 404s are the engine's cost lookup, and they are correct

Read exactly right. `fetchGenerationCostDeferred` (in the **tools** repo, served
from the engine origin — not ours) waits 2.5s, asks
`GET /api/v1/generation?id=…`, and on failure waits 2.5s and asks once more.
OpenRouter's generation row is not queryable immediately, so a 404 on the way is
expected; the function returns `null` for "unknown", **never zero**, and the cost
line shows an em-dash rather than a wrong number.

So: harmless, bounded at two requests per generation, and not fixable from this
repo. Worth raising upstream — a longer first delay would remove the noise, and
console noise matters because it is where a real error would have to be noticed.

### 4. "Are you going to add it as a tab?"

It already is — Debrief / Transcript / Translation / Infographic, each appearing
as soon as that artefact exists. The infographic's tab appears *before* it
exists, because that is the one worth watching.
