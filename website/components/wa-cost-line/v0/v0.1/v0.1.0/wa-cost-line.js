/* wa-cost-line — GBP display converted from USD metering (5 Aug decision). */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

class WaCostLine extends SgComponent {
    static jsUrl = import.meta.url
    bindElements() { this.passEl = this.$('.pass'); this.sessEl = this.$('.session') }
    update({ passUsd, sessionUsd, fmt }) {
        this.passEl.textContent = 'this pass: ' + fmt(passUsd)
        this.sessEl.textContent = 'session: '   + fmt(sessionUsd)
        this.hidden = false
    }
}
customElements.define('wa-cost-line', WaCostLine)
export { WaCostLine }
