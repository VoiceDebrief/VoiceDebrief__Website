/* chat-tools.js — the typed tool registry the chat's model may call (issue 034).

   The pattern is the reference vault app's, carried over deliberately: no native
   function-calling — the model replies with ONE fenced ```tool block holding
   {"action","params"}; we parse the first balanced JSON object, dispatch against
   this registry, feed a TOOL RESULT message back, and loop under three budgets
   the model is told about on every turn.

   Every tool delegates to an existing window.__tool action — the registry adds
   typing, tier labels and guards, never new capability. The model supplies names
   and enum values only; anything path- or id-shaped is validated here. */

import { fmtGbp } from './config.js'
import { INFOGRAPHIC_MODELS } from './infographic.js'

/* Three budgets, three different risks: steps guard against runaway loops,
   spend-calls against surprise LLM bills, dollars against a runaway exchange. */
export const TOOL_MAX_STEPS = 8       // model calls in one exchange
export const TOOL_MAX_SPEND_CALLS = 2 // tool calls that trigger NEW model spend
export const TOOL_MAX_SPEND_USD = 0.25

const SPEND_TOOLS = ['run_sample', 'redraw_infographic']
export const isSpendTool = (a) => SPEND_TOOLS.includes(a)

const SAMPLES = {
    '1':       'samples/whatsapp-voice-note-1.opus',
    '2':       'samples/whatsapp-voice-note-2.opus',
    'android': 'samples/whatsapp-voice-note-android.ogg',
}

const tool = (p) => window.__tool

export const TOOLS = {
    get_results: {
        params: '{}', tier: 'read',
        desc: 'Status of the current pass: which materials exist and their sizes.',
        run: async () => {
            const r = (await tool().getResults()) || {}
            if (!r.transcript) return 'No pass has been run yet — there is no transcript. run_sample can make one.'
            return `Pass over "${r.name}": transcript ${r.transcript.length} chars; ` +
                `summary ${r.summary ? r.summary.length + ' chars' : 'none'}; ` +
                `infographic ${r.image ? 'finished image' : r.svg ? 'drawn SVG' : 'none'}.`
        } },
    get_costs: {
        params: '{}', tier: 'read',
        desc: "This session's model spend (metered USD, shown to the user in GBP).",
        run: async () => {
            const s = (await tool().getCostSummary()) || {}
            return `Session spend: $${(s.sessionUsd ?? 0).toFixed(4)} (${fmtGbp(s.sessionUsd ?? 0)}).`
        } },
    get_exchanges: {
        params: '{}', tier: 'read',
        desc: 'The LLM calls made this session (kind, model, status, tokens, cost).',
        run: async () => {
            const list = await tool().getExchanges({ limit: 20 })
            if (!list.length) return 'No LLM calls yet this session.'
            return list.map(e => `${e.kind} · ${e.model || '?'} · ${e.status}` +
                (e.response?.costUsd != null ? ` · $${e.response.costUsd.toFixed(5)}` : '')).join('\n')
        } },
    fetch_generation: {
        params: '{id: "gen-…"}', tier: 'read',
        desc: 'The billed OpenRouter record for one generation id (get ids from get_exchanges context).',
        run: async ({ id }) => {
            if (!/^gen-[A-Za-z0-9_-]+$/.test(String(id || ''))) throw new Error('id must look like gen-…')
            const g = await tool().fetchGeneration({ id })
            return `model ${g.model}; tokens ${g.tokens_prompt}→${g.tokens_completion}; ` +
                `cost $${g.total_cost ?? g.usage ?? '?'}; latency ${g.latency ?? '?'}ms.`
        } },
    list_infographic_models: {
        params: '{}', tier: 'read',
        desc: 'The models available for the infographic, and which kind of output each produces.',
        run: () => INFOGRAPHIC_MODELS.map(m => `${m.id} — ${m.label}`).join('\n') },
    redraw_infographic: {
        params: `{model?: one of ${INFOGRAPHIC_MODELS.map(m => `"${m.id}"`).join('|')}}`,
        tier: 'spends money',
        desc: 'Regenerate the infographic over the current pass (needs a finished transcript). Takes 30–90s.',
        run: async ({ model }) => {
            if (model && !INFOGRAPHIC_MODELS.some(m => m.id === model))
                throw new Error(`unknown model "${model}" — use list_infographic_models`)
            const g = await tool().redrawInfographic(model ? { model } : {})
            return g.image ? 'Done — a finished infographic image is now on the page.'
                 : g.svg   ? 'Done — a drawn SVG infographic is now on the page.'
                 : 'The model replied but produced nothing drawable — try another model.'
        } },
    run_sample: {
        params: '{name: "1"|"2"|"android"}', tier: 'spends money',
        desc: 'Run one of the bundled sample voice notes through the full pass (transcript + summary; no infographic — redraw_infographic can add one).',
        run: async ({ name }) => {
            const path = SAMPLES[String(name || '')]
            if (!path) throw new Error(`unknown sample "${name}" — use "1", "2" or "android"`)
            const r = await fetch(path)
            if (!r.ok) throw new Error('sample failed to load: HTTP ' + r.status)
            const fname = path.split('/').pop()
            const file = new File([await r.arrayBuffer()], fname,
                { type: fname.endsWith('.ogg') ? 'audio/ogg' : 'audio/opus' })
            const res = await tool().runPass({ file, infographic: false })
            return `Pass complete. Transcript (${res.transcript.length} chars): ` +
                `"${res.transcript.slice(0, 160)}${res.transcript.length > 160 ? '…' : ''}"` +
                (res.summary ? ' A summary was also produced.' : '')
        } },
    set_prompt: {
        params: '{kind: "transcribe"|"summary"|"chat"|"infographic"|"infographic-system", text: string}',
        tier: 'changes settings',
        desc: 'Override one of the prompt templates (persists in this browser; the user can reset it in the debug pane).',
        run: async ({ kind, text }) => { await tool().setPrompt({ kind, text }); return `${kind} prompt overridden (${String(text).length} chars). Applies from the next use.` } },
    reset_prompt: {
        params: '{kind: string}', tier: 'changes settings',
        desc: 'Remove a prompt override, returning to the shipped default.',
        run: async ({ kind }) => { await tool().resetPrompt({ kind }); return `${kind} prompt back to its default.` } },
}

/** What the model is told it has left, so it can plan rather than be cut off. */
export function toolBudgetLine(used) {
    return `BUDGET: ${TOOL_MAX_STEPS - used.steps} tool step(s) and ` +
        `${TOOL_MAX_SPEND_CALLS - used.spendCalls} money-spending call(s) left in this exchange; ` +
        `$${used.spendUsd.toFixed(4)} of $${TOOL_MAX_SPEND_USD.toFixed(2)} spent. ` +
        `Do the fewest calls that answer the request, then reply in prose.`
}

/** The TOOLS section appended to the system prompt at runtime. */
export function toolsSection() {
    return '\n\nTOOLS. You may act on the tool itself. To call one, reply with ONLY one fenced block:\n' +
        '```tool\n{"action":"get_costs","params":{}}\n```\n' +
        'After it runs you receive a TOOL RESULT message; then call another tool or answer in prose.\n' +
        Object.entries(TOOLS).map(([k, t]) => `- ${k} [${t.tier}] params: ${t.params} — ${t.desc}`).join('\n') +
        `\nYou have up to ${TOOL_MAX_STEPS} tool steps and ${TOOL_MAX_SPEND_CALLS} money-spending calls per exchange; ` +
        'each TOOL RESULT tells you what is left. If you run out mid-task, say what remains rather than pretending it is done.'
}

/** Tolerant extraction: models fence inconsistently — take the first balanced JSON object. */
export function parseToolCall(text) {
    const src = String(text || '')
    const fence = src.match(/```(?:tool|json)?\s*([\s\S]*?)```/)
    const body = fence ? fence[1] : src
    const start = body.indexOf('{')
    if (start < 0) return null
    let depth = 0, inStr = false, esc = false
    for (let i = start; i < body.length; i++) {
        const ch = body[i]
        if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue }
        if (ch === '"') inStr = true
        else if (ch === '{') depth++
        else if (ch === '}') { depth--; if (!depth) {
            try {
                const obj = JSON.parse(body.slice(start, i + 1))
                if (obj && typeof obj.action === 'string' && TOOLS[obj.action]) return { action: obj.action, params: obj.params || {} }
            } catch (_) {}
            return null
        } }
    }
    return null
}

export async function runTool(call) {
    const t = TOOLS[call.action]
    if (!t) return { ok: false, text: `unknown action "${call.action}"` }
    try { return { ok: true, text: await t.run(call.params || {}) } }
    catch (e) { return { ok: false, text: String(e?.message || e) } }
}

/** For the panel's "what can it do" drawer and the API surface. */
export const listChatTools = () =>
    Object.entries(TOOLS).map(([k, t]) => ({ action: k, tier: t.tier, params: t.params, desc: t.desc }))
