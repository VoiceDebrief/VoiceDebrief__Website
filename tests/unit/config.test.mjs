/* Unit tests — config.js (GBP display + origin override). */
import { test } from 'node:test'
import assert from 'node:assert/strict'

// config.js reads location.search at import time — give Node one.
globalThis.location = { search: '?origin=http://127.0.0.1:9999' }
const { ORIGIN, USD_TO_GBP, fmtGbp } = await import('../../website/app/config.js')

test('?origin= overrides the engine origin (the dev/test hook)', () => {
    assert.equal(ORIGIN, 'http://127.0.0.1:9999')
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
