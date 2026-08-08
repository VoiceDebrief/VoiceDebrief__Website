/* wa-progress-rail v0.1.3 — adds the "drawing the infographic" step (M2). */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

const STEPS = ['ingest', 'transcribe', 'summary', 'infographic']

class WaProgressRail extends SgComponent {
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

    bindElements() {
        this.rows = {}
        for (const s of STEPS) this.rows[s] = this.$(`[data-step="${s}"]`)
        this.stop = this.$('.wa-rail__stop')
        this._timer = null
    }

    setupEventListeners() {
        this.addTrackedListener(this.stop, 'click', () => this.emit('wa:stop-requested', {}))
    }

    /* wantInfographic=false hides the fourth row for that pass. */
    reset(wantInfographic = false) {
        clearInterval(this._timer)
        for (const s of STEPS) {
            const row = this.rows[s]; if (!row) continue
            row.dataset.state = 'todo'
            row.querySelector('.ms').textContent = ''
            row.style.display = (s === 'infographic' && !wantInfographic) ? 'none' : ''
        }
    }

    start(step) {
        const row = this.rows[step]; if (!row) return
        row.dataset.state = 'active'
        const t0 = performance.now(), ms = row.querySelector('.ms')
        clearInterval(this._timer)
        this._timer = setInterval(() => { ms.textContent = Math.round((performance.now() - t0) / 1000) + 's' }, 250)
    }

    finish(step, ok = true) {
        const row = this.rows[step]; if (!row) return
        clearInterval(this._timer)
        row.dataset.state = ok ? 'done' : 'error'
    }
}
customElements.define('wa-progress-rail', WaProgressRail)
export { WaProgressRail }
