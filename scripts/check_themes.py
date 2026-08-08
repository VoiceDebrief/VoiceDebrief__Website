#!/usr/bin/env python3
"""Theme parity check (issue 050, M1) — run in CI beside the other --check gates.

A theme is one sheet of --wa-* tokens on :root. That only works if two things
stay true, and neither is self-enforcing:

  1. Every token the app READS is DECLARED by default.css. A `var(--wa-thing)`
     with no declaration silently falls back to the literal beside it (or to
     nothing), so the design has a hole exactly where a component quietly keeps
     its old colour — the failure a screenshot diff shows late and explains
     badly.
  2. Every OTHER theme declares exactly the same token set as default.css. A
     candidate missing a token inherits default's value for it, which is how an
     A/B arm ends up half-styled and the result unreadable: you cannot tell
     whether the arm lost on its design or on the bits of it that never applied.

Extra tokens are an error too — a token no component reads is either a typo or
dead weight, and both should be said out loud rather than sit in the sheet.

Run:  python3 scripts/check_themes.py
"""

import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'website/app')
THEMES = os.path.join(APP, 'themes')
INDEX = os.path.join(THEMES, 'index.json')

DECLARE_RE = re.compile(r'(--wa-[a-z0-9-]+)\s*:')
# A read is var(--wa-x) or var(--wa-x, fallback); the fallback may itself be a
# var() call, so stop at the first comma or paren.
READ_RE = re.compile(r'var\(\s*(--wa-[a-z0-9-]+)\s*[,)]')


def declared(path):
    with open(path, encoding='utf-8') as f:
        return set(DECLARE_RE.findall(f.read()))


def css_files_the_app_ships():
    """app.css plus the component stylesheet of each version app.js imports —
    older versions on disk are immutable history and are not the live design."""
    files = [os.path.join(APP, 'app.css')]
    with open(os.path.join(APP, 'app.js'), encoding='utf-8') as f:
        app_js = f.read()
    for rel in sorted(set(re.findall(r'components/([a-z-]+/v\d+/v[\d.]+/v[\d.]+)', app_js))):
        name = rel.split('/')[0]
        css = os.path.join(ROOT, 'website/components', rel, f'{name}.css')
        if os.path.exists(css):
            files.append(css)
    return files


def main():
    problems = []
    default_sheet = os.path.join(THEMES, 'default.css')
    if not os.path.exists(default_sheet):
        print(f'ERROR  missing {os.path.relpath(default_sheet, ROOT)}', file=sys.stderr)
        return 1
    base = declared(default_sheet)

    # 1. every token read by the shipped CSS is declared by default.css
    read = set()
    for path in css_files_the_app_ships():
        with open(path, encoding='utf-8') as f:
            for tok in READ_RE.findall(f.read()):
                read.add(tok)
    for tok in sorted(read - base):
        problems.append(f'{tok} is read by the app but declared by no theme — '
                        f'add it to themes/default.css')
    for tok in sorted(base - read):
        problems.append(f'{tok} is declared in themes/default.css but read by nothing — '
                        f'remove it, or fix the component that should use it')

    # 2. every other theme declares exactly default's token set
    with open(INDEX, encoding='utf-8') as f:
        index = json.load(f)
    if index.get('default') not in index.get('themes', {}):
        problems.append(f'index.json names default theme "{index.get("default")}", which it does not list')
    for name, meta in sorted(index.get('themes', {}).items()):
        sheet = os.path.join(THEMES, meta.get('sheet', ''))
        if not os.path.exists(sheet):
            problems.append(f'theme "{name}" names sheet {meta.get("sheet")!r}, which does not exist')
            continue
        if name == index.get('default'):
            continue
        toks = declared(sheet)
        for tok in sorted(base - toks):
            problems.append(f'theme "{name}" is missing {tok} — it would silently inherit default\'s value')
        for tok in sorted(toks - base):
            problems.append(f'theme "{name}" declares {tok}, which default.css does not — themes may only redefine')

    if problems:
        for p in problems:
            print(f'  ERROR  {p}', file=sys.stderr)
        return 1
    n = len(index.get('themes', {}))
    print(f'themes ok: {len(base)} token(s), {n} theme(s), every token read is declared')
    return 0


if __name__ == '__main__':
    sys.exit(main())
