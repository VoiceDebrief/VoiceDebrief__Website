/* vd-theme.js — the colour scheme, chosen and remembered (issue 060).

   Five schemes ship in vd-tokens.css. This is the twelve lines that let a person
   pick one.

   A CLASSIC SCRIPT, NOT A MODULE, AND NOT DEFERRED. It has to run before the
   first paint: a module is deferred by definition, so the page would paint in
   Signal and then flip, which is worse than not offering the choice. It is also
   why this is `script-src 'self'` rather than an inline snippet — the app and
   home pages ship a CSP with no 'unsafe-inline', and adding it to switch a
   colour would be a poor trade.

   THE STORED VALUE IS AN ALLOWLIST KEY, NEVER ANYTHING ELSE (the issue-041
   rule). localStorage is writable by anything running on this origin, so the
   value is checked against SCHEMES before it reaches the DOM; an unknown one
   falls back to Signal rather than setting an attribute nobody declared.

   THE LOCK. A page may pin itself with data-vd-theme-lock="<key>", and the
   workbench does. Its nine wa-* components still read colour through the
   --wa-* bridge, where one name does two jobs — a card SURFACE and ink on the
   dark chrome — which is invisible while both are near-white and wrong the
   moment a dark scheme makes them differ. Rather than ship a workbench that
   goes unreadable in Night, that page stays light and says so. The lock comes
   off one component at a time, as each is ported to --vd-*. */

(function () {
    var KEY = 'vd.theme'
    var DEFAULT = 'signal'
    // Mirrors website/app/themes/index.json, which CI checks against the
    // stylesheet. Inlined because this file must not wait on a fetch to decide
    // what colour the page is.
    var SCHEMES = {
        signal:    { label: 'Signal',    note: 'Light, green' },
        night:     { label: 'Night',     note: 'Dark, green' },
        paper:     { label: 'Paper',     note: 'Warm off-white, terracotta' },
        blueprint: { label: 'Blueprint', note: 'White, electric blue' },
        ember:     { label: 'Ember',     note: 'Dark, amber' },
    }

    function stored() {
        try {
            var v = localStorage.getItem(KEY)
            return Object.prototype.hasOwnProperty.call(SCHEMES, v) ? v : DEFAULT
        } catch (e) { return DEFAULT }        // private browsing: no memory, still a colour
    }

    function apply(name) {
        var root = document.documentElement
        var lock = root.getAttribute('data-vd-theme-lock')
        var use = Object.prototype.hasOwnProperty.call(SCHEMES, lock) ? lock : name
        root.setAttribute('data-vd-theme', use)
        // The CHOICE is still readable even where it is not applied, so a
        // picker can show what is selected rather than what is painted.
        root.setAttribute('data-vd-theme-chosen', name)
        return use
    }

    window.__vdTheme = {
        schemes: SCHEMES,
        get: stored,
        applied: function () { return document.documentElement.getAttribute('data-vd-theme') },
        locked: function () {
            var l = document.documentElement.getAttribute('data-vd-theme-lock')
            return Object.prototype.hasOwnProperty.call(SCHEMES, l) ? l : null
        },
        set: function (name) {
            if (!Object.prototype.hasOwnProperty.call(SCHEMES, name)) return stored()
            try { localStorage.setItem(KEY, name) } catch (e) { /* unremembered, still applied */ }
            apply(name)
            window.dispatchEvent(new CustomEvent('vd:theme-changed', { detail: { scheme: name } }))
            return name
        },
    }

    apply(stored())
})()
