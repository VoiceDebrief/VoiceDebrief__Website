/* Unit tests — workflow.js (issue 042): the validator against the shipped
   declaration and against broken ones, the quote maths, and the runner's
   abort / degrade / budget-gate / skipped-branch semantics. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { validateWorkflow, pathFor, pathUsd, maxUsd, runWorkflow } from '../../website/app/workflow.js'

const standard = JSON.parse(readFileSync(
    fileURLToPath(new URL('../../website/app/workflows/standard.json', import.meta.url)), 'utf8'))

test('the shipped standard.json is a valid declaration', () => {
    const v = validateWorkflow(standard)
    assert.deepEqual(v.errors, [])
    assert.ok(v.ok)
})

test('the quote follows the options: each optional step selects a different path', () => {
    // Two optional branches now (issue 055 added translate). The quote a user is
    // shown must be the path THEIR options select — not a fixed number — and the
    // declared ceiling must be the everything-on path, or the "max cost" promise
    // on the options screen is not a ceiling at all.
    const bare = pathUsd(standard, {})
    const infog = pathUsd(standard, { infographic: true })
    const trans = pathUsd(standard, { translate: true })
    const both = pathUsd(standard, { infographic: true, translate: true })

    assert.ok(infog > bare, 'the infographic branch must cost more')
    assert.ok(trans > bare, 'the translate branch must cost more')
    assert.ok(both > infog && both > trans, 'both branches must cost more than either alone')
    assert.equal(maxUsd(standard), both, 'all options on = the absolute ceiling')

    assert.deepEqual(pathFor(standard, {}).map(s => s.id),
        ['normalise', 'ingest', 'transcribe', 'summary'])
    assert.deepEqual(pathFor(standard, { infographic: true }).map(s => s.id),
        ['normalise', 'ingest', 'transcribe', 'summary', 'infographic'])
    // Translate sits BETWEEN transcribe and summary — the summary is built from
    // it, so any other position would summarise the wrong text.
    assert.deepEqual(pathFor(standard, { translate: true }).map(s => s.id),
        ['normalise', 'ingest', 'transcribe', 'translate', 'summary'])
    assert.deepEqual(pathFor(standard, { infographic: true, translate: true }).map(s => s.id),
        ['normalise', 'ingest', 'transcribe', 'translate', 'summary', 'infographic'])
})

/* A tiny two-step machine for the validator's negative cases. */
const tiny = (mutate) => {
    const def = {
        id: 't', schema: 1, title: 'T', start: 'a',
        steps: [
            { id: 'a', kind: 'local', label: 'A', requires: [], produces: ['x'], budget: { usd: 0 }, next: [{ to: 'b' }], on_failure: 'abort' },
            { id: 'b', kind: 'llm-text', label: 'B', model: 'm/x', requires: ['x'], produces: ['y'], budget: { usd: 0.01 }, next: [{ to: 'done' }], on_failure: 'degrade' },
        ],
    }
    mutate?.(def)
    return def
}

test('the validator refuses the declarations that would lie', () => {
    const bad = [
        [d => { d.steps[1].id = 'a' },                       /duplicate/],
        [d => { d.steps[0].next = [{ to: 'nowhere' }] },     /unknown step/],
        [d => { d.steps[1].budget = { usd: -1 } },           /budget/],
        [d => { delete d.steps[0].on_failure },              /on_failure/],
        [d => { d.start = 'zz' },                            /not a declared step/],
        [d => { d.steps[0].next = [{ to: 'done' }] },        /unreachable/],           // b orphaned
        [d => { d.steps[1].next = [{ to: 'a' }] },           /cannot reach done/],     // a↔b loop, no exit
        [d => { d.steps[0].next = [{ to: 'b', when: 'options.x' }] }, /unconditional/], // no declared fallback
        [d => { d.steps[0].next = [{ to: 'b', when: 'location.href' }, { to: 'done' }] }, /options\.<flag>/],
        [d => { delete d.steps[1].model },                   /pin a model/],
    ]
    for (const [mutate, msg] of bad) {
        const v = validateWorkflow(tiny(mutate))
        assert.ok(!v.ok && v.errors.some(e => msg.test(e)), `expected ${msg}, got: ${v.errors.join('; ')}`)
    }
})

/* Runner semantics, with stub executors and the shipped declaration. */
const stubbed = (overrides = {}) => ({
    'local':           async () => ({ costUsd: 0 }),
    'engine':          async () => ({ costUsd: 0 }),
    'llm-transcribe':  async () => ({ costUsd: 0.004 }),
    'llm-text':        async () => ({ costUsd: 0.001 }),
    'llm-infographic': async () => ({ costUsd: 0.02 }),
    ...overrides,
})

test('happy path: every path step done, spend summed, skipped branch marked', async () => {
    const events = []
    const trace = await runWorkflow(standard, { options: { infographic: false },
        executors: stubbed(), emit: (n) => events.push(n) })
    assert.equal(trace.status, 'complete')
    assert.equal(trace.steps.find(s => s.id === 'infographic').status, 'skipped')
    assert.ok(Math.abs(trace.spentUsd - 0.005) < 1e-9)
    assert.equal(trace.quoteUsd, pathUsd(standard, { infographic: false }))
    assert.ok(events.includes('wa:workflow:started') && events.includes('wa:workflow:complete'))
})

test('a degrade step failing does not stop the run — declared, not improvised', async () => {
    const trace = await runWorkflow(standard, { options: { infographic: true },
        executors: stubbed({ 'llm-text': async () => { throw Object.assign(new Error('nope'), { code: 'llm-error' }) } }) })
    assert.equal(trace.steps.find(s => s.id === 'summary').status, 'degraded')
    assert.equal(trace.steps.find(s => s.id === 'infographic').status, 'done')
    assert.equal(trace.status, 'degraded')
})

test('an abort step failing stops the run and rethrows the original code', async () => {
    await assert.rejects(
        runWorkflow(standard, { options: {},
            executors: stubbed({ 'llm-transcribe': async () => { throw Object.assign(new Error('bad'), { code: 'rate-limited' }) } }) }),
        (e) => e.code === 'rate-limited')
})

test('the budget entry gate: an overrun blocks the NEXT step (workflow-budget)', async () => {
    let trace
    await assert.rejects(
        runWorkflow(standard, { options: { infographic: true },
            executors: stubbed({ 'llm-transcribe': async () => ({ costUsd: 99 }) }),
            emit: (n, d) => { if (d?.trace) trace = d.trace } }),
        (e) => e.code === 'workflow-budget')
    assert.equal(trace.steps.find(s => s.id === 'transcribe').status, 'done')
    assert.ok(trace.steps.find(s => s.id === 'transcribe').overrun, 'the overrun itself is recorded')
    assert.equal(trace.steps.find(s => s.id === 'summary').status, 'blocked')
    assert.equal(trace.status, 'failed')
})
