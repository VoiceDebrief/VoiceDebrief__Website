/* wa-drop-zone — the one drop zone. Emits wa:file-chosen {file}. One file at a time
   (a second drop replaces the offer). Format detection is the engine's job. */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

class WaDropZone extends SgComponent {
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
        this.zone  = this.$('.wa-drop')
        this.input = this.$('input[type=file]')
    }

    setupEventListeners() {
        this.addTrackedListener(this.zone, 'click', () => this.input.click())
        this.addTrackedListener(this.zone, 'dragover', e => { e.preventDefault(); this.zone.classList.add('over') })
        this.addTrackedListener(this.zone, 'dragleave', () => this.zone.classList.remove('over'))
        this.addTrackedListener(this.zone, 'drop', this.onDrop)
        this.addTrackedListener(this.input, 'change', () => this.pick(this.input.files))
    }

    onDrop(e) {
        e.preventDefault()
        this.zone.classList.remove('over')
        this.pick(e.dataTransfer.files)
    }

    pick(files) {
        if (!files || !files.length) return
        this.emit('wa:file-chosen', { file: files[0] })
    }

    setBusy(busy) { this.zone.classList.toggle('busy', !!busy) }
}
customElements.define('wa-drop-zone', WaDropZone)
export { WaDropZone }
