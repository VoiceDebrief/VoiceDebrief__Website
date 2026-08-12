/* The hand-off: one page makes a file, another page uses it (issue 065).

   The extract-audio tool produces an `.m4a`; the app transcribes one. Asking a
   person to download it and then drag it back in is a step that exists only
   because we did not build this.

   Why IndexedDB and not something simpler:

   - a Blob cannot travel in a URL, and a multi-megabyte base64 string in
     sessionStorage would blow the ~5 MB quota on any real recording;
   - IndexedDB stores the Blob itself, at whatever size the browser allows;
   - both pages are the same origin, so nothing crosses a boundary. The audio
     never leaves the browser — which is the whole estate's promise, and a
     hand-off that quietly uploaded a file to carry it 200ms across a
     navigation would break it.

   NO URL PARAMETER IS INVOLVED. Issue 041's rule is that no parameter may decide
   what code loads; this decides nothing at all — the app always looks, and
   almost always finds nothing. What it finds is data the user put there, on this
   device, one click ago.

   Single-slot on purpose: `stash()` replaces whatever was there, and `take()`
   is destructive. A hand-off is a baton, not an inbox — a file that survives to
   be picked up twice is a file the user forgot they sent. */

const DB = 'voicedebrief-handoff'
const STORE = 'pending'
const SLOT = 'file'
const MAX_AGE_MS = 30 * 60 * 1000      // a stale baton is a surprise, not a feature

const open = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
})

const tx = async (mode, fn) => {
    const db = await open()
    try {
        return await new Promise((resolve, reject) => {
            const t = db.transaction(STORE, mode)
            const req = fn(t.objectStore(STORE))
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => reject(req.error)
        })
    } finally { db.close() }
}

/** Put a file where the next page can find it. `from` names the sender, for the UI. */
export async function stash (file, { from = 'a tool', note = '' } = {}) {
    if (!(file instanceof Blob)) throw Object.assign(new Error('stash: expected a File or Blob'), { code: 'no-file' })
    const record = { file, name: file.name || 'audio.m4a', type: file.type || '', size: file.size,
                     from, note, at: Date.now() }
    await tx('readwrite', (s) => s.put(record, SLOT))
    return { name: record.name, size: record.size, from }
}

/** Take it — and it is gone. Returns null when there is nothing, or it went stale. */
export async function take () {
    let rec = null
    try { rec = await tx('readonly', (s) => s.get(SLOT)) } catch (_) { return null }
    if (!rec) return null
    try { await tx('readwrite', (s) => s.delete(SLOT)) } catch (_) { /* best effort */ }
    if (Date.now() - rec.at > MAX_AGE_MS) return null
    // Rebuild a real File so the receiving page cannot tell the difference
    // between this and something the user dropped on it.
    const file = rec.file instanceof File
        ? rec.file
        : new File([rec.file], rec.name, { type: rec.type || 'audio/mp4' })
    return { file, from: rec.from, note: rec.note, at: rec.at }
}

/** Is something waiting? Non-destructive — for a page that wants to ask first. */
export async function peek () {
    try {
        const rec = await tx('readonly', (s) => s.get(SLOT))
        if (!rec || Date.now() - rec.at > MAX_AGE_MS) return null
        return { name: rec.name, size: rec.size, from: rec.from, note: rec.note, at: rec.at }
    } catch (_) { return null }
}

/** Drop anything waiting, without taking it. */
export async function clear () {
    try { await tx('readwrite', (s) => s.delete(SLOT)) } catch (_) { /* nothing to do */ }
}

/* The receiving half, here rather than in the page that uses it — so the
   behaviour that matters (take it, show it, SAY where it came from) is one
   tested function instead of five lines copied into whatever page next wants a
   hand-over. The app cannot be booted in a sandbox without the engine origin,
   so this is also the only way the receiving path gets real test coverage. */
export async function receive ({ onFile, mount, label = 'Ready to transcribe.' } = {}) {
    let pending = null
    try { pending = await take() } catch (_) { return null }
    if (!pending) return null

    onFile?.(pending.file)

    // Announced, never silent: a file that appears with no explanation is a file
    // the user did not put there as far as they can tell.
    if (mount) {
        const note = document.createElement('p')
        note.className = 'handoff-note'
        note.textContent = `🎙 Audio ${pending.note || ''} — handed over by ${pending.from}. ${label}`.replace(/\s+/g, ' ')
        mount.prepend(note)
    }
    return pending
}
