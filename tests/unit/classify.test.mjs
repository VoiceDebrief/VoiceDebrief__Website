/* classify.js — the trust boundary (issue 061).

   The classify step reads whatever somebody said into their phone and returns
   metadata the run then acts on. These tests are written from the attacker's
   side as much as the happy path, because the interesting failures here are not
   "the model returned something odd" but "the model returned something that
   CHANGED WHAT THE PRODUCT DID". */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseJson, normalise, needsTranslation, SIGNALS, REGISTERS, CONFIDENT }
    from '../../website/app/classify.js'

const good = {
    language: { code: 'PT', name: 'Portuguese', confidence: 0.96 },
    topics: ['site visit', 'invoice dispute'],
    register: 'Casual', sentiment: 'negative', urgency: 'high',
    signals: ['financial-request', 'urgency-pressure'],
    summaryLine: 'Asks for the invoice to be paid to a new account today',
}

test('a well-formed answer normalises, and case is not a reason to lose data', () => {
    const f = normalise(good)
    assert.equal(f.language.code, 'pt', 'the code is lowercased')
    assert.equal(f.register, 'casual', 'an allowlisted value is accepted case-insensitively')
    assert.deepEqual(f.signals, ['financial-request', 'urgency-pressure'])
    assert.equal(f.topics.length, 2)
})

test('anything not on the allowlist is DROPPED, never passed through', () => {
    const f = normalise({ ...good,
        register: 'sarcastic',                        // not a register we know
        sentiment: '<script>alert(1)</script>',
        urgency: 'EXTREMELY HIGH',
        signals: ['prompt-injection', 'ignore-previous-instructions', 'nuclear'] })
    assert.equal(f.register, null)
    assert.equal(f.sentiment, null)
    assert.equal(f.urgency, null)
    assert.deepEqual(f.signals, ['prompt-injection'], 'the invented signals are gone')
    for (const s of f.signals) assert.ok(Object.hasOwn(SIGNALS, s))
})

test('free-text fields are capped and flattened, so no field can carry a payload', () => {
    const f = normalise({ ...good,
        topics: Array.from({ length: 40 }, (_, i) => `topic ${i} ` + 'x'.repeat(200)),
        summaryLine: 'y'.repeat(5000) })
    assert.equal(f.topics.length, 5, 'at most five topics')
    for (const t of f.topics) assert.ok(t.length <= 40)
    assert.ok(f.summaryLine.length <= 120)
    assert.equal(f.summaryLine.includes('\n'), false, 'newlines are collapsed')
})

test('junk in, empty out — never a throw, because a throw would take the run with it', () => {
    for (const junk of [null, undefined, 'not json', 42, [], { language: 'Portuguese' }]) {
        const f = normalise(junk)
        assert.equal(f.language.code, null)
        assert.deepEqual(f.topics, [])
        assert.deepEqual(f.signals, [])
    }
})

test('a fenced or chatty reply is still parsed — punctuation is not worth failing a step over', () => {
    assert.deepEqual(parseJson('```json\n{"a":1}\n```'), { a: 1 })
    assert.deepEqual(parseJson('Sure! Here you go: {"a":2} — hope that helps'), { a: 2 })
    assert.equal(parseJson('no object here at all'), null)
})

/* ── the decision this feature exists to make ─────────────────────────────── */

test('translation is skipped ONLY on a confident match', () => {
    const pt = (confidence) => normalise({ ...good, language: { code: 'pt', name: 'Portuguese', confidence } })
    assert.equal(needsTranslation(pt(0.96), 'pt'), false, 'confidently already Portuguese → skip')
    assert.equal(needsTranslation(pt(0.96), 'en'), true, 'Portuguese note, English reader → translate')
    assert.equal(needsTranslation(pt(0.5), 'pt'), true, 'unsure → translate anyway')
    assert.equal(needsTranslation(pt(CONFIDENT - 0.01), 'pt'), true, 'just under the threshold → translate')
})

test('pt-PT and pt-BR read the same language, so neither pays to translate the other', () => {
    const f = normalise({ ...good, language: { code: 'pt', name: 'Portuguese', confidence: 0.95 } })
    assert.equal(needsTranslation(f, 'pt-BR'), false)
    assert.equal(needsTranslation(f, 'pt-pt'), false)
})

test('every route to "we do not know" translates rather than assuming', () => {
    // The safe direction costs a fraction of a penny. The unsafe direction hands
    // somebody a debrief in a language they cannot read, having said it was theirs.
    assert.equal(needsTranslation(normalise(null), 'en'), true, 'unparseable answer')
    assert.equal(needsTranslation(normalise({ language: { code: 'zz' } }), 'en'), true, 'bogus code')
    assert.equal(needsTranslation(normalise(good), null), true, 'no reader language known')
    assert.equal(needsTranslation(undefined, 'en'), true, 'no facts at all')
})

test('the signal vocabulary is closed, and each key has text WE wrote', () => {
    assert.ok(Object.keys(SIGNALS).length >= 5)
    for (const [key, text] of Object.entries(SIGNALS)) {
        assert.match(key, /^[a-z-]+$/, 'keys are safe to use as CSS classes and i18n keys')
        assert.ok(text.length > 20, `${key} explains itself in plain English`)
    }
    assert.ok(REGISTERS.includes('neutral'))
})
