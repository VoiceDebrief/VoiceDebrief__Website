/* wa-result-card v0.1.3 — line-based markdown-ish renderer: headings and bullet
   lists render correctly even when the model puts them in one block (M1 polish). */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

class WaResultCard extends SgComponent {
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
        this._waLocalise()
        this.titleEl.textContent = this.getAttribute('label') || 'RESULT'
        if (this._pending) this.show(this._pending)
    }

    show(text) {
        this._text = text
        if (!this.isReady) { this._pending = text; return }
        const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
        const inline = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        const out = []
        let list = null
        const flushList = () => { if (list) { out.push('<ul>' + list.join('') + '</ul>'); list = null } }
        let para = []
        const flushPara = () => { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = [] } }
        for (const raw of text.split('\n')) {
            const line = raw.trimEnd()
            if (/^#{1,4} /.test(line)) { flushList(); flushPara(); out.push('<h4>' + inline(line.replace(/^#{1,4} /, '')) + '</h4>') }
            else if (/^\s*[-*] /.test(line)) { flushPara(); (list ??= []).push('<li>' + inline(line.replace(/^\s*[-*] /, '')) + '</li>') }
            else if (line.trim() === '') { flushList(); flushPara() }
            else { flushList(); para.push(line) }
        }
        flushList(); flushPara()
        this.body.innerHTML = out.join('')
        this.hidden = false
    }
}
customElements.define('wa-result-card', WaResultCard)
export { WaResultCard }
