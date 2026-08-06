/* Unit tests — config.js (GBP display + the ?origin= engine override). */
import { test } from 'node:test'
import assert from 'node:assert/strict'

// config.js reads location.search at import time — give Node one.
globalThis.location = { search: '?origin=http://127.0.0.1:9999' }
const { ORIGIN, DEFAULT_ORIGIN, resolveOrigin, USD_TO_GBP, fmtGbp } =
    await import('../../website/app/config.js')

test('?origin= overrides the engine origin for local dev and tests', () => {
    assert.equal(ORIGIN, 'http://127.0.0.1:9999')
})

test('the allow-list accepts the real engine origins and localhost', () => {
    for (const ok of ['https://dev.tools.sgraph.ai', 'https://tools.sgraph.ai',
                      'http://localhost:8123', 'http://127.0.0.1:8124', 'https://localhost']) {
        assert.equal(resolveOrigin(ok), ok, `${ok} should be allowed`)
    }
    assert.equal(resolveOrigin('https://dev.tools.sgraph.ai/'), 'https://dev.tools.sgraph.ai',
        'a trailing slash should not defeat the match')
})

/* The override decides which JavaScript engine.js imports INTO this page, next to
   the user's OpenRouter key in localStorage. A link carrying our own domain must
   not be able to point it somewhere else (issue 038). */
test('anything else falls back to the default instead of being trusted', () => {
    for (const bad of [
        'https://evil.example',
        'https://dev.tools.sgraph.ai.evil.example',      // suffix trick
        'https://evil.example/dev.tools.sgraph.ai',      // path trick
        'https://dev-tools.sgraph.ai',                   // hyphen, not a subdomain
        'http://dev.tools.sgraph.ai',                    // downgrade to http
        'https://sub.dev.tools.sgraph.ai',               // deeper subdomain
        'javascript:alert(1)',
        '//evil.example',
    ]) {
        assert.equal(resolveOrigin(bad), DEFAULT_ORIGIN, `${bad} must not be trusted`)
    }
})

test('no ?origin= at all means the default engine', () => {
    assert.equal(resolveOrigin(null), DEFAULT_ORIGIN)
    assert.equal(resolveOrigin(''), DEFAULT_ORIGIN)
})

test('fmtGbp converts USD at the fixed rate', () => {
    assert.equal(fmtGbp(1), '£' + (1 * USD_TO_GBP).toFixed(2))
})

test('fmtGbp shows three decimals under 10p (voice-note passes cost fractions of a penny)', () => {
    assert.equal(fmtGbp(0.004), '£' + (0.004 * USD_TO_GBP).toFixed(3))
})

test('fmtGbp degrades to £— for unknown costs', () => {
    assert.equal(fmtGbp(null), '£—')
    assert.equal(fmtGbp(undefined), '£—')
    assert.equal(fmtGbp(NaN), '£—')
})
