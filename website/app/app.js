/* app.js — page bootstrap: boot the engine (Attempt 2 harness), register the
   pipeline on our SgToolApi, wire the wa-* components. The UI drives everything
   through window.__tool — the UI is just one consumer of the API. */

import { fmtGbp } from './config.js'
import { bootEngine } from './engine.js'
import { createPipeline } from './pipeline.js'

// Components (ours; the SgComponent base loads from the tools origin inside each).
import '../components/wa-key-panel/v0/v0.1/v0.1.0/wa-key-panel.js'
import '../components/wa-drop-zone/v0/v0.1/v0.1.0/wa-drop-zone.js'
import '../components/wa-progress-rail/v0/v0.1/v0.1.1/wa-progress-rail.js'
import '../components/wa-result-card/v0/v0.1/v0.1.1/wa-result-card.js'
import '../components/wa-cost-line/v0/v0.1/v0.1.0/wa-cost-line.js'

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
    fetch('../version.txt').then(r => r.ok ? r.text() : 'dev').then(v => { $('#site-version').textContent = v.trim() }).catch(() => {})

    const engine = await bootEngine()
    const pipeline = createPipeline({ api: engine.api, emit: engine.emit,
        getKey: engine.getKey, infographicMount: () => $('#infographic-mount') })

    engine.api
        .register('runPass',    (p) => pipeline.runPass(p), { async: true,
            events: ['wa:pass:started', 'wa:normalised', 'wa:ingested', 'wa:transcript', 'wa:summary', 'wa:summary:error',
                     'wa:infographic:started', 'wa:infographic', 'wa:infographic:error', 'wa:pass:complete', 'wa:pass:error'] })
        .register('getResults', () => pipeline.results(),   { async: false })
    engine.api.activate()   // → window.__tool ('whatsapp-transcribe') + tool:ready

    const key = $('#key'), drop = $('#drop'), rail = $('#rail')
    const tCard = $('#transcript-card'), sCard = $('#summary-card'), cost = $('#cost')

    // --- key handling (BYOK, localStorage) ---
    key.addEventListener('wa:key-submitted', async (e) => {
        const r = await window.__tool.setApiKey({ apiKey: e.detail.apiKey })
        key.confirmSaved(r.ok && r.present)
    })

    // --- file chosen → options row ---
    drop.addEventListener('wa:file-chosen', (e) => {
        pendingFile = e.detail.file
        $('.file-name').textContent = pendingFile.name
        $('.file-size').textContent = (pendingFile.size / 1024).toFixed(0) + ' KB'
        show('#key-section', '#file-section')
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
        show('#key-section', '#work-section', '#results-section')
        rail.reset(wantInfographic); rail.start('ingest')
        try {
            await window.__tool.runPass({ file: pendingFile, infographic: wantInfographic })
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
    window.addEventListener('wa:infographic:started', () => {
        rail.start('infographic')
        $('#infographic-card').hidden = false   // the SVG drawing itself is the progress
    })
    window.addEventListener('wa:infographic', (e) => {
        rail.finish('infographic')
        $('#save-svg').hidden = !e.detail.svg
        updateCost()
    })
    window.addEventListener('wa:infographic:error', () => rail.finish('infographic', false))
    $('#save-svg').addEventListener('click', () => {
        const svg = pipeline.results()?.svg
        if (!svg) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
        a.download = 'infographic.svg'
        a.click(); URL.revokeObjectURL(a.href)
    })
    window.addEventListener('wa:pass:complete', () => { $('#work-section').hidden = true; updateCost() })
    rail.addEventListener('wa:stop-requested', () => pipeline.cancel())

    $('#again').addEventListener('click', () => { pendingFile = null; show('#key-section') })

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
