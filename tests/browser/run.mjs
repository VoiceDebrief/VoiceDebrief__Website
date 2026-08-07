/* Headless driver for the browser unit tests (issue 049): serves website/ (the
   page ships with the site at /tests/browser/ and imports app modules by
   site-relative path), opens it in Chromium and reports each QUnit test as an
   ok/FAIL line — same voice as every other suite. The visual experience is the
   very same page on the deployed site or a local server; this is only CI's way
   of watching it.

   Environment: CHROMIUM_PATH as the integration tests.
   Run: node tests/browser/run.mjs */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const site_dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../website')
const PORT = 8131

const site = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', site_dir], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 1200))

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] })
const page = await browser.newPage()
const errs = []
page.on('pageerror', e => errs.push(String(e).slice(0, 180)))

let failures = 0
try {
    await page.goto(`http://127.0.0.1:${PORT}/tests/browser/`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__qunit?.done, null, { timeout: 60000 })
    const { tests, done } = await page.evaluate(() => window.__qunit)
    for (const t of tests) {
        const ok = t.failed === 0
        if (!ok) failures++
        console.log(`${ok ? 'ok ' : 'FAIL'}  ${t.module} › ${t.name}  (${t.total - t.failed}/${t.total} assertions)`)
    }
    if (done.failed > 0 || errs.length) failures = failures || 1
    if (errs.length) console.log('page errors:', errs.slice(0, 4).join(' | '))
} catch (e) {
    failures++
    console.log('FAIL  browser test run —', e.message)
} finally {
    await browser.close().catch(() => {})
    site.kill()
}

console.log(failures ? `\n${failures} browser test(s) FAILED` : '\nbrowser units healthy')
process.exit(failures ? 1 : 0)
