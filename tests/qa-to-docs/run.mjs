/* QA-to-docs (issue 038, review pack v0.1.20 doc 08): one run, three outputs —
   a pass/fail QA verdict over the key user journeys, the screenshots that ARE
   the user docs, and an image-diff gate that tells pixel noise from real UI
   change.

   Journeys are deterministic and keyless: the scripted OpenRouter (same
   playbook as the chat-loop integration test) returns identical output every
   run; animations are disabled; dynamic regions (version chip, costs,
   latencies) are masked per the manifest.

   Baseline policy (M-qtd-1): baselines live in website/user-guide/screenshots/
   and are ONLY ever produced by CI — a laptop's font rendering differs. When a
   baseline is missing, the run captures a CANDIDATE into
   tests/qa-to-docs/output/candidates/ and passes with a warning; CI uploads the
   candidates as an artifact, and committing them (reviewed) arms the gate.
   When a baseline exists: diff ≥ threshold fails the run and writes
   <id>.current.png + <id>.diff.png into tests/qa-to-docs/output/.

   Environment:
     SITE_DIR, TOOLS_ORIGIN, MIRROR_DIR, CHROMIUM_PATH   as the integration tests
     UPDATE_BASELINES=1   write captures straight into the baseline dir
                          (intended for the CI refresh flow, not laptops)

   Run: node tests/qa-to-docs/run.mjs */

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { installMockOpenRouter } from './mock-openrouter.mjs'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SITE_DIR = process.env.SITE_DIR || path.join(repo, 'website')
const TOOLS_ORIGIN = process.env.TOOLS_ORIGIN || 'https://dev.tools.sgraph.ai'
const MIRROR_DIR = process.env.MIRROR_DIR || ''
const UPDATE = process.env.UPDATE_BASELINES === '1'
const PORT = 8127

const manifest = JSON.parse(readFileSync(path.join(repo, 'tests/qa-to-docs/journeys.json'), 'utf8'))
const BASELINE_DIR = path.join(repo, 'website/user-guide/screenshots')
const OUT_DIR = path.join(repo, 'tests/qa-to-docs/output')
const CANDIDATE_DIR = path.join(OUT_DIR, 'candidates')

let failures = 0, candidates = 0
const check = (n, ok, x = '') => { console.log(`${ok ? 'ok ' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`); if (!ok) failures++ }

const site = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', SITE_DIR], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 1200))

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--force-device-scale-factor=1', ...(MIRROR_DIR ? ['--no-proxy-server'] : [])] })
const page = await browser.newPage({ viewport: manifest.viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' })
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
await installMockOpenRouter(page)

// Deterministic rendering: no animations, no blinking caret, no smooth scroll.
await page.addInitScript(() => {
    const style = document.createElement('style')
    style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}'
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style))
})

const shotsById = Object.fromEntries(manifest.shots.map(s => [s.id, s]))

async function capture(id) {
    const spec = shotsById[id]
    if (!spec) throw new Error(`shot ${id} not in journeys.json`)
    await page.waitForTimeout(350)   // let the last DOM change settle
    const masks = (spec.masks || []).map(sel => page.locator(sel))
    const png = await page.screenshot({ fullPage: true, mask: masks, maskColor: '#0b1f3a', animations: 'disabled' })
    const baseline = path.join(BASELINE_DIR, `${id}.png`)

    if (UPDATE) {
        mkdirSync(BASELINE_DIR, { recursive: true })
        writeFileSync(baseline, png)
        console.log(`ok    ${id}: baseline updated`)
        return
    }
    if (!existsSync(baseline)) {
        mkdirSync(CANDIDATE_DIR, { recursive: true })
        writeFileSync(path.join(CANDIDATE_DIR, `${id}.png`), png)
        candidates++
        console.log(`ok    ${id}: no baseline yet — candidate captured (commit it to arm the gate)`)
        return
    }
    const a = PNG.sync.read(readFileSync(baseline))
    const b = PNG.sync.read(png)
    if (a.width !== b.width || a.height !== b.height) {
        mkdirSync(OUT_DIR, { recursive: true })
        writeFileSync(path.join(OUT_DIR, `${id}.current.png`), png)
        check(`${id}: dimensions match baseline`, false, `${a.width}x${a.height} → ${b.width}x${b.height}`)
        return
    }
    const diff = new PNG({ width: a.width, height: a.height })
    const differing = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 })
    const fraction = differing / (a.width * a.height)
    const limit = spec.threshold ?? manifest.threshold
    if (fraction >= limit) {
        mkdirSync(OUT_DIR, { recursive: true })
        writeFileSync(path.join(OUT_DIR, `${id}.current.png`), png)
        writeFileSync(path.join(OUT_DIR, `${id}.diff.png`), PNG.sync.write(diff))
        check(`${id}: within diff threshold`, false,
            `${(fraction * 100).toFixed(3)}% ≥ ${(limit * 100).toFixed(3)}% — real UI change: regression, or refresh the baseline with the feature`)
    } else {
        console.log(`ok    ${id}: matches baseline (${(fraction * 100).toFixed(3)}% < ${(limit * 100).toFixed(3)}%)`)
    }
}

try {
    // ── Journey 1: the one pass ────────────────────────────────────────────
    await page.goto(`http://127.0.0.1:${PORT}/app/?origin=${encodeURIComponent(TOOLS_ORIGIN)}`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__tool, null, { timeout: 30000 })
    check('one-pass: app boots', true)
    await capture('01-app-start')

    const key = page.locator('wa-key-panel input')
    await key.fill('sk-or-v1-mock-qa-to-docs')
    await page.locator('wa-key-panel button').click()
    await page.waitForFunction(() => document.querySelector('wa-key-panel').shadowRoot
        .querySelector('input').placeholder.includes('key saved'), null, { timeout: 10000 })
    check('one-pass: key saves via the panel', true)
    await capture('02-key-saved')

    await page.locator('.sample-chip').first().click()
    await page.waitForFunction(() => !document.querySelector('#file-section').hidden, null, { timeout: 10000 })
    check('one-pass: sample loads into the options screen', true)
    await capture('03-options')

    // The drawn-SVG model renders the mock's deterministic SVG stream — the
    // image-model path would need a mocked image payload instead. The picker
    // lives on the (still hidden) results card, so set it directly.
    await page.evaluate(() => {
        const sel = document.querySelector('#infographic-model')
        sel.value = 'google/gemini-3.5-flash'
        sel.dispatchEvent(new Event('change'))
    })
    await page.locator('#go').click()
    // DOM-state predicate only: waitForFunction does not await async
    // predicates on every poll, so window.__tool calls cannot be used here.
    // #work-section hides on wa:pass:complete; the cards unhide as they fill.
    await page.waitForFunction(() =>
        document.querySelector('#work-section').hidden &&
        !document.querySelector('#transcript-card').hidden &&
        !document.querySelector('#summary-card').hidden &&
        !document.querySelector('#infographic-card').hidden, null, { timeout: 60000 })
    const results = await page.evaluate(async () => window.__tool.getResults())
    check('one-pass: transcript arrived', /voice memo/.test(results?.transcript || ''), JSON.stringify(results)?.slice(0, 120))
    check('one-pass: summary arrived', /Key points/.test(results?.summary || ''))
    check('one-pass: infographic drawn', !!results?.svg)
    await capture('04-results')

    // ── Journey 2: chat with the materials ─────────────────────────────────
    await page.locator('wa-chat-panel .wa-chat__toggle').click()
    await page.waitForFunction(() => document.querySelector('wa-chat-panel').shadowRoot
        .querySelector('.wa-chat__panel.open'), null, { timeout: 10000 })
    check('chat: panel opens with context rows', true)
    await capture('05-chat-open')

    const a2 = await page.evaluate(async () => window.__tool.chatExchange({ text: 'Please generate the infographic now.' }))
    check('chat: tool-driven exchange ran one step', a2.steps === 1, String(a2.steps))
    await capture('06-chat-thread')

    const a3 = await page.evaluate(async () => window.__tool.chatExchange({ text: 'Translate the summary into Spanish.' }))
    check('chat: edit exchange ran one step', a3.steps === 1, String(a3.steps))
    await page.waitForFunction(() => !document.querySelector('#summary-edit-note').hidden, null, { timeout: 10000 })
    check('chat: "edited by the assistant" note shows', true)
    await capture('07-chat-edited')

    check('no page errors', errs.length === 0, errs.slice(0, 4).join(' | '))
} catch (e) {
    check('journeys completed', false, e.message)
    console.log((e.stack || '').split('\n').slice(0, 5).join('\n'))
} finally {
    await browser.close().catch(() => {})
    site.kill()
}

if (candidates) console.log(`\n${candidates} candidate baseline(s) in tests/qa-to-docs/output/candidates/ — review and commit to website/user-guide/screenshots/ to arm the diff gate`)
console.log(failures ? `\n${failures} check(s) FAILED` : '\nqa-to-docs healthy')
process.exit(failures ? 1 : 0)
