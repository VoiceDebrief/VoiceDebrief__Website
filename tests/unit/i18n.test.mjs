/* Unit tests — strings and culture as data (issue 050, M1b/M1c).

   Two things are worth pinning here. First, the FALLBACK behaviour: this app
   ships English in its markup and overwrites it, so every failure mode has to
   degrade to readable English rather than to blanks. Second, money: M1 was not
   allowed to change a single rendered price, and fmtMoney replaced fmtGbp —
   so the format is asserted digit by digit, not just "looks like currency".

   The parity checkers get tested by BREAKING things, because a checker that
   cannot fail is worse than no checker: it reports success either way. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const { t, fmtMoney, getLocale } = await import('../../website/app/i18n.js')
const { fmtGbp, USD_TO_GBP } = await import('../../website/app/config.js')

const run = (script) => {
    try { return { ok: true, out: execFileSync('python3', [path.join(repo, 'scripts', script)], { cwd: repo, encoding: 'utf8' }) } }
    catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || '') } }
}

test('an uninitialised t() returns the key, so a miss is visible not silent', () => {
    // The app renders before/without i18n in tests and on a fetch failure. A
    // blank string there would be an invisible hole; the key is a bug report.
    assert.equal(t('core.go'), 'core.go')
    assert.equal(t('nope.at.all'), 'nope.at.all')
})

test('t() interpolates named params and leaves unknown ones alone', () => {
    // Unknown placeholders survive verbatim rather than becoming "undefined" —
    // a visible {name} in the UI names the bug; "undefined" hides it.
    assert.equal(t('x.y', { a: 1 }), 'x.y')
})

test('the default locale is en-gb before anything loads', () => {
    assert.equal(getLocale(), 'en-gb')
})

test('fmtMoney is byte-identical to the fmtGbp it replaced', () => {
    // The rule M1 must not break: prices render exactly as before.
    for (const usd of [0, 0.001, 0.004, 0.05, 0.126, 1, 12.5, 1000]) {
        const expected = '£' + (usd * USD_TO_GBP).toFixed(usd * USD_TO_GBP < 0.10 ? 3 : 2)
        assert.equal(fmtMoney(usd), expected, `usd=${usd}`)
    }
})

test('fmtMoney keeps three decimals under 10p — a pass costs fractions of a penny', () => {
    assert.equal(fmtMoney(0.004), '£0.003')
    assert.ok(fmtMoney(0.004).split('.')[1].length === 3)
})

test('fmtMoney degrades to an honest em-dash for an unknown cost', () => {
    for (const bad of [null, undefined, NaN]) assert.equal(fmtMoney(bad), '£—')
})

test('config.fmtGbp is the same function — call sites did not need rewriting', () => {
    assert.equal(fmtGbp, fmtMoney)
})

test('the locale checker passes on the committed locales', () => {
    assert.match(run('check_locales.py').out, /locales ok/)
})

test('the theme checker passes on the committed themes', () => {
    assert.match(run('check_themes.py').out, /themes ok/)
})

test('the locale checker FAILS a live locale with holes, and passes it as draft', () => {
    const idx = path.join(repo, 'website/app/locales/index.json')
    const saved = readFileSync(idx, 'utf8')
    const dir = path.join(repo, 'website/app/locales/zz-test')
    try {
        mkdirSync(dir, { recursive: true })
        writeFileSync(path.join(dir, 'core.json'), JSON.stringify({ go: 'Ir' }))
        const setStatus = (status) => {
            const d = JSON.parse(saved)
            d.locales['zz-test'] = { label: 'Test', nativeLabel: 'Test', status, files: ['core'] }
            writeFileSync(idx, JSON.stringify(d, null, 2))
        }
        setStatus('live')
        const live = run('check_locales.py')
        assert.equal(live.ok, false, 'a LIVE locale missing keys must fail')
        assert.match(live.out, /is LIVE but core\.json is missing/)

        setStatus('draft')
        assert.equal(run('check_locales.py').ok, true, 'a DRAFT locale may have holes — that is what draft means')
    } finally {
        writeFileSync(idx, saved)
        rmSync(dir, { recursive: true, force: true })
    }
})

/* The theme gate has four rules and each one exists because of a specific way a
   design can arrive half-applied. A gate nobody has watched fail is a gate
   nobody knows the shape of, so each rule is broken here on purpose. */

test('the theme checker FAILS a scheme that omits a token', () => {
    const tokens = path.join(repo, 'website/vd-tokens.css')
    const idx = path.join(repo, 'website/app/themes/index.json')
    const savedTokens = readFileSync(tokens, 'utf8')
    const savedIdx = readFileSync(idx, 'utf8')
    try {
        // A sixth scheme carrying one token instead of the full set. This is the
        // A/B failure the rule is for: the arm renders, mostly, and you cannot
        // tell whether it lost on its design or on the parts that never applied.
        writeFileSync(tokens, savedTokens + '\n[data-vd-theme="zztest"]{--vd-a:#f0f}\n')
        const d = JSON.parse(savedIdx)
        d.schemes['zztest'] = { label: 'Test', status: 'draft', description: 'x' }
        writeFileSync(idx, JSON.stringify(d, null, 2))
        const r = run('check_themes.py')
        assert.equal(r.ok, false, 'a half-finished scheme must fail, not ship half-styled')
        assert.match(r.out, /is missing --vd-/)
    } finally {
        writeFileSync(tokens, savedTokens)
        writeFileSync(idx, savedIdx)
    }
})

test('the theme checker FAILS a stylesheet that writes its own colour', () => {
    const sheet = path.join(repo, 'website/zz-test.css')
    try {
        writeFileSync(sheet, '.zz{color:#ff00ff}')
        const r = run('check_themes.py')
        assert.equal(r.ok, false, 'a hex outside the tokens file must fail the build')
        assert.match(r.out, /writes a colour of its own/)
    } finally {
        rmSync(sheet, { force: true })
    }
})

test('a var() fallback is NOT a colour of its own — components must still render standalone', () => {
    const sheet = path.join(repo, 'website/zz-test.css')
    try {
        // Every component keeps a literal beside its token so it renders in a
        // harness that loads no sheet at all. If rule 3 counted those, the rule
        // and the standalone-render guarantee would be in direct conflict.
        writeFileSync(sheet, '.zz{color:var(--vd-i,#0B1B2B);background:var(--vd-c,#fff)}')
        assert.equal(run('check_themes.py').ok, true)
    } finally {
        rmSync(sheet, { force: true })
    }
})

test('the theme checker FAILS a page that does not link the tokens', () => {
    const page = path.join(repo, 'website/zz-test.html')
    try {
        writeFileSync(page, '<!DOCTYPE html><html><head><title>x</title></head><body>x</body></html>')
        const r = run('check_themes.py')
        assert.equal(r.ok, false, 'an unlinked page is styled by component fallbacks, which looks deliberate')
        assert.match(r.out, /does not link vd-tokens\.css/)
    } finally {
        rmSync(page, { force: true })
    }
})
