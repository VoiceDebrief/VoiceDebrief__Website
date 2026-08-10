/* Design prototypes: do they actually RUN? (issues 050 + 052)

   The four .dc.html files under website/design/ are byte-identical to the
   designer's hand-off and depend on website/design/support.js — the small
   runtime that implements the contract they were written against. That makes
   this the gate on the runtime: if support.js breaks, the A/B pages become a
   blank screen, and nobody notices until someone opens one to give an opinion.

   Each theme is driven through a REAL demo pass (click → fixture stream →
   transcript on screen), which exercises the whole contract at once: event
   binding, setState re-render, sc-if branch switching, and the tool adapter.

   Environment: CHROMIUM_PATH as the other Playwright suites.
   Run: node tests/design/render-check.mjs */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const site_dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../website')
const PORT = 8137

const site = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', site_dir], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 1200))

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] })
let failures = 0
const check = (n, ok, x = '') => { console.log(`${ok ? 'ok ' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`); if (!ok) failures++ }

const open = async (file) => {
    const page = await browser.newPage({ viewport: { width: 1180, height: 950 } })
    const errs = []
    page.on('pageerror', e => errs.push(String(e).slice(0, 160)))
    await page.goto(`http://127.0.0.1:${PORT}/design/${file}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)
    return { page, errs }
}

/* The three themes: render, then run the free demo end to end. */
for (const [file, marker] of [['studio.html', 'A voice note, in writing'],
                              ['console.html', 'PIPELINE'],
                              ['card.html', 'Get words back']]) {
    const { page, errs } = await open(file)
    const body = () => page.evaluate(() => document.body.innerText)
    check(`${file}: renders`, (await body()).includes(marker), `expected "${marker}"`)
    check(`${file}: no page errors on load`, errs.length === 0, errs[0] || '')

    const demo = page.locator('button', { hasText: /demo/i }).first()
    await demo.click()
    // The fixture streams the transcript in; wait for words to arrive on screen.
    await page.waitForFunction(() => document.body.innerText.includes('Nakamura'), null, { timeout: 20000 })
        .then(() => check(`${file}: the demo pass streams a transcript`, true))
        .catch(() => check(`${file}: the demo pass streams a transcript`, false, 'no transcript after 20s'))
    check(`${file}: no page errors during the pass`, errs.length === 0, errs[0] || '')
    await page.close()
}

/* Every variant carries the way back to the hub. It is injected by the runtime
   (the .dc.html files stay byte-identical), so this is the only thing checking
   it exists — and it lives in a shadow root, hence the piercing selectors. */
for (const file of ['studio.html', 'console.html', 'card.html', 'cultures.html']) {
    const { page } = await open(file)
    const back = await page.evaluate(() => {
        const host = document.querySelector('[data-dc-banner]')
        const a = host && host.shadowRoot.querySelector('a.back')
        return a ? { text: a.textContent, href: a.getAttribute('href'),
                     first: document.body.firstElementChild === host } : null
    })
    check(`${file}: has the back-to-hub banner`, !!back && /all design candidates/i.test(back.text))
    check(`${file}: the banner is the first thing on the page`, !!back && back.first)
    check(`${file}: the back link points at the hub`, !!back && back.href === './')
    await page.close()
}

/* The culture pack: four locales, switchable, with the hash preset honoured. */
{
    const { page, errs } = await open('cultures.html')
    const body = () => page.evaluate(() => document.body.innerText)
    const text = await body()
    check('cultures.html: renders all four locale names', ['English (UK)', 'English (US)', 'Português (Portugal)', 'Português (Brasil)']
        .every(n => text.includes(n)))
    check('cultures.html: no flags anywhere (the recorded rule)', !/[\u{1F1E6}-\u{1F1FF}]/u.test(text))
    await page.locator('text=Português (Brasil)').first().click()
    await page.waitForTimeout(400)
    check('cultures.html: switching to pt-BR re-words the page', (await body()).toLowerCase().includes('arquivo'),
        'expected Brazilian vocabulary ("arquivo")')
    check('cultures.html: no page errors', errs.length === 0, errs[0] || '')
    await page.close()
}
{
    const { page, errs } = await open('cultures.html#code=pt-pt')
    const text = await page.evaluate(() => document.body.innerText)
    check('cultures.html#code=pt-pt: the hash preset starts in pt-PT', text.toLowerCase().includes('ficheiro'),
        'expected European Portuguese vocabulary ("ficheiro")')
    check('cultures.html#code=pt-pt: no page errors', errs.length === 0, errs[0] || '')
    await page.close()
}
{
    const { page } = await open('cultures.html#view=diff')
    const text = await page.evaluate(() => document.body.innerText)
    // The hub's "compare all four" link points here; the view key is `diff`, not
    // `compare` — a wrong preset would silently show the normal app instead.
    check('cultures.html#view=diff: opens the comparison matrix', /accent colour|vocabulary/i.test(text))
    await page.close()
}

/* The hub, and every link on it — including the designer's own cross-links,
   which use the ORIGINAL hand-off filenames and resolve through stubs. */
{
    const { page, errs } = await open('index.html')
    const text = await page.evaluate(() => document.body.innerText)
    check('index.html: the A/B hub renders', text.includes('Seven versions of the same tool'))
    check('index.html: no page errors', errs.length === 0, errs[0] || '')

    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a')]
        .map(a => a.getAttribute('href')).filter(h => h && !h.startsWith('http') && !h.startsWith('#')))
    for (const href of [...new Set(hrefs)]) {
        const url = href.startsWith('/') ? href : '/design/' + href
        const r = await page.request.get(`http://127.0.0.1:${PORT}${url.split('#')[0]}`)
        check(`index.html link resolves: ${href}`, r.ok(), `status ${r.status()}`)
    }
    await page.close()
}
for (const stub of ['Theme 1 - Studio.dc.html', 'Theme 2 - Console.dc.html', 'Theme 3 - Card.dc.html']) {
    const { page } = await open(encodeURIComponent(stub))
    await page.waitForTimeout(500)   // the stub is a meta-refresh
    const url = page.url()
    check(`cross-link stub redirects: ${stub}`, /\/(studio|console|card)\.html$/.test(url), url)
    await page.close()
}

await browser.close()
site.kill()
console.log(failures ? `\n${failures} check(s) FAILED` : '\ndesign prototypes healthy')
process.exit(failures ? 1 : 0)
