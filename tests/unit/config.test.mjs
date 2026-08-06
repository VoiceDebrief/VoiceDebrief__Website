/* Unit tests — config.js (GBP display + origin override + its allowlist). */
import { test } from 'node:test'
import assert from 'node:assert/strict'

// config.js reads location.search at import time — give Node one. Re-importing
// with a distinct query string gives each case a fresh module instance.
const originFor = async (search, n) => {
    globalThis.location = { search }
    return (await import(`../../website/app/config.js?case=${n}`)).ORIGIN
}

globalThis.location = { search: '?origin=http://127.0.0.1:9999' }
const { ORIGIN, USD_TO_GBP, fmtGbp } = await import('../../website/app/config.js')

test('?origin= overrides the engine origin (the dev/test hook)', () => {
    assert.equal(ORIGIN, 'http://127.0.0.1:9999')
})

test('?origin= only accepts allowlisted hosts (issue 037, S1)', async () => {
    assert.equal(await originFor('?origin=https://evil.example', 1), 'https://dev.tools.sgraph.ai')
    assert.equal(await originFor('?origin=https://dev.tools.sgraph.ai.evil.example', 2), 'https://dev.tools.sgraph.ai')
    assert.equal(await originFor('?origin=javascript:alert(1)', 3), 'https://dev.tools.sgraph.ai')
    assert.equal(await originFor('?origin=not-a-url', 4), 'https://dev.tools.sgraph.ai')
    assert.equal(await originFor('?origin=https://tools.sgraph.ai', 5), 'https://tools.sgraph.ai')
    assert.equal(await originFor('?origin=http://localhost:8124', 6), 'http://localhost:8124')
    assert.equal(await originFor('?origin=https://dev.tools.sgraph.ai/some/path', 7), 'https://dev.tools.sgraph.ai')
    assert.equal(await originFor('', 8), 'https://dev.tools.sgraph.ai')
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
