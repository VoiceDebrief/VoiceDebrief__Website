/* Browser unit tests (issue 049) — the same modules the Node suite covers,
   but under REAL browser semantics: genuine File/Blob for the audio sniffing,
   genuine localStorage for the debug store, genuine custom-element upgrade for
   wa-site-nav, and the declared-workflow machine end to end with stub
   executors. The Node suite stays the fast gate; this one proves the browser
   truths Node can only shim. Ships WITH the site (/tests/browser/) so the same
   page runs against the deployed modules — see index.html. */

/* global QUnit */

// The headless CI driver (run.mjs) reads these; the visual runner ignores them.
window.__qunit = { tests: [], done: null }
QUnit.testDone(t => window.__qunit.tests.push({
    module: t.module, name: t.name, failed: t.failed, total: t.total }))
QUnit.done(d => { window.__qunit.done = d })

import { validateWorkflow, pathFor, pathUsd, maxUsd, runWorkflow } from '../../app/workflow.js'
import { ORIGIN, fmtGbp, USD_TO_GBP } from '../../app/config.js'
import { sniffAudio, normaliseAudioFile } from '../../app/audio-normalise.js'
import { debugStore } from '../../app/debug-store.js'
import '../../components/wa-site-nav/v0/v0.1/v0.1.2/wa-site-nav.js'

const standard = await (await fetch('../../app/workflows/standard.json')).json()

/* ── the declared workflow (issue 042) ──────────────────────────────────── */
QUnit.module('workflow — the declared state machine', () => {
    QUnit.test('the shipped standard.json validates', assert => {
        const v = validateWorkflow(standard)
        assert.deepEqual(v.errors, [], 'no validation errors')
        assert.true(v.ok)
    })

    QUnit.test('the quote follows the options', assert => {
        // Two optional branches since issue 055 added translate.
        assert.true(pathUsd(standard, { infographic: true }) > pathUsd(standard, {}),
            'the infographic branch costs more')
        assert.true(pathUsd(standard, { translate: true }) > pathUsd(standard, {}),
            'the translate branch costs more')
        assert.strictEqual(maxUsd(standard), pathUsd(standard, { infographic: true, translate: true }),
            'all options on = the absolute ceiling')
        assert.deepEqual(pathFor(standard, {}).map(s => s.id),
            ['normalise', 'ingest', 'transcribe', 'summary'])
        // Translate sits between transcribe and summary: the summary is built
        // from it, so anywhere else would summarise the wrong text.
        assert.deepEqual(pathFor(standard, { translate: true }).map(s => s.id),
            ['normalise', 'ingest', 'transcribe', 'translate', 'summary'])
    })

    const stubbed = (overrides = {}) => ({
        'local': async () => ({ costUsd: 0 }), 'engine': async () => ({ costUsd: 0 }),
        'llm-transcribe': async () => ({ costUsd: 0.004 }),
        'llm-text': async () => ({ costUsd: 0.001 }),
        'llm-infographic': async () => ({ costUsd: 0.02 }), ...overrides,
    })

    QUnit.test('a run completes with the skipped branch marked', async assert => {
        const trace = await runWorkflow(standard, { options: { infographic: false }, executors: stubbed() })
        assert.strictEqual(trace.status, 'complete')
        assert.strictEqual(trace.steps.find(s => s.id === 'infographic').status, 'skipped')
        assert.true(Math.abs(trace.spentUsd - 0.005) < 1e-9, 'spend summed from the executors')
    })

    QUnit.test('degrade continues, abort stops, the budget gate blocks (the declared behaviours)', async assert => {
        const degraded = await runWorkflow(standard, { options: { infographic: true },
            executors: stubbed({ 'llm-text': async () => { throw Object.assign(new Error('x'), { code: 'llm-error' }) } }) })
        assert.strictEqual(degraded.steps.find(s => s.id === 'summary').status, 'degraded')
        assert.strictEqual(degraded.steps.find(s => s.id === 'infographic').status, 'done',
            'the run continued past the degraded step')

        await assert.rejects(
            runWorkflow(standard, { options: {},
                executors: stubbed({ 'llm-transcribe': async () => { throw Object.assign(new Error('x'), { code: 'rate-limited' }) } }) }),
            e => e.code === 'rate-limited', 'abort rethrows the original code')

        let trace
        await assert.rejects(
            runWorkflow(standard, { options: { infographic: true },
                executors: stubbed({ 'llm-transcribe': async () => ({ costUsd: 99 }) }),
                emit: (n, d) => { if (d?.trace) trace = d.trace } }),
            e => e.code === 'workflow-budget', 'an overrun is stopped at the next step boundary')
        assert.true(trace.steps.find(s => s.id === 'transcribe').overrun, 'the overrun itself is recorded')
        assert.strictEqual(trace.steps.find(s => s.id === 'summary').status, 'blocked')
    })
})

/* ── config (issue 041) ─────────────────────────────────────────────────── */
QUnit.module('config — the hardcoded origin', () => {
    QUnit.test('ORIGIN is the engine origin and nothing reads the query string', async assert => {
        assert.strictEqual(ORIGIN, 'https://dev.tools.sgraph.ai')
        const src = await (await fetch('../../app/config.js')).text()
        for (const forbidden of ['location.search', 'URLSearchParams', 'searchParams'])
            assert.false(src.includes(forbidden), `config.js must not use ${forbidden}`)
    })

    QUnit.test('fmtGbp: fixed rate, three decimals under 10p, honest dash for unknowns', assert => {
        assert.strictEqual(fmtGbp(1), '£' + (1 * USD_TO_GBP).toFixed(2))
        assert.strictEqual(fmtGbp(0.004), '£' + (0.004 * USD_TO_GBP).toFixed(3))
        assert.strictEqual(fmtGbp(null), '£—')
    })
})

/* ── audio-normalise (issue 025) with REAL browser File objects ─────────── */
QUnit.module('audio-normalise — real File/Blob, not Node shims', () => {
    const OGG_OPUS = () => {
        // A minimal OggS page whose first packet starts with OpusHead — the
        // exact byte shape the sniffer keys on (issue 025).
        const b = new Uint8Array(64)
        b.set([0x4f, 0x67, 0x67, 0x53, 0, 2], 0)                    // "OggS" + version + BOS
        b[26] = 1; b[27] = 19                                        // one segment, 19 bytes
        b.set([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], 28) // "OpusHead"
        return b
    }

    QUnit.test('an .ogg mislabelled by the OS is renamed to tell the engine the truth', async assert => {
        const file = new File([OGG_OPUS()], 'note.ogg', { type: 'application/ogg' })
        const norm = await normaliseAudioFile(file)
        assert.true(norm.changed, 'the mislabelled file was normalised')
        assert.true(norm.file.name.endsWith('.opus'), `renamed to the decoder path: ${norm.file.name}`)
    })

    QUnit.test('sniffing reads bytes, not names', async assert => {
        // sniffAudio takes bytes; the name never enters the decision. In the
        // browser we produce those bytes from a REAL File via arrayBuffer().
        const lyingName = new File([OGG_OPUS()], 'lying-name.mp3', { type: 'audio/mpeg' })
        const sniffed = sniffAudio(new Uint8Array(await lyingName.arrayBuffer()))
        assert.deepEqual(sniffed, { container: 'ogg', codec: 'opus' }, 'content wins over the filename')
        assert.strictEqual(sniffAudio(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])).container, 'unknown',
            'junk bytes are unknown, whatever a name might claim')
    })
})

/* ── debug-store with REAL localStorage ─────────────────────────────────── */
QUnit.module('debug-store — real localStorage round-trips', hooks => {
    hooks.beforeEach(() => {
        for (const k of Object.keys(localStorage)) if (k.startsWith('wa-prompt-override')) localStorage.removeItem(k)
        debugStore.clearExchanges()
    })

    QUnit.test('prompt overrides persist to localStorage and reset cleanly', assert => {
        debugStore.setPromptDefault('summary', 'DEFAULT')
        debugStore.setPrompt({ kind: 'summary', text: 'OVERRIDE' })
        assert.strictEqual(localStorage.getItem('wa-prompt-override:summary'), 'OVERRIDE',
            'the override is really in localStorage')
        assert.strictEqual(debugStore.getPrompt('summary'), 'OVERRIDE')
        debugStore.resetPrompt({ kind: 'summary' })
        assert.strictEqual(localStorage.getItem('wa-prompt-override:summary'), null)
        assert.strictEqual(debugStore.getPrompt('summary'), 'DEFAULT')
    })

    QUnit.test('the exchange log records and clears', assert => {
        const rec = debugStore.record({ kind: 'chat', model: 'm/x', status: 'pending', request: {} })
        debugStore.update(rec.id, { status: 'done' })
        assert.strictEqual(debugStore.getExchanges({ kind: 'chat' }).length, 1)
        debugStore.clearExchanges()
        assert.strictEqual(debugStore.getExchanges().length, 0)
    })
})

/* ── wa-site-nav as a REAL custom element (issue 048) ───────────────────── */
QUnit.module('wa-site-nav — real custom-element upgrade', () => {
    QUnit.test('two-level menu: App + Pricing primary, three groups, twelve grouped pages (v0.1.1)', assert => {
        const el = document.createElement('wa-site-nav')
        el.setAttribute('badge', 'BETA')
        document.getElementById('qunit-fixture').appendChild(el)
        const sr = el.shadowRoot
        assert.strictEqual(sr.querySelectorAll('nav.main > a').length, 2, 'App and Pricing stay primary')
        assert.strictEqual(sr.querySelectorAll('nav.main .group').length, 3, 'Library + News + Engineering groups')
        assert.strictEqual(sr.querySelectorAll('nav.main .group .menu a').length, 12,
            '3 library + 3 news + 6 engineering pages in the dropdowns')
        assert.strictEqual(sr.querySelector('.badge').textContent, 'BETA')
        assert.strictEqual(sr.querySelector('.sub'), null, 'no section row outside /engineering/')
        assert.true([...sr.querySelectorAll('a')].some(a => a.getAttribute('href') === '/app/'),
            'the App is always in the menu (it was not, before issue 048)')
    })

    QUnit.test('small screens get a hamburger panel — the menu is never lost (v0.1.0 hid it)', assert => {
        const el = document.createElement('wa-site-nav')
        document.getElementById('qunit-fixture').appendChild(el)
        const sr = el.shadowRoot
        const burger = sr.querySelector('.burger')
        assert.ok(burger, 'the hamburger button exists')
        assert.strictEqual(burger.getAttribute('aria-expanded'), 'false')
        burger.click()
        assert.true(el.classList.contains('open'), 'clicking opens the panel')
        assert.strictEqual(burger.getAttribute('aria-expanded'), 'true')
        assert.true(sr.querySelectorAll('.panel a').length >= 15,
            'the panel lists every page — primary, news and engineering alike')
        burger.click()
        assert.false(el.classList.contains('open'), 'clicking again closes it')
    })
})

QUnit.start()   // autostart is off — see index.html
