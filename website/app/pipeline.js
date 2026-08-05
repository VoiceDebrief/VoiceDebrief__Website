/* pipeline.js — the one pass, streaming in arrival order (brief v0.33.53):
   visible progress → TRANSCRIPT → SUMMARY → (infographic when issue 024 lands).
   Emits wa:* events; never holds a finished artefact for a slower one. */

import { SUMMARY_PROMPT_URL, INFOGRAPHIC_PROMPT_URL } from './config.js'
import { generateInfographic } from './infographic.js'
import { normaliseAudioFile } from './audio-normalise.js'

export function createPipeline({ api, emit, getKey, infographicMount }) {
    const call = (name, params) => window.__tool[name](params)
    let current = { itemId: null, results: null }

    async function loadSummaryPrompt() {
        const r = await fetch(SUMMARY_PROMPT_URL, { cache: 'no-cache' })
        if (!r.ok) throw Object.assign(new Error('summary prompt unavailable'), { code: 'prompt-missing' })
        return r.text()
    }

    async function loadInfographicPrompt() {
        const r = await fetch(INFOGRAPHIC_PROMPT_URL, { cache: 'no-cache' })
        return r.ok ? r.text() : 'Create an infographic of this voice note.\n---\n'
    }

    /* runPass({ file, infographic?, style? }) → { transcript, summary, svg, usage } —
       streams via events: wa:pass:started · wa:transcript · wa:summary ·
       wa:infographic:started · wa:infographic {svg,usage} · wa:infographic:error ·
       wa:pass:complete · wa:pass:error {code,stage} */
    async function runPass(params = {}) {
        const chosen = params.file
        if (!chosen) throw Object.assign(new Error('runPass requires { file }'), { code: 'no-file' })

        // Detect the format by CONTENT before the engine decides anything from the
        // filename or the OS-supplied MIME (issue 025: a mislabelled Opus-in-Ogg
        // reached the model undecodable and came back as a hallucinated transcript).
        const norm = await normaliseAudioFile(chosen)
        const file = norm.file
        if (norm.changed) emit('wa:normalised', { from: chosen.name, to: file.name, sniffed: norm.sniffed, reason: norm.reason })

        const results = { name: chosen.name, transcript: null, summary: null, svg: null, usage: {} }
        current = { itemId: null, results }
        emit('wa:pass:started', { name: chosen.name, sizeBytes: file.size, sniffed: norm.sniffed })

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

        // Stage 4 — infographic, only if asked (arrives last, the delight).
        if (params.infographic) {
            emit('wa:infographic:started', {})
            try {
                const preamble = await loadInfographicPrompt()
                const content = preamble + '\n## Transcript\n' + results.transcript +
                    (results.summary ? '\n\n## Summary\n' + results.summary : '')
                const g = await generateInfographic({
                    mount: infographicMount(), content, apiKey: getKey(),
                    style: params.style || 'executive' })
                results.svg = g.svg
                results.usage.infographic = g.usage
                emit('wa:infographic', { svg: g.svg, usage: g.usage })
            } catch (e) {
                // Like the summary: an infographic failure degrades, never aborts.
                emit('wa:infographic:error', { code: e.code || 'llm-error', message: e.message })
            }
        }

        emit('wa:pass:complete', { results })
        return results
    }

    function cancel() {
        if (current.itemId != null) return call('cancelItem', { id: current.itemId })
        return { cancelled: 0 }
    }

    return { runPass, cancel, results: () => current.results }
}
