/* wa-result-card — one artefact (transcript or summary): copy + download .md. */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

class WaResultCard extends SgComponent {
    static jsUrl = import.meta.url

    bindElements() {
        this.titleEl = this.$('.wa-card__title')
        this.body    = this.$('.wa-card__body')
        this.copyBtn = this.$('.wa-card__copy')
        this.dlBtn   = this.$('.wa-card__dl')
        this._text   = ''
    }

    setupEventListeners() {
        this.addTrackedListener(this.copyBtn, 'click', async () => {
            await navigator.clipboard.writeText(this._text)
            this.copyBtn.textContent = 'copied ✓'
            setTimeout(() => { this.copyBtn.textContent = 'copy' }, 1600)
        })
        this.addTrackedListener(this.dlBtn, 'click', () => {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(new Blob([this._text], { type: 'text/markdown' }))
            a.download = (this.getAttribute('filename') || 'result') + '.md'
            a.click(); URL.revokeObjectURL(a.href)
        })
    }

    onReady() {
        this.titleEl.textContent = this.getAttribute('label') || 'RESULT'
        if (this._pending) this.show(this._pending)
    }

    /* Plain text is rendered as escaped paragraphs; markdown-ish headings/bullets kept simple. */
    show(text) {
        this._text = text
        if (!this.isReady) { this._pending = text; return }
        const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
        this.body.innerHTML = esc(text)
            .split(/\n{2,}/).map(p => {
                const lines = p.split('\n')
                if (lines.every(l => /^\s*[-*] /.test(l)))
                    return '<ul>' + lines.map(l => '<li>' + l.replace(/^\s*[-*] /, '') + '</li>').join('') + '</ul>'
                if (/^#{1,3} /.test(p)) return '<h4>' + p.replace(/^#{1,3} /, '') + '</h4>'
                return '<p>' + lines.join('<br>') + '</p>'
            }).join('')
        this.hidden = false
    }
}
customElements.define('wa-result-card', WaResultCard)
export { WaResultCard }
