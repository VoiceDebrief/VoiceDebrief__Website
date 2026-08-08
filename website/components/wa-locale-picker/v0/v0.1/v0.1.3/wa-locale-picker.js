/* wa-locale-picker v0.1.3 — the panel is anchored to the SCREEN on phones.

   v0.1.2 anchored the panel to the trigger (`right:0`), which is correct only
   while the trigger is itself at the right edge of the screen. On an iPhone the
   header wraps, the picker lands mid-row, and the panel opened at x = -131px —
   a third of the language names off the left edge, and 60px of the list below
   the fold (measured at 390x664; Dinis's screenshot showed exactly this).

   A dropdown must not depend on where its button happens to sit. Below 620px
   the panel is `position:fixed`, inset from both screen edges, with its top set
   from the trigger's rect at open time — so it is on screen whatever the header
   does now or after any future nav change. It also scrolls: sixteen cultures do
   not fit on a phone, and a list that runs past the bottom hides its own tail.

   The two buttons go flag-only below 560px (the code is still in the accessible
   name), because a phone header has to hold the brand, both controls and the
   hamburger.

   From v0.1.2, both about not stranding people:

   0. The trigger shows the locale CODE (🇵🇹 PT-PT), not the native name. The
      full names belong in the panel, where there is room for them; in the bar
      they pushed the whole control onto a second row and dragged the panel off
      the left edge with it.

  1. THE ESCAPE HATCH. Once a non-default locale is active, a plain 🇬🇧 EN-GB
      button appears BESIDE the dropdown — no menu, one click, back to English.
      Someone who lands on Portuguese by accident (a shared link, a mis-tap)
      should not have to operate a dropdown in a language they cannot read to
      undo it. The dropdown then shows the locale they are actually in, so the
      two controls answer two different questions: "where am I" and "get me out".
   2. It lives in the site nav, top right, via <slot name="locale"> — the place
      every other product puts it, including sgraph.ai.

   The panel is CLOSED until the caret is clicked, and closes on the caret, a
   click anywhere else, Escape, or a selection.

   Carried over from v0.1.1:

   1. FLAGS ARE BACK, and correctly so. A flag is a poor stand-in for a language
      — but our unit is a CULTURE (language + country), so every entry genuinely
      names one country. 🇵🇹 and 🇧🇷 are exactly the distinction we are drawing.
   2. UNAVAILABLE CULTURES ARE LISTED, dimmed and marked, not hidden. The list
      is a roadmap: someone sees their language coming and can ask for it.
      Draft ones are pickable — that is how they get the feedback that makes
      them live. Ones we do not ship at all are shown as SOON and are inert.
   3. THE LIST COMES FROM THE ALLOWLIST and nothing else (the issue-041 rule).

   Dependency-free; styled from --wa-* tokens with literal fallbacks so it
   renders correctly on pages that never load the theme sheet. */

const T = (k, fallback) => window.__waI18n?.tOr?.(k, fallback) ?? fallback

/* Cultures we intend to support. Anything not in the allowlist renders as SOON
   — listed honestly rather than promised. Kept here, not in the allowlist,
   because the allowlist is "what exists"; this is "what is coming". */
const ROADMAP = [
    ['de-de', '🇩🇪', 'Deutsch (Deutschland)'], ['de-ch', '🇨🇭', 'Deutsch (Schweiz)'],
    ['es-es', '🇪🇸', 'Español (España)'],      ['es-ar', '🇦🇷', 'Español (Argentina)'],
    ['es-mx', '🇲🇽', 'Español (México)'],      ['fr-fr', '🇫🇷', 'Français (France)'],
    ['fr-ca', '🇨🇦', 'Français (Canada)'],     ['hr-hr', '🇭🇷', 'Hrvatski (Hrvatska)'],
    ['it-it', '🇮🇹', 'Italiano (Italia)'],     ['nl-nl', '🇳🇱', 'Nederlands (Nederland)'],
    ['pl-pl', '🇵🇱', 'Polski (Polska)'],       ['ro-ro', '🇷🇴', 'Română (România)'],
]

class WaLocalePicker extends HTMLElement {
    connectedCallback() {
        if (this._built) return
        this._built = true
        this.attachShadow({ mode: 'open' })
        this._open = false
        this.render()
        for (const ev of ['wa:locale-changed', 'wa:i18n-ready'])
            window.addEventListener(ev, this._onI18n = () => this.render())
        // Click-away and Escape: a panel that can only be closed by the button
        // that opened it is a trap on touch.
        document.addEventListener('click', this._onDoc = (e) => {
            if (this._open && !e.composedPath().includes(this)) this.toggle(false)
        })
        document.addEventListener('keydown', this._onKey = (e) => {
            if (e.key === 'Escape' && this._open) this.toggle(false)
        })
        // Turning the phone sideways moves the trigger; the fixed panel's top was
        // measured against where it used to be. Re-place rather than close — a
        // rotation should not throw away what the user was in the middle of.
        window.addEventListener('resize', this._onResize = () => {
            if (this._open) this.place(this.shadowRoot.querySelector('.panel'))
        })
    }

    disconnectedCallback() {
        for (const ev of ['wa:locale-changed', 'wa:i18n-ready']) window.removeEventListener(ev, this._onI18n)
        document.removeEventListener('click', this._onDoc)
        document.removeEventListener('keydown', this._onKey)
        window.removeEventListener('resize', this._onResize)
    }

    toggle(next = !this._open) {
        this._open = next
        const panel = this.shadowRoot.querySelector('.panel')
        const btn = this.shadowRoot.querySelector('.trigger')
        if (panel) panel.hidden = !next
        if (btn) btn.setAttribute('aria-expanded', String(next))
        if (panel && next) this.place(panel)
    }

    /* On phones the panel is fixed to the VIEWPORT, so the one thing CSS cannot
       know — how far down the header the trigger ended up — is measured here at
       open time. Above the breakpoint the inline top is cleared and the CSS
       `top:calc(100% + 10px)` takes over again; leaving a stale value behind
       would strand the panel after a rotation from portrait to landscape. */
    place(panel) {
        const narrow = window.matchMedia('(max-width:620px)').matches
        if (!narrow) { panel.style.top = ''; return }
        const box = this.getBoundingClientRect()
        panel.style.top = `${Math.round(box.bottom + 8)}px`
    }

    render() {
        const api = window.__waI18n
        const locales = api?.getLocales?.() || {}
        const active = api?.getLocale?.() || ''
        const names = Object.keys(locales)
        if (!names.length) { this.shadowRoot.innerHTML = ''; return }

        const cur = locales[active] || {}
        const rows = [
            ...names.map(name => {
                const m = locales[name]
                const draft = m.status !== 'live'
                return { name, flag: m.flag || '🌐', label: m.nativeLabel || m.label || name,
                         tag: draft ? T('core.localeDraft', 'draft') : '', on: name === active, live: true }
            }),
            ...ROADMAP.filter(([id]) => !locales[id])
                .map(([id, flag, label]) => ({ name: id, flag, label, tag: T('core.localeSoon', 'soon'),
                                               on: false, live: false })),
        ]

        const isDefault = active === (api?.defaultLocale?.() || 'en-gb')
        const home = locales['en-gb']
        /* Both buttons lose their text label on a phone, so the name they carry
           for a screen reader (and for a long-press tooltip) has to say the whole
           thing — a bare flag is not a label. */
        const curLabel = `${cur.nativeLabel || cur.label || active} — ${T('core.localeLabel', 'language')}`
        const homeLabel = T('core.localeHome', 'Back to English (UK)')

        this.shadowRoot.innerHTML = `
<style>
  :host{ position:relative; display:inline-block;
         font-family:var(--wa-font,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif) }
  .controls{ display:flex; align-items:center; gap:6px }
  .trigger,.home{ display:inline-flex; align-items:center; gap:7px; cursor:pointer; font:inherit;
    font-size:.8rem; font-weight:700; letter-spacing:.3px; padding:6px 11px; border-radius:9px;
    border:1px solid var(--wa-on-dark-28,rgba(255,255,255,.28));
    background:var(--wa-on-dark-08,rgba(255,255,255,.08)); color:var(--wa-fg,#fff) }
  .trigger:hover,.home:hover{ border-color:var(--wa-green,#25d366); color:var(--wa-green-soft,#8ff0b6) }
  .trigger .chev{ font-size:.62rem; opacity:.8 }
  /* The way home is quieter than the current language but never hidden. */
  .home{ font-weight:600; opacity:.85 }
  .panel{ position:absolute; z-index:80; top:calc(100% + 10px); right:0; min-width:560px;
    padding:12px; border-radius:14px; border:1px solid var(--wa-line,#dbe3ec);
    background:var(--wa-fg,#fff); box-shadow:0 10px 30px var(--wa-shadow-panel,rgba(11,31,58,.18));
    display:grid; grid-template-columns:1fr 1fr; gap:2px 10px }
  .opt{ display:flex; align-items:center; gap:8px; width:100%; cursor:pointer; font:inherit;
    font-size:.86rem; text-align:left; padding:7px 9px; border-radius:8px; border:0;
    background:none; color:var(--wa-ink,#1a2433) }
  .opt:hover{ background:var(--wa-mist,#f2f5f9) }
  .opt.on{ color:var(--wa-blue,#2563eb); font-weight:700 }
  /* SOON is dimmed AND disabled — a row you can click that does nothing is
     worse than one that plainly cannot be clicked. */
  .opt.soon{ color:var(--wa-muted-2,#9fb2c9); cursor:default }
  .opt.soon:hover{ background:none }
  /* Native names must not wrap: "Português (Portugal)" broken over two lines
     reads as two entries and makes the two-column grid ragged. */
  .name{ flex:1; white-space:nowrap }
  .tag{ font-size:.6rem; font-weight:800; letter-spacing:.6px; text-transform:uppercase;
    padding:2px 7px; border-radius:999px; border:1px solid currentColor; opacity:.75;
    white-space:nowrap }   /* "em breve" must not break across two lines */
  .opt.draft .tag{ color:var(--wa-amber-ink,#a05a00); background:var(--wa-amber-bg,#fdf1e3);
                   border-color:var(--wa-amber-line,#e0a445); opacity:1 }
  /* Phones: the panel stops being a dropdown hanging off a button and becomes a
     sheet pinned to the screen. position:fixed with both insets set means its
     width and both edges come from the VIEWPORT, so where the trigger sits in a
     wrapped header stops mattering — which is the whole bug in v0.1.2. The top
     is set from the trigger's rect in place(); it is the only value CSS cannot
     derive. max-height + scroll because sixteen cultures do not fit on a phone. */
  @media(max-width:620px){
    .panel{ position:fixed; left:10px; right:10px; min-width:0; width:auto;
      grid-template-columns:1fr; max-height:calc(100vh - 120px);
      overflow-y:auto; overscroll-behavior:contain }
  }
  /* Flag-only below 560px: the header also has to hold the brand and the
     hamburger. The code stays in the accessible name, never only in the pixels. */
  @media(max-width:560px){ .trigger .code,.home .code{ display:none }
    .trigger,.home{ padding:6px 9px; gap:5px } }
</style>
<div class="controls">
  ${isDefault ? '' : `<button type="button" class="home" data-locale="en-gb"
      title="${homeLabel}" aria-label="${homeLabel}"><span>${home?.flag || '🇬🇧'}</span><span class="code">EN-GB</span></button>`}
  <button type="button" class="trigger" aria-haspopup="listbox" aria-expanded="false"
      title="${curLabel}" aria-label="${curLabel}">
    <span>${cur.flag || '🌐'}</span>
    <span class="code">${active.toUpperCase()}</span>
    <span class="chev">▼</span>
  </button>
</div>
<div class="panel" role="listbox" aria-label="${T('core.localeLabel', 'language')}" hidden>
  ${rows.map(r => `<button type="button" role="option" class="opt${r.on ? ' on' : ''}${r.live ? (r.tag ? ' draft' : '') : ' soon'}"
      data-locale="${r.name}" ${r.live ? '' : 'disabled'} aria-selected="${r.on}">
      <span>${r.flag}</span><span class="name">${r.label}</span>${r.tag ? `<span class="tag">${r.tag}</span>` : ''}
    </button>`).join('')}
</div>`

        this.shadowRoot.querySelector('.trigger').addEventListener('click', (e) => {
            e.stopPropagation(); this.toggle()
        })
        const go = async (name) => {
            this.toggle(false)
            try { await window.__waI18n?.setLocale?.(name) }
            catch (err) { console.warn('[wa-locale-picker]', err) }
        }
        this.shadowRoot.querySelector('.home')?.addEventListener('click', () => go('en-gb'))
        for (const b of this.shadowRoot.querySelectorAll('.opt:not([disabled])')) {
            b.addEventListener('click', () => go(b.dataset.locale))
        }
        this.toggle(this._open)
    }
}
customElements.define('wa-locale-picker', WaLocalePicker)
