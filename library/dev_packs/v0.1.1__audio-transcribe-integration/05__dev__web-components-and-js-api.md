# Dev Brief: Web Components And The JS API — Build It The SGraph Way From Day One

**version** v0.1.1 · **date** 29 July 2026 · **role** Dev (with Architect) · **type** Dev-pack brief
**status** PROPOSED — briefs only

*Part of the dev pack [v0.1.1__audio-transcribe-integration](README.md) — see the [pack README](README.md) for scope, ground truth and definition of done. This brief refines [03 — implementation](03__dev__implementation-brief.md) §1: the HTML/CSS/JS structure is Web-Component-based, and the app itself speaks the SG JS API from day one.*

---

## 1. The Base Web Component Already Exists — Extend It, Don't Reinvent It

Everything on `*.tools.sgraph.ai` is built on **`SgComponent`**, the shared base class
(Shadow DOM + resource loading), published as a versioned, immutable, CORS-importable
module:

```
https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js
```
(source: `SGraph-AI__Tools` [`sgraph_ai_tools__static/components/base/v1/v1.0/v1.0.0/sg-component.js`](https://github.com/the-cyber-boardroom/SGraph-AI__Tools/blob/dev/sgraph_ai_tools__static/components/base/v1/v1.0/v1.0.0/sg-component.js); verified live with `access-control-allow-origin: *`, 29 Jul 2026)

What it gives every component for free — do not re-implement any of this:

- **Shadow DOM** (`mode: 'open'`) for style isolation.
- **The js/html/css triplet**: `loadResources()` fetches the component's sibling
  `<name>.html` template and `<name>.css`, plus `sharedCssPaths()` (shared tokens)
  injected first.
- **Lifecycle**: `loadResources() → bindElements() → setupEventListeners() → onReady()`,
  with `component-ready` emitted (composed, crosses shadow boundaries) and
  `whenReady(timeout)` for consumers.
- **Tracked listeners** (`addTrackedListener`) auto-removed on disconnect; `$`/`$$`
  shadow queries; `emit()` for composed+bubbling custom events; `showError()`.

**Every UI piece of our app page is an `SgComponent` subclass.** The subclass pattern
(copy it from [`sg-site-header`](https://github.com/the-cyber-boardroom/SGraph-AI__Tools/blob/dev/sgraph_ai_tools__static/components/site-header/v1/v1.0/v1.0.2/sg-site-header.js)):

```js
// website/components/wa-drop-zone/v0/v0.1/v0.1.0/wa-drop-zone.js
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

class WaDropZone extends SgComponent {
    static jsUrl = import.meta.url      // sibling .html/.css resolve against OUR origin
    get sharedCssPaths() { return [] }  // shared tokens are page-level (see §3)
    bindElements()        { this.input = this.$('input[type=file]') }
    setupEventListeners() { this.addTrackedListener(this, 'drop', this.onDrop) }
    onReady()             { /* … */ }
    onDrop(e)             { this.emit('wa:file-dropped', { files: e.dataTransfer.files }) }
}
customElements.define('wa-drop-zone', WaDropZone)
```

Two cross-origin footguns, called out once so nobody trips them:
1. **Import the base by full URL** (as above). The tools' own components import it as
   `/components/base/...` — that absolute path resolves against *their* origin when we
   import *their* components (fine), but our components must not use it (it would hit
   github.io and 404).
2. **Always set `static jsUrl = import.meta.url`** in our subclasses so the base
   fetches our `.html`/`.css` siblings from our origin.

## 2. Our Component Layout (IFD-versioned, like the tools site)

```
website/
  components/                          our sg-style components, one dir each,
    wa-drop-zone/v0/v0.1/v0.1.0/       IFD-versioned triplets:
        wa-drop-zone.js / .html / .css
    wa-progress-rail/v0/v0.1/v0.1.0/...
    wa-transcript-card/v0/v0.1/v0.1.0/...
    wa-mode-selector/v0/v0.1/v0.1.0/...
    wa-cost-line/v0/v0.1/v0.1.0/...
  app/
    index.html                         the product page: mounts the components
    manifest.json                      OUR tool manifest (see §4)
    app.js                             entry: SgToolApi registration + pipeline wiring
    pipeline.js  prompts/  skills/     as in brief 03 §1
```

- Prefix `wa-` (WhatsApp Audio) distinguishes our components from imported `sg-*` ones.
  Published versions are immutable — a change means a new `v0.1.x` directory, exactly
  as the sibling repos do it.
- Reuse imported `sg-*` components directly where they fit (e.g.
  `sg-openrouter-key-stats` for the budget panel, the `sg-llm-infographic` component
  in M2) — import by full `dev.tools.sgraph.ai` URL, pinned versions.

## 3. CSS: Design Tokens First, Component CSS Second

The tools pages load, in order (their manifest `loader` phase 1):
`/components/tokens/v1/v1.0/v1.0.0/sg-tokens.css` → layout css → tool css. We mirror
that: our `app/index.html` links the **shared token sheet from the tools origin**
(pinned version) first, then our page css; each component's own `.css` rides inside
its shadow root via the base class. Our brand values (navy `#0b1f3a`, WhatsApp green)
live as CSS custom properties in our page css so components inherit them through the
shadow boundary — never hard-code colours inside component css.

## 4. The JS API: Our Site Is A Conforming SG Tool From Day One

This is the compliance requirement from Dinis (29 Jul): **100% compatible with the JS
API spec from the start.** Concretely, our app page is not just a *consumer* of
`window.__tool` — it **publishes its own** `SgToolApi` instance, exactly like every
tool on tools.sgraph.ai:

```js
import { SgToolApi } from 'https://dev.tools.sgraph.ai/core/sg-tool-api/v0/v0.1/v0.1.0/sg-tool-api.js'

const api = new SgToolApi({
    name:     'whatsapp-transcribe',
    version:  { api: '0.1.0', ui: '<from version.txt>', content: '0.1.0' },
    manifest: './manifest.json',
    skills:   { human: './skills/SKILL__human.md',
                browser: './skills/SKILL__browser.md',
                api: './skills/SKILL__api.md' },
});
api.register('setApiKey',  p => engine.setApiKey(p),  { async: true,
    sanitiseParams: p => ({ ...p, apiKey: '••••' }) });   // never log the key
api.register('addFiles',   p => engine.addFiles(p),   { async: true });
api.register('runPass',    p => pipeline.runPass(p),  { async: true,
    events: ['wa:pass:started','wa:transcript','wa:summary','wa:infographic','wa:pass:complete'] });
api.register('getResults', () => pipeline.results(),  { async: false });
api.register('getCostSummary', () => engine.getCostSummary(), { async: false });
api.activate();   // → window.__tool + window.__tools registry + tool:ready
```

What the spec requires of us (from `sg-tool-api.js` + the audio-transcribe
`manifest.json` `api` section + `SKILL__api.md` — all in the Tools repo):

| Requirement | Our implementation |
|-------------|--------------------|
| `activate()` publishes `window.__tool`, registers in `window.__tools`, fires `tool:ready {instanceId, tool, version}` | via `SgToolApi` — free |
| Every action returns a Promise, callable headlessly (console, Playwright, other components are equal consumers) | register everything through `api.register`; the UI calls the API, never the internals — the UI is just one consumer |
| `manifest.json` with `id/name/slug/description/icon/version/status/category/keywords/locale/dependencies/loader/api/skills` — the `api` section (actions, events, skills) is the authoritative contract | ship `app/manifest.json` from day one; keep the `api` section in lockstep with `api.register` calls |
| `skills/SKILL__{human,browser,api}.md` | ship all three (short is fine; they grow with the tool) |
| `meta` surface: `getManifest/getMethods/getSkills/getVersion/getEvents/health/getLog` | via `SgToolApi` — free (execution ring buffer included) |
| Secrets masked in logs | `sanitiseParams` on every key-carrying action |
| Namespaced events with `instanceId` in detail | ours are `wa:*`; the imported engine keeps its `at:*` |

**Why this matters beyond consistency**: our CI contract smoke test
([03](03__dev__implementation-brief.md) §7) drives `window.__tool` on our own page —
the same seam a future vault embed, an agent, or the tools directory would use. We
dogfood the ecosystem contract we depend on upstream, and our product is itself
embeddable/scriptable on day one — including by our own agentic team.

## 5. Page Bootstrap: Manifest-Loader, Like The Tools Pages

The tools pages boot with one module script:
```html
<script type="module">
    import { loadManifest } from 'https://dev.tools.sgraph.ai/core/manifest-loader/v0/v0.1/v0.1.0/manifest-loader.js';
    loadManifest('./manifest.json');
</script>
```
Our `manifest.json` `loader` phases then declare: phase 1 css (tokens → ours),
phase 2 components (imported `sg-*` by full URL + our `wa-*` by relative path),
phase 3 the `entry: true` script (`app.js`, which registers the API above). If the
loader turns out to assume same-origin paths anywhere, fall back to plain
`<script type="module" src="app.js">` with explicit imports — note the finding in the
M1-a spike note either way.

## 6. Compliance Checklist (gate for M1 review)

- [ ] Every UI element is an `SgComponent` subclass (`wa-*`), js/html/css triplet, IFD-versioned dir
- [ ] Base class + `SgToolApi` + tokens css imported from pinned `dev.tools.sgraph.ai` URLs, never copied
- [ ] `static jsUrl = import.meta.url` in every subclass
- [ ] `window.__tool` live on our page after `tool:ready`; all product actions registered; UI calls the API only
- [ ] `manifest.json` `api` section matches registered actions/events 1:1
- [ ] `skills/SKILL__{human,browser,api}.md` present
- [ ] API keys masked via `sanitiseParams`; no secrets in `getLog()`
- [ ] Playwright smoke drives `window.__tool` end-to-end

---

This document is released under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).
