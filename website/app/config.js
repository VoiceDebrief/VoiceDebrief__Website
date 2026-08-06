/* App configuration — the only file with tunable constants. */

const qs = new URLSearchParams(location.search)

/* Where the audio-transcribe engine's ES modules are imported from at runtime.
   `?origin=` overrides it for development and tests — but ONLY to an origin on
   the allow-list below (found and fixed independently by two sessions on 6 Aug:
   issue 037 item 1 on dev, issue 041 on qa — this is the stricter merge).

   Why the allow-list: whatever this resolves to, engine.js does `import()` on
   it, so the value decides which JavaScript executes inside this page — with
   access to the user's OpenRouter key in localStorage. Without the check, a link
   carrying OUR OWN trusted domain
   (…/app/?origin=https://somewhere-else) would run someone else's code and could
   post the key anywhere. That is a credential-theft vector wearing a legitimate
   URL, so an unrecognised origin is ignored rather than trusted. */
const ALLOWED_ORIGINS = [
    /^https:\/\/(dev\.)?tools\.sgraph\.ai$/,              // the real engine, dev + prod
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,       // local dev and the test mirror
]

export const DEFAULT_ORIGIN = 'https://dev.tools.sgraph.ai'

export function resolveOrigin(requested) {
    if (!requested) return DEFAULT_ORIGIN
    const clean = String(requested).replace(/\/+$/, '')
    if (ALLOWED_ORIGINS.some(re => re.test(clean))) return clean
    // Loud, because a blocked override means the page is not running what the
    // link asked for — and because it may be someone else's attempt, not a typo.
    console.warn(`[whatsapp-transcribe] ignoring ?origin=${requested} — not an allowed engine origin. ` +
                 `Using ${DEFAULT_ORIGIN}.`)
    return DEFAULT_ORIGIN
}

export const ORIGIN = resolveOrigin(qs.get('origin'))

/* Costs: the engine meters in USD; the product speaks GBP (5 Aug decision).
   Fixed, versioned rate — reviewed when pricing goes live, not a live feed. */
export const USD_TO_GBP = 0.79

export const fmtGbp = (usd) =>
    (usd == null || Number.isNaN(usd)) ? '£—'
    : '£' + (usd * USD_TO_GBP).toFixed(usd * USD_TO_GBP < 0.10 ? 3 : 2)

/* The summary prompt is a markdown file served from the site (5 Aug decision) —
   editable without touching code. */
export const SUMMARY_PROMPT_URL = './prompts/summary-prompt.md'
export const INFOGRAPHIC_PROMPT_URL = './prompts/infographic-prompt.md'
