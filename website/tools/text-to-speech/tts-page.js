/* The tool page's bootstrap. A separate FILE rather than an inline module for
   one reason: CI's cache-buster stamps `?v=` onto script src= attributes and
   onto relative imports inside .js files, but it cannot reach an import written
   inline in HTML. A page whose logic is inline therefore keeps loading last
   deploy's tts-tool.js for as long as the CDN caches it — the same trap issue
   026 recorded, and the one issue 050 found again in component CSS. */

import { wirePage, publishApi } from './tts-tool.js'

wirePage()

// The API is a bonus, not a dependency: if the engine origin is unreachable the
// page still works for a human. Agents wait for window.__tool (or `tool:ready`),
// which only appears when it is genuinely ready.
publishApi().catch(err => console.warn('[tts] JS API unavailable:', err.message))

fetch('/version.txt', { cache: 'no-store' }).then(r => r.ok ? r.text() : 'dev')
    .then(v => { document.getElementById('site-version').textContent = v.trim() })
    .catch(() => {})
