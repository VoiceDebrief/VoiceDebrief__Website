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

    // classify sits on EVERY path (issue 061): the safety signals are the most
    // valuable thing it produces and must not depend on a translate checkbox.
    assert.deepEqual(pathFor(standard, {}).map(s => s.id),
        ['normalise', 'ingest', 'transcribe', 'classify', 'summary'])
    assert.deepEqual(pathFor(standard, { infographic: true }).map(s => s.id),
        ['normalise', 'ingest', 'transcribe', 'classify', 'summary', 'infographic'])
    // Translate sits BETWEEN classify and summary — the summary is built from
    // it, so any other position would summarise the wrong text. It is priced in
    // whenever the user asked for it; whether it RUNS is a fact classify learns.
    assert.deepEqual(pathFor(standard, { translate: true }).map(s => s.id),
        ['normalise', 'ingest', 'transcribe', 'classify', 'translate', 'summary'])
    assert.deepEqual(pathFor(standard, { infographic: true, translate: true }).map(s => s.id),
        ['normalise', 'ingest', 'transcribe', 'classify', 'translate', 'summary', 'infographic'])
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
    // classify declares the fact the translate branch is guarded on; true here so
    // the stubbed happy path exercises the same shape a real translating run does.
    'llm-classify':    async () => ({ costUsd: 0.002, facts: { needsTranslation: true } }),
    'llm-translate':   async () => ({ costUsd: 0.006 }),
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
    // transcribe 0.004 + classify 0.002 + summary 0.001. Translate is NOT here:
    // it was never quoted (options.translate is false), so even though classify
    // declares needsTranslation the runner refuses to route to an unpriced step.
    assert.ok(Math.abs(trace.spentUsd - 0.007) < 1e-9, `spent ${trace.spentUsd}`)
    assert.equal(trace.steps.find(s => s.id === 'translate').status, 'skipped')
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
    // The NEXT step is now classify (issue 061), and it is the one refused —
    // the gate blocks at the first boundary after the overrun, wherever that is.
    assert.equal(trace.steps.find(s => s.id === 'classify').status, 'blocked')
    assert.equal(trace.steps.find(s => s.id === 'summary').status, 'pending',
        'nothing past the blocked step was even considered')
    assert.equal(trace.status, 'failed')
})

/* ── facts: conditions the RUN discovers (issue 061) ──────────────────────────
   The asymmetry these lock down is the one the price on screen depends on: a
   quote assumes every discoverable branch is taken, and a run may then decline
   work — so a pass can cost LESS than quoted and never more. */

const withClassify = () => ({
    id: 'f', schema: 1, title: 't', version: '1', start: 'a',
    steps: [
        { id: 'a', kind: 'local', label: 'A', requires: [], produces: [], budget: { usd: 0 },
          on_failure: 'abort', next: [{ to: 'b' }] },
        { id: 'b', kind: 'llm-classify', label: 'B', model: 'm', requires: [], produces: [], budget: { usd: 0.01 },
          on_failure: 'degrade', next: [{ to: 'c', when: 'facts.need', quoteWhen: 'options.want', reason: 'not needed' }, { to: 'd' }] },
        { id: 'c', kind: 'llm-translate', label: 'C', model: 'm', requires: [], produces: [], budget: { usd: 0.03 },
          on_failure: 'degrade', next: [{ to: 'd' }] },
        { id: 'd', kind: 'llm-text', label: 'D', model: 'm', requires: [], produces: [], budget: { usd: 0.02 },
          on_failure: 'degrade', next: [{ to: 'done' }] },
    ],
})

const exec = (facts, spend = {}) => ({
    local: async () => ({ costUsd: 0 }),
    'llm-classify': async () => ({ costUsd: spend.b ?? 0.005, facts }),
    'llm-translate': async () => ({ costUsd: spend.c ?? 0.02 }),
    'llm-text': async () => ({ costUsd: spend.d ?? 0.01 }),
})

test('a declaration may guard a step on a fact', () => {
    assert.deepEqual(validateWorkflow(withClassify()).errors, [])
})

test('quoteWhen must be an option — a price cannot depend on what only the run learns', () => {
    const bad = withClassify()
    bad.steps[1].next[0].quoteWhen = 'facts.something'
    assert.ok(validateWorkflow(bad).errors.some(e => e.includes('quoteWhen')))
})

test('the QUOTE follows the option, not the fact', () => {
    const def = withClassify()
    // want=true → the ceiling includes the guarded step, whatever the run finds
    assert.ok(Math.abs(pathUsd(def, { want: true }) - 0.06) < 1e-9)
    // want=false → it cannot happen, so it is not priced
    assert.ok(Math.abs(pathUsd(def, { want: false }) - 0.03) < 1e-9)
})

test('a false fact SKIPS the quoted step, and the run spends less than quoted', async () => {
    const trace = await runWorkflow(withClassify(),
        { options: { want: true }, executors: exec({ need: false }) })
    const c = trace.steps.find(s => s.id === 'c')
    assert.equal(c.status, 'skipped')
    assert.equal(c.skippedBecause, 'not needed', 'the declaration says WHY, for the flow panel')
    assert.ok(trace.spentUsd < trace.quoteUsd, `spent ${trace.spentUsd} < quoted ${trace.quoteUsd}`)
    assert.equal(trace.status, 'complete')
})

test('a true fact runs it', async () => {
    const trace = await runWorkflow(withClassify(),
        { options: { want: true }, executors: exec({ need: true }) })
    assert.equal(trace.steps.find(s => s.id === 'c').status, 'done')
})

test('a step that DEGRADES can still declare the fact — losing metadata must not drop the work', async () => {
    // This is the safety property: classify failing leaves needsTranslation true.
    const executors = { ...exec({}), 'llm-classify': async () => {
        throw Object.assign(new Error('boom'), { code: 'llm-error', facts: { need: true } })
    } }
    const trace = await runWorkflow(withClassify(), { options: { want: true }, executors })
    assert.equal(trace.steps.find(s => s.id === 'b').status, 'degraded')
    assert.equal(trace.steps.find(s => s.id === 'c').status, 'done',
        'the guarded step still ran, because the failure said it should')
})

test('and a degraded step that says nothing leaves the fact false — so declarations must default safely', async () => {
    const executors = { ...exec({}), 'llm-classify': async () => {
        throw Object.assign(new Error('boom'), { code: 'llm-error' })
    } }
    const trace = await runWorkflow(withClassify(), { options: { want: true }, executors })
    assert.equal(trace.steps.find(s => s.id === 'c').status, 'skipped',
        'undefined reads as false — which is why classify attaches its fact to the failure')
})
