#!/usr/bin/env python3
"""Generate a real URL per locale: /app/pt-pt/, /app/en-us/ … (issue 056).

Why real pages and not client-side routing: this is a static site on two hosts,
and GitHub Pages cannot rewrite `/app/pt-pt/` to `/app/`. A path that only works
because JavaScript rescues it is not a shareable link — it is a 404 with good
intentions. So each locale gets a directory with an index.html, and the URL
works before a single line of our code runs.

Each generated page is the app page with four changes:

  <base href="../">   every relative reference in the page, in app.js's module
                      graph and in its fetch() calls resolves against /app/ as
                      before. One line instead of rewriting a dozen paths and
                      getting one of them wrong. (CSP `base-uri 'self'` allows it.)
  lang="…"            the real language of the document, for screen readers and
                      for translation tooling that would otherwise offer to
                      translate Portuguese into Portuguese.
  canonical           points at itself, not at /app/ — these are distinct pages
                      with distinct content, and pointing them all at one
                      canonical would ask search engines to drop them.
  hreflang alternates every locale plus x-default → /app/, which is the honest
                      statement that the bare path serves whoever arrives.

The pages are BUILD OUTPUT (gitignored), regenerated on every deploy from the
allowlist, so a new locale cannot be added without its URL appearing.

Run:  python3 scripts/build_locale_pages.py [--out website] [--check]
"""

import argparse, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_DEFAULT = os.path.join(ROOT, 'website')
PROD = 'https://voicedebrief.ai'


def bcp47(name):
    """pt-pt -> pt-PT. URLs stay lowercase by convention; the lang and hreflang
    attributes are language-subtag-lowercase, region-subtag-UPPERCASE. Browsers
    are case-insensitive about it, but this is machine-readable metadata that
    other people's tooling reads, and getting it right costs one function."""
    parts = name.split('-')
    return parts[0].lower() + ('-' + parts[1].upper() if len(parts) > 1 else '')


def build(out_dir, check_only=False):
    app = os.path.join(out_dir, 'app')
    src = os.path.join(app, 'index.html')
    index_path = os.path.join(app, 'locales', 'index.json')
    problems = []

    for p in (src, index_path):
        if not os.path.exists(p):
            problems.append(f'missing {os.path.relpath(p, ROOT)}')
    if problems:
        for p in problems:
            print(f'  ERROR  {p}', file=sys.stderr)
        return 1

    with open(index_path, encoding='utf-8') as f:
        index = json.load(f)
    locales = index.get('locales', {})
    with open(src, encoding='utf-8') as f:
        page = f.read()

    if '<base href="./">' not in page:
        problems.append('website/app/index.html must declare <base href="./"> — the locale pages '
                        'rewrite it to ../, and without a pinned base a language switch breaks '
                        'every relative fetch on the page')
    if problems:
        for p in problems:
            print(f'  ERROR  {p}', file=sys.stderr)
        return 1

    # hreflang set: every locale, plus x-default for the bare path.
    alts = '\n'.join(
        f'<link rel="alternate" hreflang="{bcp47(name)}" href="{PROD}/app/{name}/">'
        for name in sorted(locales)
    ) + f'\n<link rel="alternate" hreflang="x-default" href="{PROD}/app/">'

    # The bare /app/ carries the same alternates, so a crawler landing there
    # discovers every language. Those live in the SOURCE page and are CHECKED
    # here rather than injected: a build script that edits its own input leaves
    # the repo dirty after every build and makes it unclear which file is the
    # truth. index.html stays the truth; drifting from the allowlist is a build
    # failure with a message, not a silent difference.
    for name in sorted(locales):
        want = f'<link rel="alternate" hreflang="{bcp47(name)}" href="{PROD}/app/{name}/">'
        if want not in page:
            problems.append(f'website/app/index.html is missing its alternate for "{name}" — '
                            f'add: {want}')
    if 'hreflang="x-default"' not in page:
        problems.append('website/app/index.html is missing the x-default alternate')
    for m in re.findall(r'hreflang="([a-z]{2}-[A-Z]{2})"', page):
        if m.lower() not in locales:
            problems.append(f'website/app/index.html advertises "{m}", which the allowlist does not list')
    if problems:
        for p in problems:
            print(f'  ERROR  {p}', file=sys.stderr)
        return 1

    if check_only:
        print(f'locale pages ok: {len(locales)} page(s) would be generated '
              f'({", ".join(sorted(locales))}); source alternates match the allowlist')
        return 0

    for name, meta in sorted(locales.items()):
        html = page
        html = html.replace('<html lang="en-gb">', f'<html lang="{bcp47(name)}">', 1)
        # One level deeper, so the same relative references resolve to /app/.
        html = html.replace('<base href="./">', '<base href="../">', 1)
        html = re.sub(r'<link rel="canonical" href="[^"]*">',
                      f'<link rel="canonical" href="{PROD}/app/{name}/">', html, count=1)
        html = html.replace('</head>', alts + '\n</head>', 1)
        # A generated page must say so — someone will open it and try to edit it.
        html = html.replace('<!DOCTYPE html>',
                            f'<!DOCTYPE html>\n<!-- GENERATED by scripts/build_locale_pages.py for locale "{name}".\n'
                            f'     Edit website/app/index.html instead; this file is build output. -->', 1)

        dest = os.path.join(app, name)
        os.makedirs(dest, exist_ok=True)
        with open(os.path.join(dest, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(html)

    print(f'built {len(locales)} locale page(s): {", ".join(sorted(locales))}')
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=SITE_DEFAULT, help='site directory to write into')
    ap.add_argument('--check', action='store_true', help='validate inputs, write nothing')
    args = ap.parse_args()
    return build(args.out, check_only=args.check)


if __name__ == '__main__':
    sys.exit(main())
