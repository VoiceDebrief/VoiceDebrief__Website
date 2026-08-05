/* engine.js — the import harness, Attempt 2 (spike verdict, 5 Aug 2026; see
   library/dev_packs/v0.1.1__audio-transcribe-integration/06__spike-note__m1a-import-harness.md).

   Imports the audio-transcribe engine's method-group builders from the tools
   origin and registers them — plus the entry-module-only methods (connect,
   setApiKey, ask, setSpendCap), replicated faithfully from
   audio-transcribe-api.js v0.1.26 — on OUR OWN SgToolApi('whatsapp-transcribe').
   The page's identity requirement (brief 05 / 5 Aug decision) is therefore
   native: window.__tool IS whatsapp-transcribe. */

import { ORIGIN } from './config.js'
import { debugStore } from './debug-store.js'
import { fetchGeneration, fetchKeyStatus, fetchModelDetails } from './openrouter.js'

const KEY_STORAGE = 'sg-openrouter-mgmt-key'
const CHAT_MODEL_DEFAULT = 'google/gemini-3.5-flash'

export async function bootEngine() {
    const [
        { SgToolApi },
        { SGL_LLM },
        ,   // sg-llm-request: imported for its custom-element definition only
        { createState },
        { buildSourceMethods },
        { buildTranscribeMethods },
        { buildBatchMethods },
        { makeIsolatedTransport },
        { listModels, DEFAULT_MODEL },
        { fetchGenerationCostDeferred },
    ] = await Promise.all([
        import(`${ORIGIN}/core/sg-tool-api/v0/v0.1/v0.1.0/sg-tool-api.js`),
        import(`${ORIGIN}/components/llm/sg-llm-events/v0/v0.1/v0.1.0/sg-llm-events.js`),
        import(`${ORIGIN}/components/llm/sg-llm-request/v0/v0.1/v0.1.6/sg-llm-request.js`),
        import(`${ORIGIN}/en-gb/audio-transcribe/ui/state.js`),
        import(`${ORIGIN}/en-gb/audio-transcribe/api/api-source.js`),
        import(`${ORIGIN}/en-gb/audio-transcribe/api/api-transcribe.js`),
        import(`${ORIGIN}/en-gb/audio-transcribe/api/api-batch.js`),
        import(`${ORIGIN}/en-gb/audio-transcribe/api/llm-transport.js`),
        import(`${ORIGIN}/en-gb/audio-transcribe/api/audio-models.js`),
        import(`${ORIGIN}/en-gb/audio-transcribe/api/openrouter-cost.js`),
    ])

    const state = createState({ defaultModel: DEFAULT_MODEL })
    state.setActiveModel(DEFAULT_MODEL)

    const api = new SgToolApi({
        name:     'whatsapp-transcribe',
        version:  { api: '0.1.0', ui: 'site', content: '0.1.0' },
        panelId:  'root',
        manifest: './manifest.json',
        skills:   { human: './skills/SKILL__human.md',
                    browser: './skills/SKILL__browser.md',
                    api: './skills/SKILL__api.md' },
    })
    const emit = (name, detail) => api._emit(name, detail || {})
    debugStore.bindEmit(emit)   // exchange/prompt changes surface as wa:debug:* events

    // Our own LLM bus host — same isolated-transport pattern as the tool page.
    const host = document.createElement('div')
    host.setAttribute('data-llm-bus', '')
    host.hidden = true
    document.body.appendChild(host)

    let currentApiKey = ''
    const rawTransport = makeIsolatedTransport(host, () => currentApiKey)
    // Every request passes through here on its way to the bus — the one place we
    // own — so this is where a saved transcription-prompt override takes effect.
    const busTransport = (req) => rawTransport(debugStore.applyTranscribeOverride(req))

    async function connect(params = {}) {
        const model = params.model || state.getActiveModel()
        currentApiKey = params.apiKey || ''
        host.dispatchEvent(new CustomEvent(SGL_LLM.CONNECTED, {
            detail: { provider: 'openrouter', model, apiKey: currentApiKey },
            bubbles: true, composed: true,
        }))
        state.setApiKeyPresent(!!params.apiKey)
        return { provider: 'openrouter', model }
    }

    async function setApiKey(params = {}) {
        const apiKey = params.apiKey || ''
        try { if (apiKey) localStorage.setItem(KEY_STORAGE, apiKey); else localStorage.removeItem(KEY_STORAGE) } catch (_) {}
        const r = await connect({ apiKey, model: params.model })
        return { ok: true, present: !!apiKey, model: r.model }
    }

    const source     = buildSourceMethods({ state, emit })
    const transcribe = buildTranscribeMethods({
        state, emit, sendToLlm: busTransport,
        getActiveModel: () => state.getActiveModel(),
        fetchCost: (genId) => fetchGenerationCostDeferred(genId, currentApiKey),
        onExchange: (x) => debugStore.recordEngineExchange(x),
    })
    const batch = buildBatchMethods({ state, emit, transcribeItem: transcribe.transcribeItem })

    async function ask(params = {}) {
        const text = (params.text || '').trim()
        if (!text) throw Object.assign(new Error('ask requires { text }'), { code: 'no-text' })
        const model = params.model || CHAT_MODEL_DEFAULT
        const ctx = params.context != null ? params.context : state.getItems()
            .filter((i) => i.status === 'done' && i.transcript)
            .map((it, i) => `### Transcript ${i + 1} — ${it.name}\n${it.transcript}`).join('\n\n')
        const messages = []
        if (ctx) messages.push({ role: 'system', content: `You are answering questions about the following audio transcript(s).\n\n${ctx}` })
        messages.push({ role: 'user', content: text })
        const rec = debugStore.record({ kind: params.label || 'ask', stage: params.label || 'ask',
            model, status: 'pending', request: { messages } })
        const t0 = Date.now()
        let res
        try { res = (await busTransport({ messages, model })) || {} }
        catch (e) {
            debugStore.update(rec.id, { status: 'error', error: e.message, errorCode: e.code || 'llm-error' })
            throw e
        }
        debugStore.update(rec.id, { status: 'done', response: {
            content: (res.content != null ? String(res.content) : '').trim(),
            promptTokens: res.promptTokens, completionTokens: res.completionTokens,
            latencyMs: res.latencyMs || (Date.now() - t0), generationId: res.generationId,
            costUsd: (typeof res.responseCost === 'number' ? res.responseCost : undefined) } })
        return {
            text: (res.content != null ? String(res.content) : '').trim(), model,
            generationId: res.generationId,
            usage: { promptTokens: res.promptTokens, completionTokens: res.completionTokens,
                     costUsd: (typeof res.responseCost === 'number' ? res.responseCost : undefined) },
        }
    }

    /* One raw model call with a full message array — the chat panel's transport
       (issue 034). Rides the same isolated LLM cell as everything else and lands
       in the debug store, so the debug pane audits chat like any other call. */
    async function chat(params = {}) {
        const messages = Array.isArray(params.messages) ? params.messages : null
        if (!messages || !messages.length) throw Object.assign(new Error('chat requires { messages }'), { code: 'bad-params' })
        const model = params.model || CHAT_MODEL_DEFAULT
        const rec = debugStore.record({ kind: 'chat', stage: params.label || 'chat',
            model, status: 'pending', request: { messages } })
        const t0 = Date.now()
        let res
        try { res = (await busTransport({ messages, model })) || {} }
        catch (e) {
            debugStore.update(rec.id, { status: 'error', error: e.message, errorCode: e.code || 'llm-error' })
            throw e
        }
        const out = {
            text: (res.content != null ? String(res.content) : '').trim(), model,
            generationId: res.generationId,
            usage: { promptTokens: res.promptTokens, completionTokens: res.completionTokens,
                     costUsd: (typeof res.responseCost === 'number' ? res.responseCost : undefined) },
        }
        debugStore.update(rec.id, { status: 'done', response: {
            content: out.text, promptTokens: res.promptTokens, completionTokens: res.completionTokens,
            latencyMs: res.latencyMs || (Date.now() - t0), generationId: res.generationId,
            costUsd: out.usage.costUsd } })
        return out
    }

    const passthrough = (p) => p
    const maskKey = (p = {}) => ({ ...p, apiKey: p.apiKey ? '••••' : p.apiKey })

    api .register('connect',        connect,                  { async: true,  sanitiseParams: maskKey })
        .register('setApiKey',      setApiKey,                { async: true,  sanitiseParams: maskKey })
        .register('addFiles',       source.addFiles,          { async: true })
        .register('getItems',       source.getItems,          { async: false })
        .register('getItem',        source.getItem,           { async: false })
        .register('removeItem',     source.removeItem,        { async: false })
        .register('clearAll',       source.clearAll,          { async: false })
        .register('listModels',     () => listModels(),       { async: false })
        .register('setModel',       transcribe.setModel,      { async: false })
        .register('transcribeItem', transcribe.transcribeItem,{ async: true })
        .register('cancelItem',     transcribe.cancelItem,    { async: false })
        .register('transcribeAll',  batch.transcribeAll,      { async: true })
        .register('getTranscript',  transcribe.getTranscript, { async: false })
        .register('getCostSummary', transcribe.getCostSummary,{ async: false })
        .register('setSpendCap',    (p = {}) => { state.setSpendCap(p.usd != null ? p.usd : null); return { cap: state.getSpendCap() } }, { async: false })
        .register('ask',            ask,                      { async: true,  sanitiseParams: passthrough })
        .register('chat',           chat,                     { async: true,  sanitiseParams: passthrough })
        // Debug/advanced surface (issue 027) — the pane consumes ONLY these.
        .register('getExchanges',   (p) => debugStore.getExchanges(p),   { async: false })
        .register('clearExchanges', () => debugStore.clearExchanges(),   { async: false })
        .register('getPrompts',     () => debugStore.getPrompts(),       { async: false })
        .register('setPrompt',      (p) => debugStore.setPrompt(p),      { async: false })
        .register('resetPrompt',    (p) => debugStore.resetPrompt(p),    { async: false })
        .register('fetchGeneration',(p = {}) => fetchGeneration({ ...p, apiKey: currentApiKey }), { async: true })
        .register('getKeyStatus',   () => fetchKeyStatus({ apiKey: currentApiKey }),              { async: true })
        .register('getModelDetails',(p = {}) => fetchModelDetails(p),                             { async: true })

    // The stored key reconnects on load — BYOK persistence (5 Aug decision).
    const stored = (() => { try { return localStorage.getItem(KEY_STORAGE) || '' } catch (_) { return '' } })()
    if (stored) await connect({ apiKey: stored })

    return { api, state, emit, hasKey: () => !!currentApiKey, getKey: () => currentApiKey }
}
