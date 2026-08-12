/* Integration — the keyless demo (issue 062).

   A stranger cannot see what this product does until they have an OpenRouter
   account and a key. The demo removes that wall, and the two things that make it
   trustworthy are exactly what this file asserts:

   1. IT RUNS THE REAL WORKFLOW. Not a mock-up with timers — the declared path,
      the real trace, the real events, the real cards. A demo that drifts from the
      product is a demo that lies about the product.
   2. IT SPENDS AND SENDS NOTHING. No key is set at any point in this test, and
      every outbound request to OpenRouter is failed loudly rather than mocked —
      so if the demo path ever reached the network, this test breaks instead of
      quietly costing somebody money.

   Run: node tests/integration/demo.test.mjs */

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SITE_DIR = process.env.SITE_DIR || path.join(repo, 'website')
const TOOLS_ORIGIN = process.env.TOOLS_ORIGIN || 'https://dev.tools.sgraph.ai'
const MIRROR_DIR = process.env.MIRROR_DIR || ''
const PORT = 8131

let failures = 0
const check = (name, ok, extra = '') => {
    console.log(`${ok ? 'ok ' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`)
    if (!ok) failures++
}

const site = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', SITE_DIR], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 1200))

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', ...(MIRROR_DIR ? ['--no-proxy-server'] : [])] })
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } })
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

/* NOT a mock. Any OpenRouter call at all is a failure of the feature, so it is
   recorded and aborted rather than answered. */
const openrouterCalls = []
await page.route('https://openrouter.ai/**', route => {
    openrouterCalls.push(route.request().url())
    route.abort()
})

try {
    await page.goto(`http://127.0.0.1:${PORT}/app/`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__tool, null, { timeout: 30000 })

    // Deliberately no setApiKey, and localStorage is cleared to be certain.
    await page.evaluate(() => localStorage.removeItem('sg-openrouter-mgmt-key'))
    const keyless = await page.evaluate(() => !localStorage.getItem('sg-openrouter-mgmt-key'))
    check('no key is present before the demo runs', keyless)

    const out = await page.evaluate(async () => {
        const seen = []
        const names = ['wa:pass:started', 'wa:transcript', 'wa:facts', 'wa:summary', 'wa:pass:complete']
        const fns = names.map(n => { const f = () => seen.push(n); window.addEventListener(n, f); return [n, f] })
        const r = await window.__tool.runPass({ demo: true, infographic: false, translate: true })
        for (const [n, f] of fns) window.removeEventListener(n, f)
        return {
            seen,
            transcript: (r.transcript || '').slice(0, 60),
            summary: (r.summary || '').slice(0, 40),
            facts: r.facts && { code: r.facts.language.code, topics: r.facts.topics.length },
            steps: (r.trace?.steps || []).map(s => `${s.id}:${s.status}`),
            spent: r.trace?.spentUsd, quoted: r.trace?.quoteUsd, demo: r.trace?.demo,
        }
    })

    check('the demo produces a transcript, metadata and a debrief',
        out.transcript.length > 20 && out.summary.includes('Key points') && out.facts?.topics === 3,
        `${out.facts?.topics} topics · ${out.summary}`)
    check('it walks the REAL declared path, classify branch included',
        out.steps.includes('classify:done') && out.steps.includes('transcribe:done'), out.steps.join(' '))
    check('it emits the same wa:* stream a real pass does',
        ['wa:pass:started', 'wa:transcript', 'wa:facts', 'wa:summary', 'wa:pass:complete'].every(n => out.seen.includes(n)),
        out.seen.join(' '))
    // The demo fixture is English, so an English reader's demo demonstrates the
    // translate-skip decision rather than papering over it.
    check('the translate decision is made by the real code, not hardcoded',
        out.steps.includes('translate:skipped'), out.steps.join(' '))
    check('it spends nothing', out.spent === 0 && out.quoted > 0, `spent ${out.spent} of ${out.quoted}`)
    check('the trace is marked as a demo', out.demo === true, String(out.demo))

    // THE ONE THAT MATTERS MOST.
    check('NOTHING was sent to OpenRouter', openrouterCalls.length === 0,
        openrouterCalls.slice(0, 2).join(' '))
    const stillKeyless = await page.evaluate(() => !localStorage.getItem('sg-openrouter-mgmt-key'))
    check('and no key was created or required', stillKeyless)

    /* The stamp. A scripted result that could be mistaken for the user's own
       recording is the one failure this feature cannot have. */
    const banner = await page.evaluate(() => {
        document.querySelector('#try-demo').click()
        const b = document.querySelector('#results-section .demo-banner')
        return b ? b.textContent.replace(/\s+/g, ' ').trim() : null
    })
    check('every demo result sits under a DEMO stamp',
        !!banner && /DEMO/.test(banner) && /not a real recording/i.test(banner), String(banner))

    check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
} catch (e) {
    check('test run completed', false, e.message)
} finally {
    await browser.close().catch(() => {})
    site.kill()
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\ndemo path healthy')
process.exit(failures ? 1 : 0)
