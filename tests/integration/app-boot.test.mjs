/* Integration test — boots the real app in headless Chromium and exercises the
   full no-key surface: engine import, SgToolApi contract, sample chips, the
   debug pane (exchanges / OpenRouter / prompts tabs), and prompt overrides.
   No OpenRouter key is used — LLM calls are covered by the QA pass and the
   optional keyed run.

   Environment:
     SITE_DIR       website dir to serve      (default: <repo>/website)
     TOOLS_ORIGIN   engine origin             (default: https://dev.tools.sgraph.ai)
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
const TOOLS_ORIGIN = process.env.TOOLS_ORIGIN || 'https://dev.tools.sgraph.ai'
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
    await page.goto(`http://127.0.0.1:${PORT}/app/?origin=${encodeURIComponent(TOOLS_ORIGIN)}`, { waitUntil: 'domcontentloaded' })

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
    const chips = await page.locator('.sample-chip').count()
    check('three sample chips rendered', chips === 3, String(chips))
    await page.locator('.sample-chip').first().click()
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
        document.querySelector('wa-debug-panel').shadowRoot.querySelectorAll('.prompt').length === 4, null, { timeout: 10000 }).then(() => true).catch(() => false)
    check('prompts tab shows the four templates', prompts)
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

    // 7. The exchange log is empty (no key, no LLM calls) and clearable.
    const log = await page.evaluate(async () => ({
        list: (await window.__tool.getExchanges()).length,
        cleared: (await window.__tool.clearExchanges()).ok }))
    check('exchange log empty without LLM calls, clearExchanges ok', log.list === 0 && log.cleared === true)

    // 8. No page errors during any of the above.
    check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 4).join(' | '))
} catch (e) {
    check('test run completed', false, e.message)
} finally {
    await browser.close().catch(() => {})
    site.kill()
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed')
process.exit(failures ? 1 : 0)
