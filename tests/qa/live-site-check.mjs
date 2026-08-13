/* QA — post-deploy check of the LIVE site. Plain fetches, no browser: is the
   deployed artifact whole and internally consistent (the issue-026 class of
   failure), and are its upstream dependencies reachable?

   Environment:
     LIVE_URL         (default https://voicedebrief.ai)
     EXPECT_VERSION   if set, version.txt must match (CI passes the fresh tag)

   Run: node tests/qa/live-site-check.mjs */

const LIVE = (process.env.LIVE_URL || 'https://voicedebrief.ai').replace(/\/$/, '')
const EXPECT_VERSION = (process.env.EXPECT_VERSION || '').trim()

let failures = 0
const check = (name, ok, extra = '') => {
    console.log(`${ok ? 'ok ' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`)
    if (!ok) failures++
}
// Same lesson as the outbound-link fetches learned in §6, one layer deeper: a
// dropped connection (ECONNRESET — common right after a deploy while the CDN
// settles) previously CRASHED the whole script from inside this helper, taking
// every remaining check with it (run #33). Retry with backoff; if our own site
// truly cannot answer three times in a row, that IS a failing check — reported
// as one, never as an unhandled TypeError.
const get = async (path, base = LIVE) => {
    for (let attempt = 1; ; attempt++) {
        try {
            const r = await fetch(base + path, { headers: { 'cache-control': 'no-cache' } })
            return { ok: r.ok, status: r.status, text: r.ok ? await r.text() : '' }
        } catch (e) {
            if (attempt >= 3) return { ok: false, status: `ERR ${String(e?.cause?.code || e?.message || e).slice(0, 40)}`, text: '' }
            await new Promise(r => setTimeout(r, 1500 * attempt))
        }
    }
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
// The home page's marker is a section only the redesign has (issue 060, M2):
// 'Voice' matched the old page and the new one alike, so it proved the page
// answered, not that the page shipped.
for (const [path, marker] of [['/', 'Getting the audio'], ['/app/', 'wa-drop-zone'], ['/updates/', 'Updates'],
                              ['/versions/', 'Every version'], ['/library/', 'Library'],
                              ['/videos/', 'See it work'], ['/user-guide/', 'step by step'],
                              ['/openrouter-key/', 'spend limit'],
                              ['/engineering/', 'engine room'], ['/engineering/pipeline/', 'live QA'],
                              ['/engineering/testing/', 'Three layers'], ['/engineering/docs/', 'reality doc'],
                              ['/engineering/security/', 'ciphertext'], ['/engineering/team/', 'agent roles'],
                              ['/engineering/concepts/', 'concept'],
                              ['/tests/browser/', 'qunit'],
                              ['/design/', 'design candidates'],
                              ['/tools/', 'What makes something a tool here'],
                              ['/tools/text-to-speech/', 'window.__tool'],
                              ['/tools/extract-audio/', 'Extract the audio from a video']]) {
    const r = await get(path)
    check(`GET ${path} → 200 + expected content`, r.ok && r.text.includes(marker), `status ${r.status}`)
}

// 1b. One real URL per locale (issue 056). A translated page that 404s is worse
//     than no translation: it is a link we published that does not work. The
//     marker is the page's own lang attribute, so a generator that wrote four
//     copies of the same page is caught too, not just a missing file.
for (const [path, marker] of [['/app/en-gb/', 'lang="en-GB"'], ['/app/en-us/', 'lang="en-US"'],
                              ['/app/pt-pt/', 'lang="pt-PT"'], ['/app/pt-br/', 'lang="pt-BR"']]) {
    const r = await get(path)
    check(`GET ${path} → 200 + correct lang`, r.ok && r.text.includes(marker), `status ${r.status}`)
}
const appAlts = (await get('/app/')).text.match(/hreflang="[^"]+"/g) || []
check('the app page advertises every locale + x-default', appAlts.length >= 5, appAlts.join(' '))

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
    // Site-absolute refs (the shared wa-site-nav) resolve from the root;
    // everything else is relative to the app page.
    const path = ref.startsWith('/') ? ref : '/app/' + ref.replace(/^\.\//, '')
    const r = await get(path)
    check(`stamped asset resolves: ${ref}`, r.ok, `status ${r.status}`)
}

// 4. The app's runtime fetches: prompts, samples, manifest.
for (const path of ['/app/manifest.json', '/versions/versions.json',
                    '/llms.txt', '/sitemap.xml', '/robots.txt',
                    '/components/wa-site-nav/v0/v0.1/v0.1.11/wa-site-nav.js',
                    '/components/vd-workflow/v0/v0.1/v0.1.1/vd-workflow.js',
                    '/vd-tokens.css', '/vd-theme.js', '/home.js',
                    '/tools/text-to-speech/tts-tool.js', '/tools/text-to-speech/manifest.json',
                    '/tools/extract-audio/extract-tool.js', '/tools/extract-audio/extract-page.js',
                    '/tools/extract-audio/manifest.json', '/tools/extract-audio/skills/SKILL__api.md',
                    '/shared/handoff.js',
                    '/tools/text-to-speech/skills/SKILL__api.md',
                    '/tools/text-to-speech/skills/SKILL__human.md',
                    '/app/skills/SKILL__api.md', '/app/workflows/standard.json',
                    '/engineering/status.json', '/engineering/issues.json', '/engineering/docs.json',
                    '/engineering/concepts/concepts.json',
                    '/updates/updates.json', '/updates/feed.xml', '/videos/videos.json',
                    '/app/prompts/summary-prompt.md', '/app/prompts/infographic-prompt.md',
                    '/app/samples/whatsapp-voice-note-1.opus', '/app/samples/whatsapp-voice-note-2.opus',
                    '/app/samples/whatsapp-voice-note-android.ogg',
                    '/tests/browser/tests.mjs', '/tests/browser/vendor/qunit.js',
                    '/user-guide/guide.json']) {
    let r
    for (let attempt = 1; ; attempt++) {
        r = await fetch(LIVE + path, { method: 'HEAD' }).catch(e => ({ ok: false, status: `ERR ${String(e?.cause?.code || '').slice(0, 20)}` }))
        if (r.ok || attempt >= 3) break
        await new Promise(res => setTimeout(res, 1500 * attempt))
    }
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
//    A dead link ANSWERS — with a 404 — and that stays fatal. A connection that
//    drops (fetch throws: reset, timeout, TLS hiccup) is the runner's network or
//    GitHub throttling the burst of sequential requests this loop makes; it was
//    the recurring "status ERR" that failed every other build on a random link.
//    Those are retried with backoff and, if still unanswered, reported loudly
//    but non-fatally: no HTTP response is no evidence about the link.
const fetchLink = async url => {
    for (let attempt = 1; ; attempt++) {
        try {
            return await fetch(url, { method: 'GET', redirect: 'follow',
                headers: { 'user-agent': 'sgraph-live-qa-link-check' } })
        } catch (e) {
            if (attempt >= 3) return { ok: false, status: 'ERR', transient: true,
                detail: String(e?.cause?.code || e?.message || e).slice(0, 80) }
            await new Promise(r => setTimeout(r, 1500 * attempt))
        }
    }
}
const seen = new Set()
for (const page of ['/updates/', '/library/']) {
    const html = (await get(page)).text
    for (const m of html.matchAll(/href="(https?:[^"#]+)/g)) {
        const url = m[1]
        if (seen.has(url)) continue
        seen.add(url)
        const strict = url.startsWith('https://github.com/') || url.startsWith(LIVE)
        const r = await fetchLink(url)
        if (r.transient) console.log(`warn  link ${url} → no HTTP response after 3 attempts (${r.detail}) — connection noise, not a dead link`)
        else if (strict) check(`link resolves (${page}): ${url}`, r.ok, `status ${r.status}`)
        else if (!r.ok) console.log(`warn  link ${url} → ${r.status} (non-blocking: third-party host)`)
        await new Promise(r => setTimeout(r, 250))   // pace the burst — the throttling is what caused the drops
    }
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nlive site healthy')
process.exit(failures ? 1 : 0)
