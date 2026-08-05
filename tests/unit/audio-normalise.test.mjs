/* Unit tests — audio-normalise.js (the issue-025 fix).
   Runs under `node --test`; Node 20+ provides File/Blob globals. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { sniffAudio, normaliseAudioFile } from '../../website/app/audio-normalise.js'

const fixture = (name) => readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)))
const opusBytes = fixture('whatsapp-voice-note-1.opus')

test('sniffAudio identifies a real WhatsApp voice note as Opus-in-Ogg', () => {
    assert.deepEqual(sniffAudio(new Uint8Array(opusBytes.subarray(0, 64))), { container: 'ogg', codec: 'opus' })
})

test('sniffAudio identifies m4a (ftyp M4A) and wav (RIFF/WAVE) headers', () => {
    const m4a = new Uint8Array(16)
    m4a.set([0, 0, 0, 24], 0)
    m4a.set([...'ftypM4A '].map(c => c.charCodeAt(0)), 4)
    assert.equal(sniffAudio(m4a).container, 'mp4')

    const wav = new Uint8Array(16)
    wav.set([...'RIFF'].map(c => c.charCodeAt(0)), 0)
    wav.set([...'WAVE'].map(c => c.charCodeAt(0)), 8)
    assert.deepEqual(sniffAudio(wav), { container: 'wav', codec: 'pcm' })
})

test('sniffAudio returns unknown for junk bytes', () => {
    assert.equal(sniffAudio(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])).container, 'unknown')
})

/* The issue-025 matrix: every lying name/MIME combination must come out as a
   truthful .opus/audio/opus File so the engine takes its proven decode path. */
for (const [name, type] of [
    ['note.ogg', 'application/ogg'],
    ['note.ogg', 'video/ogg'],
    ['note.ogg', 'audio/ogg'],
    ['note.bin', ''],
    ['note.opus', 'application/octet-stream'],
]) {
    test(`normaliseAudioFile renames "${name}" (${type || 'no MIME'}) to .opus/audio/opus`, async () => {
        const r = await normaliseAudioFile(new File([opusBytes], name, { type }))
        assert.equal(r.changed, true)
        assert.match(r.file.name, /\.opus$/)
        assert.equal(r.file.type, 'audio/opus')
        assert.deepEqual(r.sniffed, { container: 'ogg', codec: 'opus' })
        assert.equal(r.file.size, opusBytes.length, 'bytes must be untouched')
    })
}

test('normaliseAudioFile leaves an already-truthful .opus file alone', async () => {
    const r = await normaliseAudioFile(new File([opusBytes], 'note.opus', { type: 'audio/opus' }))
    assert.equal(r.changed, false)
    assert.equal(r.file.name, 'note.opus')
})

test('normaliseAudioFile leaves unrecognised content alone', async () => {
    const r = await normaliseAudioFile(new File([new Uint8Array([9, 9, 9, 9])], 'x.txt', { type: 'text/plain' }))
    assert.equal(r.changed, false)
})
