/* wa-site-nav v0.1.0 — THE site header (issue 048). One source for every page:
   the menus had drifted into five variants (the app page didn't link Videos or
   Engineering; only Versions linked the App; the templates differed from the
   landing page). Now the header is this component, everywhere.

   Deliberately dependency-free (no SgComponent, no fetches beyond this file):
   the nav must render on pages that never load the engine, and must not fail
   with it. One file, shadow DOM, absolute URLs so any page depth works.

   Usage:  <wa-site-nav></wa-site-nav>
           <wa-site-nav badge="BETA"></wa-site-nav>       (the app page)
   The active link is derived from location.pathname; on /engineering/* a
   second row carries the section links. */

const LINKS = [
    ['/#how',         'How it works'],
    ['/#privacy',     'Privacy'],
    ['/#pricing',     'Pricing'],
    ['/app/',         'App'],
    ['/user-guide/',  'User guide'],
    ['/library/',     'Library'],
    ['/updates/',     'Updates'],
    ['/versions/',    'Versions'],
    ['/videos/',      'Videos'],
    ['/engineering/', 'Engineering'],
]

const ENGINEERING = [
    ['/engineering/',          'Overview'],
    ['/engineering/pipeline/', 'Pipeline'],
    ['/engineering/testing/',  'Testing'],
    ['/engineering/docs/',     'Docs'],
    ['/engineering/security/', 'Security'],
    ['/engineering/team/',     'Team'],
]

const CSS = `
:host{display:block}
header{background:#0b1f3a;color:#fff;padding:14px 0;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:1060px;margin:0 auto;padding:0 20px;
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;letter-spacing:.2px}
.brand a{color:#fff;text-decoration:none}
.dot{width:12px;height:12px;border-radius:50%;background:#25d366;
  box-shadow:0 0 0 4px rgba(37,211,102,.18)}
.badge{font-size:.66rem;font-weight:700;letter-spacing:.6px;padding:2px 8px;
  border-radius:999px;background:rgba(37,211,102,.18);color:#8ff0b6;
  border:1px solid rgba(37,211,102,.45)}
nav{display:flex;flex-wrap:wrap;gap:0}
nav a{color:#dbe6f5;text-decoration:none;margin-left:18px;font-size:.92rem}
nav a:hover{color:#fff}
nav a.active{color:#fff;font-weight:600;border-bottom:2px solid #25d366}
.sub{background:#122c50;padding:8px 0}
.sub .wrap{justify-content:flex-start}
.sub span{font-size:.7rem;font-weight:700;letter-spacing:1.2px;color:#8ff0b6;margin-right:4px}
.sub a{margin-left:14px;font-size:.85rem}
@media (max-width:640px){nav{display:none}.sub nav{display:flex}}
`

class WaSiteNav extends HTMLElement {
    connectedCallback() {
        const path = location.pathname
        const badge = this.getAttribute('badge')
        // Longest matching prefix wins, so /engineering/testing/ doesn't light
        // both Engineering and an anchor link; anchors are never "active".
        const active = LINKS.filter(([href]) => !href.includes('#') && path.startsWith(href))
            .sort((a, b) => b[0].length - a[0].length)[0]?.[0]
        const link = ([href, label], current) =>
            `<a href="${href}"${href === current ? ' class="active" aria-current="page"' : ''}>${label}</a>`
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
    <nav aria-label="Main">${LINKS.map(l => link(l, active)).join('')}</nav>
  </div>
</header>` + (inEngineering ? `
<div class="sub">
  <div class="wrap"><span>ENGINE ROOM</span>
    <nav aria-label="Engineering sections">${ENGINEERING.map(l => link(l, section)).join('')}</nav>
  </div>
</div>` : '')
    }
}
customElements.define('wa-site-nav', WaSiteNav)
export { WaSiteNav }
