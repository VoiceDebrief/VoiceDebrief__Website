/* wa-site-nav v0.1.9 — THE site header (issues 048 + 054). One source for every
   page.

   v0.1.9 adds the second tool, Extract audio (issue 065).

   v0.1.8 carried two pieces of work that landed together:

   Tools ▾ (issue 064). The site now has small things that are not the product —
   the first is text to speech — and they needed somewhere to live that is
   neither the app nor the engine room.

   The go-live pass (issue 060, claims audit):
   - the brand is VoiceDebrief, not "Voice Note Transcribe" — WhatsApp is one of
     several ways audio arrives here, not the product
   - BETA is persistent chrome (see render()), not an opt-in attribute
   - Library gains "Getting a key" (/openrouter-key/): a person who has not got
     an OpenRouter key cannot use the product at all, so the page that gets them
     one must be reachable from every page, not only from the app
   - "Pricing" → "What it costs": there is no price list to look at; the honest
     label names the question, not a product we do not sell

   v0.1.6 fixes the App link rendering blue/purple: wrapping it in .i18n-link
   for the locale flag (v0.1.3) took it out of the `nav.main > a` selector, so it
   fell back to the browser's default link colour on a navy bar.

   v0.1.5 adds Engineering / Concepts (issue 057).

   v0.1.4 keeps the header intact on a phone (Dinis, 8 Aug, with screenshots).
   The bar is a space-between row, so when it wrapped on an iPhone the language
   picker and the hamburger — plain siblings — were pushed to opposite ends of
   the second line. Controls at each end of an otherwise empty row read as two
   unrelated things. They are now one `.right` cluster held hard right, sharing
   the brand's row where there is room and taking their own where there is not;
   the brand shrinks (and finally ellipses) before they do.

   v0.1.1 added what v0.1.0 lacked (Dinis, 8 Aug, with screenshots):

   - a SECOND LEVEL: ten flat links became five primary links plus two groups —
     News ▾ (Updates / Versions / Videos) and Engineering ▾ (the six sections) —
     CSS-only dropdowns (hover + :focus-within, so the keyboard works)
   - small screens get a hamburger panel with every link grouped and reachable;
     v0.1.0 simply did nav{display:none} under 640px — the menu was LOST
   - mid-width wrapping tidied (row-gap, no orphan link on its own line)

   Still deliberately dependency-free (no SgComponent, no fetches): the nav must
   render on pages that never load the engine, and must not fail with it.

   Usage:  <wa-site-nav></wa-site-nav>
           <wa-site-nav badge="BETA"></wa-site-nav>       (the app page)
   The active link is derived from location.pathname; on /engineering/* a
   second row carries the section links. */

const NEWS = [
    ['/updates/',  'Updates'],
    ['/versions/', 'Versions'],
    ['/videos/',   'Videos'],
]

const ENGINEERING = [
    ['/engineering/',          'Overview'],
    ['/engineering/pipeline/', 'Pipeline'],
    ['/engineering/testing/',  'Testing'],
    ['/engineering/docs/',     'Docs'],
    ['/engineering/security/', 'Security'],
    ['/engineering/team/',     'Team'],
    ['/engineering/concepts/', 'Concepts'],
    ['/design/',               'Design candidates'],
]

const TOOLS = [
    ['/tools/',                'All tools'],
    ['/tools/extract-audio/',  'Extract audio'],
    ['/tools/text-to-speech/', 'Text to speech'],
]

const LIBRARY = [
    ['/user-guide/',     'User guide'],
    ['/openrouter-key/', 'Getting a key'],
    ['/#how',            'How it works'],
    ['/#privacy',        'Where your audio goes'],
]

// Top level: [href, label] for plain links; { label, href, children } for groups.
// The group parent is a real link (its landing page), so nothing needs JS to
// navigate — the dropdown is a shortcut, not a gate. Five items (Dinis, 8 Aug):
// the product and its price stay primary; everything else is one group deep.
/* Pages that exist in more than English. Today that is the app alone, and the
   nav says so rather than implying the whole site follows your language: the
   translated links carry the ACTIVE locale's flag, everything else sits behind
   one 🇬🇧 marker. When /pt-pt/updates/ ships, its href moves up here and the
   marker covers less — the nav degrades honestly as coverage grows, instead of
   needing a redesign. */
const TRANSLATED = new Set(['/app/'])

const MENU = [
    ['/app/',     'App'],
    ['/#pricing', 'What it costs'],
    { label: 'Library',     href: '/library/',     children: LIBRARY },
    { label: 'Tools',       href: '/tools/',       children: TOOLS },
    { label: 'News',        href: '/updates/',     children: NEWS },
    { label: 'Engineering', href: '/engineering/', children: ENGINEERING },
]

// What a group's own landing page is called in the small-screen panel, where
// there is no parent link to click — "Library ▸ Library" reads like a mistake.
const LANDING_LABEL = { Library: 'All documents', Tools: 'All tools', News: 'Updates' }

const CSS = `
:host{display:block}
header{background:var(--wa-navy,#0b1f3a);color:var(--wa-fg,#fff);padding:12px 0;position:relative;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:1060px;margin:0 auto;padding:0 20px;
  display:flex;align-items:center;justify-content:space-between;gap:10px 16px;flex-wrap:wrap}
/* The controls are ONE cluster. Left to themselves as siblings of a
   space-between row, the picker and the hamburger were pushed to opposite ends
   the moment the header wrapped on a phone — controls at each end of a line
   with nothing between them read as two unrelated things. margin-left:auto
   keeps the cluster hard right whether it shares the brand's row or takes its
   own, and flex-shrink:0 means the brand gives up space before they do. */
.right{display:flex;align-items:center;gap:8px;margin-left:auto;flex:0 0 auto}
/* min-width:0 + ellipsis is the last-resort guard: the name gets cut before the
   bar can ever overflow the screen sideways. */
.brand{display:flex;align-items:center;gap:10px;font-weight:700;letter-spacing:.2px;min-width:0}
.brand a{color:var(--wa-fg,#fff);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dot{width:12px;height:12px;border-radius:50%;background:var(--wa-green,#25d366);
  box-shadow:0 0 0 4px rgba(37,211,102,.18)}
.badge{font-size:.66rem;font-weight:700;letter-spacing:.6px;padding:2px 8px;
  border-radius:999px;background:rgba(37,211,102,.18);color:var(--wa-green-soft,#8ff0b6);
  border:1px solid rgba(37,211,102,.45)}
nav.main{display:flex;flex-wrap:wrap;align-items:center;gap:4px 18px}
/* The App link is wrapped in .i18n-link (it is the one page that exists in other
   languages), so the nav.main > a selector stopped matching it in v0.1.3 and it
   fell back to the browser default link colour — blue, and PURPLE once visited,
   on a navy bar. Any selector styling top-level nav links must name both shapes. */
nav.main > a, nav.main > .i18n-link > a, .group > a{color:var(--wa-link-on-dark,#dbe6f5);text-decoration:none;font-size:.92rem;
  padding:4px 0;display:inline-block}
nav.main a:hover{color:var(--wa-fg,#fff)}
nav.main a.active{color:var(--wa-fg,#fff);font-weight:600;border-bottom:2px solid var(--wa-green,#25d366)}
.group{position:relative}
.group > a .caret{font-size:.62rem;opacity:.7;margin-left:4px}
.menu{position:absolute;top:100%;left:-14px;min-width:160px;padding:8px 0;margin:0;
  background:var(--wa-navy-2,#122c50);border:1px solid rgba(255,255,255,.12);border-radius:10px;
  box-shadow:0 12px 28px rgba(0,0,0,.35);list-style:none;z-index:50;
  opacity:0;visibility:hidden;transform:translateY(6px);transition:.14s}
.group:hover .menu,.group:focus-within .menu{opacity:1;visibility:visible;transform:none}
.menu a{display:block;padding:7px 16px;font-size:.88rem;color:var(--wa-link-on-dark,#dbe6f5);text-decoration:none}
.menu a:hover{background:rgba(37,211,102,.12);color:var(--wa-fg,#fff)}
.menu a.active{color:var(--wa-green-soft,#8ff0b6);font-weight:600}
.burger{display:none;background:none;border:1px solid rgba(255,255,255,.25);border-radius:8px;
  color:var(--wa-link-on-dark,#dbe6f5);font-size:1.15rem;line-height:1;padding:6px 10px;cursor:pointer}
.burger:hover{color:var(--wa-fg,#fff);border-color:rgba(255,255,255,.5)}
.panel{display:none;background:var(--wa-navy-hover,#0e2647);border-top:1px solid rgba(255,255,255,.1);padding:10px 0 16px}
.panel .wrap{display:block}
.panel h6{font-size:.68rem;font-weight:700;letter-spacing:1.2px;color:var(--wa-green-soft,#8ff0b6);
  margin:14px 0 4px;text-transform:uppercase}
.panel a{display:block;padding:8px 0;color:var(--wa-link-on-dark,#dbe6f5);text-decoration:none;font-size:1rem;
  border-bottom:1px solid rgba(255,255,255,.06)}
.panel a:hover{color:var(--wa-fg,#fff)}
.panel a.active{color:var(--wa-green-soft,#8ff0b6);font-weight:600}
:host(.open) .panel{display:block}
.sub{background:var(--wa-navy-2,#122c50);padding:8px 0}
.sub .wrap{justify-content:flex-start}
.sub span{font-size:.7rem;font-weight:700;letter-spacing:1.2px;color:var(--wa-green-soft,#8ff0b6);margin-right:4px}
.sub nav{display:flex;flex-wrap:wrap;gap:0}
.sub a{margin-left:14px;font-size:.85rem;color:var(--wa-link-on-dark,#dbe6f5);text-decoration:none}
.sub a:hover{color:var(--wa-fg,#fff)}
.sub a.active{color:var(--wa-fg,#fff);font-weight:600;border-bottom:2px solid var(--wa-green,#25d366)}
@media (max-width:760px){nav.main{display:none}.burger{display:inline-block}}
/* Phones: shave the brand rather than the controls. The BETA badge STAYS — it
   fits on one row if it goes, but what the badge says (this product is in beta,
   judge it accordingly) is worth more than 32px of header height. So the bar
   takes two rows on a narrow phone, deliberately, with the controls together on
   the second one. */
@media (max-width:560px){header>.wrap{gap:8px 10px}.brand{font-size:.92rem;gap:8px}}
`

class WaSiteNav extends HTMLElement {
    connectedCallback() {
        // The flag beside a translated link names the ACTIVE locale, so the nav
        // must redraw when that changes: once when i18n finishes its first load,
        // and again on every switch. Rendering is therefore a method that can run
        // many times — the shadow root is created once and only its HTML is
        // replaced, because attachShadow() throws on the second call.
        if (!this._hooked) {
            this._hooked = true
            for (const ev of ['wa:i18n-ready', 'wa:locale-changed'])
                window.addEventListener(ev, () => this.render())
        }
        this.render()
    }

    render() {
        const path = location.pathname
        /* BETA is now persistent chrome, not an opt-in attribute (claims audit
           item 7). It was on the app page only, while the home page said
           "BETA — LIVE NOW" in hero copy that scrolls away. A beta mark should
           be a small permanent statement beside the name — Gmail's treatment —
           so it defaults on and a page can only override the WORD, never remove
           the fact. */
        const badge = this.hasAttribute('badge') ? this.getAttribute('badge') : 'BETA'
        const flat = MENU.flatMap(m => Array.isArray(m) ? [m] : [[m.href, m.label], ...m.children])
        // Longest matching prefix wins, so /engineering/testing/ doesn't light
        // both Engineering and an anchor link; anchors are never "active".
        const active = flat.filter(([href]) => !href.includes('#') && path.startsWith(href))
            .sort((a, b) => b[0].length - a[0].length)[0]?.[0]
        const link = ([href, label], current) =>
            `<a href="${href}"${href === current ? ' class="active" aria-current="page"' : ''}>${label}</a>`
        const groupIsActive = g => g.href === active || g.children.some(([href]) => href === active)

        /* The active locale, if the page loaded i18n at all. Most pages do not —
           only the app does — so the fallback is English, which is the truth for
           them. The nav never assumes a language it cannot serve. */
        const api = window.__waI18n
        const here = api?.getLocale?.() || 'en-gb'
        const meta = api?.getLocales?.()?.[here]
        const flagHere = meta?.flag || '🇬🇧'
        const english = api?.getLocales?.()?.['en-gb']?.flag || '🇬🇧'

        const item = (m) => Array.isArray(m) ? link(m, active) : `
          <div class="group">
            <a href="${m.href}"${groupIsActive(m) ? ' class="active"' : ''} aria-haspopup="true">${m.label}<span class="caret">▾</span></a>
            <ul class="menu">${m.children.map(c => `<li>${link(c, active)}</li>`).join('')}</ul>
          </div>`

        // Translated pages first, each flagged with the language you are in;
        // then one marker, then everything that is English only.
        const translated = MENU.filter(m => Array.isArray(m) && TRANSLATED.has(m[0]))
        const englishOnly = MENU.filter(m => !(Array.isArray(m) && TRANSLATED.has(m[0])))
        const topLevel =
            translated.map(m => `<span class="i18n-link">${flagHere} ${item(m)}</span>`).join('') +
            `<span class="en-only" title="These pages are in English for now — the app is the part that speaks your language.">${english}</span>` +
            englishOnly.map(item).join('')

        // The panel lists everything: plain links under Product, then each group
        // with its landing page first — no page is reachable on desktop only.
        const panel = `
          <h6>Product</h6>
          ${MENU.filter(Array.isArray).map(l => link(l, active)).join('')}
          ${MENU.filter(m => !Array.isArray(m)).map(m => `
            <h6>${m.label}</h6>
            ${link([m.href, LANDING_LABEL[m.label] || 'Overview'], active)}
            ${m.children.filter(([href]) => href !== m.href && href !== '/updates/').map(l => link(l, active)).join('')}`).join('')}`

        const inEngineering = path.startsWith('/engineering/')
        const section = inEngineering
            ? ENGINEERING.filter(([href]) => path.startsWith(href)).sort((a, b) => b[0].length - a[0].length)[0]?.[0]
            : null

        const root = this.shadowRoot || this.attachShadow({ mode: 'open' })
        root.innerHTML = `<style>${CSS}</style>
<header>
  <div class="wrap">
    <div class="brand"><span class="dot"></span><a href="/">VoiceDebrief</a>
      ${badge ? `<span class="badge">${badge}</span>` : ''}</div>
    <nav class="main" aria-label="Main">${topLevel}</nav>
    <div class="right"><slot name="locale"></slot>
      <button class="burger" aria-label="Menu" aria-expanded="false">☰</button></div>
  </div>
  <div class="panel"><div class="wrap"><nav aria-label="All pages">${panel}</nav></div></div>
</header>` + (inEngineering ? `
<div class="sub">
  <div class="wrap"><span>ENGINE ROOM</span>
    <nav aria-label="Engineering sections">${ENGINEERING.map(l => link(l, section)).join('')}</nav>
  </div>
</div>` : '')

        const burger = root.querySelector('.burger')
        burger.addEventListener('click', () => {
            const open = this.classList.toggle('open')
            burger.setAttribute('aria-expanded', String(open))
        })
    }
}
customElements.define('wa-site-nav', WaSiteNav)
export { WaSiteNav }
