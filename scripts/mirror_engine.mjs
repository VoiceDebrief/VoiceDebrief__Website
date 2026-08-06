/* Build a local mirror of the engine modules the app imports from the tools
   origin, for the integration tests' MIRROR_DIR mode (review pack v0.1.20, E4:
   sandboxed/network-restricted runs, and one day a pinned engine for the gate).

   Starts from the import lists in engine.js and infographic.js, downloads each
   module, scans it for further same-origin imports (static and dynamic) and
   recurses until closed.

   Usage: node scripts/mirror_engine.mjs <target-dir> [origin]
          (origin defaults to https://dev.tools.sgraph.ai) */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const target = process.argv[2]
if (!target) { console.error('usage: node scripts/mirror_engine.mjs <target-dir> [origin]'); process.exit(2) }
const ORIGIN = (process.argv[3] || 'https://dev.tools.sgraph.ai').replace(/\/$/, '')

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Seed paths: every `${ORIGIN}/...` import in the app's own harness files, plus
// the absolute tools-origin imports in the wa-* components (SgComponent et al).
import { globSync } from 'node:fs'
const seeds = new Set()
for (const f of ['website/app/engine.js', 'website/app/infographic.js']) {
    const src = readFileSync(path.join(repo, f), 'utf8')
    for (const m of src.matchAll(/import\(`\$\{ORIGIN\}(\/[^`]+)`\)/g)) seeds.add(m[1])
}
for (const f of globSync('website/components/**/*.js', { cwd: repo })) {
    const src = readFileSync(path.join(repo, f), 'utf8')
    for (const m of src.matchAll(/from\s*['"]https:\/\/[^'"/]*tools\.sgraph\.ai(\/[^'"]+)['"]/g)) seeds.add(m[1])
}

const fetched = new Set()
const queue = [...seeds]
let failures = 0

const specifiers = (js) => {
    const out = []
    // static: import ... from 'x' / export ... from 'x'; dynamic: import('x')
    for (const m of js.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]/g)) out.push(m[1])
    for (const m of js.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push(m[1])
    return out
}

while (queue.length) {
    const p = queue.shift()
    if (fetched.has(p)) continue
    fetched.add(p)
    const url = ORIGIN + p
    const r = await fetch(url).catch(() => null)
    if (!r || !r.ok) { console.error(`FAIL ${url} → ${r ? r.status : 'ERR'}`); failures++; continue }
    const body = await r.text()
    const file = path.join(target, p)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, body)
    console.log(`ok   ${p}  (${body.length}b)`)
    if (p.endsWith('.js') || p.endsWith('.mjs')) {
        for (const spec of specifiers(body)) {
            if (/^(https?:)?\/\//.test(spec)) continue           // other origins: not ours to mirror
            if (!spec.startsWith('.') && !spec.startsWith('/')) continue // bare specifiers: none expected
            const resolved = spec.startsWith('/') ? spec
                : path.posix.normalize(path.posix.join(path.posix.dirname(p), spec))
            if (!fetched.has(resolved)) queue.push(resolved)
        }
    }
}

console.log(`\n${fetched.size} modules, ${failures} failures`)
process.exit(failures ? 1 : 0)
