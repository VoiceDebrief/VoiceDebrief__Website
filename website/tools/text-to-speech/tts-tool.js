/* Text to speech — the tool page's logic and its JS API (issue 064).

   Two consumers, one implementation:

   1. A HUMAN types or pastes text, picks a voice, hears it, downloads the .wav.
   2. An AGENT drives the same thing through `window.__tool` — the same
      SgToolApi contract the transcription app publishes, so anything that can
      already operate this estate (a Playwright script, a chat tool loop) can
      make audio without learning anything new. Actions return base64 rather
      than a Blob, because a Blob does not survive `page.evaluate`.

   The synthesis itself is `core/sg-tts-openrouter` from the engine origin,
   imported ON FIRST USE: a visitor who only reads the page fetches nothing.
   Node cannot import an https URL but a browser can, which is why this lives
   in the page rather than in a build script (issue 062's brief).

   BYOK: the key is the same `sg-openrouter-mgmt-key` the app saves, read from
   this browser only, sent only to OpenRouter, and billed to whoever owns it.
   Nothing is uploaded to us and nothing is stored server-side — there is no
   server.

   Testing seams: `window.__ttsSynthesize` replaces the synthesis call and
   `window.__ttsLookupCost` the cost read-back — exactly as `synthesizeOpenRouter`
   itself takes `fetchImpl` — so the whole flow is testable with no key, no
   network and no spend. */

const LS_KEY = 'sg-openrouter-mgmt-key'
const ORIGIN = 'https://dev.tools.sgraph.ai'
const TTS_MODULE = `${ORIGIN}/core/sg-tts-openrouter/v0/v0.1/v0.1.0/sg-tts-openrouter.js`
export const VOICES = ['onyx', 'echo', 'alloy', 'fable', 'nova', 'shimmer']
export const DEFAULT_VOICE = 'onyx'
export const DEFAULT_MODEL = 'openai/gpt-audio'

/* A news read is a lead-in, the headline, then the story — the style comes from
   the script, never from a mode. Exported so the prefill and its test agree. */
export function newsScript (post) {
    if (!post) return ''
    const title = String(post.title || '').replace(/\s*—\s*/g, ', ').trim()
    const body = String(post.summary || '').trim()
    return `Here is the latest from VoiceDebrief. ${title}${title.endsWith('.') ? '' : '.'}\n\n${body}`
}

/* apply() on a whole multi-megabyte array blows the argument limit, so walk it
   in 32k slices. A minute of 24 kHz mono pcm16 is ~2.9 MB — this is the normal
   case, not an edge one. */
export const bytesToBase64 = (bytes) => {
    let s = ''
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
    return btoa(s)
}

/* The API hands out base64 (a Blob cannot cross page.evaluate); the browser
   wants a Blob URL (a multi-megabyte data: URI in an href is a bad idea). One
   helper serves both, so there is only ever one copy of this conversion. */
export const base64ToBlob = (base64, mime = 'audio/wav') =>
    new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: mime })

const getKey = () => { try { return localStorage.getItem(LS_KEY) || '' } catch (_) { return '' } }
const setKey = (k) => { try { k ? localStorage.setItem(LS_KEY, k) : localStorage.removeItem(LS_KEY) } catch (_) {} }

let last = null          // the most recent result, for getLastAudio/saveLastAudio

async function synthesizeReal (text, opts) {
    if (typeof window.__ttsSynthesize === 'function') return window.__ttsSynthesize(text, opts)
    const mod = await import(/* @vite-ignore */ TTS_MODULE)
    return mod.synthesizeOpenRouter(text, opts)
}

/* Best effort: the generationId turned into the cost actually billed. Not always
   ready immediately, so a miss reports null rather than inventing a number. */
async function lookupCost (generationId, apiKey) {
    if (typeof window.__ttsLookupCost === 'function') return window.__ttsLookupCost(generationId, apiKey)
    if (!generationId || !apiKey) return null
    try {
        const r = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`,
            { headers: { Authorization: `Bearer ${apiKey}` } })
        if (!r.ok) return null
        const d = await r.json()
        return typeof d?.data?.total_cost === 'number' ? d.data.total_cost : null
    } catch (_) { return null }
}

/* THE one implementation. The page calls it; the JS API calls it. */
export async function speak ({ text, voice = DEFAULT_VOICE, model = DEFAULT_MODEL, apiKey } = {}) {
    const words = String(text || '').trim()
    if (!words) throw Object.assign(new Error('Nothing to read — pass some text.'), { code: 'no-text' })
    const key = apiKey || getKey()
    if (!key) throw Object.assign(new Error('An OpenRouter key is required (BYOK) — it stays in this browser.'), { code: 'no-key' })
    if (!VOICES.includes(voice)) throw Object.assign(new Error(`Unknown voice "${voice}" — one of: ${VOICES.join(', ')}`), { code: 'bad-voice' })

    const started = Date.now()
    const { blob, durationMs, generationId } = await synthesizeReal(words, { apiKey: key, voice, model })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const costUsd = await lookupCost(generationId, key)
    last = {
        base64: bytesToBase64(bytes), mime: blob.type || 'audio/wav', bytes: bytes.length,
        durationMs: durationMs ?? null, generationId: generationId ?? null, costUsd,
        voice, model, tookMs: Date.now() - started,
    }
    window.dispatchEvent(new CustomEvent('tts:done', { detail: { ...last, base64: undefined } }))
    return last
}

/* ── the JS API (window.__tool), so agents can use this over Playwright ─────

   PUBLISHED SYNCHRONOUSLY, THEN UPGRADED. A diagnostic from an agent on 12 Aug
   found `window.__tool` undefined after a normal load, and it was right twice
   over — the first version of this awaited `sg-tool-api.js` from the engine
   origin BEFORE publishing anything, which made the advertised entry point
   depend on a second origin and three sequential cross-origin module fetches:

   - if that origin is slow, `window.__tool` simply does not exist yet. Measured
     at ~1.9s after `goto` on a fast path, which is AFTER `readyState` reaches
     "complete" — so the obvious check ("wait for the page to load, then read
     window.__tool") loses a race it does not know it is in;
   - if that origin is blocked — normal for a sandboxed browser allowed to reach
     only the page it navigated to — `window.__tool` never appears at all;
   - and four of the seven actions need nothing from that origin anyway. An API
     should never be less available than the button beside it.

   So the local implementation IS the API and is assigned during module
   evaluation. The shared SgToolApi primitive is an upgrade that arrives later
   and takes over `window.__tool` through its own registry (identical actions,
   same `speak()` underneath, so a held reference keeps working either way).

   And it is never silent: `window.__toolStatus` always exists and always says
   which mode is live and why — a caught error in a console.warn is invisible to
   an agent reading only console errors, which is exactly what happened. */

const VERSION = { api: '0.1.0', ui: 'site', content: '0.1.0' }
const SG_TOOL_API = `${ORIGIN}/core/sg-tool-api/v0/v0.1/v0.1.0/sg-tool-api.js`
const mask = (p) => ({ ...p, apiKey: p?.apiKey ? '***' : undefined })

/* One list, both implementations — there is no second definition of the API to
   drift from this one. Shape matches SgToolApi.register(name, fn, opts). */
const ACTIONS = [
    ['synthesize', speak, { async: true, sanitiseParams: mask }],
    ['getVoices', () => ({ voices: VOICES, default: DEFAULT_VOICE, model: DEFAULT_MODEL }), { async: false }],
    ['setApiKey', ({ apiKey } = {}) => { setKey(String(apiKey || '').trim()); return { saved: !!getKey() } },
        { async: false, sanitiseParams: () => ({ apiKey: '***' }) }],
    ['hasApiKey', () => ({ present: !!getKey() }), { async: false }],
    // The audio itself, base64 — a Blob cannot cross page.evaluate().
    ['getLastAudio', () => last, { async: false }],
    // Triggers a real browser download, which Playwright can capture.
    ['saveLastAudio', ({ filename } = {}) => {
        if (!last) throw Object.assign(new Error('Nothing generated yet.'), { code: 'no-audio' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(base64ToBlob(last.base64, last.mime))
        a.download = filename || `speech-${last.voice}.wav`
        document.body.appendChild(a); a.click(); a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 10000)
        return { filename: a.download, bytes: last.bytes }
    }, { async: false }],
    ['newsScriptFor', ({ post } = {}) => ({ script: newsScript(post) }), { async: false }],
]

/* A local stand-in for SgToolApi: same method names, same call shape, every
   action a Promise (SgToolApi's _invoke is async whatever `async:false` says),
   same `meta` surface, same execution log. Deliberately small — its job is to
   exist instantly and never need the network. */
function makeLocalApi (status) {
    const log = []
    const api = {
        meta: {
            getManifest: () => fetch('./manifest.json').then(r => r.json()),
            getMethods: () => ACTIONS.map(([name]) => name),
            getSkills: () => Promise.all([
                fetch('./skills/SKILL__api.md').then(r => r.text()),
                fetch('./skills/SKILL__human.md').then(r => r.text()),
            ]).then(([api_, human]) => ({ api: api_, human })),
            getVersion: () => ({ ...VERSION }),
            getEvents: () => ['tool:ready', 'tts:done'],
            health: () => ({ ...status, methods: ACTIONS.length }),
            getLog: () => [...log],
        },
    }
    for (const [name, fn, opts = {}] of ACTIONS) {
        api[name] = async (params = {}) => {
            const entry = { timestamp: new Date().toISOString(), method: name,
                            params: opts.sanitiseParams ? opts.sanitiseParams(params) : params }
            const t0 = Date.now()
            try {
                const result = await fn(params)
                log.push({ ...entry, result, duration: Date.now() - t0 })
                return result
            } catch (err) {
                log.push({ ...entry, error: { message: err.message, code: err.code }, duration: Date.now() - t0 })
                throw err
            }
        }
    }
    return api
}

/* Synchronous. `window.__tool` and `window.__toolStatus` exist the moment this
   returns; `upgraded` resolves to the SgToolApi instance, or to null when the
   engine origin cannot be reached — which is a downgrade in provenance, not in
   capability, and is stated rather than logged. */
export function publishApi () {
    const status = {
        tool: 'text-to-speech', ready: true, mode: 'local', methods: ACTIONS.length,
        engine: { origin: ORIGIN, module: 'sg-tool-api', loaded: false, error: null },
    }
    const local = makeLocalApi(status)
    window.__tool = local
    window.__tools = Object.assign(window.__tools || {}, { 'text-to-speech:root': local })
    window.__toolStatus = status
    window.dispatchEvent(new CustomEvent('tool:ready', {
        detail: { tool: 'text-to-speech', instanceId: 'text-to-speech:root', version: { ...VERSION }, mode: 'local' },
    }))

    const upgraded = import(/* @vite-ignore */ SG_TOOL_API).then(({ SgToolApi }) => {
        const api = new SgToolApi({
            name: 'text-to-speech', version: { ...VERSION }, panelId: 'root',
            manifest: './manifest.json',
            skills: { api: './skills/SKILL__api.md', human: './skills/SKILL__human.md' },
        })
        for (const [name, fn, opts] of ACTIONS) api.register(name, fn, opts)
        api.activate()            // its registry takes over window.__tool + fires tool:ready again
        status.mode = 'sg-tool-api'
        status.engine.loaded = true
        return api
    }).catch((err) => {
        status.engine.error = err.message      // queryable, not just console noise
        return null
    })

    return { api: local, upgraded, status }
}

/* ── the page ──────────────────────────────────────────────────────────────

   `root` is anything with getElementById — the document on the real page, a
   fixture in the tests. `postsUrl` is the same seam by another name: the tests
   hand it a blob URL rather than depending on a deployed feed. */
export function wirePage ({ root = document, postsUrl = '/updates/updates.json' } = {}) {
    const $ = (id) => root.getElementById(id)
    let lastUrl = null       // revoked on the next generation, so the tab does
                             // not accumulate megabytes across a session
    const voiceSel = $('voice')
    voiceSel.innerHTML = VOICES.map(v => `<option${v === DEFAULT_VOICE ? ' selected' : ''}>${v}</option>`).join('')
    $('key').value = getKey()
    $('key').addEventListener('change', () => setKey($('key').value.trim()))

    // Optional convenience, not the point of the page: pull a published update
    // in as a starting script. The tool reads whatever text you give it.
    const feed = fetch(postsUrl, { cache: 'no-cache' }).then(r => r.json()).then(d => {
        const posts = (d.posts || []).slice(0, 20)
        if (!posts.length) return
        $('prefill').innerHTML = '<option value="">— or start from a published update —</option>' +
            posts.map((p, i) => `<option value="${i}">${(p.date_label || p.date)} — ${p.title.replace(/</g, '&lt;')}</option>`).join('')
        $('prefill').hidden = false
        $('prefill').addEventListener('change', () => {
            const p = posts[Number($('prefill').value)]
            if (p) { $('text').value = newsScript(p); $('name').value = p.slug }
        })
    }).catch(() => { /* the tool works without the updates feed */ })

    async function generate () {
        const status = $('status'), out = $('out')
        status.className = 'status'
        status.textContent = 'Generating — a read of this length takes a few seconds…'
        $('go').disabled = true
        out.hidden = true
        try {
            const r = await speak({ text: $('text').value, voice: voiceSel.value, apiKey: $('key').value.trim() })
            if (lastUrl) URL.revokeObjectURL(lastUrl)
            const url = lastUrl = URL.createObjectURL(base64ToBlob(r.base64, r.mime))
            $('audio').src = url
            $('dl').href = url
            $('dl').download = ($('name').value.trim() || 'speech') + `__${r.voice}.wav`
            out.hidden = false
            status.textContent = `Done — ${Math.round((r.durationMs || 0) / 100) / 10}s of audio in ${Math.round(r.tookMs / 1000)}s.`
            $('meta').textContent = [`voice ${r.voice}`, `${(r.bytes / 1024 / 1024).toFixed(2)} MB wav`,
                r.generationId || 'no generation id', r.costUsd != null ? `cost $${r.costUsd.toFixed(4)}` : null]
                .filter(Boolean).join(' · ')
        } catch (err) {
            status.className = 'status err'
            status.textContent = err?.code === 'tts-http'
                ? `OpenRouter refused the request: ${err.message}` : (err?.message || String(err))
        } finally { $('go').disabled = false }
    }

    $('go').addEventListener('click', generate)
    // Returned so a test can await the two things a click starts and a click
    // cannot: the feed arriving, and a generation finishing.
    return { feed, generate }
}
