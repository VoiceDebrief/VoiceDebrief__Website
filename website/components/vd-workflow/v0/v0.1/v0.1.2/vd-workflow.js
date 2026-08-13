/* vd-workflow v0.1.2 — the panel from the design pack (issue 060, M3).

   v0.1.2 makes the infographic a REAL tab that exists while it is drawn, not a
   pane that appears at the end (Dinis, from QA: "the infographic is still not
   working … the request to create the infographic is not made").

   The cause was one line in home.js: it handed the pipeline a mount that was
   `document.createElement('div')` and never attached. The infographic renderer
   appends `<sg-llm-request>` into that mount and waits for it — and a custom
   element in a DETACHED tree never upgrades, so the element never connected,
   never called anything, and the step sat at "running" with no network request
   behind it. Eighty-six seconds of nothing, which is what the screenshot shows.

   The fix belongs here rather than only there: the mount is now SLOTTED into the
   infographic pane. It lives in the page's light DOM — so it is connected, and
   stays connected across the panel's re-renders, which innerHTML would otherwise
   destroy mid-draw — and it is rendered where the drawing should be seen. An
   image model takes 60–90 seconds; watching it arrive is the difference between
   a slow step and a broken one.

   v0.1.1 fixes a running state that could not tell the truth and gave no way out
   (Dinis, from QA, with a screenshot showing "Translating…" still spinning while
   "Writing the debrief" had already ticked).

   Three changes, one cause. v0.1.0 kept its OWN list of steps and advanced it by
   guessing — mark one done, promote the next. The run does not work like that:
   a step can be SKIPPED (translate, when the recording is already in the
   reader's language), DEGRADED (it failed but the pass carried on), or BLOCKED
   (the budget gate stopped it), and none of those emit the completion event the
   guess was waiting for. So the row sat spinning for something that had already
   been decided against, and the panel's account of the run disagreed with the
   run's own.

   1. THE STEP LIST IS THE TRACE. `setTrace()` renders whatever the declared
      workflow says, statuses and all, including the ones a guess cannot infer.
      There is now one source for what happened, and it is the executing one.
   2. ARTEFACTS APPEAR AS THEY ARRIVE, not at the end. The transcript is readable
      while the infographic is still drawing — an image model takes 60–90s, which
      is long enough that a panel showing nothing looks broken. The caveat follows
      the transcript rather than the state, because rule 3 is about what exists on
      screen, not about which state we are in.
   3. THERE IS A WAY OUT. Stop cancels the pass; a failed or degraded run offers
      retry. A machine that only moves forwards is one a person cannot leave.

   Every running row carries its own elapsed seconds, so "slow" and "stuck" stop
   looking the same.

   One recording in, four artefacts out, on the home page. It owns the state
   machine in `04-states.md`:

     empty ─drop/pick─► ready ─run─► [key held?] ─no─► key ─saved─► running ─► results
       ▲                  │              │yes                          │
       └─── remove ───────┘              └──────────────────────────────┘
       ◄──────────────── start another ──────────────────────────────────┘

   Three rules from the design that must not be traded away later:

   1. THE KEY IS NEVER ASKED FOR BEFORE RUN. A stranger can load a recording, set
      both options and read the quoted maximum without meeting a password field.
      The `key` state is reachable only from `run`, never from load.
   2. THE ROUTING STATEMENT IS WELDED TO THE PANEL — same border, no gap, present
      in every pre-result state, at body size, and NOT styled as a warning. No
      amber, no icon: framing integrity as a hazard invites the reader to dismiss
      it. Do not move it to a footer, a tooltip or below the fold to improve
      conversion.
   3. THE CAVEAT SITS WITH THE TRANSCRIPT, and only once a transcript exists. A
      transcript looks authoritative in a way a debrief does not, so the caveat
      belongs where that impression is created — and before any result exists it
      would read as boilerplate and be scrolled past.

   Deliberately dependency-free: no SgComponent, no imports, no fetches. It must
   render on a page that never reaches the engine origin, and must not fail with
   it — the home page's first screen cannot depend on a third party answering.
   The page module (home.js) owns the engine and drives this through its API.

   Colour is read from --vd-* on :root and inherits through the shadow boundary;
   every var() keeps a literal fallback so the component still renders standalone
   in a harness that loads no sheet.

   Drive it:
     el.setFile({name, bytes})        → ready
     el.setQuote('£0.24')             the maximum, shown before anything runs
     el.askForKey()                   → key       (only from a run attempt)
     el.startRun([{id,label}, …], {infographic})  → running (the declared path)
     el.setTrace(trace)               the executing truth: statuses, cost, ms
     el.artefact(kind, value)         show one as soon as it exists
     el.showResults({...})            → results
     el.showError({title, body, detail, actions:[{label,event}]})
     el.reset()                       → empty
   Listen:
     vd:file {file} · vd:sample · vd:demo · vd:run {translate,infographic}
     vd:key-save {apiKey} · vd:reset · vd:state {state} · vd:option {…}
     vd:stop · vd:retry
*/

const STATES = ['empty', 'ready', 'key', 'running', 'results', 'error']

const STATE_LABEL = {
    empty:   'Ready for a recording',
    ready:   'File loaded — not sent anywhere yet',
    key:     'Needs your OpenRouter key',
    running: 'Running one pass',
    results: 'Done — nothing stored',
    error:   'That did not work',
}

const ROUTING_HTML =
    'Your audio leaves this browser once, to <strong>OpenRouter</strong>, which hands it to ' +
    'whichever model provider it picks. <strong>We do not know which provider gets your ' +
    'recording, and we have no control over what they do with it.</strong> We store nothing — ' +
    'there is no server of ours in the path. Don’t send anything you wouldn’t hand to a stranger.'

const CAVEAT_HTML =
    '<strong>Written by a model, not a stenographer.</strong> It can mishear, and it can add ' +
    'words nobody said. Check anything that matters against the audio.'

const CSS = `
:host{display:block;
  font-family:var(--vd-font,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif)}
*{box-sizing:border-box}
.panel{border:1px solid var(--vd-L,#D8E1E9);border-radius:var(--vd-r-panel,18px);
  background:var(--vd-c,#fff);overflow:hidden;box-shadow:0 18px 44px var(--vd-sh,rgba(11,27,43,.09))}
.head{display:flex;align-items:center;gap:10px;padding:14px 20px;
  border-bottom:1px solid var(--vd-l,#E3E9EF);background:var(--vd-b,#F8FAFC)}
.head .dot{width:8px;height:8px;border-radius:50%;background:var(--vd-a,#0E9E72);flex:none}
.head .state{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;font-weight:600;
  color:var(--vd-m,#6B7F94)}
.head .restart{margin-left:auto}
.body{padding:26px 24px}

button{font:inherit;cursor:pointer}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-size:.94rem;
  font-weight:600;padding:12px 20px;min-height:44px;border-radius:var(--vd-r-ctl,10px);
  border:1px solid transparent;text-decoration:none}
.btn-primary{background:var(--vd-a,#0E9E72);color:var(--vd-ai,#fff);border-color:var(--vd-a,#0E9E72)}
.btn-primary:hover:not(:disabled){background:var(--vd-at,#0A7D5A);border-color:var(--vd-at,#0A7D5A)}
.btn-primary:disabled{background:var(--vd-off,#EDF1F5);color:var(--vd-offi,#8697A8);
  border-color:var(--vd-off,#EDF1F5);cursor:not-allowed}
.btn-quiet{background:var(--vd-c,#fff);border-color:var(--vd-L,#D8E1E9);color:var(--vd-i,#0B1B2B)}
.btn-quiet:hover{border-color:var(--vd-a,#0E9E72)}
.btn-sm{font-size:.8rem;padding:6px 12px;min-height:32px}
.link{background:none;border:0;padding:0;color:var(--vd-at,#0A7D5A);text-decoration:underline;
  text-underline-offset:3px;font-size:inherit}
.link:hover{color:var(--vd-i,#0B1B2B)}
a{color:var(--vd-at,#0A7D5A);text-decoration:underline;text-underline-offset:3px}
:focus-visible{outline:2px solid var(--vd-a,#0E9E72);outline-offset:2px;border-radius:3px}

/* empty */
.drop{border:2px dashed var(--vd-tl,#9FD8C4);background:var(--vd-tn,#F2FBF7);
  border-radius:var(--vd-r-card,13px);padding:44px 28px;text-align:center}
:host(.dragover) .drop{background:var(--vd-c,#fff);border-color:var(--vd-a,#0E9E72)}
.drop h3{margin:0;font-size:1.4rem;font-weight:700;letter-spacing:-.02em;color:var(--vd-i,#0B1B2B)}
.drop p{margin:10px 0 0;font-size:.94rem;color:var(--vd-t,#45596E)}
.drop .row{margin-top:26px;display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
input[type=file]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}

/* ready */
.file{display:flex;align-items:center;gap:14px;border:1px solid var(--vd-l,#E3E9EF);
  background:var(--vd-b,#F8FAFC);border-radius:var(--vd-r-card,13px);padding:14px 16px}
.file .name{font-size:.94rem;font-weight:600;color:var(--vd-i,#0B1B2B);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.file .meta{font-size:.8rem;color:var(--vd-m,#6B7F94);margin-top:2px}
.file .grow{min-width:0;flex:1}
.local{font-size:.8rem;color:var(--vd-at,#0A7D5A);margin-top:10px}
.opts{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.opt{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--vd-L,#D8E1E9);
  background:var(--vd-c,#fff);border-radius:var(--vd-r-chip,999px);padding:9px 16px;
  font-size:.86rem;color:var(--vd-t,#45596E);cursor:pointer;min-height:40px}
.opt input{accent-color:var(--vd-a,#0E9E72);width:16px;height:16px}
.opt.on{border-color:var(--vd-tl,#9FD8C4);background:var(--vd-tn,#F2FBF7);color:var(--vd-ti,#204738)}
.runrow{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:20px}
.quote{font-size:.83rem;color:var(--vd-m,#6B7F94)}
.quote b{color:var(--vd-i,#0B1B2B)}
.billing{font-size:.78rem;color:var(--vd-m,#6B7F94);margin-top:8px}

/* key */
.key h3{margin:0;font-size:1.06rem;color:var(--vd-i,#0B1B2B)}
.key p{margin:8px 0 0;font-size:.9rem;color:var(--vd-t,#45596E)}
.keyrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
label.kl{display:block;font-size:.7rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
  color:var(--vd-m,#6B7F94);margin-top:16px}
input[type=password]{flex:1;min-width:220px;font:inherit;font-size:1rem;padding:11px 14px;
  border:1px solid var(--vd-L,#D8E1E9);border-radius:var(--vd-r-ctl,10px);
  background:var(--vd-c,#fff);color:var(--vd-i,#0B1B2B)}
.hint{font-size:.8rem;color:var(--vd-m,#6B7F94);margin-top:10px}

/* running */
.bar{height:6px;border-radius:999px;background:var(--vd-off,#EDF1F5);overflow:hidden}
.bar i{display:block;height:100%;background:var(--vd-a,#0E9E72);transition:width .3s}
.steps{list-style:none;margin:18px 0 0;padding:0;display:flex;flex-direction:column;gap:10px}
.steps li{display:flex;align-items:center;gap:10px;font-size:.9rem;color:var(--vd-m,#6B7F94)}
.steps li .mark{width:18px;height:18px;border-radius:50%;border:1px solid var(--vd-L,#D8E1E9);
  display:inline-flex;align-items:center;justify-content:center;font-size:.65rem;flex:none}
.steps li[data-status=now]{color:var(--vd-i,#0B1B2B);font-weight:600}
.steps li[data-status=now] .mark{border-color:var(--vd-a,#0E9E72)}
.steps li[data-status=done]{color:var(--vd-t,#45596E)}
.steps li[data-status=done] .mark{background:var(--vd-a,#0E9E72);color:var(--vd-ai,#fff);
  border-color:var(--vd-a,#0E9E72)}
.steps li[data-status=failed] .mark,.steps li[data-status=blocked] .mark{
  border-color:var(--vd-e,#C0392B);color:var(--vd-e,#C0392B)}
.steps li[data-status=skipped]{color:var(--vd-f,#8697A8)}
.steps li[data-status=skipped] .mark{border-style:dashed}
.steps li[data-status=degraded] .mark{border-color:var(--vd-wl,#DFA100);color:var(--vd-wi,#6E5000)}
.steps li .grow{flex:1;min-width:0}
.steps li .why{color:var(--vd-m,#6B7F94);font-weight:400}
.steps li .secs{font-variant-numeric:tabular-nums;font-size:.78rem;color:var(--vd-m,#6B7F94);flex:none}
.pane .drawing{font-size:.85rem;color:var(--vd-m,#6B7F94);margin-top:10px}
.pane ::slotted(*){display:block;max-width:100%}
.arts{margin-top:22px;border-top:1px solid var(--vd-l,#E3E9EF);padding-top:6px}
.record{margin-top:18px;border-top:1px solid var(--vd-l,#E3E9EF);padding-top:12px}
.record summary{font-size:.83rem;color:var(--vd-m,#6B7F94);cursor:pointer}
.record summary:hover{color:var(--vd-i,#0B1B2B)}
.record .steps{margin-top:12px}

/* results */
.tabs{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--vd-l,#E3E9EF)}
.tabs button{background:none;border:0;border-bottom:2px solid transparent;padding:9px 12px;
  font-size:.88rem;color:var(--vd-m,#6B7F94)}
.tabs button[aria-selected=true]{color:var(--vd-i,#0B1B2B);font-weight:600;
  border-bottom-color:var(--vd-a,#0E9E72)}
.pane{padding-top:16px;font-size:.94rem;line-height:1.6;color:var(--vd-t,#45596E);
  overflow-wrap:anywhere;max-height:420px;overflow:auto}
.pane h4{font-size:.83rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--vd-i,#0B1B2B);margin:18px 0 8px}
.pane h4:first-child{margin-top:0}
.pane p{margin:0 0 10px}
.pane ul,.pane ol{margin:0 0 12px;padding-left:20px}
.pane li{margin-bottom:6px}
.pane strong{color:var(--vd-i,#0B1B2B)}
.pane[hidden]{display:none}
.pane img,.pane svg{max-width:100%;height:auto;white-space:normal}
.resfoot{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;
  border-top:1px solid var(--vd-l,#E3E9EF);padding-top:14px}
.cost{font-size:.83rem;color:var(--vd-m,#6B7F94);margin-left:auto}
.cost b{color:var(--vd-i,#0B1B2B)}

/* the welded statements */
.honesty{border-top:1px solid var(--vd-tl,#9FD8C4);background:var(--vd-tn,#F2FBF7);padding:18px 24px}
.honesty .eyebrow{font-size:.69rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;
  color:var(--vd-at,#0A7D5A)}
.honesty p{margin:7px 0 0;font-size:.94rem;line-height:1.55;color:var(--vd-ti,#204738)}
.honesty strong{font-weight:700}
/* The ONLY place the design uses the warning pair. */
.caveat{border-top:1px solid var(--vd-wl,#DFA100);background:var(--vd-wb,#FFF8E8);padding:16px 24px;
  font-size:.88rem;line-height:1.55;color:var(--vd-wi,#6E5000)}
.caveat strong{color:var(--vd-ws,#513A00)}

/* A demo result must never be mistakable for the reader's own recording, so the
   stamp goes at the TOP of the panel, above the artefacts, not in a footnote. */
.demo{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 24px;
  background:var(--vd-tn,#F2FBF7);border-bottom:1px solid var(--vd-tl,#9FD8C4);
  font-size:.83rem;color:var(--vd-ti,#204738)}
.demo .tag{font-size:.62rem;font-weight:700;letter-spacing:.1em;padding:2px 7px;
  border-radius:4px;background:var(--vd-a,#0E9E72);color:var(--vd-ai,#fff)}

/* error — never colour alone: there is always the word, and the next action */
.err{border:1px solid var(--vd-e,#C0392B);border-radius:var(--vd-r-card,13px);padding:18px 20px}
.err h3{margin:0;font-size:1rem;color:var(--vd-e,#C0392B)}
.err p{margin:8px 0 0;font-size:.9rem;color:var(--vd-t,#45596E)}
.err .detail{font-family:var(--vd-font-mono,ui-monospace,Menlo,monospace);font-size:.75rem;
  color:var(--vd-m,#6B7F94);margin-top:10px}
.err .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}

@media (max-width:620px){
  .body{padding:20px 16px}
  .honesty,.caveat{padding:16px}
  .runrow .btn{width:100%;min-height:52px}   /* phone: full width, 52px (design) */
}
`

class VdWorkflow extends HTMLElement {
    connectedCallback() {
        if (this._built) return
        this._built = true
        this._state = 'empty'
        this._opts = { translate: true, infographic: true }
        this._quote = ''
        this.attachShadow({ mode: 'open' })
        this.render()
        this._wireDrop()
    }

    /* ── the state machine ─────────────────────────────────────────────── */

    get state() { return this._state }

    _go(state, data = {}) {
        if (!STATES.includes(state)) throw new Error(`vd-workflow: unknown state ${state}`)
        this._state = state
        this.render(data)
        this.setAttribute('state', state)
        this.dispatchEvent(new CustomEvent('vd:state', { detail: { state }, bubbles: true, composed: true }))
    }

    setFile({ name, bytes } = {}) { this._file = { name, bytes }; this._go('ready') }
    setQuote(text) { this._quote = text || ''; if (this._state === 'ready') this.render() }
    /* Reachable only from a run attempt — see rule 1 in the header. */
    askForKey(message) { this._keyError = message || ''; this._go('key') }

    /* The declared path, shown BEFORE the run starts so the list does not appear
       one row at a time. Every row is `pending` until the trace says otherwise. */
    startRun(steps, opts = {}) {
        this._expectInfographic = !!opts.infographic
        this._steps = steps.map(s => ({ ...s, status: 'pending' }))
        this._partial = {}
        this._startedAt = Date.now()
        this._go('running')
        this._tick = this._tick || setInterval(() => {
            if (this._state === 'running') this._retime()
        }, 1000)
    }

    /* THE EXECUTING TRUTH. Statuses this panel cannot infer — skipped, degraded,
       blocked — only ever arrive here. */
    setTrace(trace) {
        if (!trace?.steps) return
        this._steps = trace.steps.map(t => ({
            id: t.id, label: this._labelFor(t), status: t.status,
            costUsd: t.costUsd, ms: t.ms, error: t.error,
        }))
        if (this._state === 'running') this.render()
    }

    /* One artefact, as soon as it exists — the transcript is worth reading while
       an image model is still working. */
    artefact(kind, value) {
        if (!value) return
        this._partial = { ...(this._partial || {}), [kind]: value }
        if (this._state === 'running' || this._state === 'results') this.render()
    }

    showResults(r) { this._results = { ...(this._partial || {}), ...r }; this._stopTick(); this._go('results') }
    showError(e) { this._error = e; this._stopTick(); this._go('error') }
    reset() {
        this._file = null; this._results = null; this._error = null
        this._partial = null; this._steps = null; this._expectInfographic = false
        this._stopTick(); this._go('empty')
    }

    disconnectedCallback() { this._stopTick() }
    _stopTick() { if (this._tick) { clearInterval(this._tick); this._tick = null } }

    /* Only the seconds move each tick. Re-rendering the panel once a second
       would blow away a text selection in a transcript somebody is reading. */
    _retime() {
        const now = this.shadowRoot.querySelector('.steps li[data-status=running] .secs')
        if (now) now.textContent = `${Math.round((Date.now() - (this._stepAt || this._startedAt)) / 1000)}s`
    }

    _labelFor(t) {
        const known = (this._steps || []).find(s => s.id === t.id)
        return known?.label || t.label || t.id
    }

    /* ── rendering ─────────────────────────────────────────────────────── */

    render() {
        const sr = this.shadowRoot
        const body = this[`_${this._state}Html`] ? this[`_${this._state}Html`]() : ''
        /* The routing statement shows while there is still something to send. The
           caveat replaces it the moment a TRANSCRIPT exists — which since v0.1.1
           can be mid-run, because the transcript is shown as soon as it arrives.
           Keying this on the state instead would have left the routing statement
           sitting under a transcript it no longer describes. */
        const hasTranscript = !!(this._results?.transcript || this._partial?.transcript)
        const foot = hasTranscript
            ? `<div class="caveat">${CAVEAT_HTML}</div>`
            : `<div class="honesty" id="routing">
                 <div class="eyebrow">Where your recording goes</div>
                 <p>${ROUTING_HTML}</p>
               </div>`
        sr.innerHTML = `<style>${CSS}</style>
<div class="panel">
  <div class="head">
    <span class="dot" aria-hidden="true"></span>
    <span class="state" aria-live="polite">${STATE_LABEL[this._state]}</span>
    ${this._state === 'results' || this._state === 'error'
        ? '<button type="button" class="btn btn-quiet btn-sm restart" data-act="reset">Start another</button>' : ''}
  </div>
  ${this._results?.demo ? `<div class="demo"><span class="tag">DEMO</span>
     This is a scripted example, not a real recording. Nothing was sent anywhere and
     nothing was charged.</div>` : ''}
  <div class="body">${body}</div>
  ${foot}
</div>`
        this._bind()
    }

    _emptyHtml() {
        return `<div class="drop">
  <h3>Drop the recording here</h3>
  <p>Or <button type="button" class="link" data-act="pick">choose a file</button> — it never
     leaves your device until you press run.</p>
  <div class="row">
    <button type="button" class="btn btn-quiet" data-act="sample">Try it with a sample note</button>
    <button type="button" class="btn btn-quiet" data-act="demo">See it work — no key needed</button>
  </div>
  <input type="file" accept="audio/*,.opus,.ogg,.m4a,.mp3,.wav,.aac,.flac" data-el="file">
</div>`
    }

    _readyHtml() {
        const kb = this._file?.bytes ? `${Math.round(this._file.bytes / 1024)} KB` : ''
        const opt = (key, label) => `<label class="opt${this._opts[key] ? ' on' : ''}">
      <input type="checkbox" data-opt="${key}"${this._opts[key] ? ' checked' : ''}>${label}</label>`
        return `<div class="file">
  <span aria-hidden="true">🎙</span>
  <span class="grow"><span class="name">${esc(this._file?.name || '')}</span>
    <span class="meta">${esc(kb)}</span></span>
  <button type="button" class="btn btn-quiet btn-sm" data-act="reset">Remove</button>
</div>
<p class="local">Read on this device. Nothing has left it yet.</p>
<div class="opts">${opt('translate', 'Translate into my language')}${opt('infographic', 'Draw an infographic')}</div>
<div class="runrow">
  <button type="button" class="btn btn-primary" data-act="run">Run one pass →</button>
  ${this._quote ? `<span class="quote">Maximum for this recording: <b>${esc(this._quote)}</b></span>` : ''}
</div>
<p class="billing">Billed by OpenRouter to your key. We take nothing.</p>`
    }

    _keyHtml() {
        return `<div class="key">
  <h3>One thing before it runs: your OpenRouter key</h3>
  <p>OpenRouter is the service that passes your audio to a model. You pay it directly, so we
     never hold your card or your credits. The key stays in this browser.</p>
  <label class="kl" for="k">Paste your key</label>
  <div class="keyrow">
    <input id="k" type="password" placeholder="sk-or-v1-…" autocomplete="off" spellcheck="false" data-el="key">
    <button type="button" class="btn btn-primary" data-act="save" disabled data-el="save">Save and run</button>
  </div>
  ${this._keyError ? `<p class="hint" style="color:var(--vd-e,#C0392B)">${esc(this._keyError)}</p>` : ''}
  <p class="hint">Stored in this browser only. Clear it any time; we never see it.
     <a href="/openrouter-key/">Don’t have one? Two minutes, step by step →</a></p>
  <p class="hint">Typical spend: pence a recording. Set a hard cap on the key while you are there.</p>
</div>`
    }

    /* One row per declared step, in the declaration's order, carrying the status
       the RUN gave it. Every status has a WORD beside its mark: a person who
       cannot tell the tick from the dash still learns that translate was skipped,
       and why. Rendered identically during the run and in the record after it. */
    _stepListHtml() {
        const steps = this._steps || []
        const mark = { pending: '', running: '·', done: '✓', skipped: '–', degraded: '!', blocked: '×', failed: '×' }
        const note = {
            skipped: 'not needed',
            degraded: 'failed — the pass carried on without it',
            blocked: 'stopped by the spending ceiling',
            failed: 'failed',
        }
        return `<ul class="steps" aria-live="polite">${steps.map(s => `
  <li data-status="${esc(s.status)}">
    <span class="mark">${mark[s.status] ?? ''}</span>
    <span class="grow">${esc(s.label)}${note[s.status] ? ` <span class="why">— ${note[s.status]}</span>` : ''}</span>
    ${s.status === 'running' ? '<span class="secs">0s</span>' : ''}
    ${s.ms != null && s.status === 'done' ? `<span class="secs">${Math.round(s.ms / 1000)}s</span>` : ''}
  </li>`).join('')}</ul>`
    }

    _runningHtml() {
        const steps = this._steps || []
        const settled = steps.filter(s => ['done', 'skipped', 'degraded'].includes(s.status)).length
        const pct = steps.length ? Math.round((settled / steps.length) * 100) : 0
        return `<div class="bar"><i style="width:${pct}%"></i></div>
${this._stepListHtml()}
<div class="runrow">
  <button type="button" class="btn btn-quiet btn-sm" data-act="stop">Stop this pass</button>
  <span class="quote">Nothing is stored. Close the tab and it is gone.</span>
</div>
${this._artefactsHtml(this._partial, false)}`
    }

    /* Shared by running and results: whatever exists NOW. During a run this is
       how somebody reads their transcript while an image model spends another
       minute — and how they see that the pass is producing things rather than
       sitting still. */
    _artefactsHtml(r, withFooter = true) {
        r = r || {}
        const panes = [
            ['debrief', 'Debrief', r.summary],
            ['transcript', 'Transcript', r.transcript],
            ['translation', 'Translation', r.translation],
        ].filter(([, , v]) => v)
        /* The infographic pane exists as soon as the run ASKS for one, because
           that is when there is something to watch. Its content is a <slot>: the
           mount is a light-DOM node the page owns, so re-rendering this shadow
           tree — which happens on every trace update — cannot tear a half-drawn
           SVG out from under the renderer. */
        const wantsInfographic = this._expectInfographic || !!r.infographicHtml
        if (!panes.length && !wantsInfographic) return ''
        const tabs = panes.map(([id, label]) => [id, label])
        if (wantsInfographic) tabs.push(['infographic', 'Infographic'])
        const active = this._tab && tabs.some(t => t[0] === this._tab) ? this._tab : tabs[0][0]
        return `<div class="arts">
<div class="tabs" role="tablist">${tabs.map(([id, label]) => `
  <button type="button" role="tab" data-tab="${id}" aria-selected="${id === active}">${label}</button>`).join('')}</div>
${panes.map(([id, , v]) => `<div class="pane" data-pane="${id}"${id === active ? '' : ' hidden'}>${md(v)}</div>`).join('')}
${wantsInfographic ? `<div class="pane" data-pane="infographic"${active === 'infographic' ? '' : ' hidden'}>
  <slot name="infographic"></slot>
  ${r.infographicHtml ? '' : '<p class="drawing">Drawing it now. An image model takes a minute or so — the debrief and transcript are ready to read while it works.</p>'}
</div>` : ''}
${withFooter ? `<div class="resfoot">
  <button type="button" class="btn btn-quiet btn-sm" data-act="copy">Copy debrief</button>
  <a class="btn btn-quiet btn-sm" href="/app/">Take it further in the workbench →</a>
  ${r.costText ? `<span class="cost">Cost of this pass: <b>${esc(r.costText)}</b></span>` : ''}
</div>` : ''}
</div>`
    }

    /* The run record OUTLIVES the run (Dinis: "show the user what has been done
       on each phase, or at least make it available"). Folded away by default —
       the artefacts are what somebody came for — but one click from every
       finished pass, with what each step did, how long it took and what it cost.
       Open by default when something did not go cleanly: a degraded or blocked
       step is the one case where the record is the news. */
    _stepRecordHtml() {
        if (!this._steps?.length) return ''
        const rough = this._steps.some(s => ['degraded', 'blocked', 'failed'].includes(s.status))
        const ran = this._steps.filter(s => s.status === 'done').length
        const skipped = this._steps.filter(s => s.status === 'skipped').length
        return `<details class="record"${rough ? ' open' : ''}>
  <summary>What ran — ${ran} step${ran === 1 ? '' : 's'}${skipped ? `, ${skipped} not needed` : ''}${
      rough ? ', and one did not go cleanly' : ''}</summary>
  ${this._stepListHtml()}
</details>`
    }

    _resultsHtml() { return this._artefactsHtml(this._results) + this._stepRecordHtml() }

    _errorHtml() {
        const e = this._error || {}
        return `<div class="err" role="alert">
  <h3>${esc(e.title || 'That did not work')}</h3>
  <p>${esc(e.body || '')}</p>
  ${e.detail ? `<p class="detail">${esc(e.detail)}</p>` : ''}
  <div class="row">
    ${(e.actions || []).map(a => `<button type="button" class="btn ${a.primary ? 'btn-primary' : 'btn-quiet'}"
       data-act="${esc(a.event)}">${esc(a.label)}</button>`).join('')}
  </div>
</div>
${/* Whatever the pass finished before it stopped stays on screen. Clearing the
      panel on a failure would throw away work the reader has already paid for —
      and after a STOP it would be actively misleading, because they asked the
      run to end, not the results to vanish. */ ''}
${this._artefactsHtml(this._partial)}
${this._stepRecordHtml()}`
    }

    /* ── events ────────────────────────────────────────────────────────── */

    _bind() {
        const sr = this.shadowRoot
        const fire = (name, detail = {}) =>
            this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }))

        sr.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', () => {
            const act = el.dataset.act
            if (act === 'pick') return sr.querySelector('[data-el=file]')?.click()
            if (act === 'sample') return fire('vd:sample')
            if (act === 'demo') return fire('vd:demo')
            if (act === 'reset') { this.reset(); return fire('vd:reset') }
            if (act === 'run') return fire('vd:run', { ...this._opts })
            if (act === 'save') return fire('vd:key-save', { apiKey: sr.querySelector('[data-el=key]').value.trim() })
            if (act === 'copy') return this._copy()
            fire('vd:' + act)                        // error-recovery actions
        }))

        sr.querySelector('[data-el=file]')?.addEventListener('change', (e) => {
            const f = e.target.files?.[0]
            if (f) fire('vd:file', { file: f })
        })

        sr.querySelectorAll('[data-opt]').forEach(cb => cb.addEventListener('change', () => {
            this._opts[cb.dataset.opt] = cb.checked
            cb.closest('.opt').classList.toggle('on', cb.checked)
            fire('vd:option', { ...this._opts })
        }))

        const key = sr.querySelector('[data-el=key]')
        if (key) {
            const save = sr.querySelector('[data-el=save]')
            // Disabled until the field is plausibly a key — a save that can only
            // fail is a button that wastes a round trip and a person's patience.
            const check = () => { save.disabled = !/^sk-[A-Za-z0-9_-]{12,}$/.test(key.value.trim()) }
            key.addEventListener('input', check)
            key.addEventListener('keydown', e => { if (e.key === 'Enter' && !save.disabled) save.click() })
            check(); key.focus()
        }

        sr.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
            this._tab = b.dataset.tab
            sr.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)))
            sr.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== this._tab })
        }))
    }

    _copy() {
        const text = this._results?.summary || ''
        navigator.clipboard?.writeText(text).catch(() => {})
    }

    /* The drop target is the WHOLE panel, not only the dashed area — the dashed
       area is where the eye goes, not where the hand is accurate. */
    _wireDrop() {
        const stop = e => { e.preventDefault(); e.stopPropagation() }
        this.addEventListener('dragover', e => { stop(e); this.classList.add('dragover') })
        this.addEventListener('dragleave', e => { stop(e); this.classList.remove('dragover') })
        this.addEventListener('drop', e => {
            stop(e); this.classList.remove('dragover')
            const f = e.dataTransfer?.files?.[0]
            if (f) this.dispatchEvent(new CustomEvent('vd:file', { detail: { file: f }, bubbles: true, composed: true }))
        })
    }
}

/* The debrief and the transcript arrive as markdown — the prompts ask for it and
   the workbench renders it. Rendering it as source here would have shipped
   `## Key points` and `**Nakamura contract:**` to the reader on the product's
   front page. Escape FIRST, then apply the small inline set: the text came back
   from a model, so it is never trusted as markup. Same order, and the same
   deliberately tiny grammar, as scripts/build_content.py. */
function md(text) {
    const out = []
    let list = null
    const inline = (t) => esc(t)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<![*\w])\*([^*\n]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
    for (const raw of String(text ?? '').replace(/\r/g, '').split('\n')) {
        const line = raw.trim()
        if (!line) { if (list) { out.push(`</${list}>`); list = null } continue }
        const h = /^(#{1,4})\s+(.*)$/.exec(line)
        if (h) { if (list) { out.push(`</${list}>`); list = null }
            out.push(`<h4>${inline(h[2])}</h4>`); continue }
        const li = /^([-*+]|\d+[.)])\s+(.*)$/.exec(line)
        if (li) { const want = /^\d/.test(li[1]) ? 'ol' : 'ul'
            if (list !== want) { if (list) out.push(`</${list}>`); out.push(`<${want}>`); list = want }
            out.push(`<li>${inline(li[2])}</li>`); continue }
        if (list) { out.push(`</${list}>`); list = null }
        out.push(`<p>${inline(line)}</p>`)
    }
    if (list) out.push(`</${list}>`)
    return out.join('')
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

customElements.define('vd-workflow', VdWorkflow)
export { VdWorkflow, STATES, STATE_LABEL }
