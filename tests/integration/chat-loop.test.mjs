/* Integration test — the M3 chat loop against a SCRIPTED OpenRouter (issue 034).
   Deterministic and keyless: the mock plays transcribe → summary → a prose chat
   answer → a fenced tool call → the SVG stream → a confirmation, which exercises
   the whole surface for free: the pass, chatExchange's bounded tool loop, a tool
   that REALLY runs (redraw_infographic lands an SVG on the page), machinery
   marking, the audit trail, and the panel rendering.

   Environment: SITE_DIR, MIRROR_DIR, CHROMIUM_PATH as app-boot. */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SITE_DIR = process.env.SITE_DIR || path.join(repo, 'website')
// The engine origin is hardcoded in config.js (issue 041). MIRROR_DIR mode
// serves it locally by intercepting requests to it, not by rewriting it.
const TOOLS_ORIGIN = 'https://dev.tools.sgraph.ai'
const MIRROR_DIR = process.env.MIRROR_DIR || ''
const PORT = 8125

let failures = 0
const check = (n, ok, x = '') => { console.log(`${ok ? 'ok ' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`); if (!ok) failures++ }

const site = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', SITE_DIR], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 1200))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', ...(MIRROR_DIR ? ['--no-proxy-server'] : [])] })
const page = await browser.newPage()
const errs = []
page.on('pageerror', e => errs.push(String(e).slice(0, 180)))

if (MIRROR_DIR) {
    await page.route(TOOLS_ORIGIN + '/**', route => {
        const u = new URL(route.request().url())
        try { route.fulfill({ body: readFileSync(path.join(MIRROR_DIR, u.pathname)), contentType: 'text/javascript',
            headers: { 'access-control-allow-origin': '*' } }) }
        catch { route.fulfill({ status: 404, body: 'not mirrored' }) }
    })
}

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50" fill="#0b1f3a"/><text x="10" y="30" fill="#fff">mock</text></svg>'
const jsonReply = (content, id) => JSON.stringify({ id,
    choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 40, completion_tokens: 20, cost: 0.0005 } })
let n = 0
await page.route('https://openrouter.ai/**', async route => {
    const req = route.request()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type,http-referer,x-title', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const u = new URL(req.url())
    if (!u.pathname.includes('/chat/completions'))
        return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: '{"data":{}}' })
    const body = JSON.parse(req.postData() || '{}')
    const id = 'gen-mock-' + (++n)
    const all = JSON.stringify(body.messages || [])
    const lastMsg = (() => { const m = (body.messages || []).slice(-1)[0]; return typeof m?.content === 'string' ? m.content : JSON.stringify(m?.content || '') })()
    if (body.stream) {
        const sse = `data: ${JSON.stringify({ id, choices: [{ delta: { content: SVG } }] })}\n\n` +
                    `data: ${JSON.stringify({ id, choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 30, completion_tokens: 60, cost: 0.0007 } })}\n\n` +
                    `data: [DONE]\n\n`
        return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'text/event-stream' }, body: sse })
    }
    let content
    if (all.includes('Transcribe the following audio')) content = 'This is me recording a voice memo that we can use in our tests.'
    else if (all.includes('answering questions about the following audio')) content = '## Key points\n- a voice memo for tests'
    else if (lastMsg.includes('TOOL RESULT')) content = 'Done — the drawn SVG infographic is now on the page.'
    else if (/generate the infographic/i.test(lastMsg)) content = 'On it.\n```tool\n{"action":"redraw_infographic","params":{"model":"google/gemini-3.5-flash"}}\n```'
    else if (/translate the summary/i.test(lastMsg)) content = '```tool\n{"action":"update_summary","params":{"text":"## Puntos clave\\n- una nota de voz para pruebas"}}\n```'
    else content = 'The voice memo says it was recorded to be used in tests.'
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: jsonReply(content, id) })
})

try {
    await page.goto(`http://127.0.0.1:${PORT}/app/`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__tool, null, { timeout: 30000 })
    await page.evaluate(async () => { await window.__tool.setApiKey({ apiKey: 'sk-or-v1-mock' }) })

    const pass = await page.evaluate(async () => {
        const r = await fetch('samples/whatsapp-voice-note-2.opus')
        const f = new File([await r.arrayBuffer()], 'whatsapp-voice-note-2.opus', { type: 'audio/opus' })
        return window.__tool.runPass({ file: f, infographic: false })
    })
    check('mock pass produced a transcript', /voice memo/.test(pass.transcript || ''))

    const a1 = await page.evaluate(async () => window.__tool.chatExchange({ text: 'What did the note say?' }))
    check('plain question → prose, zero tool steps', a1.steps === 0 && /voice memo/i.test(a1.reply), `steps=${a1.steps}`)

    const a2 = await page.evaluate(async () => window.__tool.chatExchange({ text: 'Please generate the infographic now.' }))
    check('tool-driven exchange used exactly one step', a2.steps === 1, String(a2.steps))
    check('final reply is prose confirmation', /now on the page/i.test(a2.reply), (a2.reply || '').slice(0, 80))

    const after = await page.evaluate(async () => {
        const r = await window.__tool.getResults()
        const h = await window.__tool.getChatHistory()
        return { svg: !!r.svg,
            tools: h.messages.filter(m => m.role === 'tool').map(m => ({ ok: m.ok, did: m.did })),
            machinery: h.messages.some(m => m.toolOnly),
            chatLog: (await window.__tool.getExchanges({ kind: 'chat' })).length,
            infogLog: (await window.__tool.getExchanges({ kind: 'infographic' })).length }
    })
    check('the tool actually redrew: svg on results', after.svg)
    check('tool call + result visible in history',
        after.tools.length === 1 && after.tools[0].ok && after.tools[0].did.startsWith('redraw_infographic'), JSON.stringify(after.tools))
    check('the fenced block reply is marked machinery', after.machinery)
    check('chat + infographic calls audited in the exchange log', after.chatLog === 3 && after.infogLog === 1,
        `chat=${after.chatLog} infog=${after.infogLog}`)

    // The material-edit workflow (issue 035, brief written from inside the chat):
    // update_summary rewrites the page, keeps the original, and restore undoes it.
    const a3 = await page.evaluate(async () => window.__tool.chatExchange({ text: 'Translate the summary into Spanish.' }))
    check('edit exchange used one tool step', a3.steps === 1, String(a3.steps))
    const edited = await page.evaluate(async () => ({
        summary: (await window.__tool.getResults()).summary,
        noteShown: !document.querySelector('#summary-edit-note').hidden }))
    check('the summary on the page IS the Spanish rewrite', /Puntos clave/.test(edited.summary), (edited.summary || '').slice(0, 40))
    check('the "edited by the assistant" note is visible', edited.noteShown)
    const restored = await page.evaluate(async () => {
        await window.__tool.restoreMaterial({ what: 'summary' })
        return { summary: (await window.__tool.getResults()).summary,
                 noteShown: !document.querySelector('#summary-edit-note').hidden }
    })
    check('restore returns the original summary and hides the note', /Key points/.test(restored.summary) && !restored.noteShown)

    const chat = page.locator('wa-chat-panel')
    await chat.locator('.wa-chat__toggle').click()
    await page.waitForTimeout(500)
    const ui = await page.evaluate(() => {
        const sr = document.querySelector('wa-chat-panel').shadowRoot
        return { msgs: sr.querySelectorAll('.msg').length, tools: sr.querySelectorAll('.msg--tool').length,
                 models: sr.querySelectorAll('.wa-chat__model option').length,
                 ctx: sr.querySelectorAll('.ctx-row').length, meter: sr.querySelector('.wa-chat__meter').textContent,
                 suggHidden: sr.querySelector('.wa-chat__suggestions').hidden }
    })
    check('panel renders thread, tool rows, models, context rows', ui.msgs >= 8 && ui.tools === 2 && ui.models >= 3 && ui.ctx === 5, JSON.stringify(ui))
    check('suggestion chips hidden once the conversation has started (issue 035)', ui.suggHidden === true)
    check('no page errors', errs.length === 0, errs.slice(0, 4).join(' | '))
} catch (e) {
    check('test run completed', false, e.message)
} finally {
    await browser.close().catch(() => {})
    site.kill()
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nchat loop healthy')
process.exit(failures ? 1 : 0)
