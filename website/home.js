/* home.js — the workflow, on the home page (issue 060, M3).

   The original brief asked for "the main workflow available directly from the
   home page". This is that: <vd-workflow> owns the panel and its states, and
   this module owns the engine and drives it — the same split app.js has, and the
   same engine, pipeline, declared workflow and demo path. Nothing here is a
   second implementation of the pass:

     - `bootEngine()` and `createPipeline()` are the app's own modules, imported
       from ./app/. A pass run here is byte-for-byte the pass run there.
     - the quote comes from `getWorkflow({options})`, so the maximum on screen is
       the declaration's sum, not a number typed into a page.
     - the demo runs `runPass({demo:true})` — the real state machine on scripted
       answers, touching no network and no key.

   THE ENGINE IS LOADED LAZILY AND ITS FAILURE IS NOT FATAL. The engine's base
   class comes from a different origin; the home page's first screen must not
   depend on that origin answering. So the panel renders from static markup, and
   the boot happens after — if it never finishes, the panel still explains the
   product and the workbench link still works. What it must not do is claim to be
   ready and then do nothing when pressed. */

import { bootEngine } from './app/engine.js'
import { createPipeline } from './app/pipeline.js'
import { fmtGbp } from './app/config.js'
import './components/vd-workflow/v0/v0.1/v0.1.2/vd-workflow.js'

const panel = document.querySelector('vd-workflow')
if (panel) main().catch(e => {
    console.warn('[voicedebrief] the workflow could not start:', e)
    panel.showError({
        title: 'The workflow could not start on this page.',
        body: 'Everything it needs is on the workbench, which loads it a different way — ' +
              'your recording and your key are unaffected.',
        detail: String(e?.message || e).slice(0, 160),
        actions: [{ label: 'Open the workbench →', event: 'workbench', primary: true }],
    })
})

/* Nine error states are specified in the design (04-states.md). The pass emits
   typed codes, and these are the ones it can currently tell apart — each with
   what happened in the reader's terms and a way forward, never a bare status
   code as the headline. The states we CANNOT yet distinguish (no-speech-detected
   and a mid-stream network drop both surface as a generic llm-error) are not
   faked with a guess: they fall to the last entry, which is honest about not
   knowing rather than confidently wrong. */
const ERRORS = {
    'not-audio':       ['We can’t read that file.', 'It doesn’t look like audio we can decode — Opus, Ogg, M4A, MP3 and WAV all work.'],
    'too-large':       ['That recording is longer than one pass can handle.', 'Split it, or use the longer workflow in the workbench.'],
    'empty':           ['That file is empty.', 'Re-export the recording and try again.'],
    'key-invalid':     ['That key was refused.', 'OpenRouter didn’t accept it — it may have been revoked, or copied incompletely.'],
    'budget-exceeded': ['Your OpenRouter balance is empty.', 'Nothing ran, and nothing was charged. Top up and run it again.'],
    'key-exhausted':   ['That key is exhausted or revoked.', 'Paste a different one, or raise its limit on OpenRouter.'],
    'rate-limited':    ['OpenRouter is throttling this key.', 'Wait a moment and run it again — nothing was charged for the refused call.'],
    'budget-cap':      ['This session’s spend cap stopped the pass.', 'Raise or clear the cap and run it again.'],
    'network':         ['OpenRouter could not be reached.', 'Check your connection and any ad-blocker, then try again — nothing was stored.'],
    'prompt-missing':  ['A prompt failed to load.', 'The transcript is unaffected; running it again usually fixes this.'],
}

async function main() {
    const engine = await bootEngine()
    const pipeline = createPipeline({
        api: engine.api, emit: engine.emit, getKey: engine.getKey,
        infographicMount: () => mount,
    })
    engine.api
        .register('runPass',    (p) => pipeline.runPass(p), { async: true })
        .register('getResults', () => pipeline.results(),   { async: false })
        .register('getWorkflow', (p) => pipeline.getWorkflow(p), { async: true })
        .register('getWorkflowTrace', () => pipeline.trace(), { async: false })
        /* Redraw is the natural second attempt at the one step that can fail
           without costing you the pass, and it is the same pipeline call the
           workbench uses. Registered here so an agent driving this page has it,
           and so the drawing path itself is testable — the panel offers no model
           choice, by design: that lives in the workbench. */
        .register('redrawInfographic', (p) => pipeline.redrawInfographic(p), { async: true })
    engine.api.activate()

    /* THE MOUNT MUST BE IN THE DOCUMENT. The infographic renderer appends
       <sg-llm-request> into it and waits for that element to do the work — and a
       custom element in a DETACHED tree never upgrades, so it never connects,
       never calls anything, and the step sits at "running" with no request
       behind it. This was `document.createElement('div')` and that is exactly
       what happened (Dinis, from QA, 86 seconds of nothing).

       It is the light-DOM node slotted into the panel's infographic tab, so the
       drawing is watched where it will be read, and the panel re-rendering its
       shadow tree on every trace update cannot tear it out mid-draw. */
    const mount = document.getElementById('infographic-mount')

    let pendingFile = null, runAfterKey = false, ran = null, demoRun = false

    const options = () => ({ ...panel._opts, language: 'English' })

    const quote = async () => {
        try {
            const w = await window.__tool.getWorkflow({ options: options() })
            panel.setQuote(fmtGbp(w.quoteUsd))
        } catch { panel.setQuote('') }
    }

    /* ── the panel drives, this listens ────────────────────────────────── */

    panel.addEventListener('vd:file', (e) => take(e.detail.file))
    panel.addEventListener('vd:option', quote)
    panel.addEventListener('vd:reset', () => { pendingFile = null; ran = null; demoRun = false })

    panel.addEventListener('vd:sample', async () => {
        try {
            const r = await fetch('/app/samples/whatsapp-voice-note-1.opus')
            const b = await r.blob()
            take(new File([b], 'sample voice note.opus', { type: 'audio/ogg' }))
        } catch { panel.showError({ title: 'The sample would not load.',
            body: 'Your own recording will still work — drop it in.',
            actions: [{ label: 'Back', event: 'reset', primary: true }] }) }
    })

    panel.addEventListener('vd:demo', async () => {
        demoRun = true
        panel.startRun(steps({ translate: false, infographic: false }, true), { infographic: false })
        try { await window.__tool.runPass({ demo: true, infographic: false, translate: false }) }
        catch (e) { console.warn('[voicedebrief] demo:', e) }
    })

    panel.addEventListener('vd:run', () => {
        if (!pendingFile) return
        // The key is asked for HERE and nowhere earlier.
        if (!engine.hasKey()) { runAfterKey = true; return panel.askForKey() }
        run()
    })

    panel.addEventListener('vd:key-save', async (e) => {
        const r = await window.__tool.setApiKey({ apiKey: e.detail.apiKey }).catch(() => ({ ok: false }))
        if (r.ok && r.present) { if (runAfterKey) { runAfterKey = false; run() } }
        else panel.askForKey('That key was refused. Check it and paste it again.')
    })

    panel.addEventListener('vd:workbench', () => { location.href = '/app/' })

    /* A way out of a running pass. cancelItem stops the engine's work; whatever
       the pass had already produced stays on screen, because the honest thing
       after a stop is what was actually finished, not an empty panel. */
    panel.addEventListener('vd:stop', () => {
        try { pipeline.cancel() } catch (e) { console.warn('[voicedebrief] stop:', e) }
        panel.showError({
            title: 'Stopped.',
            body: pendingFile
                ? 'Anything finished before you stopped is below. The recording is still loaded, so you can run it again.'
                : 'Anything finished before you stopped is below.',
            actions: pendingFile
                ? [{ label: 'Run it again', event: 'retry', primary: true }, { label: 'Start another', event: 'reset' }]
                : [{ label: 'Start another', event: 'reset', primary: true }],
        })
    })

    /* Retry is a fresh run of the same file with the same options, not a resume:
       the pass is one declared workflow and re-entering it half way would mean
       two code paths through the same steps. Re-running is cheap (the quote is
       the same) and it is the behaviour the reader expects from the word. */
    panel.addEventListener('vd:retry', () => {
        if (!pendingFile) return panel.reset()
        panel.setFile({ name: pendingFile.name, bytes: pendingFile.size })
        quote()
        if (engine.hasKey()) run(); else { runAfterKey = true; panel.askForKey() }
    })

    function take(file) {
        demoRun = false
        pendingFile = file
        panel.setFile({ name: file.name, bytes: file.size })
        quote()
    }

    function steps(o, demo = false) {
        const s = [{ id: 'ingest', label: demo ? 'Reading the sample' : 'Reading the audio in your browser' },
                   { id: 'transcribe', label: 'Transcribing — via OpenRouter' },
                   { id: 'classify', label: 'Reading what kind of recording it is' }]
        if (o.translate) s.push({ id: 'translate', label: 'Translating into your language' })
        s.push({ id: 'summary', label: 'Writing the debrief' })
        if (o.infographic) s.push({ id: 'infographic', label: 'Drawing the infographic' })
        return s
    }

    async function run() {
        demoRun = false
        const o = options()
        ran = { }
        panel.startRun(steps(o), { infographic: o.infographic })
        try {
            await window.__tool.runPass({ ...o, file: pendingFile })
        } catch (e) {
            const code = e?.code || 'llm-error'
            const [title, body] = ERRORS[code] ||
                ['The pass stopped part way.', 'The recording is still loaded here and can be run again.']
            panel.showError({ title, body, detail: e?.message ? `${code}: ${String(e.message).slice(0, 120)}` : code,
                actions: [
                    { label: 'Try again', event: 'retry', primary: true },
                    ...(code === 'key-invalid' || code === 'key-exhausted'
                        ? [{ label: 'Get a key', event: 'keyguide' }] : []),
                ] })
        }
    }

    panel.addEventListener('vd:keyguide', () => { location.href = '/openrouter-key/' })

    /* ── the pass, as it happens ───────────────────────────────────────── */

    const on = (name, fn) => window.addEventListener(name, fn)

    /* THE STEP LIST IS THE TRACE, not a guess. v0.1.0 of the panel advanced its
       own list on completion events, which cannot see a SKIPPED step (translate,
       when the recording is already in the reader's language) — so that row sat
       spinning while later rows ticked, and the panel's account of the run
       disagreed with the run's own. The declared workflow emits its whole trace
       on every transition; that is the only thing worth rendering. */
    on('wa:workflow:started', (e) => panel.setTrace(e.detail.trace))
    on('wa:workflow:step',    (e) => panel.setTrace(e.detail.trace))
    on('wa:workflow:complete', (e) => panel.setTrace(e.detail.trace))

    // Each artefact goes up the moment it exists, so a long step is something to
    // read through rather than something to stare at.
    on('wa:transcript',  (e) => { ran = { ...ran, transcript: e.detail.text }; panel.artefact('transcript', e.detail.text) })
    on('wa:translation', (e) => { ran = { ...ran, translation: e.detail.text }; panel.artefact('translation', e.detail.text) })
    on('wa:summary',     (e) => { ran = { ...ran, summary: e.detail.text }; panel.artefact('summary', e.detail.text) })
    on('wa:infographic', (e) => {
        const html = e.detail.svg || (e.detail.image ? `<img alt="" src="${e.detail.image}">` : '')
        ran = { ...ran, infographicHtml: html }
        panel.artefact('infographicHtml', html)
    })

    on('wa:pass:complete', async () => {
        let costText = ''
        try {
            const s = await window.__tool.getSpendSummary?.()
            const item = (s?.perItem || []).slice(-1)[0]
            costText = item ? fmtGbp(item.usd) : ''
        } catch { /* the cost line is a nicety; its absence is not a failure */ }
        /* AWAITED. Actions registered on the tool API return a promise whether or
           not they were declared async, so reading `.summary` off the call
           itself yields undefined — it was masked here only because `ran` had
           the same values from the event stream. app.js has always awaited it. */
        const r = (await window.__tool.getResults?.()) || {}
        panel.showResults({
            summary: ran?.summary || r.summary,
            transcript: ran?.transcript || r.transcript,
            translation: ran?.translation || r.translation,
            infographicHtml: ran?.infographicHtml,
            costText,
            // A scripted result must never be mistakable for the reader's own
            // recording. The panel stamps it at the top, above the artefacts.
            demo: demoRun,
        })
    })

    on('wa:pass:error', (e) => {
        const code = e.detail?.code || 'llm-error'
        const [title, body] = ERRORS[code] ||
            ['The pass stopped part way.', 'The recording is still loaded here and can be run again.']
        panel.showError({ title, body, detail: code,
            actions: [{ label: 'Try again', event: 'retry', primary: true }] })
    })
}


/* The version stamp. It used to be an inline <script> at the foot of the page,
   which the home page's own CSP blocked the moment M3 added one — `script-src
   'self'` with no 'unsafe-inline' (visible in the console as "Executing inline
   script violates…"). Moving it into this module is the fix; loosening the
   policy to print a version number would not have been. */
const stamp = document.getElementById('site-version')
if (stamp) fetch('/version.txt', { cache: 'no-store' })
    .then(r => (r.ok ? r.text() : 'dev'))
    .then(v => { stamp.textContent = v.trim() })
    .catch(() => {})
