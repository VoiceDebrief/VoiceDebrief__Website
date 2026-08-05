/* pipeline.js — the one pass, streaming in arrival order (brief v0.33.53):
   visible progress → TRANSCRIPT → SUMMARY → (infographic when issue 024 lands).
   Emits wa:* events; never holds a finished artefact for a slower one. */

import { SUMMARY_PROMPT_URL } from './config.js'

export function createPipeline({ api, emit }) {
    const call = (name, params) => window.__tool[name](params)
    let current = { itemId: null, results: null }

    async function loadSummaryPrompt() {
        const r = await fetch(SUMMARY_PROMPT_URL, { cache: 'no-cache' })
        if (!r.ok) throw Object.assign(new Error('summary prompt unavailable'), { code: 'prompt-missing' })
        return r.text()
    }

    /* runPass({ file }) → { transcript, summary, usage } — streams via events:
       wa:pass:started {name,sizeBytes} · wa:transcript {text,usage} ·
       wa:summary {text,usage} · wa:pass:complete {results} ·
       wa:pass:error {code,stage,message} */
    async function runPass(params = {}) {
        const file = params.file
        if (!file) throw Object.assign(new Error('runPass requires { file }'), { code: 'no-file' })

        const results = { name: file.name, transcript: null, summary: null, usage: {} }
        current = { itemId: null, results }
        emit('wa:pass:started', { name: file.name, sizeBytes: file.size })

        // Stage 1 — ingest (the engine decodes and detects format by content).
        const { added, rejected } = await call('addFiles', { files: [file] })
        if (!added.length) {
            const code = (rejected[0] && rejected[0].code) || 'not-audio'
            emit('wa:pass:error', { stage: 'ingest', code })
            throw Object.assign(new Error('file rejected'), { code })
        }
        current.itemId = added[0].id
        emit('wa:ingested', { ...added[0] })

        // Stage 2 — transcript (arrives first, never waits for later stages).
        let t
        try { t = await call('transcribeItem', { id: current.itemId }) }
        catch (e) { emit('wa:pass:error', { stage: 'transcribe', code: e.code || 'llm-error', message: e.message }); throw e }
        results.transcript = t.text
        results.usage.transcribe = t.usage
        emit('wa:transcript', { text: t.text, latencyMs: t.latencyMs, usage: t.usage })

        // Stage 3 — summary document (prompt is a markdown file on the site).
        try {
            const prompt = await loadSummaryPrompt()
            const s = await call('ask', { text: prompt })
            results.summary = s.text
            results.usage.summary = s.usage
            emit('wa:summary', { text: s.text, usage: s.usage })
        } catch (e) {
            // The transcript stands on its own — a summary failure degrades, not aborts.
            emit('wa:summary:error', { code: e.code || 'llm-error', message: e.message })
        }

        // Stage 4 — infographic: gated on the verified capabilities guide (issue 024).
        emit('wa:pass:complete', { results })
        return results
    }

    function cancel() {
        if (current.itemId != null) return call('cancelItem', { id: current.itemId })
        return { cancelled: 0 }
    }

    return { runPass, cancel, results: () => current.results }
}
