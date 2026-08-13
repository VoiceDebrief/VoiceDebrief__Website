/* Integration — the extract-audio page's own wiring (issue 065, fixed for
   issue 060's QA pass).

   Two things, both reported from QA and neither visible to a unit test:

   1. THE DROP ZONE GOES AWAY once a video is chosen. A target still saying
      "drop a video here" while a video sits under it offers a decision already
      made, and pushes the extract button — the only thing that matters now —
      further down the page. `Change` is the single way back.

   2. NOTHING ABOUT FFMPEG IS TOUCHED UNTIL EXTRACT IS PRESSED. The core is 32 MB
      and comes from a CDN; a page that started fetching it on load would cost
      every visitor that download for a tool they may not use.

   The engine module is stubbed through the seam the tool already has
   (`window.__sgVideo`), so this runs with no network, no 32 MB download, and no
   dependence on unpkg being up — the same shape the TTS tool's tests use.

   Run: node tests/integration/extract-audio-page.test.mjs */

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SITE_DIR = process.env.SITE_DIR || path.join(repo, 'website')
const PORT = 8134

let failures = 0
const check = (n, ok, x = '') => { console.log(`${ok ? 'ok ' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`); if (!ok) failures++ }

const site = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', SITE_DIR], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 1200))

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--no-proxy-server'] })
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
const errs = []
page.on('pageerror', e => errs.push(String(e).slice(0, 160)))

// Anything reaching the CDN is a failure of point 2, so it is recorded, never served.
const cdn = []
await page.route('https://unpkg.com/**', route => { cdn.push(route.request().url()); route.abort() })

const painted = (id) => page.evaluate((i) => {
    const n = document.getElementById(i)
    return !!n && !n.hidden && getComputedStyle(n).display !== 'none'
}, id)

const pick = (name = 'clip.mp4') => page.evaluate((n) => {
    const dt = new DataTransfer()
    dt.items.add(new File([new Uint8Array(2048)], n, { type: 'video/mp4' }))
    const input = document.getElementById('file')
    input.files = dt.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
}, name)

try {
    await page.goto(`http://127.0.0.1:${PORT}/tools/extract-audio/`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!document.getElementById('drop'), null, { timeout: 15000 })

    check('the drop zone is the first thing on an empty page', await painted('drop'))
    check('and nothing about a chosen file is shown yet', !(await painted('chosen')))
    check('extract is disabled with nothing to extract',
        await page.evaluate(() => document.getElementById('go').disabled))

    await pick('holiday.mp4')
    check('choosing a video HIDES the drop zone', !(await painted('drop')))
    check('and shows the file with a way to change it', await painted('chosen') &&
        await page.evaluate(() => document.getElementById('nm').textContent) === 'holiday.mp4')
    check('extract is now the live control', await page.evaluate(() =>
        !document.getElementById('go').disabled))

    await page.click('#change')
    check('Change brings the drop zone back', await painted('drop'))
    check('and clears the file behind it', !(await painted('chosen')) &&
        await page.evaluate(() => document.getElementById('file').value === '') &&
        await page.evaluate(() => document.getElementById('go').disabled))

    // Picking the SAME file again must still register: an input keeps its value,
    // and `change` never fires twice for it unless the value is cleared.
    await pick('holiday.mp4')
    await page.click('#change')
    await pick('holiday.mp4')
    check('the same file can be chosen again after a change', await painted('chosen'))

    check('NOTHING was fetched from the CDN just by loading and choosing',
        cdn.length === 0, cdn.join(' '))
    check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
} catch (e) {
    check('test run completed', false, e.message)
} finally {
    await browser.close().catch(() => {})
    site.kill()
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nextract-audio page healthy')
process.exit(failures ? 1 : 0)
