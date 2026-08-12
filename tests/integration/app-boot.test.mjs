/* Integration test — boots the real app in headless Chromium and exercises the
   full no-key surface: engine import, SgToolApi contract, sample chips, the
   debug pane (exchanges / OpenRouter / prompts tabs), and prompt overrides.
   No OpenRouter key is used — LLM calls are covered by the QA pass and the
   optional keyed run.

   Environment:
     SITE_DIR       website dir to serve      (default: <repo>/website)
     MIRROR_DIR     if set, requests to the tools origin are served from this
                    local directory instead of the network (sandboxed runs)
     CHROMIUM_PATH  explicit browser binary   (default: playwright's own)

   Run: node tests/integration/app-boot.test.mjs */
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
const PORT = 8123

let failures = 0
const check = (name, ok, extra = '') => {
    console.log(`${ok ? 'ok ' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`)
    if (!ok) failures++
}

const site = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', SITE_DIR], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 1200))

const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', ...(MIRROR_DIR ? ['--no-proxy-server'] : [])],
})
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', e => pageErrors.push(String(e).slice(0, 200)))

if (MIRROR_DIR) {
    await page.route(TOOLS_ORIGIN + '/**', route => {
        const u = new URL(route.request().url())
        try {
            route.fulfill({ body: readFileSync(path.join(MIRROR_DIR, u.pathname)),
                contentType: u.pathname.endsWith('.js') ? 'text/javascript'
                           : u.pathname.endsWith('.css') ? 'text/css'
                           : u.pathname.endsWith('.html') ? 'text/html' : 'text/plain',
                headers: { 'access-control-allow-origin': '*' } })
        } catch { route.fulfill({ status: 404, body: 'not mirrored' }) }
    })
}

try {
    await page.goto(`http://127.0.0.1:${PORT}/app/`, { waitUntil: 'domcontentloaded' })

    // 1. The engine boots and our SgToolApi publishes.
    const booted = await page.waitForFunction(() => !!window.__tool, null, { timeout: 30000 }).then(() => true).catch(() => false)
    check('engine boots, window.__tool published', booted)
    if (!booted) throw new Error('boot failed — aborting dependent checks')

    // 2. Full action contract, including the issue-027 debug surface.
    const manifest = JSON.parse(readFileSync(path.join(SITE_DIR, 'app/manifest.json'), 'utf8'))
    const missing = await page.evaluate((actions) => actions.filter(a => typeof window.__tool[a] !== 'function'), manifest.api.actions)
    check(`all ${manifest.api.actions.length} manifest actions callable`, missing.length === 0, missing.join(','))

    // 3. Ingest a real fixture through the API (no key needed).
    const buf = readFileSync(path.join(repo, 'tests/fixtures/whatsapp-voice-note-1.opus'))
    const added = await page.evaluate(async (bytes) => {
        const f = new File([new Uint8Array(bytes)], 'note.opus', { type: 'audio/opus' })
        return window.__tool.addFiles({ files: [f] })
    }, Array.from(buf))
    check('addFiles ingests a real voice note', added.added?.length === 1, JSON.stringify(added.rejected || ''))

    // 4. Sample chips exist and load a file into the flow.
    // [data-sample], not .sample-chip: the keyless demo button (issue 063) shares
    // the chip styling but is not a sample — it loads no file.
    const chips = await page.locator('.sample-chip[data-sample]').count()
    check('three sample chips rendered', chips === 3, String(chips))
    await page.locator('.sample-chip[data-sample]').first().click()
    const fileShown = await page.waitForFunction(() =>
        !document.querySelector('#file-section').hidden &&
        document.querySelector('.file-name').textContent.includes('.opus'), null, { timeout: 10000 }).then(() => true).catch(() => false)
    check('clicking a sample loads it into the flow', fileShown)

    // 5. The debug pane: opens, tabs work, prompts render.
    const dbg = page.locator('wa-debug-panel')
    await page.waitForFunction(() => document.querySelector('wa-debug-panel')?.shadowRoot?.querySelector('.wa-dbg__toggle'), null, { timeout: 10000 })
    await dbg.locator('.wa-dbg__toggle').click()
    check('debug pane opens on toggle', await dbg.locator('.wa-dbg__panel.open').count() === 1)
    await dbg.locator('.wa-dbg__tab[data-tab="prompts"]').click()
    const prompts = await page.waitForFunction(() =>
        document.querySelector('wa-debug-panel').shadowRoot.querySelectorAll('.prompt').length === 7, null, { timeout: 10000 }).then(() => true).catch(() => false)
    // Seven since issue 061 added classify. Every prompt the product sends is
    // editable here, which is the point — including the one whose answer decides
    // whether the translate step runs at all.
    check('prompts tab shows the seven templates', prompts)
    const modelOptions = await page.locator('#infographic-model option').count()
    check('infographic model picker populated', modelOptions >= 3, String(modelOptions))
    await dbg.locator('.wa-dbg__tab[data-tab="openrouter"]').click()
    check('openrouter tab reachable', await dbg.locator('[data-view="openrouter"]:not([hidden])').count() === 1)

    // 6. Prompt overrides: set via the API, survive in localStorage, resettable.
    const overridden = await page.evaluate(async () => {
        await window.__tool.setPrompt({ kind: 'transcribe', text: 'TEST OVERRIDE' })
        const active = (await window.__tool.getPrompts()).find(p => p.kind === 'transcribe')
        const stored = localStorage.getItem('wa-prompt-override:transcribe')
        await window.__tool.resetPrompt({ kind: 'transcribe' })
        const cleared = (await window.__tool.getPrompts()).find(p => p.kind === 'transcribe').override == null
        return { active: active.override === 'TEST OVERRIDE' && active.active === 'TEST OVERRIDE', stored: stored === 'TEST OVERRIDE', cleared }
    })
    check('setPrompt/resetPrompt round-trip via the API', overridden.active && overridden.stored && overridden.cleared, JSON.stringify(overridden))

    // 6b. The chat surface (issue 034): panel opens, context rows and tools listed,
    //     and opening it closes the debug pane (one side pane at a time).
    const chat = page.locator('wa-chat-panel')
    await page.waitForFunction(() => document.querySelector('wa-chat-panel')?.shadowRoot?.querySelector('.wa-chat__toggle'), null, { timeout: 10000 })
    await chat.locator('.wa-chat__toggle').click()
    check('chat pane opens on toggle', await chat.locator('.wa-chat__panel.open').count() === 1)
    check('opening chat closes the debug pane', await dbg.locator('.wa-dbg__panel.open').count() === 0)
    const chatBits = await page.evaluate(async () => ({
        rows: (await window.__tool.getChatContext()).map(r => r.id),
        tools: (await window.__tool.getChatTools()).length,
        history: (await window.__tool.getChatHistory()).messages.length,
    }))
    check('context rows include transcript/summary/costs/history',
        ['transcript', 'summary', 'costs', 'history'].every(id => chatBits.rows.includes(id)), chatBits.rows.join(','))
    check('tool registry exposed with 13 tools', chatBits.tools === 13, String(chatBits.tools))
    check('chat history starts empty', chatBits.history === 0)

    // 6c. The declared workflow (issue 042): the definition loads and validates,
    //     the quote follows the options, and the flow panel renders the steps.
    const wf = await page.evaluate(async () => {
        const all = await window.__tool.getWorkflow({ options: { infographic: true, translate: true } })
        const bare = await window.__tool.getWorkflow({ options: {} })
        return { id: all.definition.id, steps: all.definition.steps.length,
                 quoteAll: all.quoteUsd, quoteBare: bare.quoteUsd, max: all.maxUsd,
                 trace: await window.__tool.getWorkflowTrace() }
    })
    // Both optional branches on must equal the declared ceiling, or the "max cost
    // for this run" the options screen promises is not actually a maximum.
    check('workflow declaration loads with a quotable ceiling',
        wf.id === 'standard' && wf.steps === 7 && wf.quoteAll === wf.max && wf.quoteAll > wf.quoteBare,
        JSON.stringify(wf))
    check('no trace before any run', wf.trace === null)
    const quoteShown = await page.locator('#max-cost').textContent()
    check('max cost quoted on the options screen', /max cost for this run/.test(quoteShown || ''), quoteShown)
    const flow = page.locator('wa-flow-panel')
    await page.waitForFunction(() => document.querySelector('wa-flow-panel')?.shadowRoot?.querySelector('.wa-flow__toggle'), null, { timeout: 10000 })
    await flow.locator('.wa-flow__toggle').click()
    check('flow pane opens on toggle', await flow.locator('.wa-flow__panel.open').count() === 1)
    check('opening flow closes the chat pane', await chat.locator('.wa-chat__panel.open').count() === 0)
    const flowRendered = await page.waitForFunction(() =>
        document.querySelector('wa-flow-panel').shadowRoot.querySelectorAll('.wa-flow__steps .step').length === 7,
        null, { timeout: 10000 }).then(() => true).catch(() => false)
    check('flow pane renders the seven declared steps', flowRendered)
    await flow.locator('.wa-flow__close').click()

    // 7. The exchange log is empty (no key, no LLM calls) and clearable.
    const log = await page.evaluate(async () => ({
        list: (await window.__tool.getExchanges()).length,
        cleared: (await window.__tool.clearExchanges()).ok }))
    check('exchange log empty without LLM calls, clearExchanges ok', log.list === 0 && log.cleared === true)

    // 8. No page errors during any of the above.
    // i18n (issue 050 M2). The rule worth a gate: a DRAFT locale is one nobody
    // has reviewed, and must never be served automatically — only chosen. A
    // headless en-US browser was silently given the unreviewed en-us locale
    // before this was fixed, and nothing would have told us.
    const i18n = await page.evaluate(() => {
        const api = window.__waI18n
        const locales = api.getLocales()
        return { active: api.getLocale(), status: locales[api.getLocale()]?.status,
                 count: Object.keys(locales).length,
                 drafts: Object.entries(locales).filter(([, m]) => m.status !== 'live').map(([k]) => k) }
    })
    check('locale allowlist loaded', i18n.count >= 4, `${i18n.count} locales, drafts: ${i18n.drafts.join(', ')}`)
    check('the served locale is LIVE — drafts are picked, never assigned',
        i18n.status === 'live', `serving ${i18n.active} (${i18n.status})`)
    const picked = await page.evaluate(async () => {
        await window.__waI18n.setLocale('pt-br')
        return { h1: document.querySelector('h1').textContent.trim(), locale: window.__waI18n.getLocale() }
    })
    check('picking pt-BR re-renders the page in place', picked.locale === 'pt-br' && /áudio/.test(picked.h1), picked.h1)

    // The strings INSIDE the components, not just the page around them — and the
    // round trip back, which is what proves each component stashed its original
    // English rather than translating its own last output.
    const inside = await page.evaluate(() => ({
        drop: document.querySelector('wa-drop-zone').shadowRoot.querySelector('.wa-drop__big').textContent.trim(),
        save: document.querySelector('wa-key-panel').shadowRoot.querySelector('.wa-key__save').textContent.trim(),
        step: document.querySelector('wa-progress-rail').shadowRoot.querySelector('[data-step=\"transcribe\"] .label').textContent.trim(),
    }))
    check('component shadow DOM localises too', /áudio/.test(inside.drop) && inside.save === 'Salvar chave' && inside.step === 'transcrevendo…',
        JSON.stringify(inside))
    const back = await page.evaluate(async () => {
        await window.__waI18n.setLocale('en-gb')
        return document.querySelector('wa-drop-zone').shadowRoot.querySelector('.wa-drop__big').textContent.trim()
    })
    check('switching back restores the original English exactly', back === 'drop your voice note here', back)

    /* Switching language rewrites the address bar to /app/<locale>/ without a
       reload (issue 056), so links are shareable. That moves the document URL,
       and a page with no pinned <base> would resolve every relative fetch one
       level too deep from that moment on — silently, and only for users who
       change language. Assert the URL moved AND that the app can still load a
       relative asset afterwards. */
    const afterSwitch = await page.evaluate(async () => {
        await window.__waI18n.setLocale('pt-br')
        const wf = await window.__tool.getWorkflow({ options: {} })   // fetches ./workflows/standard.json
        const url = location.pathname
        await window.__waI18n.setLocale('en-gb')
        return { url, wf: wf?.definition?.id, back: location.pathname }
    })
    check('switching locale rewrites the URL for sharing', /\/app\/pt-br\/$/.test(afterSwitch.url), afterSwitch.url)
    check('relative fetches still resolve after the URL moves', afterSwitch.wf === 'standard', String(afterSwitch.wf))
    check('switching back to the default returns to /app/', /\/app\/$/.test(afterSwitch.back), afterSwitch.back)

    /* The key panel is a SETUP step, and v0.1.2 left it open forever: someone who
       had already pasted a key saw a full labelled form with an empty input on
       every visit, which reads as "not finished" (Dinis, issue 063). Tested here
       rather than in the browser suite because it extends SgComponent from the
       engine origin, which that harness deliberately does not load. */
    const keyUx = await page.evaluate(async () => {
        const el = document.querySelector('wa-key-panel')
        const sr = el.shadowRoot
        const shown = (sel) => { const n = sr.querySelector(sel)
            return !!n && !n.hidden && getComputedStyle(n).display !== 'none' }
        const out = {}
        out.openWhenEmpty = shown('.wa-key__form') && !shown('.wa-key__saved')
        // Drive the same path the app does on a successful save.
        localStorage.setItem('sg-openrouter-mgmt-key', 'sk-or-v1-integration-test-value')
        el.confirmSaved(true)
        out.collapsedWhenSaved = shown('.wa-key__saved') && !shown('.wa-key__form')
        sr.querySelector('.wa-key__change').click()
        out.reopensOnChange = shown('.wa-key__form') && shown('.wa-key__cancel')
        out.inputEmpty = sr.querySelector('input').value === ''
        out.neverShowsTheKey = !sr.textContent.includes('integration-test')
        sr.querySelector('.wa-key__cancel').click()
        out.cancelRecollapses = !shown('.wa-key__form')
        el.confirmSaved(false, 'That key was not accepted.')
        out.rejectionReopens = shown('.wa-key__form')
            && sr.querySelector('.wa-key__status').textContent.includes('not accepted')
        localStorage.removeItem('sg-openrouter-mgmt-key')
        return out
    })
    check('with no key the setup form is open', keyUx.openWhenEmpty)
    check('a saved key collapses the setup form', keyUx.collapsedWhenSaved)
    check('"change" reopens it, with a way back', keyUx.reopensOnChange && keyUx.inputEmpty)
    check('the key itself is never redisplayed', keyUx.neverShowsTheKey)
    check('cancel collapses it again', keyUx.cancelRecollapses)
    check('a REJECTED key reopens the form rather than showing a tick', keyUx.rejectionReopens)

    check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 4).join(' | '))
} catch (e) {
    check('test run completed', false, e.message)
} finally {
    await browser.close().catch(() => {})
    site.kill()
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed')
process.exit(failures ? 1 : 0)
