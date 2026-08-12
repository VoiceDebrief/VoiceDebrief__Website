#!/usr/bin/env python3
"""Theme parity check (issue 050, retargeted for issue 060's design pass).

Colour lives in ONE file — website/vd-tokens.css — which declares five --vd-*
schemes and derives from them the --wa-* names the shipped components read and
the --navy/--ink/… names the static pages read. That arrangement only holds if
four things stay true, and none of them is self-enforcing:

  1. Every token READ is DECLARED. A `var(--wa-thing)` with no declaration
     silently falls back to the literal beside it (or to nothing), so the design
     has a hole exactly where a component quietly keeps its old colour — the
     failure a screenshot diff shows late and explains badly.

  2. Every SCHEME declares exactly the same --vd-* set. A scheme missing a token
     inherits Signal's value for it, which is how a theme ends up half-applied
     and unreadable: you cannot tell whether it lost on its design or on the
     parts of it that never arrived.

  3. No stylesheet the site ships writes a COLOUR of its own. This is the rule
     the design pack asked for in one line ("no colour arrives outside
     02-tokens.css") and the only one of the four that is about intent rather
     than mechanism: a hex in a page is a decision made where nobody will look
     for it again. Checked over every sheet and every component the site loads,
     with two deliberate exemptions named in EXEMPT below.

  4. Every page LINKS the sheet. A page that does not is not un-themed — it is
     themed by whatever literal fallbacks its components happen to carry, which
     is worse, because it looks deliberate.

Extra tokens are an error too — a declared token nothing reads is either a typo
or dead weight, and both should be said out loud rather than sit in the sheet.

Run:  python3 scripts/check_themes.py
"""

import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'website')
TOKENS = os.path.join(SITE, 'vd-tokens.css')
INDEX = os.path.join(SITE, 'app/themes/index.json')

DECLARE_RE = re.compile(r'(--(?:vd|wa)-[a-zA-Z0-9-]+)\s*:')
# A read is var(--x) or var(--x, fallback); the fallback may itself be a var()
# call, so stop at the first comma or paren.
READ_RE = re.compile(r'var\(\s*(--(?:vd|wa)-[a-zA-Z0-9-]+)\s*[,)]')
# Hex literals and the rgb()/hsl() families. A literal inside a var() fallback
# is fine and expected — that is the standalone-render guarantee — so those are
# stripped before this runs.
COLOUR_RE = re.compile(r'#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(', re.I)
VAR_FALLBACK_RE = re.compile(r'var\(\s*--[a-zA-Z0-9-]+\s*,[^()]*(?:\([^()]*\)[^()]*)*\)')

# Rule 3 exemptions, each with a reason. Nothing is exempt for being awkward.
EXEMPT = {
    # The tokens file IS the colour.
    'website/vd-tokens.css': 'the source of colour',
    # Design candidates under evaluation (issue 052/059): whole point is that
    # each carries its own palette, and they are noindex and off the sitemap.
    'website/design/': 'A/B design candidates carry their own palettes by design',
    # Vendored MIT test-runner CSS — not ours to restyle.
    'website/tests/browser/vendor/': 'vendored QUnit (MIT)',
}


def rel(path):
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


def exempt(path):
    r = rel(path)
    return any(r == k or r.startswith(k) for k in EXEMPT)


def strip_fallbacks(text):
    """Remove var() fallbacks and comments, so rule 3 sees only colour a rule
    actually commits to."""
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    prev = None
    while prev != text:          # nested var() fallbacks unwind outside-in
        prev, text = text, VAR_FALLBACK_RE.sub('var(--x)', text)
    return text


def scheme_blocks(text):
    """{selector: {token: value}} for every rule in the tokens file that
    declares --vd-* names. The five schemes are the blocks that declare the
    colour set; the shape/type and derived blocks declare their own names and
    are compared separately."""
    out = {}
    for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', re.sub(r'/\*.*?\*/', '', text, flags=re.S)):
        # The trailing semicolon is OPTIONAL — CSS allows the last declaration
        # in a block to omit it, and requiring it here made a whole scheme
        # invisible to this parser rather than reported as incomplete. A gate
        # that silently skips what it cannot parse is worse than no gate: it
        # says "themes ok" about a file it did not read.
        toks = dict(re.findall(r'(--vd-[a-zA-Z0-9-]+)\s*:\s*([^;}]+)\s*(?:;|$)', body))
        if toks:
            out.setdefault(' '.join(sel.split()), {}).update(toks)
    return out


def sheets_the_site_ships():
    """Every stylesheet the LIVE site renders through, from all three routes a
    rule can arrive by:

      - .css files under website/
      - <style> blocks inside pages and page templates
      - component styles, which are a sibling .css OR inline in the .js

    The third route was missed on the first pass of this check, and
    wa-site-nav — on every page of the site — sat with 26 hardcoded colours and
    no tokens at all while it reported "themes ok". A gate that only looks where
    you remembered to point it is how a theme ends up restyling everything
    except the header.

    Older component versions on disk are immutable history: they are frozen by
    the IFD rule and cannot be edited, so scanning them would only ever produce
    unfixable failures. Only versions a page actually loads are scanned."""
    files, seen = [], set()

    pages = []
    for root, _, names in os.walk(SITE):
        if '/components/' in root.replace(os.sep, '/'):
            continue
        for n in names:
            if n.endswith('.css'):
                files.append(os.path.join(root, n))
            elif n.endswith('.html'):
                pages.append(os.path.join(root, n))
    tpl = os.path.join(ROOT, 'scripts/templates')
    pages += [os.path.join(tpl, n) for n in os.listdir(tpl) if n.endswith('.html')]
    files += [os.path.join(SITE, 'app/app.js')]

    for src in pages + [os.path.join(SITE, 'app/app.js')]:
        if not os.path.exists(src):
            continue
        with open(src, encoding='utf-8') as f:
            text = f.read()
        for m in re.findall(r'components/([a-z-]+/v\d+/v[\d.]+/v[\d.]+)', text):
            if m in seen:
                continue
            seen.add(m)
            name = m.split('/')[0]
            for ext in ('css', 'js'):
                p = os.path.join(SITE, 'components', m, f'{name}.{ext}')
                if os.path.exists(p):
                    files.append(p)
    return files + pages, pages


def main():
    problems = []
    if not os.path.exists(TOKENS):
        print(f'ERROR  missing {rel(TOKENS)}', file=sys.stderr)
        return 1
    with open(TOKENS, encoding='utf-8') as f:
        tokens_text = f.read()
    declared = set(DECLARE_RE.findall(tokens_text))

    sheets, pages = sheets_the_site_ships()

    # 1. every token read anywhere is declared here. The tokens file reads
    #    itself — layers B and C are var(--vd-*) all the way down — so it is
    #    part of the read set even though rule 3 exempts it.
    read = set(READ_RE.findall(tokens_text))
    for path in sheets:
        if exempt(path):
            continue
        with open(path, encoding='utf-8') as f:
            read.update(READ_RE.findall(f.read()))
    for tok in sorted(read - declared):
        problems.append(f'{tok} is read but declared nowhere — add it to vd-tokens.css')
    # Declared ahead of the component that will read it. Every entry names the
    # component it is waiting for, and comes OFF this list when that lands — an
    # exception with no expiry is just a hole in the rule with a comment on it.
    AHEAD = {
        '--vd-pz':      'the phone mock in the design pack (not built)',
        '--vd-ps':      'the phone mock in the design pack (not built)',
        '--vd-off':     'vd-option-toggle, inert state (M3)',
        '--vd-offi':    'vd-option-toggle, inert state (M3)',
        '--vd-ws':      'vd-caveat, the strong half of the warning pair (M3)',
        '--vd-r-chip':  'vd-option-toggle (M3)',
    }
    for tok in sorted(declared - read - set(AHEAD)):
        problems.append(f'{tok} is declared in vd-tokens.css but read by nothing — '
                        f'remove it, or fix the rule that should use it')
    for tok in sorted(set(AHEAD) & read):
        problems.append(f'{tok} is now read, so take it off the AHEAD list in this script '
                        f'({AHEAD[tok]} has landed)')

    # 2. every scheme declares the same --vd-* colour set
    blocks = scheme_blocks(tokens_text)
    schemes = {sel: toks for sel, toks in blocks.items() if 'data-vd-theme' in sel or sel.startswith(':root,')}
    if len(schemes) < 5:
        problems.append(f'expected five schemes in vd-tokens.css, found {len(schemes)}: {sorted(schemes)}')
    base_sel = next((s for s in schemes if s.startswith(':root,')), None)
    if base_sel is None:
        problems.append('no default scheme — the first block must be `:root, [data-vd-theme="signal"]`, '
                        'so an unknown scheme degrades to a readable page rather than an unstyled one')
    else:
        base = set(schemes[base_sel])
        for sel, toks in sorted(schemes.items()):
            if sel == base_sel:
                continue
            for tok in sorted(base - set(toks)):
                problems.append(f'scheme {sel} is missing {tok} — it would silently inherit Signal\'s value')
            for tok in sorted(set(toks) - base):
                problems.append(f'scheme {sel} declares {tok}, which Signal does not — a scheme may only redefine')

    # 3. no colour outside this file
    for path in sheets:
        if exempt(path):
            continue
        with open(path, encoding='utf-8') as f:
            text = f.read()
        if path.endswith(('.html', '.js')):
            # Only look inside CSS: a hex in page copy or in JS logic is not a
            # style rule. <style> blocks in pages, template literals in
            # components — both are where component CSS actually lives.
            chunks = re.findall(r'<style[^>]*>(.*?)</style>', text, flags=re.S)
            chunks += re.findall(r'(?:CSS|css|styles)\s*=\s*`(.*?)`', text, flags=re.S)
            text = '\n'.join(chunks)
        for hit in COLOUR_RE.findall(strip_fallbacks(text)) or []:
            problems.append(f'{rel(path)} writes a colour of its own ({hit.strip()}) — '
                            f'colour belongs in vd-tokens.css, read through a token')
            break        # one report per file is enough to act on

    # 4. every page links the sheet
    for page in pages:
        if exempt(page):
            continue
        with open(page, encoding='utf-8') as f:
            text = f.read()
        # A <link> ELEMENT, not the string. Checking for the string passed on
        # pages that only MENTIONED the file in a comment — which is exactly how
        # the home page shipped un-themed while this rule reported it linked.
        # Same lesson as the locale panel and the summary prompt before it:
        # assert the thing the browser acts on, never the text that was supposed
        # to cause it.
        if not re.search(r'<link[^>]+rel="stylesheet"[^>]+href="/vd-tokens\.css"', text):
            problems.append(f'{rel(page)} does not link vd-tokens.css — it would be styled by '
                            f'whatever literal fallbacks its components happen to carry')

    # 5. the scheme allowlist names real schemes (the issue-041 rule: a value
    #    that selects what the page loads must resolve to an allowlist key)
    with open(INDEX, encoding='utf-8') as f:
        index = json.load(f)
    listed = set(index.get('schemes', {}))
    real = {re.search(r'"([a-z]+)"', s).group(1) for s in schemes if 'data-vd-theme' in s} | {'signal'}
    for name in sorted(listed - real):
        problems.append(f'index.json lists scheme "{name}", which vd-tokens.css does not declare')
    for name in sorted(real - listed):
        problems.append(f'vd-tokens.css declares scheme "{name}", which index.json does not list')
    if index.get('default') not in listed:
        problems.append(f'index.json names default "{index.get("default")}", which it does not list')

    if problems:
        for p in problems:
            print(f'  ERROR  {p}', file=sys.stderr)
        return 1
    vd = len([t for t in declared if t.startswith('--vd-')])
    print(f'themes ok: {vd} scheme token(s) × {len(schemes)} scheme(s), '
          f'{len(declared) - vd} derived name(s), {len(pages)} page(s) linked, no colour outside the sheet')
    return 0


if __name__ == '__main__':
    sys.exit(main())
