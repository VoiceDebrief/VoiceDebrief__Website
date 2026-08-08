/* Integration — the translate step (issue 055).

   The product question this answers: a voice note is spoken in one language and
   read by someone who wants another. Transcribing it is not enough — a
   Portuguese reader handed an English summary has been given a translation
   problem, not a debrief.

   So the pass gains a step between transcribe and summary, and EVERYTHING
   DOWNSTREAM IS BUILT FROM THE TRANSLATION. The assertion that carries the
   feature is the summary one: a Portuguese label on an English summary would
   satisfy a weaker test and be worthless to the reader it is for.

   The transcript is deliberately NOT translated in place. It is the record of
   what was actually said, and overwriting it would destroy the only artefact
   that can be checked against the audio.

   Keyless and deterministic: the same scripted OpenRouter the qa-to-docs
   journeys use. Its own file rather than a case inside chat-loop, because an
   extra pass mid-run perturbs that test's exchange counts and material state.

   Environment: SITE_DIR, TOOLS_ORIGIN, MIRROR_DIR, CHROMIUM_PATH — as the other
   integration tests.

   Run: node tests/integration/translate.test.mjs */

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { installMockOpenRouter } from '../qa-to-docs/mock-openrouter.mjs'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SITE_DIR = process.env.SITE_DIR || path.join(repo, 'website')
const TOOLS_ORIGIN = process.env.TOOLS_ORIGIN || 'https://dev.tools.sgraph.ai'
const MIRROR_DIR = process.env.MIRROR_DIR || ''
const PORT = 8129

let failures = 0
const check = (name, ok, extra = '') => {
    console.log(`${ok ? 'ok ' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`)
    if (!ok) failures++
}

const site = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', SITE_DIR], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 1200))

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', ...(MIRROR_DIR ? ['--no-proxy-server'] : [])] })
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
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

try {
    await page.goto(`http://127.0.0.1:${PORT}/app/`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__tool, null, { timeout: 30000 })
    await page.evaluate(() => window.__tool.setApiKey({ apiKey: 'sk-or-v1-mock-translate' }))

    // The option is declared, so its cost is quotable BEFORE anything runs.
    const quote = await page.evaluate(async () => ({
        on: (await window.__tool.getWorkflow({ options: { translate: true } })).quoteUsd,
        off: (await window.__tool.getWorkflow({ options: {} })).quoteUsd,
        max: (await window.__tool.getWorkflow({ options: {} })).maxUsd,
    }))
    check('translating is quoted before it runs, and costs more', quote.on > quote.off,
        `£-ish usd ${quote.off} → ${quote.on} (ceiling ${quote.max})`)

    const run = await page.evaluate(async () => {
        await window.__waI18n.setLocale('pt-pt')
        const r = await fetch('samples/whatsapp-voice-note-1.opus')
        const f = new File([await r.arrayBuffer()], 'whatsapp-voice-note-1.opus', { type: 'audio/opus' })
        const out = await window.__tool.runPass({ file: f, infographic: false, translate: true })
        return { transcript: out.transcript, translation: out.translation, summary: out.summary,
                 steps: (out.trace?.steps || []).map(s => `${s.id}:${s.status}`),
                 cardShown: !document.querySelector('#translation-card').hidden,
                 cardLabel: document.querySelector('#translation-card').getAttribute('label') }
    })
    check('the declared path runs the translate step', run.steps.includes('translate:done'), run.steps.join(' '))
    check('the transcript stays in the language spoken', /voice memo/.test(run.transcript || ''), run.transcript)
    check('the translation is in the reader\'s language', /memorando de voz/.test(run.translation || ''), run.translation)
    check('the SUMMARY is built from the translation, not the original',
        /Pontos principais/.test(run.summary || ''), JSON.stringify(run.summary))
    check('the translation is shown, with a localised label',
        run.cardShown && run.cardLabel === 'TRADUÇÃO', `${run.cardShown} / ${run.cardLabel}`)

    // Opted out: the step must be skipped entirely, not run and discarded — the
    // user is paying per call and an invisible one is the worst kind.
    const off = await page.evaluate(async () => {
        const r = await fetch('samples/whatsapp-voice-note-2.opus')
        const f = new File([await r.arrayBuffer()], 'whatsapp-voice-note-2.opus', { type: 'audio/opus' })
        const out = await window.__tool.runPass({ file: f, infographic: false, translate: false })
        await window.__waI18n.setLocale('en-gb')
        return { translation: out.translation, steps: (out.trace?.steps || []).map(s => `${s.id}:${s.status}`) }
    })
    check('opting out skips the step and spends nothing on it',
        off.steps.includes('translate:skipped') && !off.translation, off.steps.join(' '))

    check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
} catch (e) {
    check('test run completed', false, e.message)
} finally {
    await browser.close().catch(() => {})
    site.kill()
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\ntranslate step healthy')
process.exit(failures ? 1 : 0)
