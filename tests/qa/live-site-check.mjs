/* QA — post-deploy check of the LIVE site. Plain fetches, no browser: is the
   deployed artifact whole and internally consistent (the issue-026 class of
   failure), and are its upstream dependencies reachable?

   Environment:
     LIVE_URL         (default https://whatsapp-voice-transcription.sgraph.ai)
     EXPECT_VERSION   if set, version.txt must match (CI passes the fresh tag)

   Run: node tests/qa/live-site-check.mjs */

const LIVE = (process.env.LIVE_URL || 'https://whatsapp-voice-transcription.sgraph.ai').replace(/\/$/, '')
const EXPECT_VERSION = (process.env.EXPECT_VERSION || '').trim()

let failures = 0
const check = (name, ok, extra = '') => {
    console.log(`${ok ? 'ok ' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`)
    if (!ok) failures++
}
const get = async (path, base = LIVE) => {
    const r = await fetch(base + path, { headers: { 'cache-control': 'no-cache' } })
    return { ok: r.ok, status: r.status, text: r.ok ? await r.text() : '' }
}

// 0. When CI names the expected version, wait for the CDN to serve it — Pages
//    caches with max-age=600, so the fresh deploy can lag the deploy step.
if (EXPECT_VERSION) {
    const deadline = Date.now() + 8 * 60 * 1000
    let live = ''
    while (Date.now() < deadline) {
        live = (await get('/version.txt')).text.trim()
        if (live === EXPECT_VERSION) break
        console.log(`  waiting for CDN: live=${live || '?'} expecting=${EXPECT_VERSION}…`)
        await new Promise(r => setTimeout(r, 30000))
    }
}

// 1. The pages of the product.
for (const [path, marker] of [['/', 'Voice'], ['/app/', 'wa-drop-zone'], ['/updates/', 'Updates'],
                              ['/versions/', 'Every version'], ['/library/', 'Library'],
                              ['/videos/', 'See it work'],
                              ['/engineering/', 'engine room'], ['/engineering/pipeline/', 'live QA'],
                              ['/engineering/testing/', 'Three layers'], ['/engineering/docs/', 'reality doc'],
                              ['/engineering/security/', 'ciphertext'], ['/engineering/team/', 'agent roles']]) {
    const r = await get(path)
    check(`GET ${path} → 200 + expected content`, r.ok && r.text.includes(marker), `status ${r.status}`)
}

// 2. Version stamp — the deployed artifact must name itself truthfully.
const ver = await get('/version.txt')
check('version.txt present', ver.ok && /^v?\d+\.\d+\.\d+/.test(ver.text.trim()), ver.text.trim().slice(0, 20))
if (EXPECT_VERSION) check(`version.txt is ${EXPECT_VERSION}`, ver.text.trim() === EXPECT_VERSION, `got ${ver.text.trim()}`)

// 3. Cache-busting (issue 026): the app page must reference versioned modules,
//    and every same-origin JS/CSS it names must actually resolve.
const app = await get('/app/')
const stamped = [...app.text.matchAll(/(?:src|href)="([^"]+\?v=[^"]+)"/g)].map(m => m[1])
check('app assets carry ?v= stamps', stamped.length >= 2, `${stamped.length} stamped refs`)
for (const ref of stamped) {
    const r = await get('/app/' + ref.replace(/^\.\//, ''))
    check(`stamped asset resolves: ${ref}`, r.ok, `status ${r.status}`)
}

// 4. The app's runtime fetches: prompts, samples, manifest.
for (const path of ['/app/manifest.json', '/versions/versions.json',
                    '/llms.txt', '/sitemap.xml', '/robots.txt',
                    '/components/wa-site-nav/v0/v0.1/v0.1.0/wa-site-nav.js',
                    '/app/skills/SKILL__api.md', '/app/workflows/standard.json',
                    '/engineering/status.json', '/engineering/issues.json', '/engineering/docs.json',
                    '/updates/updates.json', '/updates/feed.xml', '/videos/videos.json',
                    '/app/prompts/summary-prompt.md', '/app/prompts/infographic-prompt.md',
                    '/app/samples/whatsapp-voice-note-1.opus', '/app/samples/whatsapp-voice-note-2.opus',
                    '/app/samples/whatsapp-voice-note-android.ogg']) {
    const r = await fetch(LIVE + path, { method: 'HEAD' }).catch(() => ({ ok: false, status: 'ERR' }))
    check(`asset reachable: ${path}`, r.ok, `status ${r.status}`)
}

// 5. The engine origin the app imports from at runtime.
const originMatch = (await get('/app/config.js?qa=1')).text.match(/'(https:[^']+)'/)
const origin = originMatch ? originMatch[1] : 'https://dev.tools.sgraph.ai'
// The CDN only emits CORS headers when the request names an Origin, exactly as a
// browser would — a bare fetch gets 200 with no header at all.
const engine = await fetch(origin + '/core/sg-tool-api/v0/v0.1/v0.1.0/sg-tool-api.js',
    { headers: { Origin: LIVE } }).catch(() => ({ ok: false, status: 'ERR', headers: new Headers() }))
check(`engine origin serves modules: ${origin}`, engine.ok, `status ${engine.status}`)
const cors = engine.ok ? engine.headers.get('access-control-allow-origin') : null
check('engine origin allows cross-origin import', cors === '*' || cors === LIVE, String(cors))

// 6. Outbound links on the record pages (review pack v0.1.20, group A): every
//    GitHub link the Updates and Library pages publish must resolve — dead blob/
//    compare links are exactly how the public record rotted before. Same-origin
//    links are checked too; other hosts are reported but only GitHub/self fail
//    the job (third parties may rate-limit CI).
const seen = new Set()
for (const page of ['/updates/', '/library/']) {
    const html = (await get(page)).text
    for (const m of html.matchAll(/href="(https?:[^"#]+)/g)) {
        const url = m[1]
        if (seen.has(url)) continue
        seen.add(url)
        const strict = url.startsWith('https://github.com/') || url.startsWith(LIVE)
        const r = await fetch(url, { method: 'GET', redirect: 'follow',
            headers: { 'user-agent': 'sgraph-live-qa-link-check' } }).catch(() => ({ ok: false, status: 'ERR' }))
        if (strict) check(`link resolves (${page}): ${url}`, r.ok, `status ${r.status}`)
        else if (!r.ok) console.log(`warn  link ${url} → ${r.status} (non-blocking: third-party host)`)
    }
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nlive site healthy')
process.exit(failures ? 1 : 0)
