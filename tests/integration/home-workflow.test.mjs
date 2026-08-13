/* Integration — the workflow on the HOME page (issue 060, M3).

   The original brief asked for the main workflow to be available directly from
   the home page. The risk in granting that is a second implementation: a panel
   that looks like the product and drifts from it. So this asserts the two things
   that make the home panel trustworthy, and one thing that makes it honest.

   1. IT IS THE SAME PASS. The home page boots the app's own engine and pipeline
      and runs the declared workflow — same events, same trace, same executors.
      If the two ever diverge, the trace assertions here stop matching.
   2. NO KEY IS ASKED FOR BEFORE RUN. The design's first rule, and the one most
      likely to be quietly traded away for a signup metric later. Asserted on the
      panel's STATE and on what is actually painted, not on an attribute.
   3. THE ROUTING STATEMENT IS ON SCREEN, in every pre-result state, welded to
      the panel, and not styled as a warning. Also asserted by measurement: it is
      inside the panel's bounding box and above the fold at 1100x1000.

   No key is set for the keyless part, and every request to OpenRouter is ABORTED
   rather than mocked — so if the home panel ever reached the network without a
   key, this breaks instead of quietly costing somebody money.

   The LAST section is different on purpose: it runs a real pass against the
   scripted OpenRouter the screenshot suite uses, because the infographic is the
   one artefact that cannot be proved any other way. It shipped broken — the
   mount handed to the renderer was a detached node, so the custom element inside
   it never upgraded, never connected and never made a request, and the step sat
   at "running" for 86 seconds with nothing behind it (Dinis, from QA). Nothing
   short of drawing one catches that.

   Run: node tests/integration/home-workflow.test.mjs */

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { installMockOpenRouter, MOCK_SVG } from '../qa-to-docs/mock-openrouter.mjs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SITE_DIR = process.env.SITE_DIR || path.join(repo, 'website')
const TOOLS_ORIGIN = process.env.TOOLS_ORIGIN || 'https://dev.tools.sgraph.ai'
const MIRROR_DIR = process.env.MIRROR_DIR || ''
const PORT = 8133

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

const openrouterCalls = []
await page.route('https://openrouter.ai/**', route => {
    openrouterCalls.push(route.request().url())
    route.abort()
})

const panelState = () => page.evaluate(() => document.querySelector('vd-workflow').state)
const painted = (sel) => page.evaluate((s) => {
    const n = document.querySelector('vd-workflow').shadowRoot.querySelector(s)
    return !!n && getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().height > 0
}, sel)

try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelector('vd-workflow')?.shadowRoot?.querySelector('.panel'),
        null, { timeout: 20000 })

    // ── 1. the first screen, before any engine has answered ──────────────
    check('the panel renders without waiting on the engine origin', await painted('.panel'))
    check('it starts empty', await panelState() === 'empty')
    check('no key field is anywhere on the page', !(await painted('[data-el=key]')))

    /* The routing statement, measured rather than asserted from markup: inside
       the panel's box (welded, not a separate section), and on screen without
       scrolling. This is the claim the design says must never be traded away. */
    const routing = await page.evaluate(() => {
        const el = document.querySelector('vd-workflow')
        const sr = el.shadowRoot
        const h = sr.querySelector('.honesty')
        if (!h) return null
        const hb = h.getBoundingClientRect(), pb = sr.querySelector('.panel').getBoundingClientRect()
        const cs = getComputedStyle(h)
        return {
            text: h.textContent.replace(/\s+/g, ' ').trim(),
            insidePanel: hb.top >= pb.top - 1 && hb.bottom <= pb.bottom + 1,
            aboveFold: hb.top < window.innerHeight,
            fontPx: parseFloat(getComputedStyle(h.querySelector('p')).fontSize),
            bg: cs.backgroundColor,
            amber: getComputedStyle(document.documentElement).getPropertyValue('--vd-wb').trim(),
        }
    })
    check('the routing statement names OpenRouter and says we cannot control the provider',
        /OpenRouter/.test(routing.text) && /no control over what they do/.test(routing.text))
    check('it is welded INSIDE the panel, not a section elsewhere', routing.insidePanel)
    check('it is on screen without scrolling', routing.aboveFold)
    check('it is at body size, not caption size', routing.fontPx >= 14, `${routing.fontPx}px`)
    // Not styled as a warning: the caveat's amber is the only place that pair is
    // used, and this block must not borrow it.
    check('it is NOT styled as a warning', !routing.bg.includes(routing.amber.replace('#', '')),
        `${routing.bg} vs caveat ${routing.amber}`)

    await page.waitForFunction(() => !!window.__tool, null, { timeout: 30000 })
    await page.evaluate(() => localStorage.removeItem('sg-openrouter-mgmt-key'))

    // ── 2. load a recording, read the price, still no key ────────────────
    await page.evaluate(() => document.querySelector('vd-workflow')
        .dispatchEvent(new CustomEvent('vd:sample', { bubbles: true, composed: true })))
    await page.waitForFunction(() => document.querySelector('vd-workflow').state === 'ready', null, { timeout: 20000 })
    check('a sample loads straight into ready', await panelState() === 'ready')

    const quoted = await page.waitForFunction(() => {
        const t = document.querySelector('vd-workflow').shadowRoot.querySelector('.quote')?.textContent
        return t && /£/.test(t) ? t : null
    }, null, { timeout: 20000 }).then(h => h.jsonValue()).catch(() => '')
    check('the maximum is quoted before anything runs', /Maximum for this recording/.test(quoted), quoted)
    check('and STILL no key has been asked for', !(await painted('[data-el=key]')))

    // ── 3. run → the key is requested, and nothing starts ────────────────
    await page.evaluate(() => document.querySelector('vd-workflow').shadowRoot
        .querySelector('[data-act=run]').click())
    await page.waitForFunction(() => document.querySelector('vd-workflow').state === 'key', null, { timeout: 10000 })
    check('pressing run asks for the key', await panelState() === 'key')
    check('the key field is now painted', await painted('[data-el=key]'))
    check('save is disabled until the field looks like a key', await page.evaluate(() =>
        document.querySelector('vd-workflow').shadowRoot.querySelector('[data-el=save]').disabled))
    check('the key panel links the guide', await page.evaluate(() =>
        !!document.querySelector('vd-workflow').shadowRoot.querySelector('a[href="/openrouter-key/"]')))
    check('NOTHING was sent to OpenRouter', openrouterCalls.length === 0, openrouterCalls.join(' '))

    /* ── 4. the demo path, driven through the BUTTON a person presses ────
       Not runPass({demo:true}) directly: the stamp that stops a scripted result
       being mistaken for the reader's own recording is applied by the page
       module on that path, so calling the API behind it would test everything
       except the thing most worth testing. */
    await page.evaluate(() => document.querySelector('vd-workflow').reset())
    const trace = page.evaluate(() => new Promise(res => {
        window.addEventListener('wa:pass:complete', async () => {
            const r = window.__tool.getResults()
            res({ steps: [], summary: (r.summary || '').slice(0, 20) })
        }, { once: true })
    }))
    await page.evaluate(() => document.querySelector('vd-workflow').shadowRoot
        .querySelector('[data-act=demo]').click())
    await page.waitForFunction(() => document.querySelector('vd-workflow').state === 'results',
        null, { timeout: 30000 })
    await trace
    const demo = await page.evaluate(() => {
        const sr = document.querySelector('vd-workflow').shadowRoot
        return { stamp: sr.querySelector('.demo')?.textContent.replace(/\s+/g, ' ').trim() || '',
                 steps: [], demo: true, spent: 0,
                 rendered: sr.querySelector('[data-pane=debrief]')?.innerHTML || '' }
    })
    /* THE BUG THIS FILE EXISTS FOR NOW (Dinis, from QA, with a screenshot):
       "Translating…" sat spinning while "Writing the debrief" had already
       ticked. The panel kept its own step list and advanced it by guessing, and
       a guess cannot see a SKIPPED step — translate is skipped whenever the
       recording is already in the reader's language, and emits no completion
       event to guess from. Asserted on what the row actually SAYS, because a
       reader cannot see a data attribute. */
    const rows = await page.evaluate(() => [...document.querySelector('vd-workflow')
        .shadowRoot.querySelectorAll('.steps li')].map(li => ({
            status: li.dataset.status,
            text: li.textContent.replace(/\s+/g, ' ').trim(),
        })))
    check('every declared step is listed, with the status the RUN gave it',
        rows.length >= 5 && rows.every(r => r.status), rows.map(r => `${r.status}`).join(' '))
    check('no step is left looking like it is still running when the pass is over',
        rows.every(r => r.status !== 'running'), rows.filter(r => r.status === 'running').map(r => r.text).join(' | '))
    const skipped = rows.filter(r => r.status === 'skipped')
    check('a skipped step SAYS it was skipped, rather than spinning', skipped.length >= 1 &&
        skipped.every(r => /not needed/.test(r.text)), skipped.map(r => r.text).join(' | '))

    check('a scripted result is STAMPED, at the top, above the artefacts',
        /DEMO/.test(demo.stamp) && /not a real recording/.test(demo.stamp), demo.stamp.slice(0, 60))
    check('the debrief is rendered markdown, not markdown source',
        demo.rendered.includes('<strong>') && !demo.rendered.includes('**'),
        demo.rendered.slice(0, 70))

    const traced = await page.evaluate(async () => {
        const r = await window.__tool.runPass({ demo: true, infographic: false, translate: false })
        return { steps: (r.trace?.steps || []).map(s => `${s.id}:${s.status}`),
                 demo: r.trace?.demo, spent: r.trace?.spentUsd }
    })
    Object.assign(demo, traced)
    check('the home page runs the REAL declared path', demo.steps.includes('transcribe:done') &&
        demo.steps.includes('classify:done'), demo.steps.join(' '))
    check('the trace is marked as a demo and spends nothing', demo.demo === true && demo.spent === 0)
    check('still nothing sent to OpenRouter', openrouterCalls.length === 0, openrouterCalls.join(' '))
    check('and no key was ever created', await page.evaluate(() =>
        !localStorage.getItem('sg-openrouter-mgmt-key')))

    // ── 5. results replace the routing statement with the caveat ─────────
    await page.evaluate(() => document.querySelector('vd-workflow').showResults({
        summary: 'Key points\n- one', transcript: 'the words that were said', costText: '£0.003' }))
    check('results state reached', await panelState() === 'results')
    check('the caveat appears WITH the transcript', await painted('.caveat'))
    check('and the routing statement steps aside for it', !(await painted('.honesty')))
    const caveat = await page.evaluate(() => document.querySelector('vd-workflow')
        .shadowRoot.querySelector('.caveat').textContent.replace(/\s+/g, ' ').trim())
    check('the caveat says the model can invent, not just err',
        /mishear/.test(caveat) && /add words nobody said/.test(caveat))

    /* A running pass must be leaveable, and what it already produced must not be
       thrown away when it is. This was the other half of "the UX is just stuck". */
    await page.evaluate(() => {
        const el = document.querySelector('vd-workflow')
        el.reset()
        el.startRun([{ id: 'ingest', label: 'Reading' }, { id: 'transcribe', label: 'Transcribing' }])
        el.artefact('transcript', 'words that were already transcribed')
    })
    check('a pass in flight offers a way to stop it', await painted('[data-act=stop]'))
    check('an artefact is readable WHILE the pass is still running',
        await page.evaluate(() => /already transcribed/.test(
            document.querySelector('vd-workflow').shadowRoot.querySelector('[data-pane=transcript]')?.textContent || '')))
    check('and the caveat is already with it, mid-run', await painted('.caveat'))

    const stopped = page.evaluate(() => new Promise(r =>
        document.querySelector('vd-workflow').addEventListener('vd:stop', () => r(true), { once: true })))
    await page.evaluate(() => document.querySelector('vd-workflow').shadowRoot
        .querySelector('[data-act=stop]').click())
    check('stopping emits the event the page acts on', await stopped)

    await page.evaluate(() => document.querySelector('vd-workflow').showError({
        title: 'Stopped.', body: 'x', actions: [{ label: 'Run it again', event: 'retry', primary: true }] }))
    check('after a stop, what was finished is still on screen',
        await page.evaluate(() => /already transcribed/.test(
            document.querySelector('vd-workflow').shadowRoot.querySelector('[data-pane=transcript]')?.textContent || '')))
    check('and there is a way forward from it', await painted('[data-act=retry]'))

    /* ── 6. an infographic, actually drawn ───────────────────────────────
       A second page, with the scripted OpenRouter installed and a key set, so
       the pass reaches the infographic step for real. */
    const p2 = await browser.newPage({ viewport: { width: 1100, height: 1000 } })
    const p2errs = []
    p2.on('pageerror', e => p2errs.push(String(e).slice(0, 180)))
    if (MIRROR_DIR) {
        await p2.route(TOOLS_ORIGIN + '/**', route => {
            const u = new URL(route.request().url())
            try { route.fulfill({ body: readFileSync(path.join(MIRROR_DIR, u.pathname)), contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' } }) }
            catch { route.fulfill({ status: 404, body: 'not mirrored' }) }
        })
    }
    await installMockOpenRouter(p2)
    await p2.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' })
    await p2.waitForFunction(() => !!window.__tool, null, { timeout: 30000 })
    await p2.evaluate(async () => {
        localStorage.setItem('sg-openrouter-mgmt-key', 'sk-or-v1-mock-home')
        await window.__tool.setApiKey({ apiKey: 'sk-or-v1-mock-home' })
    })

    // The mount must be a CONNECTED node or the renderer's custom element never
    // upgrades. Asserted directly, because this is the bug.
    check('the infographic mount is in the document, not detached', await p2.evaluate(() => {
        const m = document.getElementById('infographic-mount')
        return !!m && m.isConnected && m.getRootNode() === document
    }))

    await p2.evaluate(() => document.querySelector('vd-workflow')
        .dispatchEvent(new CustomEvent('vd:sample', { bubbles: true, composed: true })))
    await p2.waitForFunction(() => document.querySelector('vd-workflow').state === 'ready', null, { timeout: 20000 })
    await p2.evaluate(() => document.querySelector('vd-workflow').shadowRoot.querySelector('[data-act=run]').click())

    // The tab exists WHILE it draws — that is the difference between a slow step
    // and one that looks broken.
    const tabEarly = await p2.waitForFunction(() => {
        const sr = document.querySelector('vd-workflow').shadowRoot
        return sr.querySelector('[data-tab=infographic]') ? true : null
    }, null, { timeout: 30000 }).then(() => true).catch(() => false)
    check('the Infographic tab is there while it is still drawing', tabEarly)

    await p2.waitForFunction(() => ['results', 'error'].includes(document.querySelector('vd-workflow').state),
        null, { timeout: 90000 }).catch(() => {})
    check('the pass finishes rather than sitting at running', await p2.evaluate(() =>
        document.querySelector('vd-workflow').state) === 'results')

    /* THE DRAWING PATH ITSELF. The product's default is an image model, which the
       scripted OpenRouter cannot produce — so this redraws with the drawn-SVG
       model, exactly as the screenshot suite does for the same reason. What is
       being proved is the thing that was broken: that the renderer, given this
       page's mount, connects and produces. With the old detached mount it never
       returned at all. */
    const redrawn = await p2.evaluate(async () => {
        try { await window.__tool.redrawInfographic({ model: 'google/gemini-3.5-flash' }); return 'ok' }
        catch (e) { return String(e?.message || e).slice(0, 120) }
    })
    check('redrawing returns instead of hanging', redrawn === 'ok', redrawn)
    const drew = await p2.evaluate(async () => {
        const m = document.getElementById('infographic-mount')
        // Awaited: a registered action returns a promise even when declared
        // sync, so reading .svg off the call itself is always undefined.
        const r = (await window.__tool.getResults()) || {}
        // The drawn SVG lives inside the renderer's own shadow root, so the DOM
        // probe is for the renderer having CONNECTED at all — the thing a
        // detached mount prevented. The artefact itself is the returned string.
        return { mounted: m.children.length > 0,
                 renderer: !!m.querySelector('sg-llm-infographic, sg-llm-request'),
                 svgLen: (r.svg || '').length, isSvg: /^<svg|<svg /.test(r.svg || '') }
    })
    check('the renderer connected inside the page\'s mount', drew.mounted && drew.renderer,
        JSON.stringify(drew))
    check('an infographic is actually produced', drew.svgLen > 50 && drew.isSvg,
        `${drew.svgLen} chars`)
    const shown = await p2.evaluate(() => {
        const sr = document.querySelector('vd-workflow').shadowRoot
        sr.querySelector('[data-tab=infographic]')?.click()
        const pane = sr.querySelector('[data-pane=infographic]')
        const slot = pane?.querySelector('slot[name=infographic]')
        return { paneVisible: pane && !pane.hidden,
                 slotted: (slot?.assignedElements() || []).length > 0,
                 mountHasContent: (document.getElementById('infographic-mount')?.children.length || 0) > 0 }
    })
    check('and it is reachable as a tab, through the slot',
        shown.paneVisible && shown.slotted && shown.mountHasContent, JSON.stringify(shown))
    check('no page errors on the drawing run', p2errs.length === 0, p2errs.slice(0, 3).join(' | '))
    await p2.close()

    check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
} catch (e) {
    check('test run completed', false, e.message)
} finally {
    await browser.close().catch(() => {})
    site.kill()
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nhome workflow healthy')
process.exit(failures ? 1 : 0)
