/* pipeline.js — the one pass, streaming in arrival order (brief v0.33.53):
   visible progress → TRANSCRIPT → SUMMARY → (infographic when issue 024 lands).
   Emits wa:* events; never holds a finished artefact for a slower one. */

import { SUMMARY_PROMPT_URL, INFOGRAPHIC_PROMPT_URL } from './config.js'
import { generateInfographic } from './infographic.js'
import { normaliseAudioFile } from './audio-normalise.js'
import { debugStore } from './debug-store.js'

export function createPipeline({ api, emit, getKey, infographicMount }) {
    const call = (name, params) => window.__tool[name](params)
    let current = { itemId: null, results: null }

    // Both prompts honour a saved debug-pane override; the site file stays the
    // default and is registered with the store so the pane can show/diff it.
    async function loadSummaryPrompt() {
        const r = await fetch(SUMMARY_PROMPT_URL, { cache: 'no-cache' })
        if (!r.ok) throw Object.assign(new Error('summary prompt unavailable'), { code: 'prompt-missing' })
        debugStore.setPromptDefault('summary', await r.text())
        return debugStore.getPrompt('summary')
    }

    async function loadInfographicPrompt() {
        const r = await fetch(INFOGRAPHIC_PROMPT_URL, { cache: 'no-cache' })
        if (r.ok) debugStore.setPromptDefault('infographic', await r.text())
        return debugStore.getPrompt('infographic') || 'Create an infographic of this voice note.\n---\n'
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

        const results = { name: chosen.name, transcript: null, summary: null, svg: null, image: null, usage: {} }
        current = { itemId: null, results }
        emit('wa:pass:started', { name: chosen.name, sizeBytes: file.size, sniffed: norm.sniffed })

        // Stage 1 — ingest (the engine decodes and detects format by content).
        const { added, rejected } = await call('addFiles', { files: [file] })
        let item = added[0]
        if (!item && !rejected.length) {
            // The engine silently dedupes an identical name+size (addItem → null:
            // not added, not rejected). Re-running the same voice note is a
            // legitimate ask — reuse the existing item; transcribeItem appends a
            // fresh version to it.
            const existing = (await call('getItems')).find(i => i.name === file.name && i.sizeBytes === file.size)
            if (existing) item = { id: existing.id, name: existing.name, sizeBytes: existing.sizeBytes, mimeType: existing.mimeType, reused: true }
        }
        if (!item) {
            const code = (rejected[0] && rejected[0].code) || 'not-audio'
            emit('wa:pass:error', { stage: 'ingest', code })
            throw Object.assign(new Error('file rejected'), { code })
        }
        current.itemId = item.id
        emit('wa:ingested', { ...item })

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
            const s = await call('ask', { text: prompt, label: 'summary' })
            results.summary = s.text
            results.usage.summary = s.usage
            emit('wa:summary', { text: s.text, usage: s.usage })
        } catch (e) {
            // The transcript stands on its own — a summary failure degrades, not aborts.
            emit('wa:summary:error', { code: e.code || 'llm-error', message: e.message })
        }

        // Stage 4 — infographic, only if asked (arrives last, the delight).
        if (params.infographic) {
            await runInfographicStage({ model: params.infographicModel, style: params.style })
        }

        emit('wa:pass:complete', { results })
        return results
    }

    /* One infographic generation over the CURRENT results — used by the pass and
       by the redraw control (issue 031: recreate with a different model/prompt). */
    async function runInfographicStage({ model, style } = {}) {
        const results = current.results
        emit('wa:infographic:started', { model })
        try {
            const preamble = await loadInfographicPrompt()
            const content = preamble + '\n## Transcript\n' + results.transcript +
                (results.summary ? '\n\n## Summary\n' + results.summary : '')
            const g = await generateInfographic({
                mount: infographicMount(), content, apiKey: getKey(),
                style: style || 'executive', model })
            results.svg = g.svg
            results.image = g.image
            results.usage.infographic = g.usage
            emit('wa:infographic', { svg: g.svg, image: g.image, usage: g.usage })
            return { svg: g.svg, image: g.image, usage: g.usage }
        } catch (e) {
            // Like the summary: an infographic failure degrades, never aborts.
            emit('wa:infographic:error', { code: e.code || 'llm-error', message: e.message })
            throw e
        }
    }

    /* Redraw on demand, after a pass — different model, same transcript+summary. */
    async function redrawInfographic(params = {}) {
        if (!current.results || !current.results.transcript)
            throw Object.assign(new Error('run a pass first — there is no transcript to draw from'), { code: 'no-results' })
        return runInfographicStage({ model: params.model, style: params.style })
    }

    function cancel() {
        if (current.itemId != null) return call('cancelItem', { id: current.itemId })
        return { cancelled: 0 }
    }

    return { runPass, redrawInfographic, cancel, results: () => current.results }
}
