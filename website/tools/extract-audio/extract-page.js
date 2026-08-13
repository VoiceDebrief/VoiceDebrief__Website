/* The extract-audio page's bootstrap — a FILE, not an inline module, so CI's
   cache-buster can stamp its import (see tts-page.js for the trap that rule
   came from). */

import { extract, publishApi, isSupported } from './extract-tool.js'

const $ = (id) => document.getElementById(id)
const status = $('status')
const say = (text, err = false) => { status.textContent = text; status.className = err ? 'status err' : 'status' }
const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB'

let chosen = null
let result = null
let objectUrl = null

/* ── choosing a file ─────────────────────────────────────────────────────────
   Once there IS a file, the drop zone goes away (Dinis). A target that says
   "drop a video here" while a video is sitting under it is offering a decision
   that has already been made, and it pushes the thing you now care about — the
   extract button — further down the page. `Change` puts it back; that is the
   only way it returns, so nothing about the state is ambiguous. */
const take = (file) => {
    if (!file) return
    chosen = file
    $('nm').textContent = file.name
    $('sz').textContent = mb(file.size)
    $('chosen').hidden = false
    $('drop').hidden = true
    $('go').disabled = false
    $('out').hidden = true
    say('')
}

/** Back to an empty page: the drop zone returns and nothing of the last file
    is left behind — including the input's own value, which would otherwise
    refuse to fire `change` if the same file were picked again. */
const clearChoice = () => {
    chosen = null
    result = null
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
    $('file').value = ''
    $('chosen').hidden = true
    $('drop').hidden = false
    $('go').disabled = true
    $('out').hidden = true
    $('bar').hidden = true
    say('')
    $('drop').focus?.()
}

$('drop').addEventListener('click', () => $('file').click())
$('file').addEventListener('change', (e) => take(e.target.files[0]))
for (const ev of ['dragenter', 'dragover']) {
    $('drop').addEventListener(ev, (e) => { e.preventDefault(); $('drop').classList.add('over') })
}
for (const ev of ['dragleave', 'drop']) {
    $('drop').addEventListener(ev, (e) => { e.preventDefault(); $('drop').classList.remove('over') })
}
$('drop').addEventListener('drop', (e) => take(e.dataTransfer?.files?.[0]))
$('change').addEventListener('click', clearChoice)

/* ── extracting ──────────────────────────────────────────────────────────── */
$('go').addEventListener('click', async () => {
    if (!chosen) return
    $('go').disabled = true
    $('out').hidden = true
    $('bar').hidden = false
    $('bar').removeAttribute('value')          // indeterminate until FFmpeg reports
    say('Getting FFmpeg ready — about 32 MB the first time, then it is cached…')

    try {
        if (!(await isSupported())) throw Object.assign(
            new Error('This browser cannot run WebAssembly, which is what does the work here.'),
            { code: 'no-wasm' })

        result = await extract({
            file: chosen,
            onProgress: (p) => {
                const pct = typeof p?.progress === 'number' ? Math.round(p.progress * 100) : null
                if (pct != null && pct >= 0 && pct <= 100) { $('bar').value = pct; say(`Extracting… ${pct}%`) }
                else say('Extracting…')
            },
        })

        if (objectUrl) URL.revokeObjectURL(objectUrl)
        objectUrl = URL.createObjectURL(result.blob)
        $('audio').src = objectUrl
        $('out').hidden = false
        say(result.reencoded
            ? 'Done — this file’s audio could not be copied across, so it was re-encoded to AAC.'
            : `Done in ${(result.tookMs / 1000).toFixed(1)}s — copied out losslessly, nothing re-encoded.`)
        $('meta').textContent = [result.filename, mb(result.bytes),
            `from ${mb(result.sourceBytes)} of video`,
            result.reencoded ? 're-encoded (aac)' : 'stream copy (lossless)'].join(' · ')
    } catch (err) {
        say(err?.code === 'no-audio'
            ? 'That file has no audio track we can read.'
            : (err?.message || String(err)), true)
    } finally {
        $('bar').hidden = true
        $('go').disabled = false
    }
})

/* ── what happens next ───────────────────────────────────────────────────── */
$('dl').addEventListener('click', () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = result.filename
    document.body.appendChild(a); a.click(); a.remove()
})

$('send').addEventListener('click', async () => {
    if (!result) return
    $('send').disabled = true
    try {
        // Same origin, same browser, no upload: the file is put where /app/ looks
        // on arrival, and taken from there exactly once.
        const { stash } = await import('../../shared/handoff.js')
        await stash(new File([result.blob], result.filename, { type: result.mime }),
                    { from: 'the extract-audio tool', note: `from ${result.sourceName}` })
        say('Handed over — opening the app…')
        location.href = '/app/'
    } catch (err) {
        say(`Could not hand it over (${err.message}) — download it and drop it into the app instead.`, true)
        $('send').disabled = false
    }
})

/* ── the API, published synchronously ────────────────────────────────────── */
const { upgraded, status: st } = publishApi()
const line = $('api-state')
const show = (text, ok) => { if (line) { line.textContent = text; line.dataset.state = ok ? 'ready' : 'degraded' } }
show(`✅ window.__tool is live (local implementation) · ${st.methods} actions`, true)
upgraded.then((api) => show(api
    ? `✅ window.__tool is live · SgToolApi · ${st.methods} actions`
    : `✅ window.__tool is live (local implementation) · all ${st.methods} actions work · the shared SgToolApi could not be loaded: ${st.engine.error}`,
    !!api))

fetch('/version.txt', { cache: 'no-store' }).then(r => r.ok ? r.text() : 'dev')
    .then(v => { document.getElementById('site-version').textContent = v.trim() }).catch(() => {})
