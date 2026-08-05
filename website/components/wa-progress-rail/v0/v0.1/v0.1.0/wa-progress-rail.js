/* wa-progress-rail — the staged rail. Elapsed time, never fake percentages. */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

const STEPS = ['ingest', 'transcribe', 'summary']

class WaProgressRail extends SgComponent {
    static jsUrl = import.meta.url

    bindElements() {
        this.rows = {}
        for (const s of STEPS) this.rows[s] = this.$(`[data-step="${s}"]`)
        this.stop = this.$('.wa-rail__stop')
        this._timer = null
    }

    setupEventListeners() {
        this.addTrackedListener(this.stop, 'click', () => this.emit('wa:stop-requested', {}))
    }

    reset() {
        clearInterval(this._timer)
        for (const s of STEPS) { this.rows[s].dataset.state = 'todo'; this.rows[s].querySelector('.ms').textContent = '' }
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
