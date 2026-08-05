/* wa-debug-panel v0.1.2 — the advanced/debug pane (issue 027).
   v0.1.1 (issue 031): in-flight rows show a live elapsed counter, so a
   long image generation (~80s) reads as working, not stuck.
   v0.1.2 (issue 034): plays nicely with the chat pane — only one right-side
   pane is open at a time, coordinated via the wa:panel-opened event.

   A toggle tab fixed to the right edge opens a resizable side pane with three
   views: every LLM exchange the page made (full request + response), OpenRouter
   details (key status, model catalogue entries, generation records by id), and
   the three prompt templates — editable, with overrides persisted in this
   browser.

   The pane talks ONLY through the published window.__tool API (getExchanges,
   getPrompts, setPrompt, resetPrompt, fetchGeneration, getKeyStatus,
   getModelDetails) and the wa:debug:* events — it is deliberately just another
   consumer of the same surface any embedder gets. */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

const LS_WIDTH = 'wa-debug-width'
const LS_OPEN  = 'wa-debug-open'
const MIN_W = 320

class WaDebugPanel extends SgComponent {
    static jsUrl = import.meta.url

    bindElements() {
        this.toggle   = this.$('.wa-dbg__toggle')
        this.panel    = this.$('.wa-dbg__panel')
        this.grip     = this.$('.wa-dbg__grip')
        this.tabs     = [...this.shadowRoot.querySelectorAll('.wa-dbg__tab')]
        this.views    = { exchanges: this.$('[data-view="exchanges"]'),
                          openrouter: this.$('[data-view="openrouter"]'),
                          prompts: this.$('[data-view="prompts"]') }
        this.exList   = this.$('.wa-dbg__ex-list')
        this.exCount  = this.$('.wa-dbg__ex-count')
        this.orOut    = this.$('.wa-dbg__or-out')
        this.genInput = this.$('.wa-dbg__gen-input')
        this.prList   = this.$('.wa-dbg__prompts')
        this._genCache = new Map()   // generationId -> fetched record
    }

    setupEventListeners() {
        this.addTrackedListener(this.toggle, 'click', () => this.setOpen(!this._open))
        this.tabs.forEach(t => this.addTrackedListener(t, 'click', () => this.showView(t.dataset.tab)))
        this.addTrackedListener(this.$('.wa-dbg__close'), 'click', () => this.setOpen(false))
        this.addTrackedListener(this.$('.wa-dbg__clear'), 'click', async () => { await this.tool('clearExchanges'); this.renderExchanges() })
        this.addTrackedListener(this.$('.wa-dbg__key-check'), 'click', () => this.checkKey())
        this.addTrackedListener(this.$('.wa-dbg__models-load'), 'click', () => this.loadModels())
        this.addTrackedListener(this.$('.wa-dbg__gen-fetch'), 'click', () => this.lookupGeneration(this.genInput.value.trim()))

        // Resize: drag the left-edge grip; width persists across visits.
        this.addTrackedListener(this.grip, 'pointerdown', (e) => {
            e.preventDefault()
            this.grip.setPointerCapture(e.pointerId)
            const onMove = (ev) => {
                const w = Math.min(Math.max(window.innerWidth - ev.clientX, MIN_W), window.innerWidth - 60)
                this.panel.style.width = w + 'px'
            }
            const onUp = (ev) => {
                this.grip.releasePointerCapture(ev.pointerId)
                this.grip.removeEventListener('pointermove', onMove)
                this.grip.removeEventListener('pointerup', onUp)
                try { localStorage.setItem(LS_WIDTH, parseInt(this.panel.style.width, 10)) } catch (_) {}
            }
            this.grip.addEventListener('pointermove', onMove)
            this.grip.addEventListener('pointerup', onUp)
        })

        // One right-side pane at a time — the chat pane announces itself the same way.
        this.addTrackedListener(window, 'wa:panel-opened', e => { if (e.detail?.id !== 'debug' && this._open) this.setOpen(false) })

        // Live refresh as the pass runs.
        this.addTrackedListener(window, 'wa:debug:exchange', () => { if (this._open) this.renderExchanges() })
        this.addTrackedListener(window, 'wa:debug:cleared', () => { if (this._open) this.renderExchanges() })
        this.addTrackedListener(window, 'wa:debug:prompt-changed', () => { if (this._open) this.renderPrompts() })
    }

    onReady() {
        const w = (() => { try { return parseInt(localStorage.getItem(LS_WIDTH), 10) } catch (_) { return null } })()
        if (w >= MIN_W) this.panel.style.width = w + 'px'
        this.showView('exchanges')
        const open = (() => { try { return localStorage.getItem(LS_OPEN) === '1' } catch (_) { return false } })()
        this.setOpen(open)
    }

    /* window.__tool publishes after tool:ready — resolve it patiently once. */
    async tool(action, params) {
        for (let i = 0; i < 100 && !(window.__tool && window.__tool[action]); i++) await new Promise(r => setTimeout(r, 100))
        if (!(window.__tool && window.__tool[action])) throw new Error('tool API not available')
        return window.__tool[action](params)
    }

    setOpen(open) {
        this._open = open
        this.panel.classList.toggle('open', open)
        this.toggle.classList.toggle('open', open)
        this.toggle.setAttribute('aria-expanded', String(open))
        try { localStorage.setItem(LS_OPEN, open ? '1' : '0') } catch (_) {}
        if (open) {
            window.dispatchEvent(new CustomEvent('wa:panel-opened', { detail: { id: 'debug' } }))
            this.renderExchanges(); this.renderPrompts(); this.startTicker()
        }
        else this.stopTicker()
    }

    /* Live elapsed counters on pending rows — 1s tick while the pane is open. */
    startTicker() {
        this.stopTicker()
        this._ticker = setInterval(() => {
            this.exList.querySelectorAll('.elapsed[data-ts]').forEach(el => {
                el.textContent = `⏳ ${Math.round((Date.now() - Number(el.dataset.ts)) / 1000)}s`
            })
        }, 1000)
    }
    stopTicker() { if (this._ticker) { clearInterval(this._ticker); this._ticker = null } }
    cleanup() { this.stopTicker(); super.cleanup?.() }

    showView(name) {
        this.tabs.forEach(t => t.classList.toggle('on', t.dataset.tab === name))
        Object.entries(this.views).forEach(([k, el]) => { el.hidden = k !== name })
        if (name === 'prompts') this.renderPrompts()
        if (name === 'exchanges') this.renderExchanges()
    }

    // --- exchanges view ---------------------------------------------------------

    async renderExchanges() {
        let list = []
        try { list = await this.tool('getExchanges', { limit: 100 }) } catch (_) { return }
        this.exCount.textContent = list.length ? `${list.length} call${list.length === 1 ? '' : 's'} this session` : 'no LLM calls yet — run a pass'
        const open = new Set([...this.exList.querySelectorAll('details[open]')].map(d => d.dataset.id))
        this.exList.replaceChildren(...list.slice().reverse().map(e => this.exchangeRow(e, open.has(String(e.id)))))
    }

    exchangeRow(e, wasOpen) {
        const d = document.createElement('details')
        d.dataset.id = e.id
        if (wasOpen) d.open = true
        const s = document.createElement('summary')
        const badge = `<span class="badge badge--${e.kind}">${e.kind}</span>`
        const status = `<span class="status status--${e.status}">${e.status}</span>`
        const r = e.response || {}
        const bits = []
        if (e.model) bits.push(this.esc(e.model))
        if (r.latencyMs) bits.push((r.latencyMs / 1000).toFixed(1) + 's')
        if (r.promptTokens != null) bits.push(`${r.promptTokens}→${r.completionTokens ?? '…'} tok`)
        if (r.costUsd != null) bits.push('$' + r.costUsd.toFixed(5))
        const elapsed = e.status === 'pending'
            ? ` <span class="meta elapsed" data-ts="${e.ts}">⏳ ${Math.round((Date.now() - e.ts) / 1000)}s</span>` : ''
        s.innerHTML = `${badge} ${status}${elapsed} <span class="meta">${bits.join(' · ')}</span>`
        d.append(s)

        const body = document.createElement('div')
        body.className = 'ex-body'
        body.append(this.jsonBlock('request', this.compactRequest(e)),
                    this.jsonBlock('response', e.status === 'pending' ? '⏳ in flight…' : (e.response ?? { error: e.error, code: e.errorCode })))
        const genId = r.generationId
        if (genId) {
            const wrap = document.createElement('div')
            const btn = document.createElement('button')
            btn.className = 'mini'
            btn.textContent = this._genCache.has(genId) ? 'openrouter generation ▾' : 'fetch openrouter generation record'
            const out = document.createElement('div')
            if (this._genCache.has(genId)) out.append(this.jsonBlock('openrouter generation ' + genId, this._genCache.get(genId)))
            btn.addEventListener('click', async () => {
                btn.disabled = true; btn.textContent = 'fetching…'
                try {
                    const rec = await this.tool('fetchGeneration', { id: genId })
                    this._genCache.set(genId, rec)
                    out.replaceChildren(this.jsonBlock('openrouter generation ' + genId, rec))
                    btn.textContent = 'openrouter generation ▾'
                } catch (err) { btn.textContent = 'fetch failed: ' + err.message; btn.disabled = false }
            })
            wrap.append(btn, out)
            body.append(wrap)
        }
        d.append(body)
        return d
    }

    /* The audio bytes travel as a data: URL megastring — show its size, not itself. */
    compactRequest(e) {
        const req = e.request || {}
        if (!req.messages) return req
        const messages = req.messages.map(m => !Array.isArray(m.content) ? m : ({ ...m,
            content: m.content.map(p => (p && p.data_url)
                ? { ...p, data_url: `[${(p.data_url.length / 1024).toFixed(0)} KB base64 audio omitted]` } : p) }))
        return { ...req, messages }
    }

    jsonBlock(title, value) {
        const det = document.createElement('details')
        det.open = true
        const sum = document.createElement('summary'); sum.textContent = title
        const pre = document.createElement('pre')
        pre.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
        det.append(sum, pre)
        det.className = 'json'
        return det
    }

    // --- openrouter view --------------------------------------------------------

    async checkKey() {
        this.orOut.replaceChildren(this.jsonBlock('key status', '⏳ asking OpenRouter…'))
        try { this.orOut.replaceChildren(this.jsonBlock('key status (GET /api/v1/key)', await this.tool('getKeyStatus'))) }
        catch (e) { this.orOut.replaceChildren(this.jsonBlock('key status', 'failed: ' + e.message)) }
    }

    async loadModels() {
        this.orOut.replaceChildren(this.jsonBlock('models', '⏳ loading catalogue…'))
        try {
            const used = [...new Set((await this.tool('getExchanges', { limit: 100 })).map(e => e.model).filter(Boolean))]
            const ids = used.length ? used : ['google/gemini-3.5-flash']
            const details = await this.tool('getModelDetails', { ids })
            this.orOut.replaceChildren(this.jsonBlock(`models used this session (GET /api/v1/models) — ${ids.join(', ')}`, details))
        } catch (e) { this.orOut.replaceChildren(this.jsonBlock('models', 'failed: ' + e.message)) }
    }

    async lookupGeneration(id) {
        if (!id) return
        this.orOut.replaceChildren(this.jsonBlock('generation ' + id, '⏳ fetching…'))
        try { this.orOut.replaceChildren(this.jsonBlock('generation ' + id + ' (GET /api/v1/generation)', await this.tool('fetchGeneration', { id }))) }
        catch (e) { this.orOut.replaceChildren(this.jsonBlock('generation ' + id, 'failed: ' + e.message)) }
    }

    // --- prompts view -----------------------------------------------------------

    async renderPrompts() {
        let prompts = []
        try { prompts = await this.tool('getPrompts') } catch (_) { return }
        this.prList.replaceChildren(...prompts.map(p => this.promptEditor(p)))
    }

    promptEditor(p) {
        const box = document.createElement('div')
        box.className = 'prompt'
        const head = document.createElement('div')
        head.className = 'prompt__head'
        head.innerHTML = `<strong>${this.esc(p.label)}</strong>` +
            (p.override != null ? ' <span class="badge badge--override">override active</span>' : '')
        const note = document.createElement('p')
        note.className = 'prompt__note'
        note.textContent = p.note
        const ta = document.createElement('textarea')
        ta.value = p.active || '(loads on first use — run a pass, or edit and save to set it now)'
        ta.rows = Math.min(14, Math.max(4, (p.active || '').split('\n').length + 1))
        const row = document.createElement('div')
        row.className = 'prompt__actions'
        const save = document.createElement('button'); save.className = 'mini'; save.textContent = 'save override'
        const reset = document.createElement('button'); reset.className = 'mini'; reset.textContent = 'reset to default'
        reset.disabled = p.override == null
        save.addEventListener('click', async () => {
            await this.tool('setPrompt', { kind: p.kind, text: ta.value })
            save.textContent = 'saved ✓'; setTimeout(() => { save.textContent = 'save override' }, 1500)
        })
        reset.addEventListener('click', async () => { await this.tool('resetPrompt', { kind: p.kind }); this.renderPrompts() })
        row.append(save, reset)
        box.append(head, note, ta, row)
        return box
    }

    esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
}
customElements.define('wa-debug-panel', WaDebugPanel)
export { WaDebugPanel }
