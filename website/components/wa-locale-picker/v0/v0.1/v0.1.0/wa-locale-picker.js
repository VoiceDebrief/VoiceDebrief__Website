/* wa-locale-picker v0.1.0 — one control, the whole locale story (issue 050, M2).

   Three decisions, all recorded rather than improvised:

   1. NATIVE NAMES, NO FLAGS. A flag is a country and a language is not a
      country: pt-PT and pt-BR would each want a different one, and English
      would have to pick a fight it cannot win. SG/Send's designer reached this
      conclusion and it was never implemented there; it is implemented here.
   2. DRAFT LOCALES ARE VISIBLE AND MARKED, not hidden. Per-locale gating beats
      a global "coming soon": someone who reads Portuguese can see the work
      exists, try it, and tell us what reads wrong — which is exactly how a
      draft becomes live.
   3. THE LIST COMES FROM THE ALLOWLIST. The picker renders locales/index.json
      and nothing else. It cannot be talked into loading a locale from a URL
      (the issue-041 rule).

   Dependency-free and shadow-DOM styled from --wa-* tokens with literal
   fallbacks, so it renders correctly on pages that do not load the theme sheet. */

const T = (k, fallback) => window.__waI18n?.tOr?.(k, fallback) ?? fallback

class WaLocalePicker extends HTMLElement {
    connectedCallback() {
        if (this._built) return
        this._built = true
        this.attachShadow({ mode: 'open' })
        this.render()
        // The app initialises i18n asynchronously; re-render when it lands and
        // whenever the locale changes, so the tick follows the actual state.
        window.addEventListener('wa:locale-changed', () => this.render())
        window.addEventListener('wa:i18n-ready', () => this.render())
    }

    render() {
        const api = window.__waI18n
        const locales = api?.getLocales?.() || {}
        const active = api?.getLocale?.() || ''
        const names = Object.keys(locales)
        // With one locale there is nothing to choose. Render nothing rather
        // than a control that cannot do anything.
        if (names.length < 2) { this.shadowRoot.innerHTML = ''; return }

        const opts = names.map(name => {
            const m = locales[name]
            const draft = m.status !== 'live'
            const label = m.nativeLabel || m.label || name
            return `<button type="button" role="option" data-locale="${name}"
                     aria-selected="${name === active}"
                     class="opt${name === active ? ' on' : ''}${draft ? ' draft' : ''}">
                     <span class="name">${label}</span>${draft
                        ? `<span class="tag">${T('core.localeDraft', 'draft')}</span>` : ''}</button>`
        }).join('')

        this.shadowRoot.innerHTML = `
<style>
  :host{ font-family:var(--wa-font,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif) }
  .wrap{ display:flex; align-items:center; gap:8px; flex-wrap:wrap }
  .lbl{ font-size:.72rem; font-weight:800; letter-spacing:1.1px; text-transform:uppercase;
        color:var(--wa-muted,#5b6b7f) }
  .opts{ display:flex; gap:6px; flex-wrap:wrap }
  .opt{ display:inline-flex; align-items:center; gap:6px; cursor:pointer; font:inherit;
        font-size:.84rem; padding:5px 11px; border-radius:999px;
        border:1px solid var(--wa-line,#dbe3ec); background:transparent;
        color:var(--wa-ink,#1a2433) }
  .opt:hover{ border-color:var(--wa-blue,#2563eb) }
  .opt.on{ background:var(--wa-navy,#0b1f3a); border-color:var(--wa-navy,#0b1f3a);
           color:var(--wa-fg,#fff); font-weight:600 }
  /* Draft is stated, never implied by being greyed out — a user who reads the
     language should still be able to try it and tell us what is wrong. */
  .tag{ font-size:.62rem; font-weight:800; letter-spacing:.6px; text-transform:uppercase;
        padding:1px 6px; border-radius:999px;
        background:var(--wa-amber-bg,#fdf1e3); color:var(--wa-amber-ink,#a05a00);
        border:1px solid var(--wa-amber-line,#e0a445) }
  .opt.on .tag{ background:var(--wa-on-dark-12,rgba(255,255,255,.12));
                color:var(--wa-fg,#fff); border-color:var(--wa-on-dark-28,rgba(255,255,255,.28)) }
</style>
<div class="wrap">
  <span class="lbl">${T('core.localeLabel', 'language')}</span>
  <div class="opts" role="listbox" aria-label="${T('core.localeLabel', 'language')}">${opts}</div>
</div>`

        for (const b of this.shadowRoot.querySelectorAll('.opt')) {
            b.addEventListener('click', async () => {
                try { await window.__waI18n?.setLocale?.(b.dataset.locale) }
                catch (e) { console.warn('[wa-locale-picker]', e) }
            })
        }
    }
}
customElements.define('wa-locale-picker', WaLocalePicker)
