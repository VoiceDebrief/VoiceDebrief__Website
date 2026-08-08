/* wa-drop-zone — the one drop zone. Emits wa:file-chosen {file}. One file at a time
   (a second drop replaces the offer). Format detection is the engine's job. */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

class WaDropZone extends SgComponent {
    static jsUrl = import.meta.url

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
