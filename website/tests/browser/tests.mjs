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
import '../../components/wa-site-nav/v0/v0.1/v0.1.8/wa-site-nav.js'
import '../../components/wa-locale-picker/v0/v0.1/v0.1.4/wa-locale-picker.js'
import { newsScript, speak, wirePage, bytesToBase64, VOICES } from '../../tools/text-to-speech/tts-tool.js'

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
            ['normalise', 'ingest', 'transcribe', 'classify', 'summary'])
        // Translate sits between transcribe and summary: the summary is built
        // from it, so anywhere else would summarise the wrong text.
        assert.deepEqual(pathFor(standard, { translate: true }).map(s => s.id),
            ['normalise', 'ingest', 'transcribe', 'classify', 'translate', 'summary'])
    })

    const stubbed = (overrides = {}) => ({
        'local': async () => ({ costUsd: 0 }), 'engine': async () => ({ costUsd: 0 }),
        'llm-transcribe': async () => ({ costUsd: 0.004 }),
        // classify declares the fact the translate branch is guarded on (issue 061)
        'llm-classify': async () => ({ costUsd: 0.002, facts: { needsTranslation: true } }),
        'llm-translate': async () => ({ costUsd: 0.006 }),
        'llm-text': async () => ({ costUsd: 0.001 }),
        'llm-infographic': async () => ({ costUsd: 0.02 }), ...overrides,
    })

    QUnit.test('a run completes with the skipped branch marked', async assert => {
        const trace = await runWorkflow(standard, { options: { infographic: false }, executors: stubbed() })
        assert.strictEqual(trace.status, 'complete')
        assert.strictEqual(trace.steps.find(s => s.id === 'infographic').status, 'skipped')
        assert.true(Math.abs(trace.spentUsd - 0.007) < 1e-9, 'spend summed from the executors')
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
        assert.strictEqual(trace.steps.find(s => s.id === 'classify').status, 'blocked',
            'the gate blocks the first step after the overrun, which is now classify')
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
    QUnit.test('two-level menu: two primary links, four groups, seventeen grouped pages (v0.1.8)', assert => {
        const el = document.createElement('wa-site-nav')
        el.setAttribute('badge', 'BETA')
        document.getElementById('qunit-fixture').appendChild(el)
        const sr = el.shadowRoot
        // Since v0.1.3 the App link is wrapped in a flag span (it is the one page
        // that exists in other languages), so it is no longer a DIRECT child of
        // nav.main — count both shapes rather than only the old one.
        assert.strictEqual(sr.querySelectorAll('nav.main > a, nav.main > .i18n-link > a').length, 2,
            'App and What it costs stay primary')
        assert.strictEqual(sr.querySelectorAll('nav.main .group').length, 4,
            'Library + Tools + News + Engineering groups (Tools added, issue 064)')
        assert.strictEqual(sr.querySelectorAll('nav.main .group .menu a').length, 17,
            '4 library + 2 tools + 3 news + 8 engineering pages in the dropdowns')
        assert.true([...sr.querySelectorAll('a')].some(a => a.getAttribute('href') === '/tools/text-to-speech/'),
            'the first tool is reachable from every page on the site')
        assert.strictEqual(sr.querySelector('.badge').textContent, 'BETA')
        assert.strictEqual(sr.querySelector('.sub'), null, 'no section row outside /engineering/')
        assert.true([...sr.querySelectorAll('a')].some(a => a.getAttribute('href') === '/app/'),
            'the App is always in the menu (it was not, before issue 048)')
        // Nobody can use this product without an OpenRouter key, so the page that
        // explains how to get one has to be reachable from every page, not only
        // from inside the app (issue 060).
        assert.true([...sr.querySelectorAll('a')].some(a => a.getAttribute('href') === '/openrouter-key/'),
            'the key guide is in the menu')
    })

    /* BETA is a standing statement about the product, so it cannot depend on a
       page remembering to ask for it. v0.1.7 put it on the app page alone while
       the home page made the same claim in hero copy that scrolls away. */
    QUnit.test('BETA is persistent chrome, not an opt-in attribute (v0.1.8)', assert => {
        const el = document.createElement('wa-site-nav')            // NO badge attribute
        document.getElementById('qunit-fixture').appendChild(el)
        assert.strictEqual(el.shadowRoot.querySelector('.badge')?.textContent, 'BETA',
            'a page that says nothing still carries the beta mark')

        const named = document.createElement('wa-site-nav')
        named.setAttribute('badge', 'ALPHA')
        document.getElementById('qunit-fixture').appendChild(named)
        assert.strictEqual(named.shadowRoot.querySelector('.badge').textContent, 'ALPHA',
            'a page may change the word')

        // The word is overridable; the fact is not. badge="" is the only way to
        // clear it and it must stay deliberate — this asserts the escape hatch
        // exists rather than blessing its use.
        const cleared = document.createElement('wa-site-nav')
        cleared.setAttribute('badge', '')
        document.getElementById('qunit-fixture').appendChild(cleared)
        assert.strictEqual(cleared.shadowRoot.querySelector('.badge'), null,
            'and clearing it takes an explicit empty badge, never an omission')
    })

    QUnit.test('the nav says which pages follow your language, and which do not (v0.1.6)', assert => {
        const el = document.createElement('wa-site-nav')
        document.getElementById('qunit-fixture').appendChild(el)
        const sr = el.shadowRoot
        // Exactly the translated pages carry a flag; everything else sits behind
        // ONE marker rather than repeating a flag five times. With no i18n on the
        // page (this harness has none) the flag is 🇬🇧 — the truth for that page.
        const flagged = [...sr.querySelectorAll('.i18n-link')]
        assert.strictEqual(flagged.length, 1, 'today only the app exists in other languages')
        assert.strictEqual(flagged[0].querySelector('a').getAttribute('href'), '/app/')
        assert.ok(/\p{Regional_Indicator}/u.test(flagged[0].textContent), 'the translated link carries a flag')
        assert.ok(sr.querySelector('.en-only'), 'one marker introduces the English-only links')
        assert.ok(sr.querySelector('.en-only').getAttribute('title')?.includes('English'),
            'and it explains itself on hover rather than being a mystery flag')
        assert.ok(sr.querySelector('slot[name="locale"]'), 'the nav offers the picker a home, top right')
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

    /* Wrapping the App link in .i18n-link for its locale flag (v0.1.3) took it out
       of the `nav.main > a` selector, so it fell back to the browser's default link
       colour — blue, and purple once visited, on a navy bar. Nothing in the markup
       looked wrong; only the painted colour was. Asserted from computed style, for
       the same reason the picker tests are. */
    QUnit.test('every top-level nav link is the same colour — the flag wrapper does not orphan one (v0.1.6)', assert => {
        const el = document.createElement('wa-site-nav')
        document.getElementById('qunit-fixture').appendChild(el)
        const sr = el.shadowRoot
        const colourOf = (sel) => { const a = sr.querySelector(sel); return a && getComputedStyle(a).color }
        const plain = colourOf('nav.main > a')
        const flagged = colourOf('nav.main > .i18n-link > a')
        assert.ok(plain, 'an unwrapped primary link exists')
        assert.ok(flagged, 'the flag-wrapped App link exists')
        assert.strictEqual(flagged, plain,
            `the App link matches its siblings (was ${flagged} vs ${plain} before v0.1.6)`)
        assert.notStrictEqual(flagged, 'rgb(0, 0, 238)', 'and is not the browser default blue')
    })

    /* The phone regression (v0.1.4). The bar is a space-between row; when it
       wrapped on an iPhone the picker slot and the hamburger — plain siblings —
       were thrown to opposite ends of the second line, and the panel, anchored
       right:0 to a trigger now sitting mid-row, opened 131px off the left edge
       of the screen. The fix is structural: the two controls are ONE element, so
       whatever the row does they stay adjacent and hard right. Assert the
       structure, because that is what the CSS depends on. */
    QUnit.test('the language slot and the hamburger are one cluster, so a wrapped header cannot separate them (v0.1.6)', assert => {
        const el = document.createElement('wa-site-nav')
        document.getElementById('qunit-fixture').appendChild(el)
        const sr = el.shadowRoot
        const cluster = sr.querySelector('header > .wrap > .right')
        assert.ok(cluster, 'the right-hand cluster exists in the bar')
        assert.ok(cluster.querySelector('slot[name="locale"]'), 'the locale slot is inside it')
        assert.ok(cluster.querySelector('.burger'), 'the hamburger is inside it')
        assert.strictEqual(sr.querySelectorAll('header > .wrap > slot[name="locale"]').length, 0,
            'and neither is left loose in the space-between row')
        assert.strictEqual(sr.querySelectorAll('header > .wrap > .burger').length, 0,
            'the hamburger is not a loose sibling either')
        // Not getComputedStyle().marginLeft — that resolves `auto` to a used
        // pixel value, so it can never equal the string 'auto'. Assert the thing
        // the margin exists to produce: the cluster sits flush with the bar's
        // right content edge.
        const wrap = sr.querySelector('header > .wrap')
        const gap = wrap.getBoundingClientRect().right - cluster.getBoundingClientRect().right
        assert.true(Math.abs(gap - 20) < 2,
            `the cluster is flush right against the bar's 20px padding (gap ${gap.toFixed(1)}px)`)
    })
})

/* ── wa-locale-picker: visibility is what the BROWSER PAINTS ─────────────────
   These exist because of a bug that shipped from v0.1.1 to v0.1.3 and survived
   review twice. toggle() sets `panel.hidden`, which closes an element only via
   the user-agent rule [hidden]{display:none}. The component's own
   .panel{display:grid} is an AUTHOR rule and beats it — so the culture list
   rendered on every page load, on every viewport, while `panel.hidden` read back
   true and every check agreed with itself.

   So none of these assert the attribute. They assert computed style and a box,
   because that is the only thing a user can see. */
QUnit.module('wa-locale-picker — closed means painting nothing', hooks => {
    let saved
    hooks.beforeEach(() => {
        saved = window.__waI18n
        window.__waI18n = {
            getLocales: () => ({
                'en-gb': { nativeLabel: 'English (UK)', status: 'live', flag: '🇬🇧' },
                'pt-br': { nativeLabel: 'Português (Brasil)', status: 'draft', flag: '🇧🇷' },
            }),
            getLocale: () => 'pt-br',
            defaultLocale: () => 'en-gb',
            tOr: (key, fallback) => fallback,
        }
    })
    /* delete, not `= saved`. On this page nothing has ever defined __waI18n, so
       `saved` is undefined and assigning it back leaves the PROPERTY defined with
       an undefined value — which is still a new global, and QUnit's noglobals
       check says so. The app page is the only place the real seam exists. */
    hooks.afterEach(() => {
        if (saved === undefined) delete window.__waI18n
        else window.__waI18n = saved
    })

    const mount = () => {
        const el = document.createElement('wa-locale-picker')
        document.getElementById('qunit-fixture').appendChild(el)
        return el
    }
    const paints = (el) => {
        const p = el.shadowRoot.querySelector('.panel')
        const box = p.getBoundingClientRect()
        return getComputedStyle(p).display !== 'none' && box.width > 0 && box.height > 0
    }

    QUnit.test('the panel paints nothing on load, whatever the hidden attribute says (v0.1.4)', assert => {
        const el = mount()
        const panel = el.shadowRoot.querySelector('.panel')
        assert.ok(panel, 'the panel exists in the shadow root')
        assert.true(panel.hidden, 'the hidden attribute is set — which by itself proves nothing')
        assert.strictEqual(getComputedStyle(panel).display, 'none',
            'and the browser genuinely paints nothing (v0.1.1-v0.1.3: display:grid beat [hidden])')
        assert.false(paints(el), 'no box on screen')
    })

    QUnit.test('the caret opens it and every exit closes it — measured, not asserted from state (v0.1.4)', assert => {
        const el = mount()
        const trigger = el.shadowRoot.querySelector('.trigger')

        trigger.click()
        assert.true(paints(el), 'clicking the caret paints the panel')
        assert.strictEqual(trigger.getAttribute('aria-expanded'), 'true')

        trigger.click()
        assert.false(paints(el), 'clicking the caret again stops painting it')

        trigger.click()
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        assert.false(paints(el), 'Escape closes it')

        trigger.click()
        document.body.click()
        assert.false(paints(el), 'a click away closes it')
    })

    QUnit.test('the way home shows only when you are away from home (v0.1.4)', assert => {
        const away = mount()
        assert.ok(away.shadowRoot.querySelector('.home'),
            'in pt-BR the EN-GB escape button is present')
        window.__waI18n.getLocale = () => 'en-gb'
        const home = mount()
        assert.strictEqual(home.shadowRoot.querySelector('.home'), null,
            'in en-GB there is nothing to escape from, so no second button')
    })
})


/* ── the text-to-speech tool (issue 064): the same code a human clicks and an
      agent drives, exercised with no key, no network and no spend ────────── */
QUnit.module('tools/text-to-speech — speak(), the page, and the agent seam', hooks => {
    const POST = { slug: 'a-post', title: 'The menu no longer vanishes — on a phone',
                   date: '2026-08-10', date_label: '10 August', summary: 'It used to disappear entirely.' }
    const KEY = 'sg-openrouter-mgmt-key'
    let savedKey, calls

    hooks.beforeEach(() => {
        savedKey = localStorage.getItem(KEY)
        localStorage.removeItem(KEY)
        calls = []
        // The two seams. `synthesizeOpenRouter` itself takes a `fetchImpl` for
        // exactly this reason — these are the same idea one level up, so the
        // whole flow runs without a key, a request, or a penny of spend.
        window.__ttsSynthesize = async (text, opts) => {
            calls.push({ text, opts })
            return { blob: new Blob([new Uint8Array(64).fill(7)], { type: 'audio/wav' }),
                     durationMs: 4200, generationId: 'gen-test-1' }
        }
        window.__ttsLookupCost = async () => 0.0012
    })
    hooks.afterEach(() => {
        delete window.__ttsSynthesize
        delete window.__ttsLookupCost
        if (savedKey == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, savedKey)
    })

    /* The fixture stands in for the tool page. wirePage takes any object with
       getElementById, so the test drives the REAL page logic — not a copy. */
    const fixture = () => {
        const c = document.createElement('div')
        c.innerHTML = `<textarea id="text"></textarea><select id="prefill" hidden></select>
            <select id="voice"></select><input id="name" value="speech"><input id="key">
            <button id="go"></button><p id="status"></p>
            <div id="out" hidden><audio id="audio"></audio><a id="dl"></a><p id="meta"></p></div>`
        document.getElementById('qunit-fixture').appendChild(c)
        return { getElementById: (id) => c.querySelector('#' + CSS.escape(id)) }
    }
    const feedUrl = (posts) =>
        URL.createObjectURL(new Blob([JSON.stringify({ posts })], { type: 'application/json' }))

    QUnit.test('the news script is a read, not the post pasted in', assert => {
        const s = newsScript(POST)
        assert.true(s.startsWith('Here is the latest from VoiceDebrief.'), 'it opens with a lead-in')
        assert.true(s.includes('The menu no longer vanishes, on a phone.'), 'the em dash becomes a spoken pause')
        assert.true(s.includes('It used to disappear entirely.'), 'the story follows')
        assert.strictEqual(newsScript(null), '', 'no post, no script')
    })

    QUnit.test('speak() returns base64 audio and the cost it actually cost', async assert => {
        const done = new Promise(r => window.addEventListener('tts:done', r, { once: true }))
        const r = await speak({ text: 'Read this out.', voice: 'echo', apiKey: 'sk-or-v1-test' })

        assert.strictEqual(calls[0].opts.voice, 'echo', 'the chosen voice is passed through')
        assert.strictEqual(calls[0].opts.apiKey, 'sk-or-v1-test', 'as is the key given to the call')
        assert.strictEqual(r.bytes, 64, 'the byte count is the audio, not the base64')
        assert.strictEqual(atob(r.base64).length, 64, 'and the base64 decodes back to it')
        assert.strictEqual(r.costUsd, 0.0012, 'the cost is read back, never guessed')
        assert.strictEqual(r.generationId, 'gen-test-1')

        const ev = await done
        assert.strictEqual(ev.detail.generationId, 'gen-test-1', 'tts:done carries the result')
        assert.strictEqual(ev.detail.base64, undefined, 'but not a megabyte of audio in an event')
    })

    QUnit.test('it refuses honestly instead of making a doomed call', async assert => {
        const refuses = async (params, code) => {
            try { await speak(params); assert.true(false, `${code} should have thrown`) }
            catch (e) { assert.strictEqual(e.code, code, `${code}: ${e.message}`) }
        }
        await refuses({ text: '   ', apiKey: 'sk-or-v1-test' }, 'no-text')
        await refuses({ text: 'hello' }, 'no-key')                       // nothing stored, none passed
        await refuses({ text: 'hello', apiKey: 'k', voice: 'brian' }, 'bad-voice')
        assert.deepEqual(calls, [], 'not one request was attempted')
        assert.true(VOICES.includes('onyx'), 'and the voices it does accept are named')
    })

    QUnit.test('the page: a published update in, a playable download out', async assert => {
        const root = fixture()
        const page = wirePage({ root, postsUrl: feedUrl([POST]) })
        await page.feed

        const prefill = root.getElementById('prefill')
        assert.false(prefill.hidden, 'the feed offers the published posts as starting scripts')
        prefill.value = '0'
        prefill.dispatchEvent(new Event('change'))
        assert.true(root.getElementById('text').value.includes('It used to disappear entirely.'),
            'choosing one fills the textarea with the news read')
        assert.strictEqual(root.getElementById('name').value, 'a-post', 'and names the file after the post')

        root.getElementById('key').value = 'sk-or-v1-test'
        root.getElementById('voice').value = 'nova'
        await page.generate()

        assert.strictEqual(calls[0].opts.voice, 'nova', 'the voice picked in the page is the one used')
        assert.false(root.getElementById('out').hidden, 'the player is revealed')
        assert.true(root.getElementById('audio').src.startsWith('blob:'),
            'the audio plays from bytes held in the tab, with no upload anywhere')
        assert.strictEqual(root.getElementById('dl').download, 'a-post__nova.wav', 'the download is named')
        assert.true(root.getElementById('meta').textContent.includes('$0.0012'), 'the real cost is shown')
    })

    QUnit.test('the page says why rather than failing quietly', async assert => {
        const root = fixture()
        const page = wirePage({ root, postsUrl: feedUrl([]) })
        root.getElementById('text').value = 'Read this out.'
        root.getElementById('key').value = ''
        await page.generate()
        assert.deepEqual(calls, [], 'nothing is sent without a key')
        assert.true(/key/i.test(root.getElementById('status').textContent), 'and the page says so')
        assert.true(root.getElementById('status').classList.contains('err'), 'as an error, not a shrug')
    })

    QUnit.test('base64 survives audio bigger than one chunk', assert => {
        // The encoder walks the array in 32k slices; a real read is megabytes,
        // so the seam between slices is the part worth proving.
        const bytes = new Uint8Array(70000).map((_, i) => i % 251)
        const back = Uint8Array.from(atob(bytesToBase64(bytes)), c => c.charCodeAt(0))
        assert.strictEqual(back.length, bytes.length, 'nothing is lost across the chunk boundary')
        assert.deepEqual([...back.slice(32760, 32780)], [...bytes.slice(32760, 32780)], 'and nothing is reordered')
    })
})

QUnit.start()   // autostart is off — see index.html
