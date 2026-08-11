/* wa-facts-card v0.1.0 — what the pass noticed about the recording (issue 061).

   A short, scannable band above the transcript: the detected language, what the
   note is about, its register and mood, and — only when there is something to
   say — the safety signals.

   Two design rules, both about not over-claiming:

   1. THE SIGNALS ARE NOT A VERDICT. They are shown as observations in the
      product's own words, and the card says plainly that the classifier reads
      the same untrusted text as everything else and can be talked out of
      reporting. A clean card is not evidence of safety, and a badge implying it
      were would be worse than showing nothing.

   2. NOTHING HERE IS RENDERED AS HTML. Every value arrives already allowlisted
      by classify.js, and every one is written with textContent regardless. The
      input is a stranger's voice note; belt and braces is the correct amount of
      caution.

   Dependency-free, styled from --wa-* tokens with literal fallbacks. */

const T = (k, fallback) => window.__waI18n?.tOr?.(k, fallback) ?? fallback

/* The pairing worth calling out, because neither half is alarming alone: a
   request to move money plus pressure not to check with anyone is the shape of
   most voice-note fraud. Duplicated from classify.js deliberately — a component
   must render correctly on a page that never loaded the app modules. */
const FRAUD_PAIR = ['financial-request', 'urgency-pressure']

const CSS = `
:host{display:block}
.card{border:1px solid var(--wa-line,#dbe3ec);border-radius:14px;background:var(--wa-fg,#fff);
  margin-bottom:18px;overflow:hidden;
  font-family:var(--wa-font,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif)}
.head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;
  padding:10px 16px;border-bottom:1px solid var(--wa-line,#dbe3ec);background:var(--wa-mist,#f2f5f9)}
.title{font-size:.7rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;
  color:var(--wa-blue,#2563eb)}
.gist{font-size:.86rem;color:var(--wa-muted,#5b6b7f);flex:1;min-width:180px}
.body{padding:14px 16px;display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;
  padding:4px 11px;border-radius:999px;border:1px solid var(--wa-line,#dbe3ec);
  background:var(--wa-mist,#f2f5f9);color:var(--wa-ink,#1a2433)}
.chip .k{font-size:.62rem;font-weight:800;letter-spacing:.6px;text-transform:uppercase;
  color:var(--wa-muted-2,#9fb2c9)}
.chip.lang{border-color:var(--wa-blue-line-2,#b9cdf2);background:var(--wa-blue-bg,#e8effc)}
.topics{display:flex;flex-wrap:wrap;gap:6px}
.topic{font-size:.78rem;padding:3px 10px;border-radius:999px;
  background:var(--wa-tint-green,rgba(37,211,102,.06));
  border:1px solid var(--wa-ring-green-2,rgba(37,211,102,.5));color:var(--wa-green-dark,#1f7a4d)}
.skipped{font-size:.8rem;color:var(--wa-green-dark,#1f7a4d)}
.signals{border-top:1px solid var(--wa-line,#dbe3ec);padding:12px 16px;
  background:var(--wa-amber-bg,#fdf1e3)}
.signals.fraud{background:var(--wa-danger-bg,#fdecec)}
.sig-h{font-size:.68rem;font-weight:800;letter-spacing:.7px;text-transform:uppercase;
  color:var(--wa-amber-ink,#a05a00);margin-bottom:7px}
.signals.fraud .sig-h{color:var(--wa-danger-ink,#8a1f1f)}
.sig{display:flex;gap:8px;font-size:.86rem;margin-bottom:5px;color:var(--wa-ink,#1a2433)}
.sig b{font-weight:700;white-space:nowrap}
.caveat{font-size:.76rem;color:var(--wa-muted,#5b6b7f);padding:9px 16px;
  border-top:1px solid var(--wa-line,#dbe3ec)}
@media(max-width:560px){ .body{gap:7px} .gist{min-width:100%} }
`

class WaFactsCard extends HTMLElement {
    connectedCallback() {
        if (!this.shadowRoot) this.attachShadow({ mode: 'open' })
        this.render()
    }

    /* show({ facts, needsTranslation, translated }) — facts already normalised
       and allowlisted by classify.js. */
    show(detail) {
        this._d = detail || null
        this.render()
    }

    clear() { this._d = null; this.render() }

    render() {
        const root = this.shadowRoot
        if (!root) return
        const d = this._d
        if (!d || !d.facts) { root.innerHTML = ''; this.hidden = true; return }
        this.hidden = false
        const f = d.facts
        const sig = f.signals || []
        const fraud = FRAUD_PAIR.every(k => sig.includes(k))

        root.innerHTML = `<style>${CSS}</style>
<div class="card">
  <div class="head">
    <span class="title">${T('facts.title', 'WHAT WE NOTICED')}</span>
    <span class="gist"></span>
  </div>
  <div class="body">
    ${f.language?.name ? `<span class="chip lang"><span class="k">${T('facts.language', 'language')}</span><b class="v-lang"></b></span>` : ''}
    ${f.register ? `<span class="chip"><span class="k">${T('facts.register', 'register')}</span><span class="v-reg"></span></span>` : ''}
    ${f.sentiment ? `<span class="chip"><span class="k">${T('facts.sentiment', 'mood')}</span><span class="v-sen"></span></span>` : ''}
    ${f.urgency && f.urgency !== 'normal' ? `<span class="chip"><span class="k">${T('facts.urgency', 'urgency')}</span><span class="v-urg"></span></span>` : ''}
    ${f.topics?.length ? `<span class="topics"></span>` : ''}
  </div>
  ${d.needsTranslation === false && d.asked ? `<div class="caveat skipped">${T('facts.noTranslationNeeded', 'Already in your language — the translation step was skipped, and not charged for.')}</div>` : ''}
  ${sig.length ? `<div class="signals${fraud ? ' fraud' : ''}">
    <div class="sig-h">${fraud ? T('facts.signalsFraud', 'worth a second look') : T('facts.signals', 'noticed')}</div>
    <div class="sig-list"></div>
  </div>` : ''}
  ${sig.length ? `<div class="caveat">${T('facts.caveat', 'These are observations from a language model reading the same recording — not a security check. It can miss things, and a note written to fool it can fool it.')}</div>` : ''}
</div>`

        // Everything below is textContent. See the header note.
        const put = (sel, text) => { const el = root.querySelector(sel); if (el && text) el.textContent = text }
        put('.gist', f.summaryLine || '')
        put('.v-lang', f.language?.name || '')
        put('.v-reg', f.register || '')
        put('.v-sen', f.sentiment || '')
        put('.v-urg', f.urgency || '')

        const topics = root.querySelector('.topics')
        if (topics) for (const t of f.topics) {
            const s = document.createElement('span')
            s.className = 'topic'; s.textContent = t
            topics.appendChild(s)
        }
        const list = root.querySelector('.sig-list')
        if (list) for (const key of sig) {
            const row = document.createElement('div')
            row.className = 'sig'
            const b = document.createElement('b')
            b.textContent = T(`facts.sig.${key}`, key.replace(/-/g, ' ')) + ' —'
            const span = document.createElement('span')
            span.textContent = T(`facts.sigText.${key}`, this.constructor.TEXT[key] || '')
            row.append(b, span)
            list.appendChild(row)
        }
    }
}

/* The plain-English line per signal. OURS, never the model's — see classify.js. */
WaFactsCard.TEXT = {
    'prompt-injection':  'The note appears to address an AI system rather than a person.',
    'credentials':       'A password, key, PIN or one-time code may have been spoken aloud.',
    'personal-data':     'Identifiable personal details about somebody are discussed.',
    'financial-request': 'The note asks for money to move, or for payment details to change.',
    'urgency-pressure':  'The note pushes for fast action or discourages checking with anyone.',
    'legal-or-medical':  'Legal or medical content, where an approximate summary can mislead.',
}

customElements.define('wa-facts-card', WaFactsCard)
