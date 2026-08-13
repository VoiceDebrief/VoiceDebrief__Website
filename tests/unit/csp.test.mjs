/* A page that ships a strict CSP must not also ship an inline <script>
   (issue 060).

   This is a failure with no symptom in the code and a loud one in the console:
   the script simply does not run, and the only place it says so is a browser
   the author may not have open. It shipped — the home page carried a version
   stamp as an inline <script> long before M3 gave that page a CSP, and the
   moment it did, the stamp went dead with nothing failing anywhere a test could
   see it (Dinis, from QA: "that script source happens on page load").

   The fix was to move the script into a module. The alternative — adding
   'unsafe-inline' so a version number could be printed — would have traded the
   policy for a convenience, which is how a CSP becomes decoration.

   Checked for real pages only. A <script type="application/ld+json"> is data,
   not script, and is not executed. */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const pages = []
const walk = (dir) => {
    for (const e of readdirSync(path.join(repo, dir), { withFileTypes: true })) {
        const p = `${dir}/${e.name}`
        if (e.isDirectory()) { if (!/\/(components|vendor)$/.test(p)) walk(p) }
        else if (e.name.endsWith('.html')) pages.push(p)
    }
}
walk('website')

const cspOf = (html) => {
    const m = /Content-Security-Policy"[^>]*content="([^"]+)"/.exec(html)
    if (!m) return null
    const directives = Object.fromEntries(m[1].split(';').map(d => {
        const [name, ...rest] = d.trim().split(/\s+/)
        return [name, rest]
    }))
    return directives
}

test('no page with a strict CSP carries an inline script', () => {
    const problems = []
    for (const page of pages) {
        const html = readFileSync(path.join(repo, page), 'utf8')
        const csp = cspOf(html)
        if (!csp) continue
        const src = csp['script-src'] || csp['default-src'] || []
        if (src.includes("'unsafe-inline'")) continue
        for (const m of html.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
            if (/application\/ld\+json/.test(m[1])) continue     // data, never executed
            if (!m[2].trim()) continue
            problems.push(`${page}: ${m[2].trim().slice(0, 70).replace(/\s+/g, ' ')}`)
        }
    }
    assert.deepEqual(problems, [],
        'these inline scripts are blocked by their own page\'s CSP — move them into a module')
})

test('every page that runs a pass pins where code and data may go', () => {
    // The home page grew a workflow in M3 and needed the workbench's policy with
    // it. A page that reaches OpenRouter without saying so in a CSP is the gap
    // issue 037 closed for /app/, and it reopened the moment a second page could
    // make the same calls.
    for (const page of ['website/index.html', 'website/app/index.html']) {
        const csp = cspOf(readFileSync(path.join(repo, page), 'utf8'))
        assert.ok(csp, `${page} ships no Content-Security-Policy`)
        assert.ok((csp['connect-src'] || []).some(s => s.includes('openrouter.ai')),
            `${page} calls OpenRouter but its connect-src does not name it`)
        assert.equal((csp['object-src'] || []).includes("'none'"), true, `${page}: object-src 'none'`)
        assert.equal((csp['base-uri'] || []).includes("'self'"), true, `${page}: base-uri 'self'`)
    }
})


/* A blob worker inherits the page's CSP, and the module imports IT then makes
   are checked against that inherited policy — not against the policy of
   wherever the worker's source came from.

   That is the whole of the extract-audio failure. `sg-video.js` builds FFmpeg's
   class worker as a blob (it has to: FFmpeg's own worker URL is cross-origin,
   and `new Worker()` refuses those), rewriting the worker's relative imports to
   absolute unpkg URLs because a blob has no path to resolve them against. The
   page allowed unpkg in `script-src` and `connect-src` but not in `worker-src`,
   so the worker was refused and the extraction stopped before a single byte of
   the 32 MB core was fetched — four CSP errors in the console and a progress bar
   that never moved (Dinis, from QA).

   Verified by construction, not by reading the spec: the same blob-worker shape
   built against a local stand-in CDN is refused without the origin in
   `worker-src` and loads with it. */
test('a page whose worker imports from a CDN names that CDN in worker-src', () => {
    const page = 'website/tools/extract-audio/index.html'
    const csp = cspOf(readFileSync(path.join(repo, page), 'utf8'))
    assert.ok(csp, `${page} ships no Content-Security-Policy`)
    const worker = csp['worker-src'] || csp['child-src'] || csp['default-src'] || []
    assert.ok(worker.includes('https://unpkg.com'),
        'the FFmpeg class worker is a blob that imports from unpkg; without unpkg in ' +
        'worker-src the browser refuses it and extraction never starts')
    // …and blob: itself, since the worker IS one.
    assert.ok(worker.includes('blob:'), 'the worker is created from a blob: URL')
})
