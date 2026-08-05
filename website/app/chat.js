/* chat.js — "talk to your materials" (issue 034, M3).

   The exchange loop lives HERE, registered on the API — the panel is a renderer.
   Patterns carried from the reference vault app: the context composer's rows
   drive both the checkbox UI and the outgoing request (what you see ticked is
   exactly what is sent); the model acts through fenced ```tool blocks against
   the typed registry in chat-tools.js; three budgets bound each exchange and
   the model is told what it has left on every turn; every tool call lands in
   the visible history AND in the debug store's exchange log. */

import { debugStore } from './debug-store.js'
import { fmtGbp } from './config.js'
import { TOOLS, toolsSection, toolBudgetLine, parseToolCall, runTool, isSpendTool,
         TOOL_MAX_STEPS, TOOL_MAX_SPEND_CALLS, TOOL_MAX_SPEND_USD, listChatTools } from './chat-tools.js'

const CHAT_PROMPT_URL = './prompts/chat-prompt.md'
export const CHAT_MODELS = [
    { id: 'google/gemini-3.5-flash',   label: 'Gemini 3.5 Flash — fast, cheap (default)' },
    { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5 — deeper answers' },
    { id: 'openai/gpt-5-mini',         label: 'GPT-5 mini — the other frontier house' },
]
export const CHAT_MODEL_DEFAULT = CHAT_MODELS[0].id

export const CHAT_SUGGESTIONS = [
    'What did the voice note actually say, in one line?',
    'What actions or follow-ups are in there?',
    'What has this session cost so far, and on which calls?',
    'Redraw the infographic as a drawn SVG instead.',
    'Rewrite the summary for someone who has 10 seconds.',
]

const estTok = (s) => Math.round(String(s || '').length / 4)

export function createChat({ emit, getResults }) {
    const history = []   // { role: 'user'|'bot'|'tool', content, ok?, did?, costUsd?, model?, tookMs?, pending? }
    const state = { busy: false, spendUsd: 0, calls: 0 }

    async function loadSystemPrompt() {
        try {
            const r = await fetch(CHAT_PROMPT_URL, { cache: 'no-cache' })
            if (r.ok) debugStore.setPromptDefault('chat', await r.text())
        } catch (_) {}
        return debugStore.getPrompt('chat') ||
            'You are the assistant inside the voice note transcription app. Answer from the provided context only.'
    }

    /* Every contributor to the prompt is a row; the panel renders these same rows
       as checkboxes. Defaults follow the reference app: materials on, the rest a
       choice the user can see. */
    function getChatContext() {
        const r = getResults() || {}
        const rows = []
        rows.push({ id: 'transcript', label: 'The transcript', on: true,
            sub: r.name ? `from "${r.name}"` : 'no pass yet',
            text: r.transcript || '(no transcript yet — no pass has been run)' })
        rows.push({ id: 'summary', label: 'The summary', on: !!r.summary,
            sub: r.summary ? null : 'none yet',
            text: r.summary || '(no summary)' })
        rows.push({ id: 'infographic', label: 'Infographic status', on: false,
            text: r.image ? 'A finished infographic image exists on the page.'
                : r.svg ? 'A drawn SVG infographic exists on the page.'
                : 'No infographic has been generated for this pass.' })
        const exchanges = debugStore.getExchanges({ limit: 20 })
        rows.push({ id: 'costs', label: 'Session calls & costs', on: false,
            sub: `${exchanges.length} LLM call(s) so far`,
            text: exchanges.map(e => `${e.kind} · ${e.model || '?'} · ${e.status}` +
                (e.response?.costUsd != null ? ` · $${e.response.costUsd.toFixed(5)}` : '') +
                (e.response?.generationId ? ` · ${e.response.generationId}` : '')).join('\n') || '(none)' })
        rows.push({ id: 'history', label: 'Earlier turns of this chat', on: true, kind: 'history',
            sub: `${history.filter(m => m.role !== 'tool').length} message(s)`, text: '' })
        return rows.map(row => ({ ...row, tok: row.kind === 'history' ? null : estTok(row.text) }))
    }

    /* One exchange: the user's text + ticked rows → bounded model/tool loop.
       rowsOn: array of row ids to include (defaults to each row's own default). */
    async function chatExchange(params = {}) {
        const text = String(params.text || '').trim()
        if (!text) throw Object.assign(new Error('chatExchange requires { text }'), { code: 'bad-params' })
        if (state.busy) throw Object.assign(new Error('an exchange is already running'), { code: 'busy' })
        state.busy = true
        const model = params.model || CHAT_MODEL_DEFAULT
        const push = (m) => { history.push(m); emit('wa:chat:update', { n: history.length }) }
        try {
            const rows = getChatContext()
            const on = (id) => Array.isArray(params.rowsOn) ? params.rowsOn.includes(id) : rows.find(r => r.id === id)?.on
            const context = rows.filter(r => r.kind !== 'history' && on(r.id))
                .map(r => `## ${r.label}\n${r.text}`).join('\n\n')
            const prior = on('history')
                ? history.filter(m => (m.role === 'user' || m.role === 'bot') && !m.toolOnly && m.content && !m.pending)
                    .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
                : []

            push({ role: 'user', content: text })
            const system = (await loadSystemPrompt()) + toolsSection()
            const messages = [{ role: 'system', content: system }, ...prior,
                { role: 'user', content: `Context the user ticked:\n\n${context}\n\n---\n\n${text}` }]
            const ctxIndex = messages.length - 1

            const used = { steps: 0, spendCalls: 0, spendUsd: 0 }
            let current = { role: 'bot', content: '', pending: true, model }
            push(current)

            for (;;) {
                const t0 = Date.now()
                const reply = await window.__tool.chat({ messages, model, label: 'chat' })
                current.content = reply.text
                current.costUsd = reply.usage?.costUsd
                current.model = model
                current.tookMs = Date.now() - t0
                current.pending = false
                state.calls++
                if (reply.usage?.costUsd) { state.spendUsd += reply.usage.costUsd; used.spendUsd += reply.usage.costUsd }
                emit('wa:chat:update', { n: history.length })

                const call = parseToolCall(current.content)
                if (!call) break

                const spending = isSpendTool(call.action)
                const stop =
                    used.steps >= TOOL_MAX_STEPS ? `${TOOL_MAX_STEPS} tool steps` :
                    (spending && used.spendCalls >= TOOL_MAX_SPEND_CALLS) ? `${TOOL_MAX_SPEND_CALLS} money-spending calls` :
                    used.spendUsd >= TOOL_MAX_SPEND_USD ? `$${TOOL_MAX_SPEND_USD.toFixed(2)} of model time` : null
                if (stop) {
                    push({ role: 'tool', ok: false, did: `${call.action}(…)`,
                        content: `not run — this exchange reached its limit of ${stop}. Ask again to carry on; the conversation is kept.` })
                    break
                }
                used.steps++
                if (spending) used.spendCalls++

                current.toolOnly = true   // the fenced block is machinery, not an answer
                const out = await runTool(call)
                push({ role: 'tool', ok: out.ok, did: `${call.action}(${JSON.stringify(call.params || {})})`, content: out.text })

                messages.push({ role: 'assistant', content: current.content })
                messages.push({ role: 'user',
                    content: `TOOL RESULT (${call.action}): ${out.ok ? out.text : 'FAILED — ' + out.text}\n${toolBudgetLine(used)}` })
                // the materials may have moved (a tool can run a pass or redraw)
                const fresh = getChatContext()
                messages[ctxIndex] = { role: 'user', content: `Context the user ticked (updated):\n\n` +
                    fresh.filter(r => r.kind !== 'history' && on(r.id)).map(r => `## ${r.label}\n${r.text}`).join('\n\n') +
                    `\n\n---\n\n${text}` }
                current = { role: 'bot', content: '', pending: true, model }
                push(current)
            }
            emit('wa:chat:complete', { spendUsd: state.spendUsd })
            return { reply: history.filter(m => m.role === 'bot' && !m.toolOnly).slice(-1)[0]?.content || '',
                     steps: used.steps, spendUsd: used.spendUsd }
        } catch (e) {
            const last = history[history.length - 1]
            if (last && last.pending) { last.pending = false; last.error = true
                last.content = `That call failed (${e.code || 'unknown'}): ${e.message}` }
            emit('wa:chat:update', { n: history.length })
            throw e
        } finally { state.busy = false }
    }

    return {
        getChatContext,
        chatExchange,
        getChatHistory: () => ({ messages: history.map(m => ({ ...m })), busy: state.busy,
            spendUsd: state.spendUsd, spendGbp: fmtGbp(state.spendUsd), calls: state.calls }),
        clearChat: () => { history.length = 0; emit('wa:chat:update', { n: 0 }); return { ok: true } },
        getChatTools: () => listChatTools(),
    }
}
