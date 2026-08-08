/* wa-cost-line — GBP display converted from USD metering (5 Aug decision). */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

class WaCostLine extends SgComponent {
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

    onReady() {
        this._waLocalise()
    }
    bindElements() { this.passEl = this.$('.pass'); this.sessEl = this.$('.session') }
    update({ passUsd, sessionUsd, fmt }) {
        this.passEl.textContent = 'this pass: ' + fmt(passUsd)
        this.sessEl.textContent = 'session: '   + fmt(sessionUsd)
        this.hidden = false
    }
}
customElements.define('wa-cost-line', WaCostLine)
export { WaCostLine }
