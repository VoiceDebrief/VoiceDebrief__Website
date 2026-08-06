/* App configuration — the only file with tunable constants. */

/* The audio-transcribe engine's ES modules are imported from here at runtime
   (website/app/engine.js). This is HARDCODED and deliberately not overridable.

   It used to accept a `?origin=` query parameter for development. That made a URL
   parameter decide which JavaScript executes inside this page — beside the user's
   OpenRouter key in localStorage — so a link carrying our own trusted domain
   (…/app/?origin=https://somewhere-else) could run someone else's code and take
   the key. An allow-list would close that, but the parameter earned its keep only
   in development, and the tests get there by intercepting requests to this origin
   rather than by rewriting it. A capability that exists for nobody is best removed
   (issue 041; Dinis, 6 Aug: "the solution is not to have that feature at all").

   To point a local checkout at a different engine build, change this line. */
export const ORIGIN = 'https://dev.tools.sgraph.ai'

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
