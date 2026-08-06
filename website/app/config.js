/* App configuration — the only file with tunable constants.
   The engine origin can be overridden for dev/tests with ?origin=<url>,
   but ONLY to an allowlisted origin: everything imported from it executes
   in this page, where the user's OpenRouter key lives (issue 037, S1 —
   a crafted ?origin= link must not load attacker code). */

const qs = new URLSearchParams(location.search)

const DEFAULT_ORIGIN = 'https://dev.tools.sgraph.ai'
const ALLOWED_ORIGIN_HOSTS = ['dev.tools.sgraph.ai', 'tools.sgraph.ai', 'localhost', '127.0.0.1']

const safeOrigin = (raw) => {
    if (!raw) return DEFAULT_ORIGIN
    try {
        const u = new URL(raw)
        if ((u.protocol === 'https:' || u.protocol === 'http:') &&
            ALLOWED_ORIGIN_HOSTS.includes(u.hostname)) return u.origin
    } catch { /* not a URL — fall through to the default */ }
    console.warn(`[config] ?origin=${raw} is not allowlisted — using ${DEFAULT_ORIGIN}`)
    return DEFAULT_ORIGIN
}

export const ORIGIN = safeOrigin(qs.get('origin'))

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
