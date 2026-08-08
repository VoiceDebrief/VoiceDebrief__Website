/* debug-store.js — the advanced/debug capture layer (issue 027).

   One in-memory log of every LLM exchange the page makes (transcription, summary
   ask, infographic), plus the prompt override registry. The store is a singleton
   module: engine.js, pipeline.js and infographic.js record into it; the UI reads
   it only through the published window.__tool actions (getExchanges, getPrompts,
   setPrompt, resetPrompt) and the wa:debug:* events — the pane is just another
   API consumer.

   Nothing here ever leaves the browser: entries live in memory for the session;
   prompt overrides persist in localStorage. */

const OVERRIDE_PREFIX = 'wa-prompt-override:'
const MAX_ENTRIES = 200

/* The engine's built-in transcription instruction (api-transcribe.js). Kept as a
   seed only — the store re-learns the live default from the first real exchange,
   so an upstream wording change shows up here without a code change. */
const TRANSCRIBE_PROMPT_SEED =
    'Transcribe the following audio to plain text. Return only the transcript, with no preamble, commentary, or formatting.'

const PROMPT_KINDS = {
    transcribe: {
        label: 'Audio transcription',
        note: 'Sent with the audio bytes. The engine default is replaced at request time when you save an override.',
        defaultText: TRANSCRIBE_PROMPT_SEED,
    },
    translate: {
        label: 'Translation',
        note: 'Used when "translate it into my language first" is on (issue 055). {{language}} and {{tone}} are filled from the active locale\'s culture data before sending (served from ./prompts/translate-prompt.md).',
        defaultText: null,   // learned when the pipeline fetches the site file
    },
    summary: {
        label: 'Summary document',
        note: 'The markdown prompt asked over the transcript (served from ./prompts/summary-prompt.md).',
        defaultText: null,   // learned when the pipeline fetches the site file
    },
    infographic: {
        label: 'Infographic content preamble',
        note: 'Prepended to the transcript + summary for the infographic call (./prompts/infographic-prompt.md).',
        defaultText: null,
    },
    chat: {
        label: 'Chat system prompt',
        note: 'The system message for the chat panel (./prompts/chat-prompt.md). The tool-calling instructions are appended at runtime and are not editable here.',
        defaultText: null,   // learned when the chat first fetches the site file
    },
    'infographic-system': {
        label: 'Infographic system prompt',
        note: 'The system message for the infographic call. Used as-is by the image models; for the drawn-SVG model the style preset supplies it unless you override here.',
        defaultText: 'You are a professional infographic designer. Create a high-quality, publication-ready infographic image. Use a clean dark navy background (#0d1b2a), white headings, teal and blue-grey accents. Clear layout with visual groupings, icons, and data callouts. Render as a landscape image.',
    },
}

let seq = 0
const entries = []
let emitFn = null

const lsGet = (k) => { try { return localStorage.getItem(k) } catch (_) { return null } }
const lsSet = (k, v) => { try { localStorage.setItem(k, v) } catch (_) {} }
const lsDel = (k) => { try { localStorage.removeItem(k) } catch (_) {} }

function notify(name, detail) { if (emitFn) emitFn(name, detail) }

/** engine.js hands over its SgToolApi emit so entries surface as wa:debug:* events. */
function bindEmit(fn) { emitFn = fn }

/** Append one exchange entry. Returns the entry (with its id) for later update(). */
function record(entry) {
    const e = { id: ++seq, ts: entry.ts || Date.now(), ...entry }
    entries.push(e)
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES)
    notify('wa:debug:exchange', { id: e.id, kind: e.kind, status: e.status })
    return e
}

/** Merge fields into an existing entry (matched by id). */
function update(id, patch) {
    const e = entries.find(x => x.id === id)
    if (!e) return null
    Object.assign(e, patch)
    notify('wa:debug:exchange', { id: e.id, kind: e.kind, status: e.status })
    return e
}

/* The engine's onExchange fires once as 'pending' and again with the outcome for
   the same version id — fold both into one entry so the log reads one row per call. */
function recordEngineExchange(x) {
    const active = getOverride('transcribe')
    if (x.request && x.request.prompt) {
        if (!active) PROMPT_KINDS.transcribe.defaultText = x.request.prompt   // learn the live default
        else x = { ...x, request: { ...x.request, prompt: active, promptOverridden: true } }
    }
    const existing = x.vid ? entries.find(e => e.kind === 'transcribe' && e.vid === x.vid) : null
    if (existing) return update(existing.id, x)
    return record({ kind: 'transcribe', stage: 'transcript', ...x })
}

function getExchanges(params = {}) {
    let list = entries
    if (params.kind) list = list.filter(e => e.kind === params.kind)
    if (params.status) list = list.filter(e => e.status === params.status)
    const limit = params.limit || 100
    return list.slice(-limit).map(e => ({ ...e }))
}

function clearExchanges() {
    entries.length = 0
    notify('wa:debug:cleared', {})
    return { ok: true }
}

// --- prompt overrides ---------------------------------------------------------

function getOverride(kind) { return lsGet(OVERRIDE_PREFIX + kind) }

/** The text actually used for a prompt kind right now (override, else default). */
function getPrompt(kind) {
    const def = PROMPT_KINDS[kind]
    if (!def) return null
    const override = getOverride(kind)
    return override != null ? override : def.defaultText
}

/** Full view of all three prompts for the pane. */
function getPrompts() {
    return Object.entries(PROMPT_KINDS).map(([kind, def]) => ({
        kind, label: def.label, note: def.note,
        defaultText: def.defaultText,
        override: getOverride(kind),
        active: getPrompt(kind),
    }))
}

function setPrompt(params = {}) {
    const { kind, text } = params
    if (!PROMPT_KINDS[kind]) throw Object.assign(new Error(`unknown prompt kind: ${kind}`), { code: 'bad-params' })
    if (typeof text !== 'string' || !text.trim()) throw Object.assign(new Error('setPrompt requires { kind, text }'), { code: 'bad-params' })
    lsSet(OVERRIDE_PREFIX + kind, text)
    notify('wa:debug:prompt-changed', { kind, overridden: true })
    return { ok: true, kind, overridden: true }
}

function resetPrompt(params = {}) {
    const { kind } = params
    if (!PROMPT_KINDS[kind]) throw Object.assign(new Error(`unknown prompt kind: ${kind}`), { code: 'bad-params' })
    lsDel(OVERRIDE_PREFIX + kind)
    notify('wa:debug:prompt-changed', { kind, overridden: false })
    return { ok: true, kind, overridden: false }
}

/** Record the site-served default once the pipeline fetches it. */
function setPromptDefault(kind, text) {
    if (PROMPT_KINDS[kind] && typeof text === 'string') PROMPT_KINDS[kind].defaultText = text
}

// --- transcription prompt override, applied at the transport ------------------

/* The engine hardcodes its transcription instruction, so the override happens in
   the one place we own: the request on its way to the LLM bus. A transcription
   request is recognisable by its shape — one user message whose content pairs a
   text part with a binary_file part. Anything else passes through untouched. */
function applyTranscribeOverride(req) {
    const override = getOverride('transcribe')
    if (!override || !req || !Array.isArray(req.messages)) return req
    const messages = req.messages.map(m => {
        if (!Array.isArray(m.content)) return m
        const hasAudio = m.content.some(p => p && p.type === 'binary_file')
        if (!hasAudio) return m
        return { ...m, content: m.content.map(p => (p && p.type === 'text') ? { ...p, text: override } : p) }
    })
    return { ...req, messages }
}

export const debugStore = {
    bindEmit, record, update, recordEngineExchange,
    getExchanges, clearExchanges,
    getPrompt, getPromptOverride: getOverride, getPrompts, setPrompt, resetPrompt, setPromptDefault,
    applyTranscribeOverride,
}
