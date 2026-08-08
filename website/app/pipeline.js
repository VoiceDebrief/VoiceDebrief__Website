/* pipeline.js — the one pass, streaming in arrival order (brief v0.33.53),
   executed FROM THE DECLARED WORKFLOW (issue 042, human brief v0.33.56): the
   sequence, models, budgets and failure behaviour live in
   workflows/standard.json; this file supplies the step executors and keeps the
   wa:* event stream exactly as it always was. Deleting the declaration breaks
   the tool — there is deliberately no code fallback. */

import { SUMMARY_PROMPT_URL, INFOGRAPHIC_PROMPT_URL, TRANSLATE_PROMPT_URL } from './config.js'
import { culture, getLocale } from './i18n.js'
import { generateInfographic } from './infographic.js'
import { normaliseAudioFile } from './audio-normalise.js'
import { debugStore } from './debug-store.js'
import { loadWorkflow, runWorkflow, pathUsd, maxUsd } from './workflow.js'

export const WORKFLOW_URL = './workflows/standard.json'

export function createPipeline({ api, emit, getKey, infographicMount }) {
    const call = (name, params) => window.__tool[name](params)
    let current = { itemId: null, results: null, trace: null }

    // Both prompts honour a saved debug-pane override; the site file stays the
    // default and is registered with the store so the pane can show/diff it.
    async function loadSummaryPrompt() {
        const r = await fetch(SUMMARY_PROMPT_URL, { cache: 'no-cache' })
        if (!r.ok) throw Object.assign(new Error('summary prompt unavailable'), { code: 'prompt-missing' })
        debugStore.setPromptDefault('summary', await r.text())
        return debugStore.getPrompt('summary')
    }

    async function loadTranslatePrompt() {
        const r = await fetch(TRANSLATE_PROMPT_URL, { cache: 'no-cache' })
        if (r.ok) debugStore.setPromptDefault('translate', await r.text())
        return debugStore.getPrompt('translate') || 'Translate the following into {{language}}. Return only the translation.\n---\n'
    }

    async function loadInfographicPrompt() {
        const r = await fetch(INFOGRAPHIC_PROMPT_URL, { cache: 'no-cache' })
        if (r.ok) debugStore.setPromptDefault('infographic', await r.text())
        return debugStore.getPrompt('infographic') || 'Create an infographic of this voice note.\n---\n'
    }

    /* The workflow declaration + its quotable ceilings (issue 042). Fetched per
       call on purpose: the declaration IS the behaviour, so a missing or invalid
       file must fail loudly rather than run from a stale copy. */
    async function getWorkflow(params = {}) {
        const definition = await loadWorkflow(WORKFLOW_URL)
        return {
            definition,
            maxUsd: maxUsd(definition),
            quoteUsd: pathUsd(definition, params.options || {}),
        }
    }

    /* runPass({ file, infographic?, infographicModel?, style? }) → results —
       streams via events: wa:pass:started · wa:transcript · wa:summary ·
       wa:infographic:started · wa:infographic · wa:infographic:error ·
       wa:pass:complete · wa:pass:error {code,stage} — plus the workflow trace:
       wa:workflow:started · wa:workflow:step · wa:workflow:complete */
    async function runPass(params = {}) {
        const chosen = params.file
        if (!chosen) throw Object.assign(new Error('runPass requires { file }'), { code: 'no-file' })

        const def = await loadWorkflow(WORKFLOW_URL)
        /* The declaration's `when` clauses read this object, so anything that
           selects a branch has to be here — a caller-supplied field that never
           reaches it silently skips its step (which is exactly what happened
           the first time translate was wired). Language and tone default from
           the active locale, so a caller may pass just { translate: true }. */
        const options = { infographic: !!params.infographic,
                          infographicModel: params.infographicModel, style: params.style,
                          translate: !!params.translate,
                          language: params.language || culture().language || 'English',
                          tone: params.tone ?? culture().tone ?? '' }

        const results = { name: chosen.name, transcript: null, translation: null, summary: null, svg: null, image: null, usage: {} }
        current = { itemId: null, results, trace: null }

        /* The step executors — each does exactly what the old inline stage did,
           emits the same events, and reports its cost to the runner. */
        const executors = {

            // Detect the format by CONTENT before the engine decides anything from
            // the filename or the OS-supplied MIME (issue 025: a mislabelled
            // Opus-in-Ogg came back as a hallucinated transcript).
            'local': async () => {
                const norm = await normaliseAudioFile(chosen)
                current.file = norm.file
                if (norm.changed) emit('wa:normalised', { from: chosen.name, to: norm.file.name, sniffed: norm.sniffed, reason: norm.reason })
                emit('wa:pass:started', { name: chosen.name, sizeBytes: norm.file.size, sniffed: norm.sniffed })
                return { costUsd: 0 }
            },

            'engine': async () => {
                const file = current.file
                const { added, rejected } = await call('addFiles', { files: [file] })
                let item = added[0]
                if (!item && !rejected.length) {
                    // The engine silently dedupes an identical name+size (addItem →
                    // null: not added, not rejected). Re-running the same voice note
                    // is a legitimate ask — reuse the existing item (issue 029).
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
                return { costUsd: 0 }
            },

            'llm-transcribe': async () => {
                let t
                try { t = await call('transcribeItem', { id: current.itemId }) }
                catch (e) { emit('wa:pass:error', { stage: 'transcribe', code: e.code || 'llm-error', message: e.message }); throw e }
                results.transcript = t.text
                results.usage.transcribe = t.usage
                emit('wa:transcript', { text: t.text, latencyMs: t.latencyMs, usage: t.usage })
                return { costUsd: t.usage?.costUsd ?? 0 }
            },

            /* Translate before summarising (issue 055). A voice note is spoken in
               whatever language the speaker used; the reader has told us, via the
               locale picker, which one they want. Everything downstream — summary
               and infographic — is then built from the TRANSLATION, so a
               Portuguese reader gets a Portuguese debrief rather than a
               Portuguese label on an English summary.

               The transcript itself is never overwritten: it is the record of
               what was actually said, and it stays in the spoken language. */
            'llm-translate': async (step, ctx) => {
                const target = ctx.options.language
                try {
                    const preamble = (await loadTranslatePrompt())
                        .replace(/\{\{language\}\}/g, target)
                        .replace(/\{\{tone\}\}/g, ctx.options.tone || '')
                    // chat() rather than ask(): ask() summarises from the engine's
                    // held context, and this needs the exact transcript text as
                    // its input, nothing else.
                    const r = await call('chat', { messages: [{ role: 'user',
                        content: preamble + '\n' + results.transcript }], label: 'translate' })
                    const text = (r.text || '').trim()
                    if (text) {
                        results.translation = text
                        results.usage.translate = r.usage
                        emit('wa:translation', { text, language: target, usage: r.usage })
                    }
                    return { costUsd: r.usage?.costUsd ?? 0 }
                } catch (e) {
                    // Declared degrade: a failed translation must not cost the
                    // user their transcript. The summary then runs on the
                    // original, which is worse but still useful.
                    emit('wa:translation:error', { code: e.code || 'llm-error', message: e.message })
                    throw e
                }
            },

            'llm-text': async () => {
                try {
                    const prompt = await loadSummaryPrompt()
                    /* With no translation, ask() is used exactly as before — the
                       engine already holds the transcript as context. With one,
                       the summary must be built from the TRANSLATED text, so it
                       is passed explicitly instead. */
                    const s = results.translation
                        ? await call('chat', { messages: [{ role: 'user',
                            content: prompt + '\n\n' + results.translation }], label: 'summary' })
                        : await call('ask', { text: prompt, label: 'summary' })
                    results.summary = s.text
                    results.usage.summary = s.usage
                    emit('wa:summary', { text: s.text, usage: s.usage })
                    return { costUsd: s.usage?.costUsd ?? 0 }
                } catch (e) {
                    // The transcript stands on its own — the declaration says
                    // degrade, and the UI hears the same event it always did.
                    emit('wa:summary:error', { code: e.code || 'llm-error', message: e.message })
                    throw e
                }
            },

            'llm-infographic': async (step, ctx) => {
                const g = await runInfographicStage({ model: ctx.options.infographicModel, style: ctx.options.style })
                return { costUsd: g.usage?.costUsd ?? 0 }
            },
        }

        const trace = await runWorkflow(def, { options, executors, emit })
        current.trace = trace
        results.trace = trace
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
            const content = preamble + '\n## Transcript\n' + (results.translation || results.transcript) +
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

    /* The assistant may edit the materials (issue 035, brief written from inside
       the chat itself): overwrite transcript or summary, keeping the ORIGINAL the
       first time so the user can always revert an unsatisfactory edit. */
    const EDITABLE = ['transcript', 'summary']
    function updateMaterial(params = {}) {
        const { what, text } = params
        if (!EDITABLE.includes(what)) throw Object.assign(new Error(`what must be one of: ${EDITABLE.join(', ')}`), { code: 'bad-params' })
        if (typeof text !== 'string' || !text.trim()) throw Object.assign(new Error('updateMaterial requires { what, text }'), { code: 'bad-params' })
        const r = current.results
        if (!r || !r[what]) throw Object.assign(new Error(`there is no ${what} yet — run a pass first`), { code: 'no-results' })
        r.originals ??= {}
        if (!(what in r.originals)) r.originals[what] = r[what]
        r[what] = text
        emit('wa:material:updated', { what, edited: true })
        return { ok: true, what, chars: text.length }
    }
    function restoreMaterial(params = {}) {
        const { what } = params
        if (!EDITABLE.includes(what)) throw Object.assign(new Error(`what must be one of: ${EDITABLE.join(', ')}`), { code: 'bad-params' })
        const r = current.results
        if (!r?.originals || !(what in r.originals)) return { ok: false, what, note: 'nothing to restore — the original is untouched' }
        r[what] = r.originals[what]
        delete r.originals[what]
        emit('wa:material:updated', { what, edited: false })
        return { ok: true, what }
    }

    function cancel() {
        if (current.itemId != null) return call('cancelItem', { id: current.itemId })
        return { cancelled: 0 }
    }

    return { runPass, redrawInfographic, updateMaterial, restoreMaterial, cancel,
             getWorkflow, results: () => current.results, trace: () => current.trace }
}
