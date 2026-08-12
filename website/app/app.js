/* app.js — page bootstrap: boot the engine (Attempt 2 harness), register the
   pipeline on our SgToolApi, wire the wa-* components. The UI drives everything
   through window.__tool — the UI is just one consumer of the API. */

import { fmtGbp } from './config.js'
import { initI18n, t, tOr, applyIn, culture, getLocale, getLocales, defaultLocale, setLocale } from './i18n.js'
import { bootEngine } from './engine.js'
import { createPipeline } from './pipeline.js'
import { INFOGRAPHIC_MODELS, INFOGRAPHIC_MODEL_DEFAULT } from './infographic.js'
import { createChat, CHAT_MODELS, CHAT_SUGGESTIONS } from './chat.js'

// Components (ours; the SgComponent base loads from the tools origin inside each).
import '../components/wa-locale-picker/v0/v0.1/v0.1.4/wa-locale-picker.js'
import '../components/wa-facts-card/v0/v0.1/v0.1.0/wa-facts-card.js'
import '../components/wa-key-panel/v0/v0.1/v0.1.4/wa-key-panel.js'
import '../components/wa-drop-zone/v0/v0.1/v0.1.2/wa-drop-zone.js'
import '../components/wa-progress-rail/v0/v0.1/v0.1.5/wa-progress-rail.js'
import '../components/wa-result-card/v0/v0.1/v0.1.3/wa-result-card.js'
import '../components/wa-cost-line/v0/v0.1/v0.1.1/wa-cost-line.js'
import '../components/wa-debug-panel/v0/v0.1/v0.1.3/wa-debug-panel.js'
import '../components/wa-chat-panel/v0/v0.1/v0.1.2/wa-chat-panel.js'
import '../components/wa-flow-panel/v0/v0.1/v0.1.1/wa-flow-panel.js'

// The chat panel reads these at mount time — before the engine has booted.
window.__waChat = { models: CHAT_MODELS, suggestions: CHAT_SUGGESTIONS }
// Same idiom for the flow panel: it displays budgets/costs in GBP.
window.__waFlow = { fmtGbp }
/* The components' seam to i18n. A global rather than an import because a
   wa-* component must not depend on the app's file layout — it is published
   at its own immutable path and has to render standalone. Absent, every
   component falls back to the English in its own markup. */
window.__waI18n = { t, tOr, applyIn, getLocale, getLocales, defaultLocale, setLocale }

const $ = (s) => document.querySelector(s)
/* #key-section is deliberately NOT in this list. It used to be, which is why the
   first thing a stranger met was a password field for an account they did not
   have — a setup step demanded before we had shown them anything (issue 060,
   build-order task 5). It is now governed by showKeySection() and asked for at
   RUN time: load a file, set the options, read the quoted ceiling, and only then
   is a key needed. */
const sections = ['#file-section', '#work-section', '#results-section', '#error-section']
const show = (...ids) => sections.forEach(s => { $(s).hidden = !ids.includes(s) })

const ERROR_COPY = {
    'not-audio':       ["That doesn't look like an audio file we can read.", 'Try the .opus/.ogg file from WhatsApp, or an .m4a forward.'],
    'too-large':       ['That file is too large for the beta.', 'Voice notes up to a few minutes work best.'],
    'empty':           ['That file appears to be empty.', 'Re-export the voice note and try again.'],
    'key-invalid':     ["Your key wasn't accepted.", 'Check it at openrouter.ai/keys and paste it again above.'],
    'budget-exceeded': ['That key has no credit left.', 'Top up on OpenRouter, or paste a different key.'],
    'key-exhausted':   ['That key is exhausted or revoked.', 'Paste a different key to continue.'],
    'rate-limited':    ['Busy moment at the model provider.', 'Wait a few seconds and press Transcribe again.'],
    'budget-cap':      ["You've hit this session's spend cap.", 'Raise or clear the cap to continue.'],
    'no-key':          ['Save your OpenRouter key first.', 'The key box is open above — it stays in this browser and goes only to OpenRouter.'],
    'network':         ['OpenRouter could not be reached.', 'Check your connection (and any ad-blocker), then try again — nothing was stored.'],
    'prompt-missing':  ['The summary prompt failed to load.', 'The transcript is unaffected; try again for the summary.'],
}

let pendingFile = null

async function main() {
    // Strings and culture first (issue 050 M1b): the page ships en-gb copy in the
    // markup, and initI18n() overwrites it with the active locale's before the
    // engine boots — so a visitor never sees English flash into their language.
    // A failure here must NOT stop the app: the markup already reads correctly.
    await initI18n().catch(e => console.warn('[whatsapp-transcribe] i18n unavailable, using the markup as written:', e))
    window.dispatchEvent(new CustomEvent('wa:i18n-ready'))   // the picker renders once there is something to pick

    // Version stamp (written by CI at publish time).
    fetch('../version.txt', { cache: 'no-store' }).then(r => r.ok ? r.text() : 'dev').then(v => { $('#site-version').textContent = v.trim() }).catch(() => {})

    console.info('[whatsapp-transcribe] app modules loaded:', import.meta.url)
    const engine = await bootEngine()
    const pipeline = createPipeline({ api: engine.api, emit: engine.emit,
        getKey: engine.getKey, infographicMount: () => $('#infographic-mount') })

    engine.api
        .register('runPass',    (p) => pipeline.runPass(p), { async: true,
            events: ['wa:pass:started', 'wa:normalised', 'wa:ingested', 'wa:transcript', 'wa:facts', 'wa:facts:error', 'wa:translation', 'wa:translation:error', 'wa:summary', 'wa:summary:error',
                     'wa:infographic:started', 'wa:infographic', 'wa:infographic:error', 'wa:pass:complete', 'wa:pass:error'] })
        .register('getResults', () => pipeline.results(),   { async: false })
        .register('redrawInfographic', (p) => pipeline.redrawInfographic(p), { async: true,
            events: ['wa:infographic:started', 'wa:infographic', 'wa:infographic:error'] })
        .register('updateMaterial',  (p) => pipeline.updateMaterial(p),  { async: false, events: ['wa:material:updated'] })
        .register('restoreMaterial', (p) => pipeline.restoreMaterial(p), { async: false, events: ['wa:material:updated'] })
        // The declared workflow (issue 042): the definition + quotable ceilings,
        // and the execution trace of the current/last run (the provenance record).
        .register('getWorkflow',      (p) => pipeline.getWorkflow(p), { async: true })
        .register('getWorkflowTrace', () => pipeline.trace(),         { async: false,
            events: ['wa:workflow:started', 'wa:workflow:step', 'wa:workflow:complete'] })

    // --- M3: chat with the materials (issue 034) — controller on the API, panel renders ---
    const chatCtl = createChat({ emit: engine.emit, getResults: () => pipeline.results() })
    engine.api
        .register('getChatContext', () => chatCtl.getChatContext(),   { async: false })
        .register('chatExchange',   (p) => chatCtl.chatExchange(p),   { async: true,
            events: ['wa:chat:update', 'wa:chat:complete'] })
        .register('getChatHistory', () => chatCtl.getChatHistory(),   { async: false })
        .register('clearChat',      () => chatCtl.clearChat(),        { async: false })
        .register('getChatTools',   () => chatCtl.getChatTools(),     { async: false })
    engine.api.activate()   // → window.__tool ('whatsapp-transcribe') + tool:ready

    const key = $('#key'), drop = $('#drop'), rail = $('#rail')
    const fCard = $('#facts-card')
    const tCard = $('#transcript-card'), xCard = $('#translation-card'),
          sCard = $('#summary-card'), cost = $('#cost')

    /* --- key handling (BYOK, localStorage) ---
       The section is shown when there is already a key (one quiet collapsed line
       that says so, and offers `change`) and otherwise stays out of the way
       until a run needs it. `runWhenKeySaved` carries the intent across the
       interruption: someone who pressed Transcribe asked for a pass, and being
       stopped for a key should not cost them the click. */
    const keySection = $('#key-section')
    const showKeySection = (on) => { keySection.hidden = !on }
    let runWhenKeySaved = false
    showKeySection(engine.hasKey())

    key.addEventListener('wa:key-submitted', async (e) => {
        const r = await window.__tool.setApiKey({ apiKey: e.detail.apiKey })
        const ok = r.ok && r.present
        key.confirmSaved(ok)
        if (ok && runWhenKeySaved) { runWhenKeySaved = false; startPass() }
    })

    /* Ask for the key at the point of need, not on arrival. Revealing the panel
       is not enough on its own — on a long page it can land below the fold, and
       a form nobody can see reads as a button that did nothing. */
    const requestKey = () => {
        runWhenKeySaved = true
        showKeySection(true)
        key.expand?.()
        keySection.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // --- file chosen → options row ---
    const takeFile = (file) => {
        pendingFile = file
        $('.file-name').textContent = pendingFile.name
        $('.file-size').textContent = (pendingFile.size / 1024).toFixed(0) + ' KB'
        show('#file-section')
    }
    drop.addEventListener('wa:file-chosen', (e) => takeFile(e.detail.file))

    /* Everything a demo produced sits under this banner. The one thing this
       feature must never do is let a scripted result be mistaken for the user's
       own recording, so the stamp goes at the top of the results, not in a
       footnote. */
    function showDemoBanner() {
        const host = $('#results-section')
        if (host.querySelector('.demo-banner')) return
        const b = document.createElement('div')
        b.className = 'demo-banner'
        const badge = document.createElement('span')
        badge.className = 'badge'
        badge.textContent = window.__waI18n?.tOr?.('core.demoBadge', 'DEMO') ?? 'DEMO'
        const text = document.createElement('span')
        text.textContent = window.__waI18n?.tOr?.('core.demoNote',
            'This is a scripted example, not a real recording. Nothing was sent anywhere and nothing was charged.')
            ?? 'This is a scripted example, not a real recording.'
        b.append(badge, text)
        host.prepend(b)
    }
    const clearDemoBanner = () => $('#results-section').querySelector('.demo-banner')?.remove()

    /* The keyless demo (issue 063). It runs the REAL declared workflow with
       scripted model answers, so what a visitor sees is the product's actual
       path, trace and cards — not a mock-up that can drift from it. No key is
       read, no request is made, and every artefact is stamped DEMO. */
    $('#try-demo')?.addEventListener('click', async () => {
        showDemoBanner()
        show('#work-section', '#results-section')
        const infog = $('#want-infographic').checked, trans = $('#want-translate').checked
        rail.reset(infog, trans); rail.start('ingest')
        try { await window.__tool.runPass({ demo: true, infographic: infog, translate: trans }) }
        catch (err) { console.warn('[demo]', err) }
    })

    // --- sample voice notes: click → fetch → the normal options screen, so the
    // infographic toggle (and any future option) stays available (issue 031). ---
    /* [data-sample], not .sample-chip. The keyless demo button (issue 063) shares
       the chip styling but loads no file — without this qualifier it also ran the
       sample loader, which fetched `undefined` and produced "that doesn't look
       like an audio file we can read" over the top of the demo. */
    document.querySelectorAll('.sample-chip[data-sample]').forEach(chip => chip.addEventListener('click', async () => {
        const path = chip.dataset.sample
        chip.disabled = true
        const label = chip.textContent
        chip.textContent = 'loading…'
        try {
            const r = await fetch(path)
            if (!r.ok) throw new Error('HTTP ' + r.status)
            const name = path.split('/').pop()
            const file = new File([await r.arrayBuffer()], name,
                { type: name.endsWith('.ogg') ? 'audio/ogg' : 'audio/opus' })
            takeFile(file)
            $('#file-section').scrollIntoView({ behavior: 'smooth', block: 'center' })
        } catch (err) {
            showError('not-audio', 'ingest', 'sample failed to load: ' + err.message)
        } finally { chip.disabled = false; chip.textContent = label }
    }))

    // --- infographic model picker (persisted) + redraw ---
    const modelSel = $('#infographic-model'), redrawBtn = $('#redraw-infographic')
    INFOGRAPHIC_MODELS.forEach(m => modelSel.add(new Option(m.label, m.id)))
    try { modelSel.value = localStorage.getItem('wa-infographic-model') || INFOGRAPHIC_MODEL_DEFAULT } catch (_) { modelSel.value = INFOGRAPHIC_MODEL_DEFAULT }
    if (!modelSel.value) modelSel.value = INFOGRAPHIC_MODEL_DEFAULT
    modelSel.addEventListener('change', () => { try { localStorage.setItem('wa-infographic-model', modelSel.value) } catch (_) {} })
    redrawBtn.addEventListener('click', async () => {
        if (!engine.hasKey()) { showKeySection(true); return showError('no-key', 'infographic') }
        try { await window.__tool.redrawInfographic({ model: modelSel.value }) } catch (_) { /* surfaced via events */ }
    })
    // Resetting the page must also stop the machine (issue 046): without the
    // cancel, a pass kept running headless after "do another voice note" /
    // remove-file — the flow panel showed a completed run whose results the
    // page never displayed.
    let passActive = false
    const resetToStart = () => {
        if (passActive) pipeline.cancel()
        pendingFile = null
        show()
    }
    $('.file-remove').addEventListener('click', resetToStart)

    // --- the quotable maximum (issue 042): sum of the declared step budgets on
    // the path the current options select — known before anything runs. ---
    const wantInfog = $('#want-infographic')
    const wantTranslate = $('#want-translate')

    /* The translate option names the language it will produce, from the active
       locale's culture data — "translate it into my language first" is vague,
       "…into Português (Portugal)" is a decision someone can actually make.
       Re-labelled on every locale change. */
    const passOptions = () => ({
        infographic: wantInfog.checked,
        translate: wantTranslate.checked,
        language: culture().language || 'English',
        tone: culture().tone || '',
    })
    const labelTranslate = () => {
        const loc = getLocales()[getLocale()]
        $('#translate-lang').textContent = loc ? ` — ${loc.nativeLabel || loc.label}` : ''
    }
    labelTranslate()
    window.addEventListener('wa:locale-changed', () => { labelTranslate(); updateQuote() })

    async function updateQuote() {
        try {
            const w = await window.__tool.getWorkflow({ options: passOptions() })
            $('#max-cost').textContent = `max cost for this run ≈ ${fmtGbp(w.quoteUsd)}`
            $('#max-cost').title = `The "${w.definition.title}" workflow declares a spending ceiling per step — this is their sum for the options chosen. The 🧭 flow tab shows the steps.`
        } catch (_) { $('#max-cost').textContent = '' }
    }
    wantInfog.addEventListener('change', updateQuote)
    wantTranslate.addEventListener('change', updateQuote)
    updateQuote()

    // --- go ---
    async function startPass() {
        if (!pendingFile) return
        const wantInfographic = $('#want-infographic').checked
        $('.working-name').textContent = pendingFile.name
        tCard.hidden = xCard.hidden = sCard.hidden = cost.hidden = true
        $('#infographic-card').hidden = true; $('#save-svg').hidden = true
        $('#infographic-note').hidden = true
        clearDemoBanner()   // a real run must never inherit the demo's stamp
        show('#work-section', '#results-section')
        rail.reset(wantInfographic, wantTranslate.checked); rail.start('ingest')
        try {
            await window.__tool.runPass({ ...passOptions(), file: pendingFile,
                infographic: wantInfographic, infographicModel: modelSel.value })
        } catch (e) {
            const code = await diagnoseLlmFailure(e)
            if (code === 'key-invalid') {
                // A rejected key means the panel has to be on screen to be fixed,
                // whatever state it was in when the run started.
                showKeySection(true)
                key.confirmSaved(false, 'OpenRouter rejected this key — it may be disabled or out of credit. Paste a fresh one.')
            }
            showError(code, 'transcribe', e.message)
        }
    }
    $('#go').addEventListener('click', () => {
        if (!pendingFile) return
        // The key is asked for HERE and nowhere earlier (build-order task 5).
        if (!engine.hasKey()) return requestKey()
        startPass()
    })

    // A disabled/revoked key surfaces as a bare "Failed to fetch" (the browser
    // gets no CORS headers on the rejection), which reads as a network problem.
    // When an LLM call dies that way, ask OpenRouter about the key itself so the
    // error names the real cause (issue 032 — found live via the debug pane).
    async function diagnoseLlmFailure(e) {
        const looksNetwork = (e?.code === 'llm-error' || e?.code == null) && /failed to fetch|networkerror|load failed/i.test(e?.message || '')
        if (!looksNetwork) return e?.code || 'llm-error'
        try { await window.__tool.getKeyStatus(); return 'network' }
        catch (ke) { return (ke?.code === 'key-invalid' || ke?.status === 401 || ke?.status === 403) ? 'key-invalid' : 'network' }
    }

    // --- streaming reveal, bound to wa:* events ---
    window.addEventListener('wa:ingested',   () => { rail.finish('ingest'); rail.start('transcribe') })
    window.addEventListener('wa:transcript', (e) => {
        rail.finish('transcribe')
        // Metadata is read on every pass (issue 061) — it decides whether the
        // translate step is needed, so the rail cannot skip ahead here.
        rail.start('classify')
        tCard.show(e.detail.text); tCard.hidden = false
        // The caveat appears WITH the transcript, never before it exists.
        const caveat = $('#model-caveat'); if (caveat) caveat.hidden = false
        updateCost()
    })

    /* What the pass noticed. The card is the visible half; the consequential
       half is `needsTranslation`, which has already decided whether the next
       step happens at all. When it says no, the translate row is REMOVED rather
       than left greyed out, and the card says why — a step that silently never
       runs looks like a bug, and a step that says "not needed, not charged"
       looks like the product being careful with your money. */
    window.addEventListener('wa:facts', (e) => {
        rail.finish('classify')
        const { facts, needsTranslation } = e.detail
        fCard.show({ facts, needsTranslation, asked: wantTranslate.checked })
        if (wantTranslate.checked && needsTranslation) rail.start('translate')
        else { rail.hide('translate'); rail.start('summary') }
        updateCost()
    })
    window.addEventListener('wa:facts:error', () => {
        // Declared degrade. No metadata, and translation goes ahead as asked —
        // losing the card must never quietly cancel work the user chose.
        rail.finish('classify', false)
        if (wantTranslate.checked) rail.start('translate'); else rail.start('summary')
    })
    /* The translation is SHOWN, not just used. Without the card a reader sees an
       English transcript and a Portuguese summary with nothing joining them —
       and no way to check the translation the summary was built on. */
    window.addEventListener('wa:translation', (e) => {
        rail.finish('translate'); rail.start('summary')
        xCard.show(e.detail.text); xCard.hidden = false
    })
    window.addEventListener('wa:translation:error', () => {
        // Declared degrade: the summary still runs, on the original transcript.
        rail.finish('translate', false); rail.start('summary')
    })

    window.addEventListener('wa:summary', (e) => {
        rail.finish('summary')
        sCard.show(e.detail.text); sCard.hidden = false
        updateCost()
    })
    window.addEventListener('wa:summary:error', () => rail.finish('summary', false))

    // The assistant edited (or restored) a material — re-render the card and say so
    // in place, with the way back always visible (issue 035).
    window.addEventListener('wa:material:updated', (e) => {
        const { what, edited } = e.detail
        const r = pipeline.results() || {}
        const card = what === 'transcript' ? tCard : sCard
        if (r[what]) { card.show(r[what]); card.hidden = false }
        $(`#${what}-edit-note`).hidden = !edited
    })
    document.querySelectorAll('[data-restore]').forEach(a => a.addEventListener('click', async (e) => {
        e.preventDefault()
        await window.__tool.restoreMaterial({ what: a.dataset.restore })
    }))

    // The image models return nothing until the finished picture arrives (80s+ is
    // normal), so the wait needs a heartbeat: spinner + live elapsed counter
    // (issue 031 — "it worked but looked stuck").
    let drawTimer = null
    const stopDrawTimer = () => { if (drawTimer) { clearInterval(drawTimer); drawTimer = null } }
    window.addEventListener('wa:infographic:started', (e) => {
        rail.start('infographic')
        $('#infographic-card').hidden = false
        $('#redraw-infographic').disabled = true
        const t0 = Date.now()
        const modelName = e.detail?.model || modelSel.value
        stopDrawTimer()
        const tick = () => infographicNote(`<span class="wa-spin"></span>drawing with ${modelName} — ${Math.round((Date.now() - t0) / 1000)}s (a finished image typically takes 60–90s)`, false, true)
        tick(); drawTimer = setInterval(tick, 1000)
    })
    window.addEventListener('wa:infographic', (e) => {
        stopDrawTimer()
        rail.finish('infographic')
        $('#redraw-infographic').disabled = false; $('#redraw-infographic').hidden = false
        const got = e.detail.svg || e.detail.image
        $('#save-svg').hidden = !got
        $('#save-svg').textContent = e.detail.image ? 'save .' + imageExt(e.detail.image) : 'save .svg'
        if (got) $('#infographic-note').hidden = true
        else infographicNote('The model replied but did not produce a drawable image. Your transcript and summary are unaffected — try a redraw, or a different model from the selector above.', true)
        updateCost()
    })
    window.addEventListener('wa:infographic:error', (e) => {
        stopDrawTimer()
        rail.finish('infographic', false)
        $('#redraw-infographic').disabled = false; $('#redraw-infographic').hidden = false
        const [title, body] = ERROR_COPY[e.detail.code] || ['The infographic could not be drawn.', 'Your transcript and summary above are unaffected — try a redraw.']
        infographicNote(`${title} ${body}`, true)
    })
    // The image models pick their own encoding (jpeg/png/webp) — name the file by
    // what the data URL actually is.
    const imageExt = (dataUrl) => {
        const m = String(dataUrl).match(/^data:image\/(\w+)/)
        const t = m ? m[1] : 'png'
        return t === 'jpeg' ? 'jpg' : t
    }
    $('#save-svg').addEventListener('click', () => {
        const r = pipeline.results() || {}
        const a = document.createElement('a')
        if (r.image) { a.href = r.image; a.download = 'infographic.' + imageExt(r.image) }
        else if (r.svg) { a.href = URL.createObjectURL(new Blob([r.svg], { type: 'image/svg+xml' })); a.download = 'infographic.svg' }
        else return
        a.click(); if (r.svg && !r.image) URL.revokeObjectURL(a.href)
    })
    window.addEventListener('wa:pass:complete', () => {
        passActive = false
        $('#work-section').hidden = true; updateCost()
        // Self-healing guard (issue 046): a finished run the user paid for must
        // never be invisible. If results exist but both the results and error
        // sections are hidden (the page was reset mid-run), bring them back.
        const done = pipeline.results() || {}
        if (done.transcript && $('#results-section').hidden && $('#error-section').hidden) {
            $('#results-section').hidden = false
            tCard.show(done.transcript); tCard.hidden = false
            if (done.translation) { xCard.show(done.translation); xCard.hidden = false }
            if (done.summary) { sCard.show(done.summary); sCard.hidden = false }
        }
        // No infographic asked for? Offer to draw one from the finished pass.
        const r = pipeline.results() || {}
        if (r.transcript && !r.svg && !r.image && drawTimer == null) {
            $('#redraw-infographic').hidden = false
            $('#redraw-infographic').textContent = 'draw infographic'
            infographicNote('No infographic was requested for this pass — pick a model above and press "draw infographic" to make one now.')
        } else { $('#redraw-infographic').textContent = 'redraw' }
    })
    rail.addEventListener('wa:stop-requested', () => pipeline.cancel())

    $('#again').addEventListener('click', resetToStart)
    window.addEventListener('wa:pass:started', () => { passActive = true })
    window.addEventListener('wa:pass:error',   () => { passActive = false })

    function infographicNote(text, bad = false, html = false) {
        const note = $('#infographic-note')
        if (html) note.innerHTML = text; else note.textContent = text
        note.classList.toggle('bad', bad)
        note.hidden = false
        $('#infographic-card').hidden = false
    }

    function updateCost() {
        const c = window.__tool.getCostSummary?.()
        Promise.resolve(c).then(sum => {
            if (!sum) return
            const item = (sum.perItem || []).slice(-1)[0]
            cost.update({ passUsd: item ? item.usd : undefined, sessionUsd: sum.sessionUsd, fmt: fmtGbp })
        }).catch(() => {})
    }

    function showError(code, stage, message) {
        const [title, body] = ERROR_COPY[code] || ['Something failed on the model side.', 'Nothing was stored — try again. (' + (message || code) + ')']
        $('.error-title').textContent = title
        $('.error-body').textContent = body
        show('#error-section', ...(pendingFile ? ['#file-section'] : []))
    }
}

main().catch(e => {
    document.body.insertAdjacentHTML('beforeend',
        '<div style="position:fixed;bottom:14px;left:14px;right:14px;background:#fff3f3;border:1px solid #f3c0c0;color:#8a1f1f;padding:12px 16px;border-radius:10px;font:14px system-ui">' +
        'The transcription engine failed to load (is dev.tools.sgraph.ai reachable?). Refresh to retry.</div>')
    console.error('[whatsapp-transcribe] boot failed:', e)
})
