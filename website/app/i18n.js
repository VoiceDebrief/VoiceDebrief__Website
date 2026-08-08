/* i18n.js — strings and culture, as data (issue 050, M1b/M1c).

   Deliberately small. There is no i18n framework here and there will not be
   one: the whole runtime is key lookup, one-hop fallback, and an event. The
   machinery that matters lives in the DATA — one folder per locale, holding a
   set of per-domain files — because that is the unit agents translate and
   humans review.

   Two rules carried over from the SG/Send record (dev pack
   v0.1.22__app-i18n-culture-themes), both learned the expensive way there:

   1. ONE FOLDER PER LOCALE, MANY SMALL FILES. Send used one big file per
      locale; at ~850 keys every small change reprocessed the whole thing and
      translation agents ran out of context mid-file. Per-domain files make the
      unit of work "translate chat.json for pt-br" (~30 keys). It also makes
      support honest: THE FILES THAT EXIST ARE THE SUPPORT YOU HAVE. A locale
      can ship core.json while chat.json is still missing, and the missing one
      falls back key by key rather than blocking the locale.

   2. ONE HOP, STRAIGHT TO en-gb. No fallback chains (de-ch → de-de → en-gb):
      they make a missing key's origin unguessable, and the second hop is
      almost never more right than English.

   Selection may only ever name a locale listed in locales/index.json — never a
   URL, never a query parameter. That is the issue-041 rule (a parameter that
   chooses what the page loads is a way to run someone else's content in our
   page), applied before anyone asks for ?locale=. */

const LS_LOCALE = 'wa-locale'
const SOURCE = 'en-gb'          // the canonical locale; every other falls back here
const BASE = './locales'

let index = null                // locales/index.json
let active = SOURCE
let bundle = {}                 // domain -> key -> string, for the active locale
let source = {}                 // the same for en-gb, always loaded as the fallback

/* Load one locale's declared domain files. A file the locale does not ship is
   not an error — it is the honest statement that this locale does not cover
   that part of the app yet, and its keys fall through to en-gb. */
async function loadLocale(name) {
    const meta = index?.locales?.[name]
    if (!meta) return {}
    const out = {}
    await Promise.all((meta.files || []).map(async (domain) => {
        try {
            const r = await fetch(`${BASE}/${name}/${domain}.json`, { cache: 'no-cache' })
            if (r.ok) out[domain] = await r.json()
        } catch { /* a locale missing a file it declared is a parity-check failure,
                     not a runtime crash — the user still gets English. */ }
    }))
    return out
}

/* The stored choice always wins; otherwise navigator.languages against the
   allowlist, then the prefix map (pt → pt-pt). Send's recorded gap was that the
   picker's choice never persisted; it does here.

   AUTOMATIC selection only ever considers LIVE locales. A draft translation is
   one nobody has reviewed yet, and serving it to a visitor purely because their
   browser said pt-BR would put unreviewed copy in front of them with no way to
   know why. Draft locales stay pickable — that is how they get the feedback that
   makes them live — but they are chosen, never assigned. (Caught in testing: a
   headless en-US browser was silently served the unreviewed en-us locale.) */
function detect() {
    // 1. The URL wins. /app/pt-pt/ exists so that a link to it produces
    //    Portuguese for whoever opens it — including someone who once picked
    //    English here. If a stored preference could override the path, shared
    //    links would work for everyone except the people most likely to be sent
    //    them. Opening a locale's URL IS an explicit choice, which is also why a
    //    draft locale may be served this way while never being auto-assigned.
    const fromPath = localeFromPath()
    if (fromPath) return fromPath

    const stored = (() => { try { return localStorage.getItem(LS_LOCALE) } catch { return null } })()
    if (stored && index?.locales?.[stored]) return stored          // explicit choice, draft or not
    const live = Object.entries(index?.locales || {})
        .filter(([, m]) => m.status === 'live').map(([k]) => k)
    for (const raw of (navigator.languages || [navigator.language || ''])) {
        const tag = String(raw).toLowerCase()
        if (live.includes(tag)) return tag
        const mapped = index?.prefixes?.[tag.split('-')[0]]
        if (mapped && live.includes(mapped)) return mapped
    }
    return index?.default || SOURCE
}

/* The locale named by the path, or null.

   This reads a path segment and turns it into an ALLOWLIST KEY — it never
   becomes part of a URL we fetch. That distinction is the whole of the
   issue-041 rule: `?origin=` was dangerous because its value was used to build
   an import URL, so any string became executable. Here, an unknown or hostile
   segment simply fails the lookup and we fall through to detection, and the
   locale files are fetched from the key, not from the path. `/app/../../evil/`
   and `/app/%2e%2e/` are non-keys like any other typo. */
function localeFromPath() {
    const seg = location.pathname.split('/').filter(Boolean).pop() || ''
    const key = seg.toLowerCase()
    return index?.locales?.[key] ? key : null
}

export async function initI18n() {
    const r = await fetch(`${BASE}/index.json`, { cache: 'no-cache' })
    index = await r.json()
    source = await loadLocale(SOURCE)
    active = detect()
    bundle = active === SOURCE ? source : await loadLocale(active)
    apply(document)
    return active
}

/* t('core.go') → the active locale's string, else en-gb's, else the key itself.
   Returning the KEY on a miss is deliberate: a visible `core.go` in the UI is a
   bug report, where a silent empty string is a hole nobody notices. */
export function t(key, params) {
    const [domain, ...rest] = String(key).split('.')
    const leaf = rest.join('.')
    const hit = bundle?.[domain]?.[leaf] ?? source?.[domain]?.[leaf] ?? key
    if (!params) return hit
    return String(hit).replace(/\{(\w+)\}/g, (m, name) =>
        (params[name] !== undefined ? String(params[name]) : m))
}

/* tOr(key, fallback) — for the wa-* components.

   A component must render correctly on its own: in the browser test harness, on
   a page that never called initI18n(), or if the locale fetch fails. So each one
   keeps its English in the markup and asks i18n only to OVERRIDE it. This is the
   same shape as the CSS token fallbacks (var(--wa-navy,#0b1f3a)) and for the same
   reason — the component is the unit that has to keep working.

   t() returns the key on a miss, which is right for the app page (a visible
   core.go is a bug report); here it is wrong, because the component has a
   perfectly good English string to fall back to. tOr() converts one to the other. */
export const tOr = (key, fallback, params) => {
    const v = t(key, params)
    return v === key ? fallback : v
}

/* Render every data-i18n in a root. Attributes are addressed as
   data-i18n-<attr> so one element can localise its text and its title. */
export function apply(root = document) {
    for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n)
    for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml)
    // 'label' is here because wa-result-card takes its heading as an attribute —
    // a component's public attributes are as translatable as its text.
    for (const attr of ['title', 'placeholder', 'aria-label', 'content', 'label']) {
        const key = 'data-i18n-' + attr
        for (const el of root.querySelectorAll(`[${key}]`)) el.setAttribute(attr, t(el.getAttribute(key)))
    }
}

/* applyIn(root) — localise a component's shadow DOM (issue 050, M1b).

   Same data-i18n attributes as the page, one difference that matters: the
   fallback is THE TEXT ALREADY IN THE TEMPLATE. A component ships readable
   English markup; this only overrides it. So there is no second copy of the
   English to drift, and the component still renders correctly standalone — in
   the browser harness, or before initI18n() resolves.

   The original is stashed in data-i18n-src on the first pass. Without that, the
   second locale switch would take the FIRST switch's output as its fallback and
   a missing key would strand the user in a language they had already left. */
export function applyIn(root) {
    if (!root) return
    for (const el of root.querySelectorAll('[data-i18n]')) {
        if (el.dataset.i18nSrc === undefined) el.dataset.i18nSrc = el.textContent
        el.textContent = tOr(el.dataset.i18n, el.dataset.i18nSrc)
    }
    for (const attr of ['title', 'placeholder', 'aria-label', 'label']) {
        const key = 'data-i18n-' + attr
        const stash = 'data-i18n-src-' + attr
        for (const el of root.querySelectorAll(`[${key}]`)) {
            if (!el.hasAttribute(stash)) el.setAttribute(stash, el.getAttribute(attr) ?? '')
            el.setAttribute(attr, tOr(el.getAttribute(key), el.getAttribute(stash)))
        }
    }
}

/* Switching locale re-renders in place — no reload. A pass in flight, the flow
   panel's trace and the chat thread all survive a language change, which is
   the whole reason components listen for the event instead of the page
   reloading itself. */
export async function setLocale(name) {
    if (!index?.locales?.[name]) throw Object.assign(
        new Error(`locale "${name}" is not in the allowlist`), { code: 'unknown-locale' })
    active = name
    bundle = name === SOURCE ? source : await loadLocale(name)
    try { localStorage.setItem(LS_LOCALE, name) } catch { /* private mode: honour it for this session only */ }
    /* Keep the address bar truthful, without reloading. A reload would be
       simpler and would throw away an in-flight pass and the chat thread; a URL
       that still says /app/pt-pt/ while the page reads English is a link that
       lies when shared. replaceState rather than pushState: switching language
       is not a navigation to go "back" from. The target page really exists
       (build_locale_pages.py), so a refresh or a copied link both work. */
    try {
        const base = location.pathname.replace(/\/app\/[a-z]{2}-[a-z]{2}\/?$/i, '/app/').replace(/\/$/, '')
        const next = name === (index?.default || SOURCE) ? `${base}/` : `${base}/${name}/`
        if (location.pathname !== next) history.replaceState(null, '', next + location.search + location.hash)
    } catch { /* a browser that refuses history is not a reason to fail the switch */ }
    apply(document)
    window.dispatchEvent(new CustomEvent('wa:locale-changed', { detail: { locale: name, culture: culture() } }))
    return name
}

export const getLocale = () => active
export const getLocales = () => index?.locales || {}

/* ── Culture (M1c) ───────────────────────────────────────────────────────
   Culture is not language: it is currency, formatting and tone, and it lives
   IN the locale folder so pt-PT and pt-BR can share a language and disagree
   about everything else. */
export const culture = () => bundle?.culture || source?.culture || {}

/* Money, declared not hardcoded. Every locale currently declares GBP (Dinis,
   8 Aug): standardising on one currency avoids exchange-rate and pricing-parity
   problems while payments are unsettled. Because it is DATA, the day payments
   want € or R$ is a data change, not a refactor — which is the whole point of
   this function existing instead of a hardcoded '£'.

   The FORMAT is deliberately unchanged from the fmtGbp it replaces, down to the
   three-decimals-under-10p rule (a voice-note pass costs fractions of a penny,
   so £0.01 would round most runs to a lie) and the honest em-dash for an unknown
   cost. Intl.NumberFormat is not used here: it would render £0.79 where this
   renders £0.790, and M1 is not allowed to change a single rendered price. */
const DEFAULT_CULTURE = { currency: 'GBP', symbol: '£', usdRate: 0.79, intlLocale: 'en-GB' }

export function fmtMoney(usd) {
    const c = { ...DEFAULT_CULTURE, ...culture() }
    if (usd == null || Number.isNaN(usd)) return c.symbol + '—'
    const v = usd * c.usdRate
    return c.symbol + v.toFixed(v < 0.10 ? 3 : 2)
}

export const fmtNumber = (n, opts) =>
    new Intl.NumberFormat(culture().intlLocale || 'en-GB', opts).format(Number(n) || 0)
