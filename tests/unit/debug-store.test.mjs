/* Unit tests — debug-store.js (the issue-027 capture layer + prompt overrides). */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// localStorage shim — the store touches it lazily, per call.
const backing = new Map()
globalThis.localStorage = {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => backing.set(k, String(v)),
    removeItem: (k) => backing.delete(k),
}

const { debugStore } = await import('../../website/app/debug-store.js')

beforeEach(() => { backing.clear(); debugStore.clearExchanges() })

test('record + update keeps one entry per call with merged fields', () => {
    const rec = debugStore.record({ kind: 'summary', model: 'm', status: 'pending', request: { messages: [] } })
    debugStore.update(rec.id, { status: 'done', response: { content: 'hi', latencyMs: 5 } })
    const list = debugStore.getExchanges()
    assert.equal(list.length, 1)
    assert.equal(list[0].status, 'done')
    assert.equal(list[0].response.content, 'hi')
})

test('recordEngineExchange folds pending → done by version id', () => {
    debugStore.recordEngineExchange({ vid: 'v1', model: 'm', status: 'pending', request: { prompt: 'P', audio: { name: 'a.opus' } } })
    debugStore.recordEngineExchange({ vid: 'v1', model: 'm', status: 'done', request: { prompt: 'P', audio: { name: 'a.opus' } }, response: { content: 'text' } })
    const list = debugStore.getExchanges()
    assert.equal(list.length, 1)
    assert.equal(list[0].kind, 'transcribe')
    assert.equal(list[0].status, 'done')
})

test('the live engine default is learned from the first exchange', () => {
    debugStore.recordEngineExchange({ vid: 'v2', status: 'pending', request: { prompt: 'ENGINE DEFAULT WORDING' } })
    const p = debugStore.getPrompts().find(p => p.kind === 'transcribe')
    assert.equal(p.defaultText, 'ENGINE DEFAULT WORDING')
})

test('getExchanges filters by kind and respects limit', () => {
    debugStore.record({ kind: 'summary', status: 'done' })
    debugStore.record({ kind: 'infographic', status: 'done' })
    assert.equal(debugStore.getExchanges({ kind: 'summary' }).length, 1)
    assert.equal(debugStore.getExchanges({ limit: 1 }).length, 1)
})

test('setPrompt persists an override; resetPrompt returns to the default', () => {
    debugStore.setPromptDefault('summary', 'DEFAULT')
    assert.equal(debugStore.getPrompt('summary'), 'DEFAULT')
    debugStore.setPrompt({ kind: 'summary', text: 'OVERRIDE' })
    assert.equal(debugStore.getPrompt('summary'), 'OVERRIDE')
    assert.equal(backing.get('wa-prompt-override:summary'), 'OVERRIDE')
    debugStore.resetPrompt({ kind: 'summary' })
    assert.equal(debugStore.getPrompt('summary'), 'DEFAULT')
})

test('setPrompt rejects unknown kinds and empty text', () => {
    assert.throws(() => debugStore.setPrompt({ kind: 'nope', text: 'x' }), /unknown prompt kind/)
    assert.throws(() => debugStore.setPrompt({ kind: 'summary', text: '   ' }), /requires/)
})

test('applyTranscribeOverride swaps the text part only in messages carrying audio', () => {
    debugStore.setPrompt({ kind: 'transcribe', text: 'CUSTOM INSTRUCTION' })
    const req = { model: 'm', messages: [
        { role: 'user', content: [ { type: 'text', text: 'engine default' },
                                   { type: 'binary_file', name: 'a.opus', data_url: 'data:...' } ] },
    ] }
    const out = debugStore.applyTranscribeOverride(req)
    assert.equal(out.messages[0].content[0].text, 'CUSTOM INSTRUCTION')
    assert.equal(out.messages[0].content[1].data_url, 'data:...', 'audio part untouched')
    assert.equal(req.messages[0].content[0].text, 'engine default', 'original request not mutated')
})

test('applyTranscribeOverride is a no-op without an override or without audio', () => {
    const chat = { messages: [{ role: 'user', content: 'plain text ask' }] }
    assert.equal(debugStore.applyTranscribeOverride(chat), chat)
    debugStore.setPrompt({ kind: 'transcribe', text: 'CUSTOM' })
    const out = debugStore.applyTranscribeOverride(chat)
    assert.equal(out.messages[0].content, 'plain text ask', 'chat-only messages untouched')
})
