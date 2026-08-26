/* transcribe-media — a podcast episode or a YouTube video in, a transcript and
   a short analysis out.

   THIS TOOL IS THE ONE EXCEPTION TO THE NO-BACKEND RULE, and it is deliberate.
   Every other tool here runs entirely in the tab. This one cannot: fetching a
   podcast RSS feed, an episode MP3 or a YouTube transcript from a page on
   voicedebrief.ai is refused by the browser — none of those origins send an
   `Access-Control-Allow-Origin` for us, and no amount of front-end work talks
   past CORS. So the fetch, the speech-to-text and the analysis happen behind
   `n8n.itwithus.com`, and the page is a client.

   What that costs the visitor is stated on the page rather than buried here:
   the URL they paste is sent to that host, and the audio is transcribed there,
   not in their browser. No OpenRouter key is involved and nothing is billed to
   them — which is the other half of why it cannot follow the your-key-your-bill
   model the rest of the tools use.

   Two upstream shapes, one result:
     podcast  submit → a jobId → poll status until `done`  (an episode is long)
     youtube  transcript → analyse                          (two sync calls)

   `fetchImpl` is injectable so the tests can drive both shapes without a
   network, a host, or a real episode. */

export const ENDPOINTS = {
    podcast: {
        submit: 'https://n8n.itwithus.com/webhook/podcast-submit',
        status: 'https://n8n.itwithus.com/webhook/podcast-status',
    },
    youtube: {
        transcript: 'https://n8n.itwithus.com/webhook/youtube-transcript-raw-v2',
        analyze:    'https://n8n.itwithus.com/webhook/youtube-analyze',
    },
}

export const STEPS = {
    podcast: ['Submit', 'Fetch', 'Transcribe', 'Analyse', 'Done'],
    youtube: ['Submit', 'Transcribe', 'Analyse', 'Done'],
}

const TRANSCRIPT_TIMEOUT_MS = 90000
const ANALYZE_TIMEOUT_MS    = 90000
const POLL_INTERVAL_MS      = 3000
const POLL_MAX              = 120          // 120 × 3s = six minutes

/* An error with a `code` the caller can branch on, rather than a message it has
   to pattern-match — the same contract the other tools publish. */
export class ToolError extends Error {
    constructor(code, message) { super(message); this.name = 'ToolError'; this.code = code }
}

const APPLE   = /(^|\/\/|\.)podcasts\.apple\.com\//i
const SPOTIFY = /(^|\/\/|\.)spotify\.com\//i

export function youtubeId(url) {
    const m = String(url).match(/[?&]v=([\w-]{11})/)
           || String(url).match(/(?:youtu\.be\/|shorts\/|embed\/)([\w-]{11})/)
    return m ? m[1] : null
}

/* Which shape a URL wants, and whether we can serve it at all. Apple Podcasts
   and Spotify are named rather than lumped into "that did not work": both are
   the obvious thing to paste, and neither exposes the feed we would need. */
export function detect(url) {
    const u = String(url || '').trim()
    if (!u) return { mode: null, supported: false, reason: 'no-url' }
    if (/youtube\.com|youtu\.be/i.test(u)) {
        const id = youtubeId(u)
        return id
            ? { mode: 'youtube', videoId: id, supported: true }
            : { mode: 'youtube', videoId: null, supported: false, reason: 'bad-youtube-url' }
    }
    if (APPLE.test(u) || SPOTIFY.test(u)) {
        return { mode: 'podcast', supported: false, reason: 'unsupported-platform',
                 platform: APPLE.test(u) ? 'Apple Podcasts' : 'Spotify' }
    }
    return { mode: 'podcast', supported: true }
}

export function unsupportedPlatformMessage(platform) {
    return `${platform} links cannot be read directly — neither exposes the episode feed. `
         + 'Paste the podcast RSS feed URL, the episode page, or the direct MP3 link instead.'
}

function fetchWithTimeout(fetchImpl, url, options, ms) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    return fetchImpl(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer))
}

const postJson = (fetchImpl, url, body, ms) => fetchWithTimeout(fetchImpl, url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
}, ms)

const wordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length


/* ── The analysis text → { summary, keyPoints, topics } ──────────────────────
   The upstream model is not pinned to one markdown shape and has been observed
   emitting both `**Summary**` and `## Summary`, so both are parsed rather than
   one being declared correct and the other silently producing an empty card. */

const stripMd = (s) => String(s).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').trim()

const splitTopics = (raw) => String(raw)
    .replace(/^[-*•]\s*/gm, '')
    .split(/[,\n]/)
    .map(t => t.replace(/[[\]]/g, '').trim())
    .filter(Boolean)

export function parseAnalysis(text) {
    const out = { summary: '', keyPoints: [], topics: [] }
    if (!text) return out

    if (/\*\*[^*]+\*\*/.test(text)) {
        const parts = String(text).split(/\*\*([^*]+)\*\*/)
        for (let i = 1; i < parts.length; i += 2) {
            const head = parts[i].trim().toLowerCase()
            const body = (parts[i + 1] || '').trim()
            if (/summary/.test(head)) out.summary = body
            else if (/key.?point/.test(head)) {
                out.keyPoints = body.split('\n')
                    .filter(l => /^[-*•\d]/.test(l.trim()))
                    .map(l => stripMd(l.replace(/^[-*•]\s*|^\d+[.)]\s*/, '')))
                    .filter(Boolean)
            } else if (/topic/.test(head)) out.topics = splitTopics(body)
        }
        return out
    }

    const sections = {}
    const re = /##\s*(?:\d+[.)]\s*)?(.+?)\n([\s\S]*?)(?=\n##|$)/g
    let m
    while ((m = re.exec(text)) !== null) sections[m[1].toLowerCase().trim()] = m[2].trim()
    const find = (...kws) => {
        for (const k of Object.keys(sections)) if (kws.some(w => k.includes(w))) return sections[k]
        return ''
    }

    out.summary = find('summary')
        || String(text).split('\n').find(l => l.trim() && !l.startsWith('#'))
        || ''
    const kp = find('key point', 'key fact', 'main point', 'points')
    if (kp) out.keyPoints = kp.split('\n')
        .map(l => stripMd(l.replace(/^\d+[.)]\s*/, '').replace(/^[-*•]+\s*/, '')))
        .filter(l => l.length > 3)
    const topics = find('topic', 'theme')
    if (topics) out.topics = splitTopics(topics)
    return out
}


/* ── YouTube: two synchronous calls ──────────────────────────────────────────
   The transcript arrives first and is handed over through `onTranscript` before
   the analysis is asked for, because the transcript is the thing the visitor
   came for and the analysis is a second wait on top of it.

   An analysis failure is NOT a transcribe failure: it resolves with
   `analysis: null` so the transcript still lands. */

async function runYoutube(url, videoId, { fetchImpl, onStep, onTranscript }) {
    onStep(2)
    let r1
    try {
        r1 = await postJson(fetchImpl, ENDPOINTS.youtube.transcript, { url }, TRANSCRIPT_TIMEOUT_MS)
    } catch (e) {
        if (e.name === 'AbortError') {
            throw new ToolError('transcribe-timeout',
                'The transcript request timed out. The video may be too long — try a shorter one.')
        }
        throw new ToolError('transcribe-http', e.message || 'Could not reach the transcript service.')
    }
    if (!r1.ok) throw new ToolError('transcribe-http', `Transcript service returned HTTP ${r1.status}.`)

    let d1
    try { d1 = await r1.json() }
    catch { throw new ToolError('no-transcript', 'No transcript is available for this video.') }
    if (!d1.success || !d1.transcript) {
        throw new ToolError('no-transcript', d1.error || 'No transcript is available for this video.')
    }

    const result = {
        transcript:  d1.transcript,
        title:       d1.title || 'YouTube video',
        channel:     d1.channel || d1.channelTitle || d1.author || d1.uploader || 'YouTube',
        wordCount:   wordCount(d1.transcript),
        thumbnail:   `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        sourceLabel: 'YouTube',
        source:      'youtube',
        url,
        analysis:    null,
    }
    onTranscript(result)
    onStep(3)

    try {
        const r2 = await postJson(fetchImpl, ENDPOINTS.youtube.analyze,
            { transcript: d1.transcript, videoId: d1.videoId || videoId }, ANALYZE_TIMEOUT_MS)
        if (!r2.ok) throw new Error(`HTTP ${r2.status}`)
        const d2 = await r2.json()
        if (d2.success && d2.result) result.analysis = d2.result
    } catch { /* the transcript stands on its own; the page says the analysis is missing */ }

    return result
}


/* ── Podcast: submit, then poll ──────────────────────────────────────────────
   An hour of audio does not fit in one request, so the upstream hands back a
   jobId and the status endpoint reports `processing` → `transcribed` → `done`.
   `transcribed` is a real intermediate state and worth showing: the transcript
   is ready while the analysis is still running. */

const sleep = (ms) => new Promise(res => setTimeout(res, ms))

async function runPodcast(url, { fetchImpl, onStep, onTranscript }) {
    let sub
    try {
        sub = await postJson(fetchImpl, ENDPOINTS.podcast.submit, { url }, TRANSCRIPT_TIMEOUT_MS)
    } catch (e) {
        throw new ToolError('transcribe-http', e.message || 'Could not reach the transcription service.')
    }
    if (!sub.ok) throw new ToolError('transcribe-http', `Submit failed: HTTP ${sub.status}.`)
    const started = await sub.json()
    if (!started.jobId || started.status === 'error') {
        throw new ToolError('transcribe-http', started.error || 'The job could not be started.')
    }

    onStep(2)
    let handedOver = false

    for (let n = 0; n < POLL_MAX; n++) {
        await sleep(POLL_INTERVAL_MS)

        let d
        try {
            const r = await fetchImpl(`${ENDPOINTS.podcast.status}?jobId=${encodeURIComponent(started.jobId)}`)
            if (!r.ok) continue          // a blip mid-job is not a failed job
            d = await r.json()
        } catch { continue }

        const shape = () => ({
            transcript:  d.transcript || '',
            title:       d.episodeTitle || 'Episode',
            channel:     d.podcastName || 'Podcast',
            wordCount:   d.wordCount || wordCount(d.transcript),
            thumbnail:   d.thumbnail || null,
            sourceLabel: d.sourceLabel || 'Podcast',
            source:      'podcast',
            url:         d.podcastUrl || url,
            analysis:    d.analysis || null,
        })

        if (d.status === 'error') throw new ToolError('transcribe-http', d.error || 'Processing failed.')

        if (d.status === 'transcribed' && !handedOver) {
            onStep(4); onTranscript(shape()); handedOver = true
        } else if (d.status === 'processing') {
            onStep(n < 4 ? 2 : 3)
        } else if (d.status === 'done') {
            const result = shape()
            if (!handedOver) onTranscript(result)
            return result
        }
    }

    throw new ToolError('transcribe-timeout',
        'The job is taking longer than six minutes. It may still finish — try again shortly.')
}


/* ── The one entry point the button and the API both call ─────────────────────
   ONE implementation, so there is no API version to drift from the UI. */

export async function transcribe({ url, fetchImpl = globalThis.fetch?.bind(globalThis),
                                   onStep = () => {}, onTranscript = () => {} } = {}) {
    const target = String(url || '').trim()
    if (!target) throw new ToolError('no-url', 'Give me a podcast or YouTube URL.')

    const d = detect(target)
    if (d.reason === 'bad-youtube-url') {
        throw new ToolError('bad-youtube-url', "That does not look like a valid YouTube URL.")
    }
    if (d.reason === 'unsupported-platform') {
        throw new ToolError('unsupported-platform', unsupportedPlatformMessage(d.platform))
    }

    const startedAt = Date.now()
    onStep(1)
    const result = d.mode === 'youtube'
        ? await runYoutube(target, d.videoId, { fetchImpl, onStep, onTranscript })
        : await runPodcast(target, { fetchImpl, onStep, onTranscript })

    result.tookMs = Date.now() - startedAt
    result.parsed = parseAnalysis(result.analysis)
    return result
}


/* ── The agent surface ───────────────────────────────────────────────────────
   Published SYNCHRONOUSLY during module evaluation, for the reason written up
   on the text-to-speech tool: an API that waits on the network is undefined
   exactly when a sandboxed agent looks for it. */

let last = null

export function publishApi(target = globalThis) {
    const ACTIONS = {
        transcribe: async (params = {}) => {
            const r = await transcribe(params)
            last = r
            target.dispatchEvent?.(new CustomEvent('transcribe:done', {
                detail: { ...r, transcript: undefined, transcriptChars: r.transcript.length },
            }))
            return r
        },
        detect:   (params = {}) => detect(params.url),
        getSteps: (params = {}) => ({ steps: STEPS[params.mode] || STEPS.podcast }),
        getLast:  () => last,
        saveLast: (params = {}) => {
            if (!last) throw new ToolError('no-result', 'Nothing has been transcribed yet.')
            const name = (params.filename || last.title || 'transcript')
                .replace(/[^\w\- ]+/g, '').trim() || 'transcript'
            const blob = new Blob([last.transcript], { type: 'text/plain;charset=utf-8' })
            const a = target.document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `${name}.txt`
            target.document.body.appendChild(a)
            a.click()
            target.document.body.removeChild(a)
            URL.revokeObjectURL(a.href)
            return { filename: `${name}.txt`, bytes: blob.size }
        },
    }

    target.__tool = ACTIONS
    target.__toolStatus = {
        tool: 'transcribe-media', ready: true, methods: Object.keys(ACTIONS).length,
        mode: 'local',
        backend: { origin: 'https://n8n.itwithus.com',
                   why: 'CORS — a podcast feed, an episode MP3 and a YouTube transcript cannot be fetched from this origin' },
    }
    target.dispatchEvent?.(new CustomEvent('tool:ready', { detail: target.__toolStatus }))
    return ACTIONS
}
