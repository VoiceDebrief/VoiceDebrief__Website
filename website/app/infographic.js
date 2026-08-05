/* infographic.js — the M2 stage: one streamed LLM call rendered live by the
   reused sg-llm-infographic component (the SVG drawing itself IS the progress).

   Wire protocol (replicating llm-transport's cell pattern, but streaming and
   with the renderer living in the same cell so it hears the chunk events):
     cell[data-llm-bus] ← <sg-llm-request> (engine) + <sg-llm-infographic> (renderer)
     dispatch CONNECTED {apiKey, model} → STREAMING {true} → SEND {messages}
     resolve on REQUEST_COMPLETE / llm:infographic-ready; typed errors as usual. */

import { ORIGIN } from './config.js'

const INFOGRAPHIC_MODEL_DEFAULT = 'google/gemini-3.5-flash'

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

/**
 * @param {object} p
 * @param {Element} p.mount     visible container the renderer component mounts into
 * @param {string}  p.content   the user content (prompt preamble + transcript + summary)
 * @param {string}  p.apiKey
 * @param {string}  [p.style]   executive|technical|playful|minimal|bold|data
 * @param {string}  [p.model]
 * @returns {Promise<{svg:string|null, usage:object, generationId?:string, component:Element}>}
 */
export async function generateInfographic({ mount, content, apiKey, style = 'executive', model = INFOGRAPHIC_MODEL_DEFAULT }) {
    const { SGL_LLM, readComplete, classifyLlmError } = await loadDeps()

    const cell = document.createElement('div')
    cell.setAttribute('data-llm-bus', '')
    const engine = document.createElement('sg-llm-request')
    const viz = document.createElement('sg-llm-infographic')
    viz.setAttribute('style-preset', style)
    cell.append(engine, viz)
    mount.replaceChildren(cell)

    // Let the component mount so getSystemPrompt() reflects the chosen style.
    await new Promise(r => requestAnimationFrame(r))
    const systemPrompt = (typeof viz.getSystemPrompt === 'function' && viz.getSystemPrompt()) ||
        'Create a single clean SVG infographic summarising the content. Output ONLY the raw SVG.'

    return new Promise((resolve, reject) => {
        let done = false
        let readySvg = null
        const finishOk = (r) => { if (done) return; done = true
            resolve({ svg: readySvg || (typeof viz.getCurrentSvg === 'function' ? viz.getCurrentSvg() : null),
                      usage: { promptTokens: r?.promptTokens, completionTokens: r?.completionTokens, costUsd: r?.responseCost },
                      generationId: r?.generationId, component: viz }) }
        cell.addEventListener(SGL_LLM.INFOGRAPHIC_READY ?? 'llm:infographic-ready', (e) => { readySvg = e.detail?.svg || null })
        cell.addEventListener(SGL_LLM.REQUEST_COMPLETE, (e) => finishOk(readComplete(e)))
        cell.addEventListener(SGL_LLM.REQUEST_ERROR, (e) => { if (done) return; done = true
            const c = classifyLlmError(e.detail || {})
            reject(Object.assign(new Error(c.message), { code: c.code, status: c.status })) })
        cell.addEventListener(SGL_LLM.REQUEST_CANCEL, () => { if (done) return; done = true
            reject(Object.assign(new Error('Cancelled'), { code: 'cancelled' })) })

        cell.dispatchEvent(new CustomEvent(SGL_LLM.CONNECTED, { detail: { provider: 'openrouter', model, apiKey }, bubbles: true, composed: true }))
        cell.dispatchEvent(new CustomEvent(SGL_LLM.STREAMING_CHANGED, { detail: { streaming: true }, bubbles: true, composed: true }))
        cell.dispatchEvent(new CustomEvent(SGL_LLM.SEND, { detail: {
            messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content } ],
            model, provider: 'openrouter' }, bubbles: true, composed: true }))
    })
}
