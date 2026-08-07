/* Unit tests — config.js (the hardcoded engine origin + GBP display). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/* A query string is present on purpose: the point of this suite is that it is
   ignored. `?origin=` used to choose which JavaScript the page imported, beside
   the user's OpenRouter key — it is gone, not allow-listed (issue 041). */
globalThis.location = { search: '?origin=https://evil.example' }
const { ORIGIN, USD_TO_GBP, fmtGbp } = await import('../../website/app/config.js')

test('the engine origin is the hardcoded one', () => {
    assert.equal(ORIGIN, 'https://dev.tools.sgraph.ai')
})

test('?origin= cannot move it — the parameter no longer exists', () => {
    assert.equal(ORIGIN, 'https://dev.tools.sgraph.ai',
        'a query parameter must never decide where the app imports code from')
})

test('config.js never reads the query string at all', () => {
    // Belt and braces: an allow-list can be widened by a later edit, but code that
    // does not look at location.search cannot be talked into trusting a URL.
    const src = readFileSync(fileURLToPath(new URL('../../website/app/config.js', import.meta.url)), 'utf8')
    for (const forbidden of ['location.search', 'URLSearchParams', 'searchParams']) {
        assert.ok(!src.includes(forbidden),
            `config.js must not read the query string (found ${forbidden})`)
    }
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
