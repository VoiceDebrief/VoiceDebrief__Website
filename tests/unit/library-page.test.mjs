/* The public Library page must list every brief in the library.

   Written because the rule failed twice in one day. `library/` (the repo folder)
   and `website/library/index.html` (the page a visitor sees) are two different
   things, and adding a brief to the first does not add it to the second. The
   semantic-graphs pack and the go-live design brief both landed in the repo,
   both were added to `library/README.md`, and neither appeared on the site —
   until Dinis went looking for one and got a 404.

   CLAUDE.md already required this ("the Library page is the Librarian-maintained
   doc front door"). Prose does not hold; a check does. The rule is deliberately
   narrow — `library/briefs/*` only — because a narrow gate that always applies
   beats a broad one that needs an exception list. */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const briefs = readdirSync(path.join(repo, 'library/briefs'), { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name)
const page = readFileSync(path.join(repo, 'website/library/index.html'), 'utf8')
const index = readFileSync(path.join(repo, 'library/README.md'), 'utf8')

test('every brief folder is linked from the PUBLIC Library page', () => {
    assert.ok(briefs.length >= 4, 'sanity: the briefs folder was found')
    const missing = briefs.filter(name => !page.includes(`library/briefs/${name}`))
    assert.deepEqual(missing, [],
        `these briefs exist in the repo but a visitor cannot reach them: ${missing.join(', ')}. ` +
        'Add a card to website/library/index.html in the same commit that adds the brief.')
})

test('and from the repo library index, which is the other half people forget', () => {
    const missing = briefs.filter(name => !index.includes(`briefs/${name}`))
    assert.deepEqual(missing, [], `not listed in library/README.md: ${missing.join(', ')}`)
})

/* A brief on a feature branch is linked as tree/qa/… because a tree/dev link
   404s from the QA estate until the branch merges — live-QA caught that once
   already (run #33). Both forms are legitimate; a link naming any OTHER branch
   is a typo that will rot. */
test('brief links name a branch that actually publishes', () => {
    const refs = [...page.matchAll(/tree\/([a-z0-9._/-]+)\/library\/briefs\//g)].map(m => m[1])
    assert.ok(refs.length >= briefs.length, `expected a link per brief, found ${refs.length}`)
    for (const branch of refs) {
        assert.ok(branch === 'dev' || branch === 'qa',
            `library link points at branch "${branch}" — only dev and qa are published`)
    }
})
