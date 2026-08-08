/* wa-site-nav v0.1.1 — THE site header (issues 048 + 054). One source for every
   page. v0.1.1 adds what v0.1.0 lacked (Dinis, 8 Aug, with screenshots):

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
]

// Top level: [href, label] for plain links; { label, href, children } for groups.
// The group parent is a real link (its landing page), so nothing needs JS to
// navigate — the dropdown is a shortcut, not a gate.
const MENU = [
    ['/#how',        'How it works'],
    ['/#privacy',    'Privacy'],
    ['/#pricing',    'Pricing'],
    ['/app/',        'App'],
    ['/user-guide/', 'User guide'],
    ['/library/',    'Library'],
    { label: 'News',        href: '/updates/',     children: NEWS },
    { label: 'Engineering', href: '/engineering/', children: ENGINEERING },
]

const CSS = `
:host{display:block}
header{background:#0b1f3a;color:#fff;padding:12px 0;position:relative;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:1060px;margin:0 auto;padding:0 20px;
  display:flex;align-items:center;justify-content:space-between;gap:10px 16px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;letter-spacing:.2px}
.brand a{color:#fff;text-decoration:none}
.dot{width:12px;height:12px;border-radius:50%;background:#25d366;
  box-shadow:0 0 0 4px rgba(37,211,102,.18)}
.badge{font-size:.66rem;font-weight:700;letter-spacing:.6px;padding:2px 8px;
  border-radius:999px;background:rgba(37,211,102,.18);color:#8ff0b6;
  border:1px solid rgba(37,211,102,.45)}
nav.main{display:flex;flex-wrap:wrap;align-items:center;gap:4px 18px}
nav.main > a, .group > a{color:#dbe6f5;text-decoration:none;font-size:.92rem;
  padding:4px 0;display:inline-block}
nav.main a:hover{color:#fff}
nav.main a.active{color:#fff;font-weight:600;border-bottom:2px solid #25d366}
.group{position:relative}
.group > a .caret{font-size:.62rem;opacity:.7;margin-left:4px}
.menu{position:absolute;top:100%;left:-14px;min-width:160px;padding:8px 0;margin:0;
  background:#122c50;border:1px solid rgba(255,255,255,.12);border-radius:10px;
  box-shadow:0 12px 28px rgba(0,0,0,.35);list-style:none;z-index:50;
  opacity:0;visibility:hidden;transform:translateY(6px);transition:.14s}
.group:hover .menu,.group:focus-within .menu{opacity:1;visibility:visible;transform:none}
.menu a{display:block;padding:7px 16px;font-size:.88rem;color:#dbe6f5;text-decoration:none}
.menu a:hover{background:rgba(37,211,102,.12);color:#fff}
.menu a.active{color:#8ff0b6;font-weight:600}
.burger{display:none;background:none;border:1px solid rgba(255,255,255,.25);border-radius:8px;
  color:#dbe6f5;font-size:1.15rem;line-height:1;padding:6px 10px;cursor:pointer}
.burger:hover{color:#fff;border-color:rgba(255,255,255,.5)}
.panel{display:none;background:#0e2647;border-top:1px solid rgba(255,255,255,.1);padding:10px 0 16px}
.panel .wrap{display:block}
.panel h6{font-size:.68rem;font-weight:700;letter-spacing:1.2px;color:#8ff0b6;
  margin:14px 0 4px;text-transform:uppercase}
.panel a{display:block;padding:8px 0;color:#dbe6f5;text-decoration:none;font-size:1rem;
  border-bottom:1px solid rgba(255,255,255,.06)}
.panel a:hover{color:#fff}
.panel a.active{color:#8ff0b6;font-weight:600}
:host(.open) .panel{display:block}
.sub{background:#122c50;padding:8px 0}
.sub .wrap{justify-content:flex-start}
.sub span{font-size:.7rem;font-weight:700;letter-spacing:1.2px;color:#8ff0b6;margin-right:4px}
.sub nav{display:flex;flex-wrap:wrap;gap:0}
.sub a{margin-left:14px;font-size:.85rem;color:#dbe6f5;text-decoration:none}
.sub a:hover{color:#fff}
.sub a.active{color:#fff;font-weight:600;border-bottom:2px solid #25d366}
@media (max-width:760px){nav.main{display:none}.burger{display:inline-block}}
`

class WaSiteNav extends HTMLElement {
    connectedCallback() {
        const path = location.pathname
        const badge = this.getAttribute('badge')
        const flat = MENU.flatMap(m => Array.isArray(m) ? [m] : m.children)
        // Longest matching prefix wins, so /engineering/testing/ doesn't light
        // both Engineering and an anchor link; anchors are never "active".
        const active = flat.filter(([href]) => !href.includes('#') && path.startsWith(href))
            .sort((a, b) => b[0].length - a[0].length)[0]?.[0]
        const link = ([href, label], current) =>
            `<a href="${href}"${href === current ? ' class="active" aria-current="page"' : ''}>${label}</a>`
        const groupIsActive = g => g.children.some(([href]) => href === active)

        const topLevel = MENU.map(m => Array.isArray(m) ? link(m, active) : `
          <div class="group">
            <a href="${m.href}"${groupIsActive(m) ? ' class="active"' : ''} aria-haspopup="true">${m.label}<span class="caret">▾</span></a>
            <ul class="menu">${m.children.map(c => `<li>${link(c, active)}</li>`).join('')}</ul>
          </div>`).join('')

        const panel = `
          <h6>Product</h6>
          ${MENU.filter(Array.isArray).map(l => link(l, active)).join('')}
          <h6>News</h6>${NEWS.map(l => link(l, active)).join('')}
          <h6>Engineering</h6>${ENGINEERING.map(l => link(l, active)).join('')}`

        const inEngineering = path.startsWith('/engineering/')
        const section = inEngineering
            ? ENGINEERING.filter(([href]) => path.startsWith(href)).sort((a, b) => b[0].length - a[0].length)[0]?.[0]
            : null

        const root = this.attachShadow({ mode: 'open' })
        root.innerHTML = `<style>${CSS}</style>
<header>
  <div class="wrap">
    <div class="brand"><span class="dot"></span><a href="/">Voice&nbsp;Note&nbsp;Transcribe</a>
      ${badge ? `<span class="badge">${badge}</span>` : ''}</div>
    <nav class="main" aria-label="Main">${topLevel}</nav>
    <button class="burger" aria-label="Menu" aria-expanded="false">☰</button>
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
