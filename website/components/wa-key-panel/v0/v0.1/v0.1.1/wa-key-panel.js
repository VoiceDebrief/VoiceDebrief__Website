/* wa-key-panel — BYOK entry. The user pastes their own OpenRouter key; the engine
   persists it in localStorage['sg-openrouter-mgmt-key'] (5 Aug decision). */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

const LS_KEY = 'sg-openrouter-mgmt-key'

class WaKeyPanel extends SgComponent {
    static jsUrl = import.meta.url

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
