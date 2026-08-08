/* wa-flow-panel v0.1.1 — the declared workflow, visualised (issue 043, from the
   v0.33.56 human brief via dev pack v0.1.21__workflow-state-machine).

   A resizable right-side pane (🧭 toggle) with one rendering and two states:
   before a run it shows WHAT WILL HAPPEN — the declaration's steps with model,
   spending ceiling and the conditional branch — plus the quotable maximum for
   the currently chosen options; during and after a run the same cards are
   driven by the execution trace: live status, actual cost against budget,
   duration, degraded/failed states honestly coloured, the skipped branch
   dimmed. That trace is the provenance record.

   Pure API consumer: window.__tool.getWorkflow / getWorkflowTrace +
   wa:workflow:* events. Joins the one-pane-at-a-time protocol (wa:panel-opened). */
import { SgComponent } from 'https://dev.tools.sgraph.ai/components/base/v1/v1.0/v1.0.0/sg-component.js'

const LS_WIDTH = 'wa-flow-width'
const MIN_W = 320

const STATUS_BADGE = {
    pending: 'waiting', running: 'running', done: 'done', degraded: 'degraded',
    failed: 'failed', blocked: 'stopped', skipped: 'not requested',
}

class WaFlowPanel extends SgComponent {
    static jsUrl = import.meta.url

    bindElements() {
        this.toggle = this.$('.wa-flow__toggle')
        this.panel  = this.$('.wa-flow__panel')
        this.grip   = this.$('.wa-flow__grip')
        this.steps  = this.$('.wa-flow__steps')
        this.name   = this.$('.wa-flow__name')
        this.desc   = this.$('.wa-flow__desc')
        this.quote  = this.$('.wa-flow__quote')
        this.status = this.$('.wa-flow__status')
        this._open = false
        this._ticker = null
    }

    setupEventListeners() {
        this.addTrackedListener(this.toggle, 'click', () => this.setOpen(!this._open))
        this.addTrackedListener(this.$('.wa-flow__close'), 'click', () => this.setOpen(false))
        // one side pane at a time — same protocol as chat and debug
        this.addTrackedListener(window, 'wa:panel-opened', e => { if (e.detail?.id !== 'flow' && this._open) this.setOpen(false) })
        // live overlay: every step transition re-renders from the emitted trace
        for (const ev of ['wa:workflow:started', 'wa:workflow:step', 'wa:workflow:complete'])
            this.addTrackedListener(window, ev, e => { this._lastTrace = e.detail?.trace; if (this._open) this.render() })
        // the quote follows the options — re-render when the checkbox changes
        this.addTrackedListener(window, 'change', e => {
            if (e.target?.id === 'want-infographic' && this._open) this.render()
        })

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
            window.dispatchEvent(new CustomEvent('wa:panel-opened', { detail: { id: 'flow' } }))
            this.render()
        } else this.stopTicker()
    }

    /* GBP display: same idiom as the chat panel's config handoff — app.js parks
       the formatter on a global before the panel first renders. */
    gbp(usd) {
        const f = window.__waFlow?.fmtGbp
        return f ? f(usd) : '$' + Number(usd || 0).toFixed(3)
    }

    currentOptions() {
        return { infographic: !!document.querySelector('#want-infographic')?.checked }
    }

    async render() {
        let w
        try { w = await this.tool('getWorkflow', { options: this.currentOptions() }) }
        catch (_) {
            this.name.textContent = 'workflow declaration unavailable'
            this.desc.textContent = 'the tool cannot run without workflows/standard.json'
            return
        }
        let trace = this._lastTrace
        if (!trace) { try { trace = await this.tool('getWorkflowTrace') } catch (_) { trace = null } }

        const def = w.definition
        this.name.textContent = `${def.title} · ${def.version}`
        this.desc.textContent = def.description || ''
        if (trace) {
            const spent = this.gbp(trace.spentUsd)
            this.quote.innerHTML = `declared ceiling <strong>${this.esc(this.gbp(trace.quoteUsd))}</strong> · spent ${this.esc(spent)}`
            this.status.textContent = { running: 'running…', complete: 'completed', degraded: 'completed (degraded)', failed: 'stopped' }[trace.status] || ''
        } else {
            this.quote.innerHTML = `max cost for the current options <strong>${this.esc(this.gbp(w.quoteUsd))}</strong> — the sum of the step ceilings below`
            this.status.textContent = 'not run yet'
        }

        const byId = trace ? Object.fromEntries(trace.steps.map(s => [s.id, s])) : {}
        const onPath = this.pathIds(def, this.currentOptions())
        this.steps.replaceChildren(...def.steps.map(s => this.stepEl(s, byId[s.id], onPath.has(s.id))))
        if (trace?.status === 'running') this.startTicker(); else this.stopTicker()
    }

    stepEl(step, t, onPath) {
        const li = document.createElement('li')
        const status = t ? t.status : (onPath ? 'pending' : 'skipped')
        li.className = `step step--${status}`
        const dot = { pending: '○', running: '', done: '✓', degraded: '!', failed: '✕', blocked: '✕', skipped: '–' }[status] ?? '○'
        const model = t?.model ?? (step.model?.startsWith('options.') ? null : step.model)
        const cond = step.next.find(n => n.when)
        const meta = [model ? `<code>${this.esc(model)}</code>` : null,
                      step.kind.startsWith('llm') ? null : 'local, free'].filter(Boolean).join(' · ')
        const budget = this.gbp(step.budget.usd)
        let cost = `ceiling ${this.esc(budget)}`
        if (t && (t.status === 'done' || t.status === 'degraded') && t.costUsd != null)
            cost = `cost ${this.esc(this.gbp(t.costUsd))} of ${this.esc(budget)} ceiling` +
                   (t.overrun ? ' <span class="over">— over the declared ceiling</span>' : '') +
                   (t.ms != null ? ` · ${(t.ms / 1000).toFixed(1)}s` : '')
        else if (t?.status === 'running')
            cost = `ceiling ${this.esc(budget)} · <span class="elapsed" data-t0="${t.startedAt || Date.now()}">0s</span>`

        li.innerHTML =
            `<span class="step__dot">${status === 'running' ? '<span class="wa-spin"></span>' : dot}</span>` +
            `<div class="step__label">${this.esc(step.label)} <span class="step__badge">${STATUS_BADGE[status] || status}</span></div>` +
            (meta ? `<div class="step__meta">${meta}</div>` : '') +
            `<div class="step__cost">${cost}</div>` +
            (cond ? `<div class="step__cond">branch: → ${this.esc(cond.to)} only when ${this.esc(cond.when.replace('options.', ''))} is requested</div>` : '') +
            (t?.error && t.status !== 'done' ? `<div class="step__err">${this.esc(String(t.error))}</div>` : '')
        return li
    }

    /* The step ids on the path the CURRENT options select (pre-run dimming) —
       the same walk the runner takes, done over the declaration alone. */
    pathIds(def, options) {
        const byId = Object.fromEntries(def.steps.map(s => [s.id, s]))
        const on = new Set()
        let id = def.start
        while (id !== 'done' && byId[id] && !on.has(id)) {
            on.add(id)
            const taken = byId[id].next.find(n => n.when == null ||
                (n.when.startsWith('options.') && !!options[n.when.slice(8)]))
            if (!taken) break
            id = taken.to
        }
        return on
    }

    startTicker() {
        if (this._ticker) return
        this._ticker = setInterval(() => {
            this.steps.querySelectorAll('.elapsed[data-t0]').forEach(el => {
                el.textContent = Math.round((Date.now() - Number(el.dataset.t0)) / 1000) + 's'
            })
        }, 500)
    }
    stopTicker() { if (this._ticker) { clearInterval(this._ticker); this._ticker = null } }
    cleanup() { this.stopTicker(); super.cleanup?.() }

    esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
}
customElements.define('wa-flow-panel', WaFlowPanel)
export { WaFlowPanel }
