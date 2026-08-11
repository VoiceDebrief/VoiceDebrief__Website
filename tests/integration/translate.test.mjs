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

    /* THE PROMPT ITSELF, not the reply. The earlier version of this test asserted
       that the summary came back in Portuguese, and it passed — because the mock
       answered in Portuguese whenever the request mentioned Portuguese. Against a
       real model it failed: the summary prompt ended with the words "British
       English", so the translated text was handed over correctly and the model was
       then told to answer in English anyway (Dinis, screenshot: Portuguese
       translation, English summary, English infographic).

       A reply can be produced by a helpful mock. An instruction cannot: either the
       prompt names the reader's language or it does not. */
    const sent = await page.evaluate(async () => {
        const ex = await window.__tool.getExchanges({ limit: 50 })
        // Identified by the prompt's OWN marker rather than by a label field, so
        // this keeps working if the record shape changes.
        const bodies = ex.map(e => JSON.stringify(e))
        return { summary: bodies.find(b => b.includes('Key points')) || '', count: ex.length }
    })
    check('the summary request was captured', !!sent.summary, `${sent.count} exchange(s)`)
    check("the summary is INSTRUCTED to write in the reader's language",
        /Portuguese/i.test(sent.summary), sent.summary ? 'the prompt names the language' : 'no summary request found')
    check('and no longer carries the hardcoded "British English" that caused the bug',
        !!sent.summary && !/British English/i.test(sent.summary))

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

    /* THE POINT OF ISSUE 061. Translate is ON, the reader is English, and the
       note is English — so the run must decline the step it was allowed to take
       and spend less than it quoted. Everything above only proves translation
       works; this proves it stops when it is pointless. */
    const already = await page.evaluate(async () => {
        const r = await fetch('samples/whatsapp-voice-note-2.opus')
        const f = new File([await r.arrayBuffer()], 'whatsapp-voice-note-2.opus', { type: 'audio/opus' })
        let seen = null
        const on = (e) => { seen = e.detail }
        window.addEventListener('wa:facts', on)
        const out = await window.__tool.runPass({ file: f, infographic: false, translate: true })
        window.removeEventListener('wa:facts', on)
        const card = document.querySelector('wa-facts-card')
        return {
            steps: (out.trace?.steps || []).map(s => `${s.id}:${s.status}`),
            because: (out.trace?.steps || []).find(s => s.id === 'translate')?.skippedBecause,
            spent: out.trace?.spentUsd, quoted: out.trace?.quoteUsd,
            translation: out.translation,
            facts: out.facts && { code: out.facts.language.code, topics: out.facts.topics.length,
                                  register: out.facts.register, signals: out.facts.signals.length },
            needed: seen?.needsTranslation,
            // .card, not the whole shadow root — textContent on the root includes
            // the <style> block, which matches almost any word you look for.
            // NOT sliced here: truncating before asserting means the assertion
            // is about the first 160 characters, not about the card.
            cardText: (card?.shadowRoot?.querySelector('.card')?.textContent || '')
                .replace(/\s+/g, ' ').trim(),
            cardHidden: card?.hidden,
        }
    })
    check('an English note for an English reader skips the translation it was allowed',
        already.steps.includes('translate:skipped') && !already.translation, already.steps.join(' '))
    check('and the trace records WHY, in the declaration\'s own words',
        already.because === "the note is already in the reader's language", String(already.because))
    check('the run spends LESS than it quoted — a fact may subtract work, never add it',
        already.spent < already.quoted, `spent ${already.spent} < quoted ${already.quoted}`)
    check('the metadata itself is typed and allowlisted',
        already.facts?.code === 'en' && already.facts.topics > 0 && already.facts.register === 'casual',
        JSON.stringify(already.facts))
    check('the card is shown and carries the gist and the topics',
        already.cardHidden === false && /WHAT WE NOTICED/i.test(already.cardText)
        && /test recording/i.test(already.cardText), already.cardText.slice(0, 90))
    check('and it says the translation was skipped rather than leaving a silent gap',
        /already in your language/i.test(already.cardText), already.cardText.slice(0, 160))

    check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
} catch (e) {
    check('test run completed', false, e.message)
} finally {
    await browser.close().catch(() => {})
    site.kill()
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\ntranslate step healthy')
process.exit(failures ? 1 : 0)
