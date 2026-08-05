/* audio-normalise.js — detect the format by CONTENT, not by extension.

   The 27 July arch brief made this a design rule ("the client should accept both
   codec families and detect by content rather than by extension"). The shared
   engine decides its decode path from the filename extension and the MIME the
   OS happened to attach, which is not the same thing — and when the OS attaches
   `application/ogg` or `video/ogg` to a WhatsApp voice note (both common on
   Windows/Linux registries), the raw Opus bytes are passed straight to the model
   labelled as something it cannot decode. The model does not error: it
   HALLUCINATES a plausible transcript of audio the user never recorded.
   (Reproduced 5 Aug 2026 with a real key — see issue 025.)

   So before anything reaches the engine we read the first bytes, work out what
   the file actually is, and hand the engine a File whose name and type tell the
   truth. Opus-in-Ogg is renamed/retyped to `.opus`/`audio/opus`, which is the
   engine's own signal to run its never-fail decode to WAV — the path that is
   proven to work for exactly these bytes. */

const HEAD_BYTES = 64

const asciiAt = (bytes, offset, length) => {
    let s = ''
    for (let i = offset; i < offset + length && i < bytes.length; i++) s += String.fromCharCode(bytes[i])
    return s
}

/**
 * Sniff a container/codec from the leading bytes.
 * @param {Uint8Array} b
 * @returns {{container:string, codec:string}}
 */
export function sniffAudio(b) {
    if (asciiAt(b, 0, 4) === 'OggS') {
        // The first Ogg page holds the codec identification header.
        const head = asciiAt(b, 0, Math.min(b.length, HEAD_BYTES))
        if (head.includes('OpusHead')) return { container: 'ogg', codec: 'opus' }
        if (head.includes('vorbis'))   return { container: 'ogg', codec: 'vorbis' }
        if (head.includes('FLAC'))     return { container: 'ogg', codec: 'flac' }
        return { container: 'ogg', codec: 'unknown' }
    }
    if (asciiAt(b, 4, 4) === 'ftyp') {
        const brand = asciiAt(b, 8, 4)
        return { container: 'mp4', codec: brand.startsWith('M4A') || brand.startsWith('mp4') || brand.startsWith('iso') ? 'aac' : 'unknown' }
    }
    if (asciiAt(b, 0, 4) === 'RIFF' && asciiAt(b, 8, 4) === 'WAVE') return { container: 'wav', codec: 'pcm' }
    if (asciiAt(b, 0, 4) === 'fLaC') return { container: 'flac', codec: 'flac' }
    if (asciiAt(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { container: 'mp3', codec: 'mp3' }
    if (asciiAt(b, 0, 4) === '\x1aE\xdf\xa3') return { container: 'webm', codec: 'unknown' }
    return { container: 'unknown', codec: 'unknown' }
}

/**
 * Normalise a user-supplied file so the engine's decode decision is made on
 * what the file IS, not what it is called.
 *
 * @param {File} file
 * @returns {Promise<{ file: File, sniffed: {container:string,codec:string}, changed: boolean, reason?: string }>}
 */
export async function normaliseAudioFile(file) {
    let bytes
    try { bytes = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer()) }
    catch { return { file, sniffed: { container: 'unknown', codec: 'unknown' }, changed: false } }

    const sniffed = sniffAudio(bytes)

    // Opus in Ogg (every WhatsApp voice note from a laptop download or Android
    // export) → make the engine decode it to WAV, whatever the file is called.
    if (sniffed.container === 'ogg' && sniffed.codec === 'opus') {
        const alreadyRight = /\.opus$/i.test(file.name) && String(file.type).toLowerCase().includes('opus')
        if (alreadyRight) return { file, sniffed, changed: false }
        const base = file.name.replace(/\.[a-z0-9]+$/i, '') || 'voice-note'
        return {
            file: new File([file], `${base}.opus`, { type: 'audio/opus', lastModified: file.lastModified }),
            sniffed, changed: true,
            reason: `Opus-in-Ogg detected by content (was "${file.name}", type "${file.type || 'none'}") — routed through the decoder`,
        }
    }

    // Any other real audio container wearing a non-audio MIME (application/ogg,
    // video/ogg, octet-stream…) gets the truthful audio MIME, so the data URL the
    // engine builds declares what the bytes actually are.
    const AUDIO_MIME = { ogg: 'audio/ogg', mp4: 'audio/mp4', wav: 'audio/wav', flac: 'audio/flac', mp3: 'audio/mpeg', webm: 'audio/webm' }
    const truthful = AUDIO_MIME[sniffed.container]
    if (truthful && !String(file.type).toLowerCase().startsWith('audio/')) {
        return {
            file: new File([file], file.name, { type: truthful, lastModified: file.lastModified }),
            sniffed, changed: true,
            reason: `${sniffed.container} container detected by content; MIME corrected from "${file.type || 'none'}" to "${truthful}"`,
        }
    }

    return { file, sniffed, changed: false }
}
