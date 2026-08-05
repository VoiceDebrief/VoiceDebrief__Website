/* app.js — page bootstrap: boot the engine (Attempt 2 harness), register the
   pipeline on our SgToolApi, wire the wa-* components. The UI drives everything
   through window.__tool — the UI is just one consumer of the API. */

import { fmtGbp } from './config.js'
import { bootEngine } from './engine.js'
import { createPipeline } from './pipeline.js'
import { INFOGRAPHIC_MODELS, INFOGRAPHIC_MODEL_DEFAULT } from './infographic.js'

// Components (ours; the SgComponent base loads from the tools origin inside each).
import '../components/wa-key-panel/v0/v0.1/v0.1.0/wa-key-panel.js'
import '../components/wa-drop-zone/v0/v0.1/v0.1.0/wa-drop-zone.js'
import '../components/wa-progress-rail/v0/v0.1/v0.1.1/wa-progress-rail.js'
import '../components/wa-result-card/v0/v0.1/v0.1.1/wa-result-card.js'
import '../components/wa-cost-line/v0/v0.1/v0.1.0/wa-cost-line.js'
import '../components/wa-debug-panel/v0/v0.1/v0.1.1/wa-debug-panel.js'

const $ = (s) => document.querySelector(s)
const sections = ['#key-section', '#file-section', '#work-section', '#results-section', '#error-section']
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
    'no-key':          ['Save your OpenRouter key first.', 'Paste it in the key box above — it stays in this browser.'],
    'prompt-missing':  ['The summary prompt failed to load.', 'The transcript is unaffected; try again for the summary.'],
}

let pendingFile = null

async function main() {
    // Version stamp (written by CI at publish time).
    fetch('../version.txt', { cache: 'no-store' }).then(r => r.ok ? r.text() : 'dev').then(v => { $('#site-version').textContent = v.trim() }).catch(() => {})

    console.info('[whatsapp-transcribe] app modules loaded:', import.meta.url)
    const engine = await bootEngine()
    const pipeline = createPipeline({ api: engine.api, emit: engine.emit,
        getKey: engine.getKey, infographicMount: () => $('#infographic-mount') })

    engine.api
        .register('runPass',    (p) => pipeline.runPass(p), { async: true,
            events: ['wa:pass:started', 'wa:normalised', 'wa:ingested', 'wa:transcript', 'wa:summary', 'wa:summary:error',
                     'wa:infographic:started', 'wa:infographic', 'wa:infographic:error', 'wa:pass:complete', 'wa:pass:error'] })
        .register('getResults', () => pipeline.results(),   { async: false })
        .register('redrawInfographic', (p) => pipeline.redrawInfographic(p), { async: true,
            events: ['wa:infographic:started', 'wa:infographic', 'wa:infographic:error'] })
    engine.api.activate()   // → window.__tool ('whatsapp-transcribe') + tool:ready

    const key = $('#key'), drop = $('#drop'), rail = $('#rail')
    const tCard = $('#transcript-card'), sCard = $('#summary-card'), cost = $('#cost')

    // --- key handling (BYOK, localStorage) ---
    key.addEventListener('wa:key-submitted', async (e) => {
        const r = await window.__tool.setApiKey({ apiKey: e.detail.apiKey })
        key.confirmSaved(r.ok && r.present)
    })

    // --- file chosen → options row ---
    const takeFile = (file) => {
        pendingFile = file
        $('.file-name').textContent = pendingFile.name
        $('.file-size').textContent = (pendingFile.size / 1024).toFixed(0) + ' KB'
        show('#key-section', '#file-section')
    }
    drop.addEventListener('wa:file-chosen', (e) => takeFile(e.detail.file))

    // --- sample voice notes: click → fetch → the normal options screen, so the
    // infographic toggle (and any future option) stays available (issue 031). ---
    document.querySelectorAll('.sample-chip').forEach(chip => chip.addEventListener('click', async () => {
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
        if (!engine.hasKey()) return showError('no-key', 'infographic')
        try { await window.__tool.redrawInfographic({ model: modelSel.value }) } catch (_) { /* surfaced via events */ }
    })
    $('.file-remove').addEventListener('click', () => { pendingFile = null; show('#key-section') })

    // --- go ---
    $('#go').addEventListener('click', async () => {
        if (!pendingFile) return
        if (!engine.hasKey()) return showError('no-key', 'key')
        const wantInfographic = $('#want-infographic').checked
        $('.working-name').textContent = pendingFile.name
        tCard.hidden = sCard.hidden = cost.hidden = true
        $('#infographic-card').hidden = true; $('#save-svg').hidden = true
        $('#infographic-note').hidden = true
        show('#key-section', '#work-section', '#results-section')
        rail.reset(wantInfographic); rail.start('ingest')
        try {
            await window.__tool.runPass({ file: pendingFile, infographic: wantInfographic,
                infographicModel: modelSel.value })
        } catch (e) {
            showError(e.code || 'llm-error', 'transcribe', e.message)
        }
    })

    // --- streaming reveal, bound to wa:* events ---
    window.addEventListener('wa:ingested',   () => { rail.finish('ingest'); rail.start('transcribe') })
    window.addEventListener('wa:transcript', (e) => {
        rail.finish('transcribe'); rail.start('summary')
        tCard.show(e.detail.text); tCard.hidden = false
        updateCost()
    })
    window.addEventListener('wa:summary', (e) => {
        rail.finish('summary')
        sCard.show(e.detail.text); sCard.hidden = false
        updateCost()
    })
    window.addEventListener('wa:summary:error', () => rail.finish('summary', false))

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
        $('#work-section').hidden = true; updateCost()
        // No infographic asked for? Offer to draw one from the finished pass.
        const r = pipeline.results() || {}
        if (r.transcript && !r.svg && !r.image && drawTimer == null) {
            $('#redraw-infographic').hidden = false
            $('#redraw-infographic').textContent = 'draw infographic'
            infographicNote('No infographic was requested for this pass — pick a model above and press "draw infographic" to make one now.')
        } else { $('#redraw-infographic').textContent = 'redraw' }
    })
    rail.addEventListener('wa:stop-requested', () => pipeline.cancel())

    $('#again').addEventListener('click', () => { pendingFile = null; show('#key-section') })

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
        show('#key-section', '#error-section', ...(pendingFile ? ['#file-section'] : []))
    }
}

main().catch(e => {
    document.body.insertAdjacentHTML('beforeend',
        '<div style="position:fixed;bottom:14px;left:14px;right:14px;background:#fff3f3;border:1px solid #f3c0c0;color:#8a1f1f;padding:12px 16px;border-radius:10px;font:14px system-ui">' +
        'The transcription engine failed to load (is dev.tools.sgraph.ai reachable?). Refresh to retry.</div>')
    console.error('[whatsapp-transcribe] boot failed:', e)
})
