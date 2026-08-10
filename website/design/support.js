/* support.js — the runtime the design prototypes are written against.
   Issue 052 (three themes) + issue 050 (culture packs).

   WHY THIS FILE EXISTS. The design hand-offs arrive as `.dc.html` files: an
   `<x-dc>` template plus a `class Component extends DCLogic` script, and a
   `<script src="./support.js">` that was never in the zip. Rather than hand-port
   four prototypes (1,300 lines of final, reviewed markup) into product code —
   which risks fidelity drift in exactly the artefacts we are asking people to
   judge — this implements the small contract they were written against, so
   **every .dc.html here is byte-identical to what the designer shipped**. When
   a design is re-exported we drop the new file in and it runs.

   THIS IS PROTOTYPE INFRASTRUCTURE, NOT PRODUCT CODE. It lives under /design/
   and nothing in website/app/ may import it. The product stays vanilla JS +
   Web Components with no framework; A/B arms that WIN get ported properly,
   which is when their tokens and strings join themes/ and locales/.

   The contract, in full (nothing else is used by the four prototypes):
     {{ expr }}                interpolation, in text and in attribute values.
                               Resolved against the sc-for scope, then
                               renderVals(), then the component instance.
     <sc-if value="{{ b }}">   render children when truthy
     <sc-for list="{{ a }}" as="c">  repeat children, `c` in scope
     onClick / onInput / onChange / onDragOver / onDragLeave / onDrop
                               bound to a method
     ref="{{ someRef }}"       assigns the element to someRef.current
     style-hover="a:b;c:d"     extra style while hovered
     hint-*                    design-tool annotations, ignored
     <helmet>                  its <style> is lifted into <head> once
   Component API: state, setState(patchOrFn, cb), forceUpdate(),
   componentDidMount(), React.createRef().

   Preset: `#key=value` in the URL seeds initial state, so one prototype can be
   linked at a specific starting point (cultures.html#code=pt-br). It seeds
   STATE only — it can never decide what code loads, which is the issue-041
   rule this estate holds to. */

(function () {
    'use strict'

    /* The prototypes use exactly one React API. */
    const React = { createRef: () => ({ current: null }) }

    const EVENTS = {
        onclick: 'click', oninput: 'input', onchange: 'change', onsubmit: 'submit',
        ondragover: 'dragover', ondragleave: 'dragleave', ondrop: 'drop',
        onkeydown: 'keydown', onfocus: 'focus', onblur: 'blur',
        onmouseenter: 'mouseenter', onmouseleave: 'mouseleave',
    }
    const INTERP = /\{\{\s*([^}]+?)\s*\}\}/g

    class DCLogic {
        setState (patch, cb) {
            const next = typeof patch === 'function' ? patch(this.state) : patch
            this.state = Object.assign({}, this.state, next)
            this.__render()
            if (typeof cb === 'function') cb()
        }
        forceUpdate () { this.__render() }
        renderVals () { return {} }
    }

    /* Resolve a `{{ }}` expression: literals first, then scope → renderVals →
       instance. Deliberately not an expression evaluator — the prototypes only
       ever name a value or a dotted path, and keeping it that way means a
       template can never execute anything. */
    function resolve (expr, ctx) {
        const raw = String(expr).trim()
        if (raw === 'true') return true
        if (raw === 'false') return false
        if (raw === 'null') return null
        if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
        if (/^'.*'$/.test(raw) || /^".*"$/.test(raw)) return raw.slice(1, -1)

        const parts = raw.split('.')
        const head = parts[0]
        let val
        if (ctx.scope && head in ctx.scope) val = ctx.scope[head]
        else if (ctx.vals && head in ctx.vals) val = ctx.vals[head]
        else val = ctx.inst[head]
        for (let i = 1; i < parts.length && val != null; i++) val = val[parts[i]]
        return val
    }

    /* A string containing exactly one {{ }} and nothing else returns the VALUE
       (a function, an array, a ref); anything else returns an interpolated
       string. That is what lets onClick="{{ browse }}" carry a method while
       style="…{{ dropLine }}…" carries text. */
    function interpolate (text, ctx) {
        const whole = text.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/)
        if (whole) return resolve(whole[1], ctx)
        return String(text).replace(INTERP, (_, e) => {
            const v = resolve(e, ctx)
            return v == null ? '' : String(v)
        })
    }

    function applyHover (el, spec) {
        let saved = null
        el.addEventListener('mouseenter', () => { saved = el.getAttribute('style') || ''; el.setAttribute('style', saved + ';' + spec) })
        el.addEventListener('mouseleave', () => { if (saved !== null) el.setAttribute('style', saved) })
    }

    /* Build a fragment from template children. sc-if / sc-for are structural, so
       they are handled before the element is cloned; everything else is a
       shallow clone plus attribute processing plus recursion. */
    function build (templateChildren, ctx) {
        const frag = document.createDocumentFragment()
        for (const node of templateChildren) {
            if (node.nodeType === Node.TEXT_NODE) {
                const t = node.nodeValue
                if (INTERP.test(t)) { INTERP.lastIndex = 0; frag.appendChild(document.createTextNode(String(interpolate(t, ctx) ?? ''))) }
                else frag.appendChild(document.createTextNode(t))
                continue
            }
            if (node.nodeType !== Node.ELEMENT_NODE) continue

            const tag = node.tagName.toLowerCase()

            if (tag === 'sc-if') {
                if (interpolate(node.getAttribute('value') || '', ctx)) frag.appendChild(build(node.childNodes, ctx))
                continue
            }
            if (tag === 'sc-for') {
                const list = interpolate(node.getAttribute('list') || '', ctx)
                const as = node.getAttribute('as') || 'item'
                if (Array.isArray(list)) {
                    for (const item of list) {
                        const scope = Object.assign({}, ctx.scope); scope[as] = item
                        frag.appendChild(build(node.childNodes, Object.assign({}, ctx, { scope })))
                    }
                }
                continue
            }

            const el = document.createElement(tag)
            for (const attr of node.attributes) {
                const name = attr.name, lower = name.toLowerCase()
                if (lower.startsWith('hint-')) continue
                if (lower === 'style-hover') { applyHover(el, attr.value); continue }
                if (lower === 'ref') {
                    const ref = interpolate(attr.value, ctx)
                    if (ref && typeof ref === 'object') ref.current = el
                    continue
                }
                if (EVENTS[lower]) {
                    const fn = interpolate(attr.value, ctx)
                    if (typeof fn === 'function') el.addEventListener(EVENTS[lower], fn)
                    continue
                }
                const v = interpolate(attr.value, ctx)
                if (v === false || v == null) continue
                el.setAttribute(name, v === true ? '' : String(v))
                // Inputs need the PROPERTY as well: the attribute only seeds the
                // default, and a re-rendered element must show current state.
                if (lower === 'value') el.value = v == null ? '' : String(v)
                if (lower === 'checked') el.checked = !!v
            }
            el.appendChild(build(node.childNodes, ctx))
            frag.appendChild(el)
        }
        return frag
    }

    /* Re-rendering replaces the tree, which would drop the caret out of the key
       input on every keystroke. Remember where focus was by its index path and
       put it back. */
    function focusPath (root) {
        const el = document.activeElement
        if (!el || !root.contains(el) || !('selectionStart' in el)) return null
        const path = []
        let n = el
        while (n && n !== root) { path.unshift(Array.prototype.indexOf.call(n.parentNode.childNodes, n)); n = n.parentNode }
        return { path, start: el.selectionStart, end: el.selectionEnd }
    }
    function restoreFocus (root, saved) {
        if (!saved) return
        let n = root
        for (const i of saved.path) { n = n && n.childNodes[i]; if (!n) return }
        if (!n.focus) return
        n.focus()
        try { n.setSelectionRange(saved.start, saved.end) } catch (_) { /* not a text input */ }
    }

    /* `#code=pt-br&reasons=false` → initial state. State only, never code. */
    function preset () {
        const out = {}
        const hash = (location.hash || '').replace(/^#/, '')
        if (!hash) return out
        for (const pair of hash.split('&')) {
            const [k, v] = pair.split('=')
            if (!k || v === undefined) continue
            out[decodeURIComponent(k)] = v === 'true' ? true : v === 'false' ? false : decodeURIComponent(v)
        }
        return out
    }

    /* The template CANNOT be read from the live DOM. The prototypes put
       <sc-for> inside <table>/<tbody>/<tr>, and the HTML parser's
       foster-parenting rules eject unknown elements out of table context — the
       culture pack's ten-row comparison matrix silently vanished before this
       was found. Re-reading the page source and parsing the <x-dc> fragment as
       XML keeps the tree exactly as written (the fragments carry no entities
       and close every tag, so they are well-formed). Falls back to the live DOM
       if a future prototype is not. */
    async function readTemplate (host) {
        try {
            const src = await (await fetch(location.href, { cache: 'no-cache' })).text()
            const m = src.match(/<x-dc[^>]*>([\s\S]*?)<\/x-dc>/i)
            if (!m) throw new Error('no <x-dc> in source')
            const doc = new DOMParser().parseFromString('<dc-root>' + m[1] + '</dc-root>', 'application/xml')
            if (doc.querySelector('parsererror')) throw new Error('template is not well-formed XML')
            return Array.from(doc.documentElement.childNodes)
        } catch (err) {
            console.warn('[dc] falling back to the parsed DOM template:', err.message,
                '— any <sc-for>/<sc-if> inside a <table> will be missing.')
            return Array.from(host.childNodes).map(n => n.cloneNode(true))
        }
    }

    async function boot () {
        const host = document.querySelector('x-dc')
        const scriptEl = document.querySelector('script[type="text/x-dc"]')
        if (!host || !scriptEl) return

        const template = (await readTemplate(host)).filter(n => {
            // <helmet> holds page-level <style>; lift it once, and keep it out of
            // the template so re-renders never duplicate it.
            if (n.nodeType === Node.ELEMENT_NODE && n.tagName.toLowerCase() === 'helmet') {
                for (const s of Array.from(n.childNodes)) {
                    if (s.nodeType !== Node.ELEMENT_NODE) continue
                    const el = document.createElement(s.tagName.toLowerCase())
                    el.textContent = s.textContent
                    document.head.appendChild(el)
                }
                return false
            }
            return true
        })
        const container = document.createElement('div')
        host.replaceWith(container)

        let Component
        try {
            // Same-origin, committed source — the design file's own logic class.
            Component = new Function('DCLogic', 'React', scriptEl.textContent + '\nreturn Component')(DCLogic, React)
        } catch (err) {
            container.textContent = 'Prototype failed to load: ' + err.message
            throw err
        }

        const inst = new Component()
        inst.state = Object.assign({}, inst.state, preset())

        let rendering = false
        inst.__render = function () {
            if (rendering) return          // setState inside render would recurse
            rendering = true
            const saved = focusPath(container)
            const ctx = { inst, vals: inst.renderVals ? inst.renderVals() : {}, scope: {} }
            container.replaceChildren(build(template, ctx))
            restoreFocus(container, saved)
            rendering = false
        }

        inst.__render()
        if (typeof inst.componentDidMount === 'function') inst.componentDidMount()
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
    else boot()
})()
