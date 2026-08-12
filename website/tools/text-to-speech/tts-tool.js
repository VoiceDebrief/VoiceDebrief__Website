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

   Exactly the primitive the app uses (`engine.js`): construct, register every
   action, then activate() — which is what puts the instance on window.__tools,
   sets the window.__tool alias (only when this page has a single tool, which it
   does) and fires `tool:ready`. Agents wait for that, never for a timer. */
export async function publishApi () {
    const { SgToolApi } = await import(`${ORIGIN}/core/sg-tool-api/v0/v0.1/v0.1.0/sg-tool-api.js`)
    const api = new SgToolApi({
        name: 'text-to-speech',
        version: { api: '0.1.0', ui: 'site', content: '0.1.0' },
        panelId: 'root',
        manifest: './manifest.json',
        skills: { api: './skills/SKILL__api.md', human: './skills/SKILL__human.md' },
    })
    api.register('synthesize', speak, { async: true, sanitiseParams: p => ({ ...p, apiKey: p?.apiKey ? '***' : undefined }) })
       .register('getVoices', () => ({ voices: VOICES, default: DEFAULT_VOICE, model: DEFAULT_MODEL }), { async: false })
       .register('setApiKey', ({ apiKey } = {}) => { setKey(String(apiKey || '').trim()); return { saved: !!getKey() } },
                 { async: false, sanitiseParams: () => ({ apiKey: '***' }) })
       .register('hasApiKey', () => ({ present: !!getKey() }), { async: false })
       // The audio itself, base64 — a Blob cannot cross page.evaluate().
       .register('getLastAudio', () => last, { async: false })
       // Triggers a real browser download, which Playwright can capture.
       .register('saveLastAudio', ({ filename } = {}) => {
           if (!last) throw Object.assign(new Error('Nothing generated yet.'), { code: 'no-audio' })
           const a = document.createElement('a')
           a.href = URL.createObjectURL(base64ToBlob(last.base64, last.mime))
           a.download = filename || `speech-${last.voice}.wav`
           document.body.appendChild(a); a.click(); a.remove()
           setTimeout(() => URL.revokeObjectURL(a.href), 10000)
           return { filename: a.download, bytes: last.bytes }
       }, { async: false })
       .register('newsScriptFor', ({ post } = {}) => ({ script: newsScript(post) }), { async: false })
    api.activate()          // → window.__tool + tool:ready
    return api
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
