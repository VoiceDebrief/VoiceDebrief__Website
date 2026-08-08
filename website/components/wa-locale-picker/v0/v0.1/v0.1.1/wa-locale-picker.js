/* wa-locale-picker v0.1.1 — the sgraph.ai pattern (issue 050 M2, Dinis).

   A compact button showing the CURRENT culture, opening a two-column panel of
   every culture we know about. Same three rules as v0.1.0, one reversal:

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
    }

    disconnectedCallback() {
        for (const ev of ['wa:locale-changed', 'wa:i18n-ready']) window.removeEventListener(ev, this._onI18n)
        document.removeEventListener('click', this._onDoc)
        document.removeEventListener('keydown', this._onKey)
    }

    toggle(next = !this._open) {
        this._open = next
        const panel = this.shadowRoot.querySelector('.panel')
        const btn = this.shadowRoot.querySelector('.trigger')
        if (panel) panel.hidden = !next
        if (btn) btn.setAttribute('aria-expanded', String(next))
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

        this.shadowRoot.innerHTML = `
<style>
  :host{ position:relative; display:inline-block;
         font-family:var(--wa-font,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif) }
  .trigger{ display:inline-flex; align-items:center; gap:8px; cursor:pointer; font:inherit;
    font-size:.86rem; font-weight:600; padding:7px 13px; border-radius:10px;
    border:1px solid var(--wa-line,#dbe3ec); background:var(--wa-fg,#fff);
    color:var(--wa-ink,#1a2433) }
  .trigger:hover{ border-color:var(--wa-blue,#2563eb) }
  .trigger .chev{ font-size:.7rem; color:var(--wa-muted,#5b6b7f) }
  .panel{ position:absolute; z-index:80; top:calc(100% + 8px); left:0; min-width:560px;
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
  @media(max-width:620px){ .panel{ grid-template-columns:1fr; min-width:min(88vw,330px) } }
</style>
<button type="button" class="trigger" aria-haspopup="listbox" aria-expanded="false">
  <span>${cur.flag || '🌐'}</span>
  <span>${(cur.nativeLabel || cur.label || active || '').toUpperCase()}</span>
  <span class="chev">▼</span>
</button>
<div class="panel" role="listbox" aria-label="${T('core.localeLabel', 'language')}" hidden>
  ${rows.map(r => `<button type="button" role="option" class="opt${r.on ? ' on' : ''}${r.live ? (r.tag ? ' draft' : '') : ' soon'}"
      data-locale="${r.name}" ${r.live ? '' : 'disabled'} aria-selected="${r.on}">
      <span>${r.flag}</span><span class="name">${r.label}</span>${r.tag ? `<span class="tag">${r.tag}</span>` : ''}
    </button>`).join('')}
</div>`

        this.shadowRoot.querySelector('.trigger').addEventListener('click', (e) => {
            e.stopPropagation(); this.toggle()
        })
        for (const b of this.shadowRoot.querySelectorAll('.opt:not([disabled])')) {
            b.addEventListener('click', async () => {
                this.toggle(false)
                try { await window.__waI18n?.setLocale?.(b.dataset.locale) }
                catch (err) { console.warn('[wa-locale-picker]', err) }
            })
        }
        this.toggle(this._open)
    }
}
customElements.define('wa-locale-picker', WaLocalePicker)
