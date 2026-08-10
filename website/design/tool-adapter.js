/* Shared adapter for the three design variants.
   Live mode: talks to the real window.__tool (SKILL__api.md actions).
   Fixture mode: scripted pass + chat, so the prototype is usable with no key.
   Telemetry: local-only (option (a)) — counters never leave the browser. */

export const KEY_LS = 'sg-openrouter-mgmt-key'
export const USD_TO_GBP = 0.79
export const gbp = (usd) => (usd == null || Number.isNaN(usd)) ? '£—'
  : '£' + (usd * USD_TO_GBP).toFixed(usd * USD_TO_GBP < 0.10 ? 3 : 2)

export function getKey () { try { return localStorage.getItem(KEY_LS) || '' } catch (e) { return '' } }
export function saveKey (k) { try { localStorage.setItem(KEY_LS, k) } catch (e) {} }
export function clearKey () { try { localStorage.removeItem(KEY_LS) } catch (e) {} }
export function hasTool () { return !!(typeof window !== 'undefined' && window.__tool) }
export function isLive () { return hasTool() && !!getKey() }

/* ---- local-only telemetry (option a) ------------------------------------ */
const TL = 'wa-design-session-log'
export function bump (event, variant) {
  try {
    const s = JSON.parse(localStorage.getItem(TL) || '{}')
    s.started = s.started || new Date().toISOString()
    s.events = s.events || []
    s.events.push({ event, variant, t: new Date().toISOString() })
    localStorage.setItem(TL, JSON.stringify(s))
  } catch (e) {}
}
export function sessionLog () {
  try { return JSON.parse(localStorage.getItem(TL) || '{}') } catch (e) { return {} }
}
export function clearSessionLog () { try { localStorage.removeItem(TL) } catch (e) {} }

/* ---- fixtures ----------------------------------------------------------- */
export const SAMPLE = {
  name: 'whatsapp-voice-note-1.opus',
  size: 214_528,
  seconds: 97
}

export const FIXTURE_TRANSCRIPT =
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

export const FIXTURE_SUMMARY =
`**Three items from the Thursday call, one needs an answer by Friday.**

- **Nakamura contract.** Legal accept the indemnity clause as drafted. Counterparty wants termination notice at 60 days, not 30. Sender's view: accept it.
- **Migration.** Export API rate-limited at ~40%; the weekend cutover is off. Priya proposes splitting it — read-only this weekend, writes the following weekend. Consequence: two customer comms instead of one. **Action:** agree wording with Marcus.
- **Q4 budget.** ~£11,000 over on contractors. **Action (by Friday):** review actuals and respond.
- Offsite: declining Tuesday, attending the dinner.`

const CHAT_RULES = [
  { re: /spanish|español|espanol/i, tool: 'update_summary', tier: 'changes materials',
    say: 'Rewritten in Spanish. The English original is one click away.',
    patch: { summary: `**Tres puntos de la llamada del jueves; uno necesita respuesta antes del viernes.**

- **Contrato Nakamura.** Legal acepta la cláusula de indemnización tal como está. La contraparte pide un preaviso de rescisión de 60 días en lugar de 30. Opinión del remitente: aceptarlo.
- **Migración.** La API de exportación alcanzó el límite al ~40%; el cambio del fin de semana queda cancelado. Priya propone dividirlo. **Acción:** acordar el texto con Marcus.
- **Presupuesto Q4.** ~£11.000 por encima en contratistas. **Acción (antes del viernes):** revisar las cifras reales.
- Offsite: no asistirá el martes, sí a la cena.` } },
  { re: /redraw|infographic|different model|diagram/i, tool: 'redraw_infographic', tier: 'spends money',
    say: 'Redrawn with the SVG model. Cost of that call: £0.041.', patch: { redraw: true } },
  { re: /action|todo|to-do|task/i, tool: 'read_summary', tier: 'read',
    say: `Two actions carry a deadline:

1. **Review Q4 contractor actuals and reply — by Friday.** ~£11k over.
2. **Agree the split-migration customer comms with Marcus** — before this weekend's read-only move.

The Nakamura 60-day term is a decision, not a task: the sender has already recommended accepting it.` },
  { re: /shorter|shorten|brief|tighter|one line/i, tool: 'update_summary', tier: 'changes materials',
    say: 'Tightened to four lines.', patch: { summary: `- Nakamura: accept 60-day termination notice (legal are content).
- Migration: cutover split — read-only this weekend, writes the next. Marcus to draft two comms.
- Q4: ~£11k over on contractors. **Actuals reviewed and answered by Friday.**
- Offsite: dinner only.` } },
  { re: /cost|spend|price|how much/i, tool: 'read_trace', tier: 'read',
    say: 'This pass cost **£0.019**: transcribe £0.011, summarise £0.003, infographic £0.005. Your declared ceiling for the run was £0.213 — you used 9% of it.' }
]

const wait = (ms) => new Promise(r => setTimeout(r, ms))

/* Reveal `full` over `duration` ms. Driven by a setTimeout tick that computes
   progress from ELAPSED TIME, so a throttled tab jumps to the right position
   instead of stretching; a hard deadline guarantees it finishes even if the tab
   is hidden (rAF is paused outright there, so it is deliberately not used). */
function streamText (full, duration, onChunk) {
  const words = full.split(' ')
  return new Promise(resolve => {
    const t0 = Date.now()
    let done = false
    const finish = () => { if (done) return; done = true; clearTimeout(deadline); onChunk(full); resolve() }
    const deadline = setTimeout(finish, duration + 40)
    let last = -1
    const step = () => {
      if (done) return
      const p = Math.min(1, (Date.now() - t0) / duration)
      const n = Math.max(1, Math.round(words.length * p))
      if (n !== last) { last = n; onChunk(words.slice(0, n).join(' ')) }
      if (p >= 1) finish(); else setTimeout(step, 50)
    }
    step()
  })
}

/* ---- the pass ----------------------------------------------------------- */
/* onStage(stage, payload) — stage ∈ ingest|transcribe|chunk|transcript|summary|infographic|complete */
export async function runPass ({ file, infographic = true, onStage = () => {}, variant } = {}) {
  bump('pass:started', variant)
  if (isLive()) {
    const on = (n, f) => window.addEventListener(n, f)
    on('wa:ingested', () => onStage('ingest'))
    on('wa:transcript', e => onStage('transcript', e.detail))
    on('wa:summary', e => onStage('summary', e.detail))
    on('wa:infographic', e => onStage('infographic', e.detail))
    const r = await window.__tool.runPass({ file, infographic })
    onStage('complete', r); bump('pass:complete', variant)
    return r
  }
  onStage('ingest'); await wait(500)
  onStage('transcribe'); await wait(700)
  /* Time-driven rather than tick-driven: a throttled background tab still finishes
     in the promised ~2s of transcription rather than stretching to a minute. */
  await streamText(FIXTURE_TRANSCRIPT, 2000, t => onStage('chunk', t))
  onStage('transcript', FIXTURE_TRANSCRIPT); await wait(400)
  onStage('summarise'); await wait(1100)
  onStage('summary', FIXTURE_SUMMARY)
  if (infographic) { onStage('drawing'); await wait(1500); onStage('infographic', { placeholder: true }) }
  const r = {
    name: (file && file.name) || SAMPLE.name,
    transcript: FIXTURE_TRANSCRIPT,
    summary: FIXTURE_SUMMARY,
    infographic: infographic ? { placeholder: true } : null,
    usage: { usd: 0.024, ceilingUsd: 0.27 }
  }
  onStage('complete', r); bump('pass:complete', variant)
  return r
}

/* ---- chat --------------------------------------------------------------- */
export async function chatTurn ({ text, onUpdate = () => {}, variant } = {}) {
  bump('chat:turn', variant)
  if (isLive()) {
    const off = e => onUpdate(e.detail)
    window.addEventListener('wa:chat:update', off)
    try { return await window.__tool.chatExchange({ text }) }
    finally { window.removeEventListener('wa:chat:update', off) }
  }
  const rule = CHAT_RULES.find(r => r.re.test(text))
  await wait(500)
  if (rule && rule.tool !== 'read_summary' && rule.tool !== 'read_trace') {
    onUpdate({ role: 'tool', tool: rule.tool, tier: rule.tier, state: 'running' })
    await wait(900)
    onUpdate({ role: 'tool', tool: rule.tool, tier: rule.tier, state: 'done' })
  } else if (rule) {
    onUpdate({ role: 'tool', tool: rule.tool, tier: rule.tier, state: 'done' })
    await wait(300)
  }
  const say = rule ? rule.say
    : `I can work on these materials, not just talk about them — try “rewrite the summary in Spanish”, “make it shorter”, “what are the actions?”, “redraw the infographic” or “what did this cost?”.`
  await wait(300)
  onUpdate({ role: 'assistant', text: say })
  return { text: say, patch: rule && rule.patch }
}

export const CHAT_SUGGESTIONS = [
  'What are the actions?',
  'Make the summary shorter',
  'Rewrite it in Spanish',
  'What did this cost?'
]
