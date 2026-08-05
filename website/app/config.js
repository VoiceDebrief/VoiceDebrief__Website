/* App configuration — the only file with tunable constants.
   The engine origin can be overridden for dev/tests with ?origin=<url>. */

const qs = new URLSearchParams(location.search)

export const ORIGIN = qs.get('origin') || 'https://dev.tools.sgraph.ai'

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
