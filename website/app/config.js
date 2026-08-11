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

/* Costs: the engine meters in USD; the product speaks the active culture's
   currency (issue 050 M1c). Every locale currently declares GBP (Dinis, 8 Aug) —
   one currency everywhere ON PURPOSE, while payments are unsettled, so we avoid
   exchange-rate and pricing-parity problems. Because the rate and symbol are
   DATA (locales/<locale>/culture.json), the day payments want EUR or BRL is a
   data change rather than a refactor.

   fmtGbp is kept as the compatibility name — it is what the flow panel, the
   chat meter and the cost line already call, and renaming those call sites is
   churn without benefit. It now delegates, so money is culture-driven
   everywhere at once. Output is byte-identical to the old implementation
   (verified by the existing unit and browser tests, which were not changed).

   USD_TO_GBP stays as the documented default rate; culture.json declares the
   same 0.79 and is what actually applies once i18n has initialised. */
export const USD_TO_GBP = 0.79

export { fmtMoney, fmtMoney as fmtGbp } from './i18n.js'

/* The summary prompt is a markdown file served from the site (5 Aug decision) —
   editable without touching code. */
export const SUMMARY_PROMPT_URL = './prompts/summary-prompt.md'
export const INFOGRAPHIC_PROMPT_URL = './prompts/infographic-prompt.md'
export const TRANSLATE_PROMPT_URL = './prompts/translate-prompt.md'
export const CLASSIFY_PROMPT_URL  = './prompts/classify-prompt.md'
