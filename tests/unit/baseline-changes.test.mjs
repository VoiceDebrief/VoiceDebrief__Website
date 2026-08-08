/* Unit tests — the baseline change recorder (issue 050).

   The policy these hold in place: a changed screenshot is RECORDED, never
   refused. CI does not judge whether a UI change is right — it writes down what
   moved, by how much, and at which commit, so an agent can ask the only question
   that matters: did the change land where the work was supposed to land?

   The failure mode worth testing is silence. A run that moves the UI and leaves
   no trace is worse than a red build, because the guide would quietly re-render
   with new pictures and nobody would know to look. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, rmSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import path from 'node:path'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(repo, 'scripts', 'record_baseline_changes.py')
const guide = path.join(repo, 'website/user-guide')
const logMd = path.join(guide, 'baseline-changes.md')
const logJson = path.join(guide, 'baseline-changes.json')
const shot = path.join(repo, 'website/user-guide/screenshots/01-app-start.png')

/* The script writes into the real guide directory by design (CI commits what it
   writes), so each test saves and restores whatever was there. */
const snapshot = () => ({
    md: existsSync(logMd) ? readFileSync(logMd) : null,
    json: existsSync(logJson) ? readFileSync(logJson) : null,
})
const restore = (s) => {
    for (const [p, v] of [[logMd, s.md], [logJson, s.json]]) {
        if (v === null) rmSync(p, { force: true })
        else writeFileSync(p, v)
    }
}

const captures = (changes, { candidates = 0, updated = [], armed = [] } = {}) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'wa-caps-'))
    mkdirSync(path.join(dir, 'candidates'), { recursive: true })
    mkdirSync(path.join(dir, 'updated'), { recursive: true })
    writeFileSync(path.join(dir, 'changes.json'), JSON.stringify({ changes, candidates }))
    for (const n of updated) copyFileSync(shot, path.join(dir, 'updated', n))
    for (const n of armed) copyFileSync(shot, path.join(dir, 'candidates', n))
    return dir
}
const record = (dir, run = '1', commit = 'a'.repeat(40)) =>
    execFileSync('python3', [script, '--captures', dir, '--run-number', run, '--commit', commit,
        '--repo-url', 'https://github.com/sgraph-ai/repo',
        '--run-url', `https://github.com/sgraph-ai/repo/actions/runs/${run}`],
        { cwd: repo, encoding: 'utf8' })

const CHANGED = [{ id: '01-app-start', kind: 'changed', pixels: 12000, area: 1024000,
                   percent: 1.172, threshold: 0.1, caption: 'x', slot: 'getting-started/arrival' }]

test('a changed shot is recorded, not refused', () => {
    const saved = snapshot()
    try {
        const out = record(captures(CHANGED, { updated: ['01-app-start.png'] }))
        assert.match(out, /1 changed/)
        const entry = JSON.parse(readFileSync(logJson, 'utf8')).entries[0]
        assert.equal(entry.changes[0].id, '01-app-start')
        assert.equal(entry.changes[0].percent, 1.172)
    } finally { restore(saved) }
})

test('the entry names the commit and run that moved it', () => {
    const saved = snapshot()
    try {
        record(captures(CHANGED, { updated: ['01-app-start.png'] }), '77', 'b'.repeat(40))
        const entry = JSON.parse(readFileSync(logJson, 'utf8')).entries[0]
        assert.equal(entry.commit, 'b'.repeat(40))
        assert.equal(entry.run, '77')
        assert.match(entry.commit_url, /\/commit\/b{40}$/)
        // Without a commit link the log is unreviewable: you can see that
        // something moved but never why.
        assert.match(readFileSync(logMd, 'utf8'), /commit \[`bbbbbbb`\]/)
    } finally { restore(saved) }
})

test('successive runs append, newest first — history is never overwritten', () => {
    const saved = snapshot()
    try {
        record(captures(CHANGED, { updated: ['01-app-start.png'] }), '1')
        record(captures(CHANGED, { updated: ['01-app-start.png'] }), '2')
        const entries = JSON.parse(readFileSync(logJson, 'utf8')).entries
        assert.equal(entries.length, 2)
        assert.equal(entries[0].run, '2', 'newest entry must be first')
        assert.equal((readFileSync(logMd, 'utf8').match(/^## /gm) || []).length, 2)
    } finally { restore(saved) }
})

test('a run that moved nothing writes no entry', () => {
    const saved = snapshot()
    try {
        const out = record(captures([]))
        assert.match(out, /nothing moved/)
        assert.ok(!existsSync(logJson) || JSON.parse(readFileSync(logJson, 'utf8')).entries.length === 0)
    } finally { restore(saved) }
})

test('a run with no verdict fails loudly instead of committing stray pixels', () => {
    const saved = snapshot()
    try {
        const dir = mkdtempSync(path.join(tmpdir(), 'wa-caps-empty-'))
        assert.throws(() => record(dir), /status 1|Command failed/)
    } finally { restore(saved) }
})

test('a resized shot records its geometry, since no percentage is meaningful', () => {
    const saved = snapshot()
    try {
        record(captures([{ id: '04-results', kind: 'resized', from: '820x912', to: '820x980',
                           caption: 'y', slot: 'one-pass/results' }], { updated: ['04-results.png'] }))
        assert.match(readFileSync(logMd, 'utf8'), /resized 820x912 → 820x980/)
    } finally {
        restore(saved)
        rmSync(path.join(repo, 'website/user-guide/screenshots/04-results.png'), { force: true })
        execFileSync('git', ['checkout', '--', 'website/user-guide/screenshots'], { cwd: repo })
    }
})
