/* wa-site-nav v0.1.11 — THE site header (issues 048 + 054). One source for every
   page.

   v0.1.11 adds the colour-scheme picker (Dinis: ship the five schemes from the
   design pack). It lives in the header's right cluster beside the language
   picker, because a scheme is chrome and applies to every page.

   It reads window.__vdTheme (website/vd-theme.js), which is loaded as a classic
   script BEFORE paint — the nav is a deferred module, so a nav that applied the
   scheme itself would flash Signal first. Absent that script the control simply
   does not render: the nav must keep working on a page that never loaded it.

   The picker shows the CHOSEN scheme even on a page that pins itself to another
   one — the workbench does, while its nine wa-* components are still on the
   --wa-* bridge — and says so rather than silently ignoring the choice.

   v0.1.10 is the design's header (issue 060, M2). It stops being a navy bar and
   becomes page-coloured with a hairline under it, which is what the redesign
   specifies and what makes the site read as one thing from the first pixel.

   The wordmark is type only: **Voice** in ink, **Debrief** in the accent, one
   word, no space — so it needs no image, survives every colour scheme, and
   cannot go stale the way a logo file does. The green dot that used to sit
   beside it is gone with the navy: on a white bar it read as a status light for
   a service, which is a claim we were not making.

   Every colour here is a --vd-* token read directly. This is the first
   component off the --wa-* bridge, so it is also the proof that the bridge is
   removable rather than permanent.

   v0.1.9 landed twice, from two agents on the same day: one adding Extract audio
   to the Tools menu (issue 065), one turning the header's ten literal rgba()
   overlays into token reads (issue 060). The published one is the tools version;
   this carries both, and its Tools menu is theirs.

   v0.1.9 (the colour half) was colour only (issue 060). Ten literal rgba() overlays became reads of
   the tokens that already carried those exact values, so the header follows the
   scheme like everything else. Until this, the site's own gate reported "themes
   ok" while the one component on every page kept its own colours — the second
   time that has happened here, and the reason check_themes.py now fails the
   build on ANY colour written outside vd-tokens.css rather than only on a token
   read that nothing declares.

   v0.1.8 carries two pieces of work that landed together:

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
    ['/#sources',        'Getting the audio'],
]
/* Those two hash targets are OLDER than the redesign, and they are published —
   in the nav, on the key guide, and in anything anyone has linked. The home page
   keeps ids for both rather than quietly dropping them: #how is the one-pass
   diagram, #privacy is the routing statement welded to the panel. A gate in
   tests/unit/home-anchors.test.mjs asserts every hash this menu names exists on
   the page, because an anchor that scrolls nowhere is a dead link that returns
   200 and so never shows up as one. */

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

/* Workbench is the app surface (design decision 9). "Advanced" describes the
   USER and implies this page is Basic; Workbench names a place you go to work a
   recording, and it survives the features already queued for it — chat with the
   debrief, alternative workflows, raw call inspection, several recordings at
   once. The URL stays /app/: renaming a published address breaks links for no
   gain, and the address is not the name. */
const MENU = [
    ['/app/',     'Workbench'],
    ['/#cost',    'What it costs'],
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
/* The design's header: page-coloured, one hairline, no bar. */
header{background:var(--vd-p,#fff);color:var(--vd-i,#0B1B2B);padding:20px 0 16px;position:relative;
  border-bottom:1px solid var(--vd-l,#E3E9EF);
  font-family:var(--vd-font,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif)}
.wrap{max-width:1240px;margin:0 auto;padding:0 32px;
  display:flex;align-items:center;justify-content:space-between;gap:10px 24px;flex-wrap:wrap}
/* The controls are ONE cluster. Left to themselves as siblings of a
   space-between row, the picker and the hamburger were pushed to opposite ends
   the moment the header wrapped on a phone — controls at each end of a line
   with nothing between them read as two unrelated things. margin-left:auto
   keeps the cluster hard right whether it shares the brand's row or takes its
   own, and flex-shrink:0 means the brand gives up space before they do. */
.right{display:flex;align-items:center;gap:8px;margin-left:auto;flex:0 0 auto}
/* min-width:0 + ellipsis is the last-resort guard: the name gets cut before the
   bar can ever overflow the screen sideways. */
.brand{display:flex;align-items:baseline;gap:9px;min-width:0}
.brand a{color:var(--vd-i,#0B1B2B);text-decoration:none;font-size:1.35rem;font-weight:700;
  letter-spacing:-.022em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.brand a em{font-style:normal;color:var(--vd-a,#0E9E72)}
.badge{font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  padding:2px 6px;border-radius:4px;line-height:1;flex:0 0 auto;
  background:var(--vd-tn,#F2FBF7);color:var(--vd-at,#0A7D5A);border:1px solid var(--vd-tl,#9FD8C4)}
nav.main{display:flex;flex-wrap:wrap;align-items:center;gap:4px 22px}
/* The Workbench link is wrapped in .i18n-link (it is the one page that exists in
   other languages), so a nav.main > a selector alone would not match it — and
   in v0.1.3 that is exactly how it fell back to the browser's default link
   colour. Any selector styling top-level nav links must name both shapes. */
nav.main > a, nav.main > .i18n-link > a, .group > a{color:var(--vd-t,#45596E);text-decoration:none;
  font-size:.88rem;padding:4px 0;display:inline-block}
nav.main a:hover{color:var(--vd-i,#0B1B2B)}
nav.main a.active{color:var(--vd-i,#0B1B2B);font-weight:600;border-bottom:2px solid var(--vd-a,#0E9E72)}
/* The product surface leads, and says it goes somewhere. */
nav.main .i18n-link > a{color:var(--vd-at,#0A7D5A);font-weight:700}
nav.main .i18n-link > a::after{content:"↗";font-size:.7em;margin-left:5px;opacity:.65}
.group{position:relative}
.group > a .caret{font-size:.62rem;opacity:.7;margin-left:4px}
.menu{position:absolute;top:100%;left:-14px;min-width:180px;padding:8px 0;margin:0;
  background:var(--vd-c,#fff);border:1px solid var(--vd-L,#D8E1E9);border-radius:var(--vd-r-ctl,10px);
  box-shadow:0 12px 28px var(--vd-sh,rgba(11,27,43,.09));list-style:none;z-index:50;
  opacity:0;visibility:hidden;transform:translateY(6px);transition:.14s}
.group:hover .menu,.group:focus-within .menu{opacity:1;visibility:visible;transform:none}
.menu a{display:block;padding:7px 16px;font-size:.86rem;color:var(--vd-t,#45596E);text-decoration:none}
.menu a:hover{background:var(--vd-tn,#F2FBF7);color:var(--vd-i,#0B1B2B)}
.menu a.active{color:var(--vd-at,#0A7D5A);font-weight:600}
.scheme{position:relative}
.scheme>button{display:flex;align-items:center;gap:7px;background:var(--vd-c,#fff);
  border:1px solid var(--vd-L,#D8E1E9);color:var(--vd-t,#45596E);padding:7px 12px;
  border-radius:var(--vd-r-ctl,10px);font-size:.81rem;min-height:38px}
.scheme>button:hover{border-color:var(--vd-a,#0E9E72);color:var(--vd-i,#0B1B2B)}
.swatch{width:13px;height:13px;border-radius:50%;border:1px solid var(--vd-L,#D8E1E9);flex:none}
.scheme ul{position:absolute;top:100%;right:0;margin:6px 0 0;padding:6px 0;min-width:230px;
  list-style:none;background:var(--vd-c,#fff);border:1px solid var(--vd-L,#D8E1E9);
  border-radius:var(--vd-r-ctl,10px);box-shadow:0 12px 28px var(--vd-sh,rgba(11,27,43,.09));
  z-index:60}
.scheme ul[hidden]{display:none}
.scheme li button{display:flex;align-items:center;gap:9px;width:100%;background:none;border:0;
  padding:8px 14px;font-size:.84rem;color:var(--vd-t,#45596E);text-align:left}
.scheme li button:hover{background:var(--vd-tn,#F2FBF7);color:var(--vd-i,#0B1B2B)}
.scheme li button[aria-current=true]{color:var(--vd-at,#0A7D5A);font-weight:600}
.scheme li .n{font-size:.73rem;color:var(--vd-m,#6B7F94);display:block;font-weight:400}
.scheme .locked{padding:8px 14px;font-size:.73rem;color:var(--vd-m,#6B7F94);
  border-top:1px solid var(--vd-l,#E3E9EF);margin-top:4px}
.burger{display:none;background:var(--vd-c,#fff);border:1px solid var(--vd-L,#D8E1E9);
  border-radius:var(--vd-r-ctl,10px);color:var(--vd-t,#45596E);font-size:1.15rem;line-height:1;
  padding:7px 12px;cursor:pointer;min-height:38px}
.burger:hover{color:var(--vd-i,#0B1B2B);border-color:var(--vd-a,#0E9E72)}
.panel{display:none;background:var(--vd-b,#F8FAFC);border-bottom:1px solid var(--vd-l,#E3E9EF);padding:10px 0 16px}
.panel .wrap{display:block}
.panel h6{font-size:.66rem;font-weight:700;letter-spacing:.12em;color:var(--vd-f,#8697A8);
  margin:14px 0 4px;text-transform:uppercase}
.panel a{display:block;padding:10px 0;color:var(--vd-t,#45596E);text-decoration:none;font-size:1rem;
  border-bottom:1px solid var(--vd-l,#E3E9EF)}
.panel a:hover{color:var(--vd-i,#0B1B2B)}
.panel a.active{color:var(--vd-at,#0A7D5A);font-weight:600}
:host(.open) .panel{display:block}
.sub{background:var(--vd-b,#F8FAFC);padding:8px 0;border-bottom:1px solid var(--vd-l,#E3E9EF)}
.sub .wrap{justify-content:flex-start}
.sub span{font-size:.66rem;font-weight:700;letter-spacing:.12em;color:var(--vd-f,#8697A8);margin-right:4px}
.sub nav{display:flex;flex-wrap:wrap;gap:0}
.sub a{margin-left:14px;font-size:.83rem;color:var(--vd-t,#45596E);text-decoration:none}
.sub a:hover{color:var(--vd-i,#0B1B2B)}
.sub a.active{color:var(--vd-i,#0B1B2B);font-weight:600;border-bottom:2px solid var(--vd-a,#0E9E72)}
/* Focus must be visible in all five schemes, and never removed (a11y floor). */
a:focus-visible,button:focus-visible{outline:2px solid var(--vd-a,#0E9E72);outline-offset:2px;border-radius:3px}
@media (max-width:860px){nav.main{display:none}.burger{display:inline-block}}
@media (max-width:560px){header>.wrap{gap:8px 10px;padding:0 20px}.brand a{font-size:1.15rem}}
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
            // …and when the scheme does. Re-rendering only on a click would leave
            // the button naming the old scheme whenever anything else changed it
            // — another tab, a deep link, the API — which is a label that lies.
            for (const ev of ['wa:i18n-ready', 'wa:locale-changed', 'vd:theme-changed'])
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
    <div class="brand"><a href="/">Voice<em>Debrief</em></a>
      ${badge ? `<span class="badge">${badge}</span>` : ''}</div>
    <nav class="main" aria-label="Main">${topLevel}</nav>
    <div class="right"><slot name="locale"></slot>${this._schemeHtml()}
      <button class="burger" aria-label="Menu" aria-expanded="false">☰</button></div>
  </div>
  <div class="panel"><div class="wrap"><nav aria-label="All pages">${panel}</nav></div></div>
</header>` + (inEngineering ? `
<div class="sub">
  <div class="wrap"><span>ENGINE ROOM</span>
    <nav aria-label="Engineering sections">${ENGINEERING.map(l => link(l, section)).join('')}</nav>
  </div>
</div>` : '')

        this._wireScheme(root)

        const burger = root.querySelector('.burger')
        burger.addEventListener('click', () => {
            const open = this.classList.toggle('open')
            burger.setAttribute('aria-expanded', String(open))
        })
    }
}
/* The scheme control. Rendered only when vd-theme.js is present, so the nav
   still works on a page that does not load it. */
WaSiteNav.prototype._schemeHtml = function () {
    const api = window.__vdTheme
    if (!api) return ''
    const chosen = api.get(), locked = api.locked()
    const dot = (k) => `<span class="swatch" style="background:var(--vd-a)" data-swatch="${k}"></span>`
    return `<div class="scheme">
  <button type="button" aria-haspopup="true" aria-expanded="false" data-scheme-toggle>
    ${dot(chosen)}<span>${api.schemes[chosen].label}</span><span aria-hidden="true">▾</span>
  </button>
  <ul hidden>
    ${Object.entries(api.schemes).map(([k, m]) => `<li><button type="button" data-scheme="${k}"
       aria-current="${k === chosen}">${dot(k)}<span>${m.label}<span class="n">${m.note}</span></span></button></li>`).join('')}
    ${locked ? `<li class="locked">This page is pinned to ${api.schemes[locked].label} while the
       workbench's older components are ported. Your choice applies everywhere else.</li>` : ''}
  </ul>
</div>`
}

WaSiteNav.prototype._wireScheme = function (root) {
    const api = window.__vdTheme
    const wrap = root.querySelector('.scheme')
    if (!api || !wrap) return
    const toggle = wrap.querySelector('[data-scheme-toggle]')
    const menu = wrap.querySelector('ul')
    /* Each swatch shows ITS OWN scheme's accent, which means painting it with
       that scheme's token rather than the active one. A scoped attribute on a
       throwaway element is how a token from another scheme is read at all. */
    for (const sw of wrap.querySelectorAll('[data-swatch]')) {
        const probe = document.createElement('div')
        probe.setAttribute('data-vd-theme', sw.dataset.swatch)
        probe.style.cssText = 'position:absolute;visibility:hidden'
        document.body.appendChild(probe)
        sw.style.background = getComputedStyle(probe).getPropertyValue('--vd-a').trim() || 'currentColor'
        probe.remove()
    }
    const close = () => { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false') }
    toggle.addEventListener('click', (e) => {
        e.stopPropagation()
        menu.hidden = !menu.hidden
        toggle.setAttribute('aria-expanded', String(!menu.hidden))
    })
    for (const b of wrap.querySelectorAll('[data-scheme]')) {
        b.addEventListener('click', () => { api.set(b.dataset.scheme); close(); this.render() })
    }
    document.addEventListener('click', close)
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close() })
}

customElements.define('wa-site-nav', WaSiteNav)
export { WaSiteNav }
