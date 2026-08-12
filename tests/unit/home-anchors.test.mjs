/* Every same-page anchor the site publishes must exist on the page it names
   (issue 060, M2).

   This is a dead link that returns 200. The live-QA link check fetches every
   outbound URL on the record pages and fails on a 404 — but `/#privacy` fetches
   the home page perfectly well and reports 200 whether or not anything on it
   carries that id. The failure is silent by construction: the browser simply
   does not scroll, and the reader assumes they misread the menu.

   It bit on the first redesign commit. The home page's sections were rewritten
   from #how/#privacy/#pricing to #sources/#workbench/#cost, and three links in
   the shipped nav plus one on the key guide kept pointing at ids that no longer
   existed. Two of those anchors are older than the redesign and published
   elsewhere, so the fix was to keep the ids alive on the sections that now do
   the job — which is only a fix if something checks it stays true. */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p) => readFileSync(path.join(repo, p), 'utf8')

const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]))

test('every hash the nav names exists on the page it points at', () => {
    // The live nav — whichever version the pages actually load, not whichever
    // is newest on disk: a frozen older version left behind by a half-done
    // repoint is exactly the case worth catching.
    const home = read('website/index.html')
    const loaded = [...home.matchAll(/components\/(wa-site-nav\/v0\/v[\d.]+\/v[\d.]+)/g)].map(m => m[1])
    assert.equal(loaded.length >= 1, true, 'the home page loads a nav')
    const nav = read(`website/components/${loaded[0]}/wa-site-nav.js`)

    const homeIds = idsOf(home)
    const hashes = [...nav.matchAll(/'\/#([a-z-]+)'/g)].map(m => m[1])
    assert.equal(hashes.length >= 1, true, 'the nav names at least one same-page anchor')
    for (const id of hashes) {
        assert.equal(homeIds.has(id), true,
            `the nav links /#${id}, which the home page does not carry — ` +
            'it would return 200 and scroll nowhere')
    }
})

test('every hash a page points at another page also exists there', () => {
    const pages = []
    const walk = (dir) => {
        for (const e of readdirSync(path.join(repo, dir), { withFileTypes: true })) {
            const p = `${dir}/${e.name}`
            if (e.isDirectory()) {
                // Generated locale copies and the A/B candidates are not hand-
                // maintained surfaces; the originals they came from are checked.
                if (/\/(en-gb|en-us|pt-pt|pt-br|design|vendor)$/.test(p)) continue
                walk(p)
            } else if (e.name.endsWith('.html')) pages.push(p)
        }
    }
    walk('website')

    const idCache = new Map()
    const idsFor = (page) => {
        if (!idCache.has(page)) {
            try { idCache.set(page, idsOf(read(page))) } catch { idCache.set(page, null) }
        }
        return idCache.get(page)
    }

    const problems = []
    for (const page of pages) {
        const html = read(page)
        for (const m of html.matchAll(/href="([^"#]*)#([a-zA-Z][\w-]*)"/g)) {
            const [, target, id] = m
            // Resolve the target relative to the page it was written on. An
            // empty target is this page; anything ending in / is that page's
            // index.html.
            let resolved
            if (!target) resolved = page
            else if (target.startsWith('http')) continue
            else {
                const base = path.posix.dirname(page)
                resolved = path.posix.normalize(path.posix.join(target.startsWith('/') ? 'website' : base,
                    target.startsWith('/') ? target.slice(1) : target))
                if (resolved.endsWith('/')) resolved += 'index.html'
                else if (!resolved.endsWith('.html')) resolved += '/index.html'
            }
            const ids = idsFor(resolved)
            if (ids === null) continue          // page not on disk here (generated at build)
            if (!ids.has(id)) problems.push(`${page} → ${target}#${id}`)
        }
    }
    assert.deepEqual(problems, [],
        'these links scroll nowhere — the anchor does not exist on the target page')
})
