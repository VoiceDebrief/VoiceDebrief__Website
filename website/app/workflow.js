/* workflow.js — the declared-workflow validator, quote and runner (issue 042,
   from the v0.33.56 human brief via dev pack v0.1.21__workflow-state-machine).

   The FORMAT is generic (any DAG of steps with requires/produces/model/budget/
   next/on_failure); the MACHINERY is deliberately minimal — this file validates
   a declaration, quotes its cost, and walks it. No expression language:
   conditions are `options.<flag>` truthiness and nothing else. If a real engine
   is ever needed it grows out of files like standard.json, not out of here.

   Budget semantics (honest — a browser cannot halt a model mid-call):
     - the QUOTE is the budget sum along the path the chosen options select
     - the ENTRY GATE refuses to start a step whose budget no longer fits within
       the path's declared total ('workflow-budget')
     - an OVERRUN (actual > declared for a finished step) is recorded on the
       trace, never silently absorbed */

export const TERMINAL = 'done'
export const KINDS = ['local', 'engine', 'llm-transcribe', 'llm-translate', 'llm-text', 'llm-infographic']
export const FAILURE_MODES = ['abort', 'degrade']

/* ── validation ──────────────────────────────────────────────────────────── */

export function validateWorkflow(def) {
    const errors = []
    const err = (m) => errors.push(m)
    if (!def || typeof def !== 'object') return { ok: false, errors: ['not an object'] }
    if (!def.id) err('missing id')
    if (def.schema !== 1) err('schema must be 1')
    if (!def.title) err('missing title')
    if (!Array.isArray(def.steps) || !def.steps.length) err('steps must be a non-empty array')

    const ids = new Set()
    for (const s of def.steps || []) {
        const where = `step ${s.id || '?'}`
        if (!s.id) err('a step is missing an id')
        else if (ids.has(s.id)) err(`duplicate step id: ${s.id}`)
        else ids.add(s.id)
        if (!KINDS.includes(s.kind)) err(`${where}: unknown kind "${s.kind}"`)
        if (!s.label) err(`${where}: missing label`)
        if (!Array.isArray(s.requires) || !Array.isArray(s.produces)) err(`${where}: requires/produces must be arrays`)
        if (typeof s.budget?.usd !== 'number' || s.budget.usd < 0) err(`${where}: budget.usd must be a number >= 0`)
        if (s.kind.startsWith('llm') && !s.model) err(`${where}: llm steps must pin a model (or an options.* reference)`)
        if (!FAILURE_MODES.includes(s.on_failure)) err(`${where}: on_failure must be one of ${FAILURE_MODES.join('/')}`)
        if (!Array.isArray(s.next) || !s.next.length) err(`${where}: next must be a non-empty array`)
        for (const n of s.next || []) {
            if (n.to !== TERMINAL && !(def.steps || []).some(x => x.id === n.to)) err(`${where}: transition to unknown step "${n.to}"`)
            if (n.when != null && !/^options\.[a-zA-Z][\w]*$/.test(n.when)) err(`${where}: "when" must be an options.<flag> reference, got "${n.when}"`)
        }
        const last = (s.next || []).slice(-1)[0]
        if (last && last.when != null) err(`${where}: the last transition must be unconditional (the declared fallback)`)
    }
    if (!def.start || !ids.has(def.start)) err(`start "${def.start}" is not a declared step`)

    // Reachability: every declared step must be reachable from start, and every
    // path must be able to reach the terminal — an unreachable step is a lie in
    // the declaration, and a dead end is an undeclared outcome.
    if (!errors.length) {
        const byId = Object.fromEntries(def.steps.map(s => [s.id, s]))
        const seen = new Set()
        const walk = (id) => {
            if (id === TERMINAL || seen.has(id)) return
            seen.add(id)
            for (const n of byId[id].next) walk(n.to)
        }
        walk(def.start)
        for (const s of def.steps) if (!seen.has(s.id)) err(`step ${s.id} is unreachable from start`)
        const reachesDone = new Set()
        let grew = true
        while (grew) {
            grew = false
            for (const s of def.steps) {
                if (reachesDone.has(s.id)) continue
                if (s.next.some(n => n.to === TERMINAL || reachesDone.has(n.to))) { reachesDone.add(s.id); grew = true }
            }
        }
        for (const s of def.steps) if (seen.has(s.id) && !reachesDone.has(s.id)) err(`step ${s.id} cannot reach ${TERMINAL}`)
    }
    return { ok: !errors.length, errors }
}

/* ── quoting ─────────────────────────────────────────────────────────────── */

const optionFlag = (options, ref) => !!ref && ref.startsWith('options.') && !!options?.[ref.slice(8)]

/* The steps the chosen options select, in execution order. */
export function pathFor(def, options = {}) {
    const byId = Object.fromEntries(def.steps.map(s => [s.id, s]))
    const path = []
    let id = def.start
    while (id !== TERMINAL) {
        const step = byId[id]
        path.push(step)
        const taken = step.next.find(n => n.when == null || optionFlag(options, n.when))
        id = taken.to
    }
    return path
}

/* The quotable ceiling for a run with these options — sum of the path's budgets. */
export function pathUsd(def, options = {}) {
    return pathFor(def, options).reduce((t, s) => t + s.budget.usd, 0)
}

/* The absolute ceiling — every step's budget, all options on. */
export function maxUsd(def) {
    return def.steps.reduce((t, s) => t + s.budget.usd, 0)
}

/* ── loading ─────────────────────────────────────────────────────────────── */

export async function loadWorkflow(url) {
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok) throw Object.assign(new Error(`workflow declaration unavailable: ${url}`), { code: 'workflow-missing' })
    const def = await r.json()
    const v = validateWorkflow(def)
    if (!v.ok) throw Object.assign(new Error(`invalid workflow ${url}: ${v.errors.join('; ')}`), { code: 'workflow-invalid' })
    return def
}

/* ── running ─────────────────────────────────────────────────────────────── */

const resolveModel = (step, options) =>
    step.model && step.model.startsWith('options.') ? (options?.[step.model.slice(8)] || null) : (step.model || null)

/* Walk the declaration. `executors` maps step kind → async fn(step, ctx) that
   does the work and returns { costUsd? }. `emit` gets the wa:workflow:* stream;
   the trace is the provenance record (which steps ran, what each cost, which
   path was taken) and is returned alongside being emitted live. */
export async function runWorkflow(def, { options = {}, executors, emit = () => {} }) {
    const byId = Object.fromEntries(def.steps.map(s => [s.id, s]))
    const quote = pathUsd(def, options)
    const trace = {
        workflow: def.id, workflowVersion: def.version, quoteUsd: quote,
        startedAt: Date.now(), spentUsd: 0, status: 'running',
        steps: def.steps.map(s => ({
            id: s.id, label: s.label, model: resolveModel(s, options), budgetUsd: s.budget.usd,
            status: 'pending', costUsd: null, ms: null, overrun: false, error: null,
        })),
    }
    const tstep = (id) => trace.steps.find(t => t.id === id)
    const tell = (id) => emit('wa:workflow:step', { trace, stepId: id })
    emit('wa:workflow:started', { trace })

    // Steps not on the selected path are declared-but-skipped from the outset.
    const onPath = new Set(pathFor(def, options).map(s => s.id))
    for (const t of trace.steps) if (!onPath.has(t.id)) t.status = 'skipped'

    let id = def.start
    try {
        while (id !== TERMINAL) {
            const step = byId[id]
            const t = tstep(id)

            // The entry gate: a run that has already overrun cannot keep spending.
            if (trace.spentUsd + step.budget.usd > quote + 1e-9) {
                t.status = 'blocked'
                t.error = 'workflow-budget'
                trace.status = 'failed'
                tell(id); emit('wa:workflow:complete', { trace })
                throw Object.assign(new Error(`step ${id} refused: spend so far ($${trace.spentUsd.toFixed(4)}) leaves no room in the declared ceiling ($${quote.toFixed(2)})`), { code: 'workflow-budget' })
            }

            t.status = 'running'
            t.startedAt = Date.now()
            tell(id)
            try {
                const out = (await executors[step.kind](step, { options })) || {}
                t.ms = Date.now() - t.startedAt
                t.costUsd = out.costUsd ?? 0
                trace.spentUsd += t.costUsd
                t.overrun = t.costUsd > step.budget.usd + 1e-9
                t.status = 'done'
            } catch (e) {
                t.ms = Date.now() - t.startedAt
                t.error = e.code || e.message || 'error'
                if (step.on_failure === 'abort') {
                    t.status = 'failed'
                    trace.status = 'failed'
                    tell(id); emit('wa:workflow:complete', { trace })
                    throw e
                }
                t.status = 'degraded'   // declared: the run continues without this artefact
            }
            tell(id)
            id = step.next.find(n => n.when == null || optionFlag(options, n.when)).to
        }
        trace.status = trace.steps.some(s => s.status === 'degraded') ? 'degraded' : 'complete'
    } finally {
        trace.finishedAt = Date.now()
    }
    emit('wa:workflow:complete', { trace })
    return trace
}
