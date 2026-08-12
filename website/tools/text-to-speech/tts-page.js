/* The tool page's bootstrap. A separate FILE rather than an inline module for
   one reason: CI's cache-buster stamps `?v=` onto script src= attributes and
   onto relative imports inside .js files, but it cannot reach an import written
   inline in HTML. A page whose logic is inline therefore keeps loading last
   deploy's tts-tool.js for as long as the CDN caches it — the same trap issue
   026 recorded, and the one issue 050 found again in component CSS. */

import { wirePage, publishApi } from './tts-tool.js'

wirePage()

/* The API first, and SYNCHRONOUSLY: `window.__tool` exists by the time this
   module finishes evaluating, before the page has finished loading, whatever
   the engine origin is doing. See tts-tool.js for why that ordering matters —
   an agent found the old ordering unusable. */
const { upgraded, status } = publishApi()

/* Say the state out loud, on the page and in the DOM. A `console.warn` inside a
   `.catch()` is invisible to anything reading only console errors, which is how
   a working page looked broken. */
const line = document.getElementById('api-state')
const show = (text, ok) => {
    if (!line) return
    line.textContent = text
    line.dataset.state = ok ? 'ready' : 'degraded'
}
show('✅ window.__tool is live (local implementation) — loading the shared primitive…', true)

upgraded.then((api) => {
    if (api) return show('✅ window.__tool is live · SgToolApi from dev.tools.sgraph.ai · '
        + `${status.methods} actions`, true)
    show('✅ window.__tool is live (local implementation) · all '
        + `${status.methods} actions work · the shared SgToolApi could not be loaded from `
        + `${status.engine.origin}: ${status.engine.error}`, false)
    console.warn('[tts] SgToolApi unavailable, running the local API:', status.engine.error)
})

fetch('/version.txt', { cache: 'no-store' }).then(r => r.ok ? r.text() : 'dev')
    .then(v => { document.getElementById('site-version').textContent = v.trim() })
    .catch(() => {})
