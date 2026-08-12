/* wa-key-panel v0.1.4 — BYOK entry, which COLLAPSES once it is done (issue 063).

   v0.1.4 adds the way out of the first-run wall (issue 060): a link to
   /openrouter-key/ inside the form. Not having a key is the one thing that stops
   a new person using this product at all, and until now the only help was a
   placeholder pointing at openrouter.ai — which tells you where to go and
   nothing about capping what the key can spend.

   Pasting a key is a setup step, and v0.1.2 left that setup step open on the page
   forever: someone who had already done it saw a full labelled form with an empty
   input every single visit, which reads as "not finished" (Dinis). Now a saved key
   shows one quiet line with a `change` control, and the form comes back on demand.

   The key itself is never re-displayed — not even masked. The panel knows only
   that one exists; the engine persists it in
   localStorage['sg-openrouter-mgmt-key'] (5 Aug decision). */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

const LS_KEY = 'sg-openrouter-mgmt-key'

class WaKeyPanel extends SgComponent {
    static jsUrl = import.meta.url

    /* Localise this component's shadow DOM (issue 050, M1b). The English in the
       template is the fallback, so this only ever overrides — the component
       still renders correctly with no i18n present, which is how the browser
       harness and any page that skips initI18n() keep working. Re-runs on
       locale change so a switch does not need a reload. */
    _waLocalise() {
        const go = () => window.__waI18n?.applyIn?.(this.shadowRoot)
        go()
        this._waOnLocale = go
        window.addEventListener('wa:i18n-ready', go)
        window.addEventListener('wa:locale-changed', go)
    }

    disconnectedCallback() {
        super.disconnectedCallback?.()
        if (this._waOnLocale) {
            window.removeEventListener('wa:i18n-ready', this._waOnLocale)
            window.removeEventListener('wa:locale-changed', this._waOnLocale)
        }
    }

    bindElements() {
        this.input  = this.$('input')
        this.button = this.$('.wa-key__save')
        this.status = this.$('.wa-key__status')
        this.wrap   = this.$('.wa-key')
        this.saved  = this.$('.wa-key__saved')
        this.form   = this.$('.wa-key__form')
        this.change = this.$('.wa-key__change')
        this.cancel = this.$('.wa-key__cancel')
    }

    setupEventListeners() {
        this.addTrackedListener(this.button, 'click', this.onSave)
        this.addTrackedListener(this.input, 'keydown', e => { if (e.key === 'Enter') this.onSave() })
        this.addTrackedListener(this.change, 'click', () => this.expand())
        this.addTrackedListener(this.cancel, 'click', () => this.collapse())
    }

    /* Open the form over a saved key. `cancel` only exists here — with no key
       saved there is nothing to cancel back to. */
    expand() {
        this.saved.hidden = true
        this.form.hidden = false
        this.wrap.classList.remove('is-saved')
        this.cancel.hidden = false
        this.input.value = ''
        this.input.focus()
    }

    collapse() {
        this.saved.hidden = false
        this.form.hidden = true
        this.wrap.classList.add('is-saved')
        this.cancel.hidden = true
    }

    onReady() {
        this._waLocalise()
        if (localStorage.getItem(LS_KEY)) this.showPresent()
    }

    showPresent() {
        this.status.textContent = 'Key saved in this browser (localStorage) — nothing leaves your device except calls to OpenRouter.'
        this.status.classList.add('ok')
        this.input.value = ''
        this.collapse()
        this.emit('wa:key-present', {})
    }

    async onSave() {
        const apiKey = this.input.value.trim()
        if (!apiKey) return
        this.status.textContent = 'Saving…'
        this.emit('wa:key-submitted', { apiKey })
    }

    confirmSaved(ok, message) {
        if (ok) { this.showPresent() }
        else {
            /* A rejected key must NOT collapse: the form stays open with the
               reason beside it, because collapsing here would hide the problem
               behind a tick that says everything is fine. */
            this.expand()
            this.status.textContent = message || 'That key was not accepted.'
            this.status.classList.remove('ok')
        }
    }
}
customElements.define('wa-key-panel', WaKeyPanel)
export { WaKeyPanel }
