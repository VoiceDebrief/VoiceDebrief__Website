/* Extract the audio from a video — the tool page's logic and its JS API
   (issue 065).

   The video never leaves the browser. FFmpeg runs as WebAssembly in this tab,
   via `core/video/sg-video.js` from the tools origin (CORS `*`, verified). There
   is no server here to upload a film to, which for a 400 MB holiday video is a
   feature and not a limitation.

   THE FIRST RUN COSTS 32 MB. That is the FFmpeg core, fetched once and then
   cached by the browser. It is loaded ON DEMAND — never on page load — so a
   visitor who only reads this page downloads none of it. Everything about the
   UI assumes that download is happening and says so.

   Free: no key, no model, no spend. This is the first tool here that costs
   nothing to run, because nothing leaves the machine.

   The API is published SYNCHRONOUSLY and upgraded — see tts-tool.js for why
   (an agent could not find `window.__tool` when it waited on a CDN). */

const ORIGIN = 'https://tools.sgraph.ai'
const SG_VIDEO = `${ORIGIN}/core/video/v1/v1.0/v1.0.1/sg-video.js`
const SG_TOOL_API = 'https://dev.tools.sgraph.ai/core/sg-tool-api/v0/v0.1/v0.1.0/sg-tool-api.js'
const VERSION = { api: '0.1.0', ui: 'site', content: '0.1.0' }

/* Copy first, re-encode only if copying is impossible.

   `extractAudio()` runs `-vn -c:a copy`: it lifts the audio stream out
   untouched, which is fast and lossless. That works for the video people
   actually have — a phone recording or a WhatsApp clip is AAC — but it CANNOT
   work for Opus in WebM, because Opus has no place in an MP4 container. Screen
   recordings and anything saved off the web are exactly that.

   The module reports the failure as "the file may not contain an audio stream",
   which in this case is untrue: it has one, and it cannot be copied. So we retry
   with `-c:a aac`, which does have to re-encode, and say so plainly rather than
   letting the person believe their file was silent. */
const COPY_FAILED = /may not contain an audio stream/i

export const OUT_MIME = 'audio/mp4'

let mod = null            // sg-video.js, imported on demand
let ffmpeg = null         // the loaded FFmpeg instance, reused across extractions
let ffmpegFrom = null     // ...and the engine it came from, so a swap invalidates it
let last = null

/* Every network-touching thing behind one seam, so the whole flow is testable
   with no 32 MB download and no network — the same shape as the TTS tool's
   `window.__ttsSynthesize`. */
async function engine () {
    if (window.__sgVideo) return window.__sgVideo
    if (!mod) mod = await import(/* @vite-ignore */ SG_VIDEO)
    return mod
}

export async function isSupported () {
    try { return (await engine()).isWasmSupported() } catch (_) { return false }
}

/** Load FFmpeg (32 MB, once). Safe to call repeatedly — the module caches it. */
export async function prepare (onProgress) {
    const e = await engine()
    // Keyed to the engine object, not just "have we loaded one". In production
    // that is the same module every time, so the 32 MB core is paid for once;
    // if the engine is ever replaced (the test seam does exactly this) the stale
    // instance goes with it rather than quietly outliving its module.
    if (!ffmpeg || ffmpegFrom !== e) { ffmpeg = await e.loadFFmpeg(onProgress); ffmpegFrom = e }
    return ffmpeg
}

/* Re-encode fallback. Written against the FFmpeg instance's own public surface
   (writeFile/exec/readFile/deleteFile), so it needs nothing private from
   sg-video.js and nothing changed in the tools repo. */
async function reencodeToAac (ff, file) {
    const input = file.name || 'input.webm'
    const output = (input.includes('.') ? input.slice(0, input.lastIndexOf('.')) : input) + '_audio.m4a'
    await ff.writeFile(input, new Uint8Array(await file.arrayBuffer()))
    try {
        const code = await ff.exec(['-i', input, '-vn', '-c:a', 'aac', '-b:a', '128k', output])
        if (code !== 0) throw Object.assign(new Error('This file has no audio track we can read.'), { code: 'no-audio' })
        const data = await ff.readFile(output)
        await ff.deleteFile(output)
        return { blob: new Blob([data], { type: OUT_MIME }), filename: output }
    } finally { await ff.deleteFile(input).catch(() => {}) }
}

/** THE one implementation: a video in, an .m4a out. The page and the API share it. */
export async function extract ({ file, onProgress } = {}) {
    if (!(file instanceof Blob)) throw Object.assign(new Error('Give me a video file.'), { code: 'no-file' })
    const e = await engine()
    const ff = await prepare(onProgress)
    const started = Date.now()

    let out, reencoded = false
    try {
        out = await e.extractAudio(ff, file)
    } catch (err) {
        if (!COPY_FAILED.test(err?.message || '')) throw err
        // Opus-in-WebM and friends: the stream exists, it just cannot be copied.
        out = await reencodeToAac(ff, file)
        reencoded = true
    }

    last = {
        filename: out.filename, mime: out.blob.type || OUT_MIME, bytes: out.blob.size,
        sourceName: file.name || 'video', sourceBytes: file.size,
        reencoded, tookMs: Date.now() - started, blob: out.blob,
    }
    window.dispatchEvent(new CustomEvent('extract:done', { detail: { ...last, blob: undefined } }))
    return last
}

/** Duration and whether it looks like it has audio — cheap, no FFmpeg needed. */
export async function probe (file) {
    const e = await engine()
    return e.getVideoInfo(file)
}

/* ── the hand-off: keep going in the app, without a round trip through the
      downloads folder ─────────────────────────────────────────────────────── */
export async function sendToApp (result = last) {
    if (!result?.blob) throw Object.assign(new Error('Nothing extracted yet.'), { code: 'no-audio' })
    const { stash } = await import('../../shared/handoff.js')
    const file = new File([result.blob], result.filename, { type: result.mime })
    return stash(file, { from: 'the extract-audio tool', note: `from ${result.sourceName}` })
}

/* ── the JS API (window.__tool) ─────────────────────────────────────────────
   Published synchronously, upgraded to SgToolApi when it loads. Identical
   reasoning, and identical shape, to the text-to-speech tool. */
const ACTIONS = [
    // base64, because a Blob does not survive page.evaluate(). A film's audio can
    // be tens of megabytes, so this is opt-in rather than always returned.
    ['extractAudio', async (p = {}) => {
        const r = await extract(p)
        const { blob, ...rest } = r
        if (!p.withAudio) return { ...rest, hint: 'pass { withAudio: true } for base64, or call saveLastAudio' }
        const bytes = new Uint8Array(await blob.arrayBuffer())
        let s = ''
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
        return { ...rest, base64: btoa(s) }
    }, { async: true }],
    ['prepare', () => prepare().then(() => ({ ready: true })), { async: true }],
    ['isSupported', () => isSupported().then((ok) => ({ supported: ok })), { async: true }],
    ['probe', ({ file } = {}) => probe(file), { async: true }],
    ['getLastAudio', () => (last ? (({ blob, ...rest }) => rest)(last) : null), { async: false }],
    ['saveLastAudio', ({ filename } = {}) => {
        if (!last) throw Object.assign(new Error('Nothing extracted yet.'), { code: 'no-audio' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(last.blob)
        a.download = filename || last.filename
        document.body.appendChild(a); a.click(); a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 10000)
        return { filename: a.download, bytes: last.bytes }
    }, { async: false }],
    ['sendToApp', () => sendToApp(), { async: true }],
]

function makeLocalApi (status) {
    const log = []
    const api = {
        meta: {
            getManifest: () => fetch('./manifest.json').then(r => r.json()),
            getMethods: () => ACTIONS.map(([n]) => n),
            getSkills: () => Promise.all([
                fetch('./skills/SKILL__api.md').then(r => r.text()),
                fetch('./skills/SKILL__human.md').then(r => r.text()),
            ]).then(([a, h]) => ({ api: a, human: h })),
            getVersion: () => ({ ...VERSION }),
            getEvents: () => ['tool:ready', 'extract:done'],
            health: () => ({ ...status, methods: ACTIONS.length }),
            getLog: () => [...log],
        },
    }
    for (const [name, fn, opts = {}] of ACTIONS) {
        api[name] = async (params = {}) => {
            const entry = { timestamp: new Date().toISOString(), method: name, params: opts.sanitiseParams ? opts.sanitiseParams(params) : params }
            const t0 = Date.now()
            try { const result = await fn(params); log.push({ ...entry, result: name === 'extractAudio' ? '(audio)' : result, duration: Date.now() - t0 }); return result }
            catch (err) { log.push({ ...entry, error: { message: err.message, code: err.code }, duration: Date.now() - t0 }); throw err }
        }
    }
    return api
}

export function publishApi () {
    const status = {
        tool: 'extract-audio', ready: true, mode: 'local', methods: ACTIONS.length,
        engine: { origin: ORIGIN, module: 'sg-video', loadedOnDemand: true, error: null },
    }
    const local = makeLocalApi(status)
    window.__tool = local
    window.__tools = Object.assign(window.__tools || {}, { 'extract-audio:root': local })
    window.__toolStatus = status
    window.dispatchEvent(new CustomEvent('tool:ready', {
        detail: { tool: 'extract-audio', instanceId: 'extract-audio:root', version: { ...VERSION }, mode: 'local' } }))

    const upgraded = import(/* @vite-ignore */ SG_TOOL_API).then(({ SgToolApi }) => {
        const api = new SgToolApi({ name: 'extract-audio', version: { ...VERSION }, panelId: 'root',
            manifest: './manifest.json',
            skills: { api: './skills/SKILL__api.md', human: './skills/SKILL__human.md' } })
        for (const [name, fn, opts] of ACTIONS) api.register(name, fn, opts)
        api.activate()
        status.mode = 'sg-tool-api'
        return api
    }).catch((err) => { status.engine.error = err.message; return null })

    return { api: local, upgraded, status }
}
