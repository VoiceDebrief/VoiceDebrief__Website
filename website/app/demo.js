/* demo.js — the product running on scripted answers, with no key (issue 062).

   Somebody arriving for the first time hits a wall: they cannot see what this
   does until they have an OpenRouter account and a key, which is a lot to ask of
   a stranger. So there is a demo path.

   THE IMPORTANT DESIGN DECISION: this does NOT simulate the product. It runs the
   real declared workflow, the real executors' shape, the real event stream, the
   real trace and the real cards — and substitutes only the model answers. The
   design prototypes under /design/ fake the flow with timers, which is right for
   a prototype and wrong here: a demo that drifts from the product is a demo that
   lies, and the first thing it would lie about is the thing it exists to show.

   So a demo pass exercises: the declared path including the classify branch, the
   budget accounting, the flow panel's trace, the facts card, the translate skip
   decision, and every wa:* event. If the workflow changes, the demo changes with
   it or the tests fail.

   Two things it must never do, both about not misleading:
     - never touch the network or the key. A demo that quietly spent someone's
       money would be indefensible.
     - never be mistakable for a real result. Every artefact is stamped, the cost
       line reads £0.00, and the fixture is visibly about a fictional company. */

/* A realistic voice note: rambling, self-correcting, several topics, an actual
   deadline, one figure. Adapted from the fixture written for the design pack —
   the same recording across both surfaces means a design decision made against
   the prototype still holds against the product. */
export const DEMO_TRANSCRIPT =
`Hi — sorry, doing this on the walk back from the station so it might be a bit rambly. ` +
`Three things from the Thursday call. First, the Nakamura contract: legal came back and they're fine ` +
`with the indemnity clause as drafted, but they want the termination notice moved from thirty days to ` +
`sixty. I said we'd think about it. Honestly I think we take it — sixty days is not the hill. ` +
`Second thing, the migration. Priya's team hit the rate limit on the export API about forty per cent ` +
`through, so the weekend cutover is not happening. She's proposing we split it: read-only traffic moves ` +
`this weekend, writes the weekend after. I think that's sensible but it means two comms to customers ` +
`instead of one, so can you talk to Marcus about the wording. And third — and this is the one I actually ` +
`need an answer on — the budget line for Q4. We're about eleven thousand over on contractors and I don't ` +
`want to find out in October that nobody flagged it. Can you have a look at the actuals and come back to ` +
`me before Friday? That's it. Oh, and the offsite — I'm a no for the Tuesday, I'll join the dinner. Thanks.`

/* Written in the shape summary-prompt.md actually produces — three fixed
   sections, actions carrying an owner. If the prompt's shape changes this is
   wrong, which is the correct amount of coupling. */
export const DEMO_SUMMARY =
`## Key points

- **Nakamura contract:** legal accept the indemnity clause as drafted. The counterparty wants termination notice at 60 days rather than 30; the speaker's view is to accept.
- **Migration:** the export API rate-limited at about 40%, so the weekend cutover is off. Priya proposes splitting it — read-only this weekend, writes the following weekend — which means two customer comms instead of one.
- **Q4 budget:** roughly £11,000 over on contractors, and the speaker does not want this surfacing in October.
- Offsite: declining the Tuesday, attending the dinner.

## Actions

- [you] Agree the customer comms wording with Marcus, now the migration is split across two weekends
- [you] Review the Q4 contractor actuals and come back before Friday

## In one sentence

Three items from Thursday's call — the contract terms are agreed, the migration slips to two weekends, and the Q4 contractor overspend needs an answer by Friday.`

export const DEMO_TRANSLATION =
`Olá — desculpa, estou a gravar isto a caminho da estação, por isso pode sair um pouco desorganizado. ` +
`Três coisas da reunião de quinta-feira. Primeiro, o contrato da Nakamura: os advogados responderam e não ` +
`têm problema com a cláusula de indemnização tal como está, mas querem que o pré-aviso de rescisão passe ` +
`de trinta para sessenta dias. Disse que íamos pensar. Sinceramente, acho que aceitamos. ` +
`Segundo, a migração. A equipa da Priya bateu no limite da API de exportação a cerca de quarenta por cento, ` +
`por isso a mudança deste fim de semana não acontece. Ela propõe dividir: o tráfego de leitura muda este ` +
`fim de semana, as escritas no seguinte. Fala com o Marcus sobre a comunicação. E terceiro — e é este que ` +
`preciso mesmo de resposta — a rubrica de orçamento para o quarto trimestre. Estamos cerca de onze mil acima ` +
`nos contratados. Podes ver os valores reais e dizer-me alguma coisa antes de sexta? É tudo. Ah, e o offsite ` +
`— não vou na terça, apareço no jantar.`

/* What classify would return for this recording. English, high confidence — so a
   demo run by an English reader SKIPS translation and shows that decision, which
   is exactly the behaviour worth demonstrating. */
export const DEMO_FACTS_RAW = {
    language: { code: 'en', name: 'English', confidence: 0.97 },
    topics: ['contract terms', 'migration schedule', 'Q4 budget overspend'],
    register: 'casual',
    sentiment: 'neutral',
    urgency: 'high',
    signals: [],
    summaryLine: 'Three items from a Thursday call; the budget one needs an answer by Friday',
}

/* Roughly what a real pass costs, so the cost line demonstrates something true
   about the product rather than a round number. NOT charged — the demo spends
   nothing, and these are reported as what this WOULD have cost. */
const WOULD_COST = { transcribe: 0.0032, classify: 0.0005, translate: 0.0071, summary: 0.0058, infographic: 0 }

const wait = (ms) => new Promise(r => setTimeout(r, ms))

/* Timings close to the real thing. A demo that returns instantly teaches the
   wrong expectation, and the progress rail is part of what is being shown. */
const PACE = { transcribe: 1400, classify: 700, translate: 1500, summary: 1600, infographic: 2200 }

/* demoExecutors({ results, emit, options }) — the same map runPass builds for a
   real pass, with the model calls replaced. Everything else (the workflow
   machine, the events, the trace, the budget gate) is untouched. */
export function demoExecutors({ results, emit, options, infographicMount, normalise, needsTranslation }) {
    return {
        'local': async () => {
            results.name = DEMO_FILE.name
            emit('wa:pass:started', { name: DEMO_FILE.name, sizeBytes: DEMO_FILE.size, sniffed: { container: 'ogg', codec: 'opus' }, demo: true })
            return { costUsd: 0 }
        },
        'engine': async () => {
            emit('wa:ingested', { id: 'demo', name: DEMO_FILE.name, sizeBytes: DEMO_FILE.size, demo: true })
            return { costUsd: 0 }
        },
        'llm-transcribe': async () => {
            await wait(PACE.transcribe)
            results.transcript = DEMO_TRANSCRIPT
            results.usage.transcribe = { costUsd: 0, wouldCostUsd: WOULD_COST.transcribe, demo: true }
            emit('wa:transcript', { text: DEMO_TRANSCRIPT, demo: true, usage: results.usage.transcribe })
            return { costUsd: 0 }
        },
        'llm-classify': async (step, ctx) => {
            await wait(PACE.classify)
            // The real normalise/needsTranslation, not a shortcut: the decision
            // being demonstrated is made by the code that makes it in production.
            const facts = normalise(DEMO_FACTS_RAW)
            results.facts = facts
            results.usage.classify = { costUsd: 0, wouldCostUsd: WOULD_COST.classify, demo: true }
            const need = !!ctx.options.translate && needsTranslation(facts, ctx.options.languageCode)
            emit('wa:facts', { facts, needsTranslation: need, demo: true, usage: results.usage.classify })
            return { costUsd: 0, facts: { needsTranslation: need } }
        },
        'llm-translate': async () => {
            await wait(PACE.translate)
            results.translation = DEMO_TRANSLATION
            results.usage.translate = { costUsd: 0, wouldCostUsd: WOULD_COST.translate, demo: true }
            emit('wa:translation', { text: DEMO_TRANSLATION, demo: true, usage: results.usage.translate })
            return { costUsd: 0 }
        },
        'llm-text': async () => {
            await wait(PACE.summary)
            results.summary = DEMO_SUMMARY
            results.usage.summary = { costUsd: 0, wouldCostUsd: WOULD_COST.summary, demo: true }
            emit('wa:summary', { text: DEMO_SUMMARY, demo: true, usage: results.usage.summary })
            return { costUsd: 0 }
        },
        /* The infographic is the one artefact a demo cannot honestly fake: it is a
           generated image, and a canned picture of somebody else's data would be
           the most misleading thing on the page. The step is declared degraded
           instead, and the UI says why — which also demonstrates the product's
           real degrade behaviour. */
        'llm-infographic': async () => {
            await wait(PACE.infographic)
            emit('wa:infographic:error', { code: 'demo-no-image', demo: true,
                message: 'The infographic is drawn by an image model, so the demo cannot show one honestly. Add a key to see it.' })
            throw Object.assign(new Error('demo: no image'), { code: 'demo-no-image' })
        },
    }
}

export const DEMO_FILE = { name: 'demo — thursday call.opus', size: 214528, seconds: 97 }
