/* Unit tests — the content pipeline (issue 036).

   These run the real build script over the real content/ folder into a temp dir,
   so a broken post fails the test suite (and therefore the release) instead of
   shipping a broken page. Everything the Journalist writes lands here first. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync, existsSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import path from 'node:path'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(repo, 'scripts', 'build_content.py')
const run = (...args) => execFileSync('python3', [script, ...args], { cwd: repo, encoding: 'utf8' })

const out = mkdtempSync(path.join(tmpdir(), 'wa-content-'))
run('--out', out)
const readOut = (p) => readFileSync(path.join(out, p), 'utf8')
const updates = JSON.parse(readOut('updates/updates.json'))
const versions = JSON.parse(readOut('versions/versions.json'))
const videos = JSON.parse(readOut('videos/videos.json'))
const indexHtml = readOut('updates/index.html')

test('every content file is valid (the gate CI runs)', () => {
    assert.match(run('--check'), /content ok/)
})

test('all posts build, newest first', () => {
    assert.ok(updates.posts.length >= 11, `only ${updates.posts.length} posts`)
    const dates = updates.posts.map(p => p.date)
    assert.deepEqual(dates, [...dates].sort().reverse(), 'posts must be newest first')
})

test('the rendered page carries one article per published post, with permalinks', () => {
    assert.equal((indexHtml.match(/<article id="/g) || []).length, updates.posts.length)
    for (const p of updates.posts) assert.ok(indexHtml.includes(`id="${p.slug}"`), `missing ${p.slug}`)
    assert.ok(!indexHtml.includes('<!--POSTS-->'), 'template marker left unreplaced')
})

test('version links are derived against the PREVIOUS release, never a branch', () => {
    for (const p of updates.posts.filter(p => p.version)) {
        const diff = p.links.find(l => l.href.includes('/compare/') || l.href.includes('/releases/tag/'))
        assert.ok(diff, `${p.slug} has a version but no diff link`)
        assert.ok(!/\.\.\.(dev|qa|main)\b/.test(diff.href), `${p.slug} links a moving branch: ${diff.href}`)
    }
})

test('issue links resolve to a file that actually exists today', () => {
    for (const p of updates.posts) {
        for (const l of p.links.filter(l => l.href.includes('/issues/'))) {
            const rel = l.href.split('/blob/dev/')[1]
            assert.ok(existsSync(path.join(repo, rel)), `${p.slug} links a missing issue file: ${rel}`)
        }
    }
})

test('versions.json keeps the shape the Versions page fetches', () => {
    assert.ok(versions.versions.length >= 21)
    for (const v of versions.versions) {
        assert.match(v.v, /^v\d+\.\d+\.\d+$/)
        assert.match(v.date, /^\d{4}-\d{2}-\d{2}$/)
        assert.ok(v.title && Array.isArray(v.changes) && v.changes.length, `${v.v} has no changes`)
    }
    const vs = versions.versions.map(v => v.v)
    assert.equal(new Set(vs).size, vs.length, 'duplicate version entries')
})

test('a published video always has a real YouTube id; drafts are held back', () => {
    for (const v of videos.videos) {
        assert.match(v.youtube_id, /^[A-Za-z0-9_-]{11}$/, `${v.slug} is published without a usable id`)
        assert.ok(['demo', 'explainer', 'short'].includes(v.kind))
    }
})

test('the videos page never embeds a player before the visitor asks', () => {
    const html = readOut('videos/index.html')
    assert.ok(!/<iframe/i.test(html), 'an iframe is present in the served HTML — that loads YouTube unasked')
    assert.ok(html.includes('youtube-nocookie.com'), 'the click handler should use the no-cookie host')
})

test('the RSS feed is well formed and matches the posts', () => {
    const feed = readOut('updates/feed.xml')
    assert.ok(feed.startsWith('<?xml'))
    assert.equal((feed.match(/<item>/g) || []).length, Math.min(20, updates.posts.length))
})

test('bad content fails the build rather than shipping', () => {
    // The validator is the safety net for an unattended 5am agent: prove it bites.
    const dir = path.join(repo, 'content', 'updates', '2099', '01', '01')
    mkdirSync(dir, { recursive: true })
    writeFileSync(path.join(dir, 'v9.9.9__update__broken.md'), '---\ntitle: No date here\n---\n\nbody\n')
    try {
        assert.throws(() => run('--check'), /date is required|Content problems/)
    } finally {
        rmSync(path.join(repo, 'content', 'updates', '2099'), { recursive: true, force: true })
    }
    assert.match(run('--check'), /content ok/, 'the suite must leave content valid')
})
