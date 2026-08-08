/* The concept scheme, rendered three ways (issue 057).

   Three views over ONE dataset, because deciding how to look at this is half the
   exercise. They answer different questions and none of them is a favourite yet:

     cards   — definition first, labels underneath.  "Is this word right?"
     matrix  — every culture on one row.             "Where do the cultures part?"
     graph   — broader/narrower/related as edges.    "Is the shape the same?"

   The last one is the interesting one and the honest one: it is the structure a
   held-out check would compare, and drawing it makes plain how few edges thirteen
   interface terms actually induce. A divergence test over a near-edgeless graph
   would produce noise, which is why it is not built yet.

   Dependency-free, same as the rest of the site. Colours come from the theme
   tokens with literal fallbacks. */

const FLAG = { 'en-gb': '🇬🇧', 'en-us': '🇺🇸', 'pt-pt': '🇵🇹', 'pt-br': '🇧🇷' }

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const view = document.getElementById('view')
const filters = document.getElementById('filters')

let data = null
let mode = 'cards'
let only = null          // scheme id, or null for all

const scheme = (id) => data.schemes.find(s => s.id === id)
const shown = () => data.concepts.filter(c => !only || c.scheme === only)

/* ── header counts ─────────────────────────────────────────────────────── */
function renderCounts() {
    const n = (v) => data.concepts.filter(c => c.verdict === v).length
    document.getElementById('counts').innerHTML = `
      <div class="stat"><div class="k">concepts</div><div class="v">${data.concepts.length}</div></div>
      <div class="stat"><div class="k">schemes</div><div class="v">${data.schemes.length}</div></div>
      <div class="stat"><div class="k">cultures</div><div class="v">${data.locales.length}</div></div>
      <div class="stat"><div class="k">change</div><div class="v">${n('change')}</div></div>
      <div class="stat"><div class="k">decide</div><div class="v">${n('decide')}</div></div>
      <div class="stat"><div class="k">keep</div><div class="v">${n('keep')}</div></div>`
}

function renderFilters() {
    filters.innerHTML = [['', 'All schemes'], ...data.schemes.map(s => [s.id, s.label])]
        .map(([id, label]) => `<button type="button" data-scheme="${id}"
             class="${(only || '') === id ? 'on' : ''}">${esc(label)}</button>`).join('')
}

/* ── cards ─────────────────────────────────────────────────────────────── */
const labelRow = (c, which) => data.locales.map(l => {
    const v = (which === 'current' ? c.current : c.proposed)?.[l]
    return `<div class="lab ${v ? '' : 'none'}">
        <span class="lc">${FLAG[l] || ''} ${l}</span>
        <span class="lv">${v ? esc(v.trim()) : '—'}</span></div>`
}).join('')

function renderCards() {
    view.innerHTML = data.schemes
        .filter(s => !only || s.id === only)
        .map(s => `
      <div class="scheme">
        <h3 class="scheme-h">${esc(s.label)}</h3>
        <p class="scheme-n">${esc(s.note)}</p>
        ${data.concepts.filter(c => c.scheme === s.id).map(c => `
          <article class="concept v-${c.verdict}">
            <header>
              <code class="cid">${esc(c.id)}</code>
              <span class="verdict v-${c.verdict}">${c.verdict}</span>
              ${c.finding ? `<span class="finding" title="${esc(data.findings[c.finding])}">${esc(c.finding)}</span>` : ''}
            </header>
            <p class="def">${esc(c.definition)}</p>
            ${c.scopeNote ? `<p class="scope"><span>scope</span> ${esc(c.scopeNote)}</p>` : ''}
            <div class="labels">
              <div class="labels-h">ships today${c.keys.length ? ` · <code>${c.keys.map(esc).join('</code> <code>')}</code>` : ' · no label'}</div>
              <div class="labgrid">${labelRow(c, 'current')}</div>
            </div>
            ${c.proposed ? `<div class="labels proposed">
              <div class="labels-h">proposed</div>
              <div class="labgrid">${labelRow(c, 'proposed')}</div></div>` : ''}
            <p class="why">${esc(c.reasoning)}</p>
            ${relLine(c)}
          </article>`).join('')}
      </div>`).join('')
}

const relLine = (c) => {
    const bits = []
    for (const [k, sym] of [['broader', '↑'], ['narrower', '↓'], ['related', '↔']])
        for (const t of c[k] || []) bits.push(`<span class="rel">${sym} ${esc(t)}</span>`)
    return bits.length ? `<div class="rels">${bits.join('')}</div>` : ''
}

/* ── matrix ────────────────────────────────────────────────────────────── */
function renderMatrix() {
    const rows = shown().map(c => `
      <tr class="v-${c.verdict}">
        <th scope="row"><code>${esc(c.id)}</code>
          <span class="verdict v-${c.verdict}">${c.verdict}</span></th>
        ${data.locales.map(l => {
            const cur = c.current[l], prop = c.proposed?.[l]
            return `<td>${cur ? esc(cur.trim()) : '<span class="none">—</span>'}
              ${prop ? `<span class="prop">→ ${esc(prop)}</span>` : ''}</td>`
        }).join('')}
      </tr>`).join('')
    view.innerHTML = `<div class="tablewrap"><table class="matrix">
      <thead><tr><th scope="col">concept</th>
        ${data.locales.map(l => `<th scope="col">${FLAG[l] || ''} ${l}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody></table></div>
      <p class="tnote">A row where all four cells differ is usually the model working
        (<code>source-recording</code>), not a defect. A row where they all agree and the
        English is wrong is the expensive case — every culture inherited the error
        (<code>locale-unreviewed</code>).</p>`
}

/* ── graph ─────────────────────────────────────────────────────────────────
   Laid out by hand rather than by a force simulation: with this few nodes a
   simulation is both overkill and less readable, and the shape is the point.
   Each scheme is a column — parent on top, children beneath, related concepts
   joined by a dashed line. */
function renderGraph() {
    const schemes = data.schemes.filter(s => !only || s.id === only)
    /* One BAND per scheme, stacked vertically: parents on the upper row,
       their children spread across the lower one. The first version laid
       schemes out as columns and put every node in a single vertical line —
       which drew every edge on top of every other edge and made a tree look
       like a list. Fanning the children out is the whole point: the shape IS
       the information a divergence check would compare. */
    const W = 980, HEAD = 22, ROW_A = 56, ROW_B = 132, BAND = 196
    const height = schemes.length * BAND + 16
    const pos = {}
    const heads = []

    schemes.forEach((s, i) => {
        const top = i * BAND
        const list = data.concepts.filter(c => c.scheme === s.id)
        const parents = list.filter(c => (c.narrower || []).length)
        const kids = list.filter(c => (c.broader || []).length)
        // Neither a parent nor a child: it belongs to the scheme but hangs off
        // it by a related edge only (spoken-language, source-recording).
        const floats = list.filter(c => !(c.narrower || []).length && !(c.broader || []).length)
        const spread = (arr, y) => arr.forEach((c, j) =>
            { pos[c.id] = { x: W * (j + 0.5) / arr.length, y: top + y, row: y } })
        spread([...parents, ...floats], ROW_A)
        spread(kids, ROW_B)
        heads.push(`<text class="col-h" x="14" y="${top + HEAD}" style="text-anchor:start">${esc(s.label)}</text>`)
    })

    const edges = []
    const seen = new Set()
    for (const c of data.concepts) {
        if (!pos[c.id]) continue
        for (const n of c.narrower || []) if (pos[n])
            edges.push(`<line x1="${pos[c.id].x}" y1="${pos[c.id].y + 13}" x2="${pos[n].x}" y2="${pos[n].y - 13}" class="e-h"/>`)
        for (const r of c.related || []) {
            const key = [c.id, r].sort().join('|')
            if (!pos[r] || seen.has(key)) continue
            seen.add(key)
            const a = pos[c.id], b = pos[r]
            // Two nodes on the same row would be joined by a straight line
            // running through whatever sits between them. Arc under instead.
            if (a.row === b.row) {
                const dip = 20 + Math.abs(b.x - a.x) * 0.06
                edges.push(`<path d="M ${a.x} ${a.y + 13} Q ${(a.x + b.x) / 2} ${a.y + 13 + dip} ${b.x} ${b.y + 13}" class="e-r"/>`)
            } else {
                edges.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="e-r"/>`)
            }
        }
    }
    const nodes = Object.entries(pos).map(([id, p]) => {
        const c = data.concepts.find(x => x.id === id)
        const w = Math.max(96, id.length * 7.2 + 22)
        return `<g class="n v-${c.verdict}">
          <rect x="${p.x - w / 2}" y="${p.y - 13}" width="${w}" height="26" rx="7"/>
          <text x="${p.x}" y="${p.y + 4}">${esc(id)}</text></g>`
    }).join('')
    const width = W

    view.innerHTML = `<div class="graphwrap">
      <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img"
           aria-label="Concept relations: solid lines are broader-to-narrower, dashed lines are related">
        ${heads}${edges.join('')}${nodes}
      </svg></div>
      <p class="tnote"><span class="key-h"></span> broader → narrower &nbsp;
        <span class="key-r"></span> related. ${data.concepts.length} interface terms induce
        <strong>${edges.length} edges</strong> — which is the honest argument against running a
        graph-divergence check at this scale yet. Within a scheme the shape is real; across a
        vocabulary this flat, two cultures would differ mostly by noise.</p>`
}

/* ── boot ──────────────────────────────────────────────────────────────── */
const draw = () => ({ cards: renderCards, matrix: renderMatrix, graph: renderGraph }[mode])()

document.querySelector('.viewpick').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]')
    if (!b) return
    mode = b.dataset.view
    for (const x of document.querySelectorAll('.viewpick button')) {
        const on = x === b
        x.classList.toggle('on', on)
        x.setAttribute('aria-selected', String(on))
    }
    draw()
})

filters.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-scheme]')
    if (!b) return
    only = b.dataset.scheme || null
    renderFilters()
    draw()
})

try {
    data = await (await fetch('concepts.json', { cache: 'no-cache' })).json()
    renderCounts()
    renderFilters()
    draw()
} catch (err) {
    view.innerHTML = `<p class="tnote">The concept scheme could not be loaded: ${esc(err.message)}</p>`
}
