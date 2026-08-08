/* wa-key-panel — BYOK entry. The user pastes their own OpenRouter key; the engine
   persists it in localStorage['sg-openrouter-mgmt-key'] (5 Aug decision). */
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
        this.button = this.$('button')
        this.status = this.$('.wa-key__status')
    }

    setupEventListeners() {
        this.addTrackedListener(this.button, 'click', this.onSave)
        this.addTrackedListener(this.input, 'keydown', e => { if (e.key === 'Enter') this.onSave() })
    }

    onReady() {
        this._waLocalise()
        if (localStorage.getItem(LS_KEY)) this.showPresent()
    }

    showPresent() {
        this.status.textContent = 'Key saved in this browser (localStorage) — nothing leaves your device except calls to OpenRouter.'
        this.status.classList.add('ok')
        this.input.value = ''
        this.input.placeholder = 'key saved — paste a new one to replace it'
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
            this.status.textContent = message || 'That key was not accepted.'
            this.status.classList.remove('ok')
        }
    }
}
customElements.define('wa-key-panel', WaKeyPanel)
export { WaKeyPanel }
