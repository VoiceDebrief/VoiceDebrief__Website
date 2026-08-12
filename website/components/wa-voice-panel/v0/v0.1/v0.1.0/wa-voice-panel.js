/* wa-voice-panel v0.1.0 — the Updates, read aloud, on demand (issue 062).

   A right-edge 🎙 pane on the Updates page: pick a post, edit the spoken script,
   pick a voice, hear it, download it. The product turns voice notes into
   writing; this turns our writing back into a voice note.

   Why a panel first (Dinis, 11 Aug), rather than the CI pipeline the brief
   described: it removes every blocker at once. No CI secret — the key is
   already in this browser's localStorage under the same name the app uses. No
   committed audio and no ffmpeg — you listen, and download only what you like.
   And no vendoring: Node cannot import an https URL, but a BROWSER can, so the
   TTS module loads straight from the engine origin with CORS `*`. It also
   answers the only question a pipeline could not: does the voice sound right.

   DELIBERATELY DEPENDENCY-FREE, and one file. The Updates page loads no engine
   today, and a reader who never opens this pane should pay nothing for it: the
   TTS module is imported on FIRST SYNTHESIS, not on page load. One file because
   sibling .css is fetched unstamped at runtime, so a cached copy can outlive a
   deploy (the trap recorded in issue 050's M1a note).

   Styling reads --wa-* tokens with literal fallbacks, so it looks right on the
   Updates page (which loads no theme sheet) and follows the theme where one
   exists. Joins the one-pane-at-a-time protocol (wa:panel-opened).

   CSP NOTE: the Updates page declares no Content-Security-Policy today, and this
   is why it must not gain a restrictive one by accident — synthesis needs
   `script-src https://dev.tools.sgraph.ai` (the module) and
   `connect-src https://openrouter.ai` (the call and the cost lookup). The app
   page's CSP already names both hosts; copy it, do not invent a narrower one.

   Testing seam: `panel.synthesize = fn` replaces the real call, exactly as
   `synthesizeOpenRouter` itself accepts `fetchImpl` — so the whole flow is
   testable with no key, no network and no spend. */

const LS_KEY = 'sg-openrouter-mgmt-key'          // the same key the app saves
const TTS_MODULE = 'https://dev.tools.sgraph.ai/core/sg-tts-openrouter/v0/v0.1/v0.1.0/sg-tts-openrouter.js'
const VOICES = ['onyx', 'echo', 'alloy', 'fable', 'nova', 'shimmer']
const DEFAULT_VOICE = 'onyx'

/* The news style comes from the script, not from a mode — so the script is a
   starting point a human edits, never something silently synthesised from the
   post. A lead-in, the headline, then the story in the Journalist's own words. */
export function draftScript (post) {
    if (!post) return ''
    const lead = 'Here is the latest from Voice Note Transcribe.'
    const title = String(post.title || '').replace(/\s*—\s*/g, ', ').trim()
    const body = String(post.summary || '').trim()
    return `${lead} ${title}${title.endsWith('.') ? '' : '.'}\n\n${body}`
}

const CSS = `
:host{all:initial}
*{box-sizing:border-box;font-family:var(--wa-font,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif)}
.toggle{position:fixed;right:0;top:44%;z-index:60;display:flex;flex-direction:column;align-items:center;
  gap:6px;padding:12px 6px;border:1px solid var(--wa-ring-blue-3,rgba(37,99,235,.3));border-right:0;
  border-radius:8px 0 0 8px;background:var(--wa-blue-bg,#eef4ff);color:var(--wa-blue,#2563eb);
  cursor:pointer;font-size:1.05rem;line-height:1}
.toggle small{font-size:.58rem;font-weight:700;letter-spacing:.08em;writing-mode:vertical-rl}
.toggle:hover{background:var(--wa-blue-line,#dbe7ff)}
.toggle.open{background:var(--wa-blue,#2563eb);color:#fff}
.panel{position:fixed;top:0;right:0;bottom:0;z-index:59;width:min(430px,100vw);display:none;
  flex-direction:column;background:#fff;border-left:1px solid var(--wa-line,#dbe3ec);
  box-shadow:-8px 0 30px rgba(11,31,58,.18)}
.panel.open{display:flex}
.head{display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--wa-navy,#0b1f3a);color:#fff;flex:none}
.head b{font-size:.95rem;font-weight:700}
.head button{margin-left:auto;background:none;border:0;color:#c8d6e8;font-size:1.1rem;cursor:pointer;line-height:1}
.body{padding:14px;overflow:auto;display:flex;flex-direction:column;gap:12px}
label{font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--wa-muted,#5b6b7f);display:block;margin-bottom:4px}
select,textarea,input{width:100%;font:inherit;font-size:.9rem;padding:8px 10px;border-radius:8px;
  border:1px solid var(--wa-line,#dbe3ec);background:#fff;color:var(--wa-ink,#1a2433)}
textarea{min-height:170px;line-height:1.55;resize:vertical}
.row{display:flex;gap:10px}.row>*{flex:1}
button.go{font:inherit;font-weight:700;font-size:.92rem;padding:11px 16px;border:0;border-radius:9px;
  background:var(--wa-green,#25d366);color:#06301a;cursor:pointer}
button.go:disabled{background:var(--wa-line,#dbe3ec);color:var(--wa-muted,#5b6b7f);cursor:not-allowed}
.note{font-size:.78rem;line-height:1.5;color:var(--wa-muted,#5b6b7f);
  border:1px dashed var(--wa-line,#dbe3ec);border-radius:9px;padding:9px 11px}
.note b{color:var(--wa-ink,#1a2433)}
.status{font-size:.82rem;color:var(--wa-muted,#5b6b7f);min-height:1.2em}
.status.err{color:var(--wa-danger,#b3261e)}
audio{width:100%}
.out{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--wa-line,#dbe3ec);padding-top:12px}
.out.hide{display:none}
a.dl{font-size:.85rem;font-weight:600;color:var(--wa-blue,#2563eb)}
.meta{font-size:.74rem;color:var(--wa-muted,#5b6b7f);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
`

class WaVoicePanel extends HTMLElement {
    connectedCallback () {
        const root = this.attachShadow({ mode: 'open' })
        root.innerHTML = `<style>${CSS}</style>
<button class="toggle" title="Read an update aloud">🎙<small>VOICE</small></button>
<aside class="panel" aria-label="Read an update aloud">
  <div class="head"><b>🎙 Read an update aloud</b><button class="close" aria-label="Close">✕</button></div>
  <div class="body">
    <p class="note"><b>A synthetic voice reads a script you write.</b> It is generated here in
      your browser with <b>your own OpenRouter key</b> and billed to it — a short read costs a
      fraction of a penny. Nothing is uploaded to us and nothing is published: you listen, and
      download the file if it is any good.</p>
    <div><label for="post">Update</label><select id="post"></select></div>
    <div><label for="script">Spoken script — edit until it reads like the news</label>
      <textarea id="script" spellcheck="true"></textarea></div>
    <div class="row">
      <div><label for="voice">Voice</label><select id="voice"></select></div>
      <div><label for="key">OpenRouter key</label><input id="key" type="password" placeholder="sk-or-v1-…"></div>
    </div>
    <button class="go" id="go">Generate the voice memo</button>
    <p class="status" id="status"></p>
    <div class="out hide" id="out">
      <audio id="audio" controls></audio>
      <a class="dl" id="dl" download>⬇ Download the .wav</a>
      <p class="meta" id="meta"></p>
    </div>
  </div>
</aside>`
        this.$ = (s) => root.getElementById(s) || root.querySelector(s)
        this._open = false
        this._posts = []

        const voice = this.$('voice')
        voice.innerHTML = VOICES.map(v => `<option value="${v}"${v === DEFAULT_VOICE ? ' selected' : ''}>${v}</option>`).join('')
        try { this.$('key').value = localStorage.getItem(LS_KEY) || '' } catch (_) { /* private mode */ }

        root.querySelector('.toggle').addEventListener('click', () => this.setOpen(!this._open))
        root.querySelector('.close').addEventListener('click', () => this.setOpen(false))
        window.addEventListener('wa:panel-opened', e => { if (e.detail?.id !== 'voice' && this._open) this.setOpen(false) })
        this.$('post').addEventListener('change', () => this.fillScript())
        this.$('go').addEventListener('click', () => this.generate())
        this.$('key').addEventListener('change', () => {
            const v = this.$('key').value.trim()
            try { v ? localStorage.setItem(LS_KEY, v) : localStorage.removeItem(LS_KEY) } catch (_) {}
        })
    }

    setOpen (open) {
        this._open = open
        this.shadowRoot.querySelector('.panel').classList.toggle('open', open)
        this.shadowRoot.querySelector('.toggle').classList.toggle('open', open)
        if (open) {
            window.dispatchEvent(new CustomEvent('wa:panel-opened', { detail: { id: 'voice' } }))
            if (!this._posts.length) this.loadPosts()
        }
    }

    /* The same updates.json the page and the feed are built from — no second
       source of truth for what has been published. */
    async loadPosts (url = '/updates/updates.json') {
        try {
            const d = await (await fetch(url, { cache: 'no-cache' })).json()
            this._posts = (d.posts || []).slice(0, 30)
        } catch (_) { this._posts = [] }
        this.$('post').innerHTML = this._posts.length
            ? this._posts.map((p, i) => `<option value="${i}">${p.date_label || p.date} — ${escapeHtml(p.title)}</option>`).join('')
            : '<option value="">(updates.json unavailable)</option>'
        this.fillScript()
    }

    fillScript () {
        const p = this._posts[Number(this.$('post').value)]
        this.$('script').value = draftScript(p)
    }

    /* Replaced wholesale in tests. Lazily imported so a reader who never opens
       this pane never fetches the module. */
    async synthesize (text, opts) {
        const mod = await import(/* @vite-ignore */ TTS_MODULE)
        return mod.synthesizeOpenRouter(text, opts)
    }

    /* Best effort: turn the generationId into the real cost. It is not always
       ready immediately, so a miss reports nothing rather than guessing. */
    async lookupCost (generationId, apiKey) {
        if (!generationId) return null
        try {
            const r = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`,
                { headers: { Authorization: `Bearer ${apiKey}` } })
            if (!r.ok) return null
            const d = await r.json()
            const usd = d?.data?.total_cost
            return typeof usd === 'number' ? usd : null
        } catch (_) { return null }
    }

    async generate () {
        const status = this.$('status'), out = this.$('out'), go = this.$('go')
        const text = this.$('script').value.trim()
        const apiKey = this.$('key').value.trim()
        status.classList.remove('err')
        if (!text) { status.textContent = 'Write a script first.'; return }
        if (!apiKey) { status.classList.add('err'); status.textContent = 'An OpenRouter key is needed — it stays in this browser.'; return }

        go.disabled = true
        status.textContent = 'Generating — a read of this length takes a few seconds…'
        out.classList.add('hide')
        const started = Date.now()
        try {
            const voice = this.$('voice').value
            const { blob, durationMs, generationId } = await this.synthesize(text, { apiKey, voice })
            const url = URL.createObjectURL(blob)
            if (this._url) URL.revokeObjectURL(this._url)
            this._url = url
            this.$('audio').src = url
            const p = this._posts[Number(this.$('post').value)]
            this.$('dl').href = url
            this.$('dl').download = `${p?.slug || 'update'}__${voice}.wav`
            out.classList.remove('hide')
            const secs = Math.round((durationMs || 0) / 100) / 10
            status.textContent = `Done — ${secs}s of audio in ${Math.round((Date.now() - started) / 1000)}s.`
            this.$('meta').textContent = `voice ${voice} · ${(blob.size / 1024 / 1024).toFixed(2)} MB wav · ${generationId || 'no generation id'}`
            const usd = await this.lookupCost(generationId, apiKey)
            if (usd != null) this.$('meta').textContent += ` · cost $${usd.toFixed(4)}`
            this.dispatchEvent(new CustomEvent('wa:voice:generated', { bubbles: true, detail: { durationMs, generationId, voice } }))
        } catch (err) {
            status.classList.add('err')
            // Typed errors from the module: no-key / tts-http / tts-no-audio / no-fetch.
            status.textContent = err?.code === 'tts-http'
                ? `OpenRouter refused the request: ${err.message}`
                : `Could not generate: ${err?.message || err}`
        } finally { go.disabled = false }
    }
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

customElements.define('wa-voice-panel', WaVoicePanel)
export { WaVoicePanel }
