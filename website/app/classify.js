/* classify.js — turning a model's answer about the transcript into TYPED FACTS.

   The classify step reads untrusted text (whatever somebody said into their
   phone) and returns metadata that the rest of the run then acts on — most
   consequentially, whether the translate step needs to happen at all. That makes
   this file a trust boundary, and it is written as one.

   THREE RULES, each of which has a reason rather than a preference behind it.

   1. EVERY VALUE RESOLVES TO AN ALLOWLIST KEY. `register`, `sentiment`,
      `urgency` and every entry in `signals` are matched against a fixed set;
      anything else is dropped, not passed through. This is the issue-041 rule
      applied one layer in: a value that decides what the product does must never
      be free text a stranger can author.

   2. NOTHING FROM HERE IS EVER PUT BACK INTO A PROMPT. The topics and the
      one-line gist are display-only strings. If they were interpolated into the
      summary or infographic prompt, a voice note could write our instructions —
      which is precisely the attack `prompt-injection` exists to report.

   3. UNSURE MEANS DO THE WORK. `needsTranslation` is false ONLY on a confident
      match between the detected language and the reader's. A parse failure, a
      missing field, a low confidence or a degraded step all leave it true, so
      the worst case of this feature is that it costs a translation nobody
      needed — never that it silently withholds one somebody asked for.

   A note on what this is NOT. The safety signals are a SIGNAL, not a control.
   The classifier reads the same untrusted text as everything else and can be
   talked out of reporting, so a clean result is not evidence of safety. It is
   worth surfacing because a flagged note is worth a second look, and worth
   labelling honestly because a security theatre badge is worse than none. */

export const REGISTERS  = ['formal', 'casual', 'neutral', 'instructional']
export const SENTIMENTS = ['positive', 'neutral', 'negative', 'mixed']
export const URGENCIES  = ['low', 'normal', 'high']

/* Each signal carries the plain-English line the UI shows. Keys are the contract
   with the prompt; the text is ours and is never taken from the model. */
export const SIGNALS = {
    'prompt-injection':  'The note appears to address an AI system rather than a person.',
    'credentials':       'A password, key, PIN or one-time code may have been spoken aloud.',
    'personal-data':     'Identifiable personal details about somebody are discussed.',
    'financial-request': 'The note asks for money to move, or for payment details to change.',
    'urgency-pressure':  'The note pushes for fast action or discourages checking with anyone.',
    'legal-or-medical':  'Legal or medical content, where an approximate summary can mislead.',
}

/* The pairing worth naming, because it is the shape of most voice-note fraud and
   neither half is alarming on its own. */
export const FRAUD_PAIR = ['financial-request', 'urgency-pressure']

const pick = (value, allowed) =>
    (typeof value === 'string' && allowed.includes(value.toLowerCase())) ? value.toLowerCase() : null

/* Models are asked for bare JSON and sometimes fence it anyway. Recover the
   object rather than failing the step over punctuation — but recover it by
   PARSING, never by regexing values out of prose. */
export function parseJson(text) {
    const raw = String(text || '').trim()
    const body = raw.startsWith('```')
        ? raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
        : raw
    try { return JSON.parse(body) } catch { /* fall through to the brace scan */ }
    const a = body.indexOf('{'), b = body.lastIndexOf('}')
    if (a >= 0 && b > a) { try { return JSON.parse(body.slice(a, b + 1)) } catch { /* give up */ } }
    return null
}

const clean = (s, max) => typeof s === 'string'
    ? s.replace(/\s+/g, ' ').trim().slice(0, max) || null
    : null

/* normalise(modelOutput) → the typed facts the product may act on.
   Never throws: an unusable answer produces an EMPTY classification, which is
   the same thing a failed step produces, so both take the safe branch. */
export function normalise(parsed) {
    const p = (parsed && typeof parsed === 'object') ? parsed : {}
    const langRaw = (p.language && typeof p.language === 'object') ? p.language : {}
    const code = typeof langRaw.code === 'string' && /^[a-z]{2}$/i.test(langRaw.code.trim())
        ? langRaw.code.trim().toLowerCase() : null
    const confidence = typeof langRaw.confidence === 'number' && langRaw.confidence >= 0 && langRaw.confidence <= 1
        ? langRaw.confidence : 0

    return {
        language: { code, name: clean(langRaw.name, 40), confidence },
        // Display-only, length-capped, and deliberately few: a wall of topics is
        // the failure mode the ontology research warned about.
        topics: Array.isArray(p.topics)
            ? p.topics.map(t => clean(t, 40)).filter(Boolean).slice(0, 5) : [],
        register:  pick(p.register, REGISTERS),
        sentiment: pick(p.sentiment, SENTIMENTS),
        urgency:   pick(p.urgency, URGENCIES),
        signals: Array.isArray(p.signals)
            ? [...new Set(p.signals.map(s => pick(s, Object.keys(SIGNALS))).filter(Boolean))] : [],
        summaryLine: clean(p.summaryLine, 120),
    }
}

/* Does this note still need translating for this reader?

   TRUE unless we are confident it is already in their language. `readerCode` is
   the primary subtag of the active locale (pt-PT and pt-BR both read `pt` — a
   Brazilian reader does not need a European Portuguese note translated).

   The threshold is deliberately high. Being wrong in one direction spends a few
   tenths of a penny; being wrong in the other hands somebody a debrief in a
   language they cannot read, having told them it was translated. */
export const CONFIDENT = 0.75

export function needsTranslation(facts, readerCode) {
    if (!facts?.language?.code || !readerCode) return true
    if (facts.language.confidence < CONFIDENT) return true
    return facts.language.code !== String(readerCode).toLowerCase().split('-')[0]
}
