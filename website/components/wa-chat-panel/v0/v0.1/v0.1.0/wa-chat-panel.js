/* wa-chat-panel v0.1.0 — talk to your materials (issue 034, M3).

   A resizable right-side pane (💬 toggle) rendering the chat the app-level
   controller runs: context composer whose checkboxes ARE the request rows,
   suggestions, model choice, the message thread with visible tool calls, a
   spend meter, and timer-driven progress while the model works.

   Pure API consumer: everything goes through window.__tool (getChatContext,
   chatExchange, getChatHistory, clearChat, getChatTools) + wa:chat:* events. */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

const LS_WIDTH = 'wa-chat-width'
const MIN_W = 340

class WaChatPanel extends SgComponent {
    static jsUrl = import.meta.url

    bindElements() {
        this.toggle  = this.$('.wa-chat__toggle')
        this.panel   = this.$('.wa-chat__panel')
        this.grip    = this.$('.wa-chat__grip')
        this.thread  = this.$('.wa-chat__thread')
        this.ctxList = this.$('.wa-chat__ctx')
        this.sugg    = this.$('.wa-chat__suggestions')
        this.input   = this.$('.wa-chat__input')
        this.sendBtn = this.$('.wa-chat__send')
        this.modelSel= this.$('.wa-chat__model')
        this.meter   = this.$('.wa-chat__meter')
        this.toolsUl = this.$('.wa-chat__tools')
        this._open = false
        this._ticker = null
    }

    setupEventListeners() {
        this.addTrackedListener(this.toggle, 'click', () => this.setOpen(!this._open))
        this.addTrackedListener(this.$('.wa-chat__close'), 'click', () => this.setOpen(false))
        this.addTrackedListener(this.$('.wa-chat__clear'), 'click', async () => { await this.tool('clearChat'); this.renderThread() })
        this.addTrackedListener(this.sendBtn, 'click', () => this.send())
        this.addTrackedListener(this.input, 'keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send() } })
        this.addTrackedListener(window, 'wa:chat:update', () => { if (this._open) this.renderThread() })
        this.addTrackedListener(window, 'wa:pass:complete', () => { if (this._open) this.renderContext() })
        // one side pane at a time — the debug pane listens for the same signal
        this.addTrackedListener(window, 'wa:panel-opened', e => { if (e.detail?.id !== 'chat' && this._open) this.setOpen(false) })

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
    }

    async onReady() {
        const w = (() => { try { return parseInt(localStorage.getItem(LS_WIDTH), 10) } catch (_) { return null } })()
        if (w >= MIN_W) this.panel.style.width = w + 'px'
        // models + suggestions come from the app config via the manifest globals set in app.js
        const cfg = window.__waChat || { models: [], suggestions: [] }
        cfg.models.forEach(m => this.modelSel.add(new Option(m.label, m.id)))
        this.sugg.replaceChildren(...cfg.suggestions.map(s => {
            const b = document.createElement('button')
            b.className = 'chip'; b.type = 'button'; b.textContent = s
            b.addEventListener('click', () => { this.input.value = s; this.send() })
            return b
        }))
    }

    async tool(action, params) {
        for (let i = 0; i < 100 && !(window.__tool && window.__tool[action]); i++) await new Promise(r => setTimeout(r, 100))
        if (!(window.__tool && window.__tool[action])) throw new Error('tool API not available')
        return window.__tool[action](params)
    }

    setOpen(open) {
        this._open = open
        this.panel.classList.toggle('open', open)
        this.toggle.classList.toggle('open', open)
        if (open) {
            window.dispatchEvent(new CustomEvent('wa:panel-opened', { detail: { id: 'chat' } }))
            this.renderContext(); this.renderThread(); this.renderTools()
            this.input.focus()
        }
    }

    async renderContext() {
        let rows = []
        try { rows = await this.tool('getChatContext') } catch (_) { return }
        this.ctxList.replaceChildren(...rows.map(r => {
            const label = document.createElement('label')
            label.className = 'ctx-row'
            const cb = document.createElement('input')
            cb.type = 'checkbox'; cb.checked = !!r.on; cb.dataset.id = r.id
            const span = document.createElement('span')
            span.innerHTML = `<strong>${this.esc(r.label)}</strong>` +
                (r.sub ? ` <em>${this.esc(r.sub)}</em>` : '') +
                (r.tok != null ? ` <em>~${r.tok} tok</em>` : '')
            label.append(cb, span)
            return label
        }))
    }

    rowsOn() { return [...this.ctxList.querySelectorAll('input:checked')].map(cb => cb.dataset.id) }

    async renderTools() {
        try {
            const tools = await this.tool('getChatTools')
            this.toolsUl.replaceChildren(...tools.map(t => {
                const li = document.createElement('li')
                li.innerHTML = `<code>${this.esc(t.action)}</code> <span class="tier tier--${t.tier.replace(/\s+/g, '-')}">${this.esc(t.tier)}</span> — ${this.esc(t.desc)}`
                return li
            }))
        } catch (_) {}
    }

    async renderThread() {
        let h
        try { h = await this.tool('getChatHistory') } catch (_) { return }
        this.meter.textContent = h.calls
            ? `${h.calls} call(s) · ${h.spendGbp} this chat` : 'nothing spent yet'
        this.sendBtn.disabled = h.busy
        const atBottom = this.thread.scrollHeight - this.thread.scrollTop - this.thread.clientHeight < 80
        this.thread.replaceChildren(...h.messages.map(m => this.messageEl(m)))
        if (h.busy) this.startTicker(); else this.stopTicker()
        if (atBottom) this.thread.scrollTop = this.thread.scrollHeight
    }

    messageEl(m) {
        const div = document.createElement('div')
        if (m.role === 'tool') {
            div.className = 'msg msg--tool' + (m.ok ? '' : ' msg--toolfail')
            div.innerHTML = `<span class="did">⚙ ${this.esc(m.did)}</span> ${this.esc(m.content)}`
            return div
        }
        div.className = 'msg msg--' + m.role + (m.toolOnly ? ' msg--machinery' : '') + (m.error ? ' msg--error' : '')
        if (m.pending) {
            div.innerHTML = `<span class="wa-spin"></span><span class="pending-note">thinking — <span class="elapsed" data-t0="${Date.now()}">0s</span></span>`
        } else if (m.role === 'bot') {
            div.innerHTML = this.md(m.content)
            if (m.costUsd != null || m.tookMs != null) {
                const meta = document.createElement('div')
                meta.className = 'msg-meta'
                meta.textContent = [m.model, m.tookMs != null ? (m.tookMs / 1000).toFixed(1) + 's' : null,
                    m.costUsd != null ? '$' + m.costUsd.toFixed(5) : null].filter(Boolean).join(' · ')
                div.append(meta)
            }
        } else div.textContent = m.content
        return div
    }

    startTicker() {
        if (this._ticker) return
        this._ticker = setInterval(() => {
            this.thread.querySelectorAll('.elapsed[data-t0]').forEach(el => {
                el.textContent = Math.round((Date.now() - Number(el.dataset.t0)) / 1000) + 's'
            })
        }, 500)
    }
    stopTicker() { if (this._ticker) { clearInterval(this._ticker); this._ticker = null } }
    cleanup() { this.stopTicker(); super.cleanup?.() }

    async send() {
        const text = this.input.value.trim()
        if (!text) return
        this.input.value = ''
        try {
            await this.tool('chatExchange', { text, rowsOn: this.rowsOn(), model: this.modelSel.value })
        } catch (_) { /* the failed message is already in the thread */ }
        this.renderThread(); this.renderContext()
    }

    /* Small line renderer for model prose — the fenced tool blocks stay visible as code. */
    md(src) {
        const esc = this.esc
        const out = []; let list = null, fence = null
        const flush = () => { if (list) { out.push('</ul>'); list = null } }
        for (const raw of String(src || '').split('\n')) {
            const line = raw.trimEnd()
            if (fence !== null) {
                if (/^```/.test(line.trim())) { out.push(`<pre><code>${esc(fence.join('\n'))}</code></pre>`); fence = null }
                else fence.push(raw)
                continue
            }
            if (/^```/.test(line.trim())) { flush(); fence = []; continue }
            const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            if (/^#{1,4} /.test(line)) { flush(); out.push('<h4>' + inline(line.replace(/^#{1,4} /, '')) + '</h4>') }
            else if (/^\s*[-*] /.test(line)) { if (!list) { out.push('<ul>'); list = true } out.push('<li>' + inline(line.replace(/^\s*[-*] /, '')) + '</li>') }
            else if (!line.trim()) flush()
            else { flush(); out.push('<p>' + inline(line) + '</p>') }
        }
        if (fence !== null) out.push(`<pre><code>${esc(fence.join('\n'))}</code></pre>`)
        flush()
        return out.join('')
    }

    esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
}
customElements.define('wa-chat-panel', WaChatPanel)
export { WaChatPanel }
