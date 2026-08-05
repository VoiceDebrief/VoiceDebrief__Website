/* infographic.js — the infographic stage, two render paths (issue 031):

   IMAGE (default): the same model the proven Infographic Generator tool uses —
   google/gemini-3.1-flash-image-preview — returns a finished PNG. The request
   travels the same isolated LLM cell as everything else (sg-llm-request v0.1.6
   accumulates streamed image deltas into detail.images).

   SVG (alternative): the original M2 path — a streamed text response rendered
   live by the reused sg-llm-infographic component.

   Wire protocol per cell (replicating llm-transport's pattern):
     cell[data-llm-bus] ← <sg-llm-request> (+ <sg-llm-infographic> for SVG)
     dispatch CONNECTED {apiKey, model} → STREAMING {true} → SEND {messages}
     resolve on REQUEST_COMPLETE; typed errors as usual. */

import { ORIGIN } from './config.js'
import { debugStore } from './debug-store.js'

export const INFOGRAPHIC_MODELS = [
    { id: 'google/gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image — finished image', kind: 'image' },
    { id: 'google/gemini-2.5-flash-image',         label: 'Gemini 2.5 Flash Image — finished image', kind: 'image' },
    { id: 'google/gemini-3.5-flash',               label: 'Gemini 3.5 Flash — drawn SVG',            kind: 'svg' },
]
export const INFOGRAPHIC_MODEL_DEFAULT = INFOGRAPHIC_MODELS[0].id

const modelKind = (model) =>
    (INFOGRAPHIC_MODELS.find(m => m.id === model) || {}).kind ||
    (/image/.test(model) ? 'image' : 'svg')

let deps = null
async function loadDeps() {
    deps ??= await (async () => {
        const [{ SGL_LLM }, , { readComplete }, { classifyLlmError }] = await Promise.all([
            import(`${ORIGIN}/components/llm/sg-llm-events/v0/v0.1/v0.1.0/sg-llm-events.js`),
            import(`${ORIGIN}/components/llm/sg-llm-infographic/v0/v0.1/v0.1.0/sg-llm-infographic.js`),
            import(`${ORIGIN}/en-gb/audio-transcribe/api/llm-transport.js`),
            import(`${ORIGIN}/en-gb/audio-transcribe/api/llm-errors.js`),
        ])
        return { SGL_LLM, readComplete, classifyLlmError }
    })()
    return deps
}

/* Streamed responses carry no rawResponse, so readComplete has no generation id —
   but the SSE chunks do. Fish it out for the debug pane / cost lookup. */
const genIdFromChunks = (detail) => {
    const m = JSON.stringify(detail?.rawChunks || '').match(/gen-[A-Za-z0-9_-]{10,}/)
    return m ? m[0] : undefined
}

/**
 * @param {object} p
 * @param {Element} p.mount     visible container the result renders into
 * @param {string}  p.content   the user content (prompt preamble + transcript + summary)
 * @param {string}  p.apiKey
 * @param {string}  [p.style]   SVG path only: executive|technical|playful|minimal|bold|data
 * @param {string}  [p.model]
 * @returns {Promise<{svg:string|null, image:string|null, usage:object, generationId?:string}>}
 */
export async function generateInfographic({ mount, content, apiKey, style = 'executive', model = INFOGRAPHIC_MODEL_DEFAULT }) {
    const { SGL_LLM, readComplete, classifyLlmError } = await loadDeps()
    const kind = modelKind(model)

    const cell = document.createElement('div')
    cell.setAttribute('data-llm-bus', '')
    const engine = document.createElement('sg-llm-request')
    cell.append(engine)

    let viz = null
    let systemPrompt = debugStore.getPrompt('infographic-system')
    if (kind === 'svg') {
        viz = document.createElement('sg-llm-infographic')
        viz.setAttribute('style-preset', style)
        cell.append(viz)
        mount.replaceChildren(cell)
        // Let the component mount so getSystemPrompt() reflects the chosen style;
        // an explicit override from the debug pane wins over the preset.
        await new Promise(r => requestAnimationFrame(r))
        if (debugStore.getPromptOverride('infographic-system') == null)
            systemPrompt = (typeof viz.getSystemPrompt === 'function' && viz.getSystemPrompt()) ||
                'Create a single clean SVG infographic summarising the content. Output ONLY the raw SVG.'
    } else {
        cell.hidden = true
        mount.replaceChildren(cell)   // the <img> lands here on completion
    }

    const messages = [ { role: 'system', content: systemPrompt }, { role: 'user', content } ]
    const rec = debugStore.record({ kind: 'infographic', stage: 'infographic', model,
        status: 'pending', request: { messages, output: kind, ...(kind === 'svg' ? { stylePreset: style } : {}) } })
    const t0 = Date.now()

    return new Promise((resolve, reject) => {
        let done = false
        let readySvg = null
        const finishOk = (r, detail) => { if (done) return; done = true
            const generationId = r?.generationId || genIdFromChunks(detail)
            const usage = { promptTokens: r?.promptTokens, completionTokens: r?.completionTokens, costUsd: r?.responseCost }
            const latencyMs = r?.latencyMs || (Date.now() - t0)
            if (kind === 'image') {
                const first = (detail?.images || [])[0]
                const url = first && (first.image_url?.url || first.url || (typeof first === 'string' ? first : null))
                if (url) {
                    const img = document.createElement('img')
                    img.src = url
                    img.alt = 'Generated infographic'
                    mount.replaceChildren(img)
                }
                debugStore.update(rec.id, { status: 'done', response: {
                    images: (detail?.images || []).length, imageBytes: url ? url.length : 0, drawable: !!url,
                    content: url ? undefined : (r?.content || '').slice(0, 2000),
                    ...usage, latencyMs, generationId } })
                resolve({ svg: null, image: url || null, usage, generationId })
            } else {
                const svg = readySvg || (viz && typeof viz.getCurrentSvg === 'function' ? viz.getCurrentSvg() : null)
                debugStore.update(rec.id, { status: 'done', response: {
                    content: r?.content, svgBytes: svg ? svg.length : 0, drawable: !!svg,
                    ...usage, latencyMs, generationId } })
                resolve({ svg, image: null, usage, generationId })
            }
        }
        cell.addEventListener(SGL_LLM.INFOGRAPHIC_READY ?? 'llm:infographic-ready', (e) => { readySvg = e.detail?.svg || null })
        cell.addEventListener(SGL_LLM.REQUEST_COMPLETE, (e) => finishOk(readComplete(e), e.detail))
        cell.addEventListener(SGL_LLM.REQUEST_ERROR, (e) => { if (done) return; done = true
            const c = classifyLlmError(e.detail || {})
            debugStore.update(rec.id, { status: 'error', error: c.message, errorCode: c.code })
            reject(Object.assign(new Error(c.message), { code: c.code, status: c.status })) })
        cell.addEventListener(SGL_LLM.REQUEST_CANCEL, () => { if (done) return; done = true
            debugStore.update(rec.id, { status: 'cancelled' })
            reject(Object.assign(new Error('Cancelled'), { code: 'cancelled' })) })

        cell.dispatchEvent(new CustomEvent(SGL_LLM.CONNECTED, { detail: { provider: 'openrouter', model, apiKey }, bubbles: true, composed: true }))
        cell.dispatchEvent(new CustomEvent(SGL_LLM.STREAMING_CHANGED, { detail: { streaming: true }, bubbles: true, composed: true }))
        cell.dispatchEvent(new CustomEvent(SGL_LLM.SEND, { detail: { messages, model, provider: 'openrouter' }, bubbles: true, composed: true }))
    })
}
