/* Unit tests — the user guide built from the QA captures (issue 038, M-qtd-2).

   The guide's promise is that its pictures are evidence: every screenshot on the
   page was taken by a journey that was, in the same run, asserting the product
   works. These tests hold the two halves of that promise together — the manifest
   the journeys read IS the manifest the guide renders from, and a shot with no
   baseline is stated honestly rather than shown as a broken image. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import path from 'node:path'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(repo, 'scripts', 'build_user_guide.py')
const run = (...args) => execFileSync('python3', [script, ...args], { cwd: repo, encoding: 'utf8' })

const manifest = JSON.parse(readFileSync(path.join(repo, 'tests/qa-to-docs/journeys.json'), 'utf8'))
const out = mkdtempSync(path.join(tmpdir(), 'wa-guide-'))
run('--out', out)
const html = readFileSync(path.join(out, 'user-guide/index.html'), 'utf8')
const guide = JSON.parse(readFileSync(path.join(out, 'user-guide/guide.json'), 'utf8'))

test('the manifest validates (the gate CI runs)', () => {
    assert.match(run('--check'), /user guide ok/)
})

test('every captured shot becomes a figure in the guide', () => {
    assert.equal(guide.shots.length, manifest.shots.length)
    for (const s of manifest.shots) {
        assert.ok(guide.shots.some(g => g.id === s.id), `shot ${s.id} missing from the guide`)
        assert.ok(html.includes(s.caption.replace(/&/g, '&amp;')), `caption for ${s.id} not rendered`)
    }
})

test('a shot with no baseline says so instead of showing a broken image', () => {
    // The temp build has no screenshots dir at all — the first-CI-run condition.
    assert.equal((html.match(/shot__pending/g) || []).length - 1, manifest.shots.length)
    assert.ok(!html.includes('<img src="screenshots/'), 'referenced a PNG that does not exist')
})

test('a committed baseline is rendered as the picture', () => {
    const dir = path.join(out, 'user-guide/screenshots')
    mkdirSync(dir, { recursive: true })
    const id = manifest.shots[0].id
    writeFileSync(path.join(dir, `${id}.png`), 'not a real png, only its presence matters')
    run('--out', out)
    const withShot = readFileSync(path.join(out, 'user-guide/index.html'), 'utf8')
    assert.ok(withShot.includes(`<img src="screenshots/${id}.png"`), 'baseline not rendered')
})

test('every shot is framed and slotted — the guide cannot silently lose a step', () => {
    const slots = new Set()
    for (const s of manifest.shots) {
        assert.ok(s.caption?.trim(), `${s.id} has no caption`)
        assert.match(s.slot || '', /^[a-z-]+\/[a-z-]+$/, `${s.id} has a malformed slot`)
        assert.ok(s.clip, `${s.id} has no clip — full-page shots bury the subject under the hero`)
        assert.ok(!slots.has(s.slot), `duplicate slot ${s.slot}`)
        slots.add(s.slot)
    }
})

test('every slot names a section the guide actually teaches', () => {
    // The failure mode this guards: adding a journey must force a decision about
    // where it is taught, rather than silently dropping the shot from the guide.
    const known = new Set(guide.sections.map(s => s.key))
    for (const s of manifest.shots)
        assert.ok(known.has(s.slot.split('/')[0]),
            `${s.id} sits in section "${s.slot.split('/')[0]}", which the guide does not teach`)
})
