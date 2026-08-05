#!/usr/bin/env python3
"""Append ?v=<version> to every same-origin asset URL in the published site.

Why: GitHub Pages serves our unversioned ES modules with `cache-control:
max-age=600`. After a deploy a browser can therefore run OLD JavaScript against
NEW HTML for up to ten minutes — which is exactly what happened on 5 Aug 2026:
the freshly-deployed page offered the infographic checkbox while the cached
app.js knew nothing about it, so ticking it did nothing (issue 026).

The IFD convention (immutable, versioned asset paths) solves this for our
`wa-*` components. The app's own modules are not versioned by path, so CI
stamps a query string instead: every deploy produces distinct URLs, and a
browser cannot mix generations. Idempotent — an existing `?v=` is rewritten.

Run over the site directory *after* the version file is known:
    python3 scripts/stamp_cache_busters.py --site website --version v0.1.16
"""

import argparse
import re
from pathlib import Path

# Relative specifiers only: absolute https:// URLs point at the tools origin,
# which is already immutably versioned and must not be rewritten.
JS_IMPORT = re.compile(
    r"""((?:^|[\s(=])(?:import|export)[^'"\n]*?from\s*      # import x from '…'
        |(?:^|[\s(=])import\s*\(\s*                          # import('…')
        |(?:^|\n)\s*import\s+                                # bare side-effect import '…'
      )(['"])(\.{1,2}/[^'"\n]+?\.js)(?:\?v=[^'"\n]*)?(\2)""",
    re.M | re.X)
HTML_SRC  = re.compile(r"""((?:src|href)=")((?!https?://|//|#|mailto:)[^"\n]+?\.(?:js|css))(?:\?v=[^"\n]*)?(")""")


def stamp_js(text: str, version: str) -> str:
    return JS_IMPORT.sub(lambda m: f"{m.group(1)}{m.group(2)}{m.group(3)}?v={version}{m.group(4)}", text)


def stamp_html(text: str, version: str) -> str:
    return HTML_SRC.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={version}{m.group(3)}", text)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--site', required=True, help='site root, e.g. website')
    ap.add_argument('--version', required=True, help='version string, e.g. v0.1.16')
    args = ap.parse_args()

    root = Path(args.site)
    changed = 0
    for path in sorted(root.rglob('*')):
        if path.suffix not in {'.js', '.html'} or not path.is_file():
            continue
        original = path.read_text(encoding='utf-8')
        updated = stamp_js(original, args.version) if path.suffix == '.js' else stamp_html(original, args.version)
        if updated != original:
            path.write_text(updated, encoding='utf-8')
            changed += 1
            print(f'  stamped {path.relative_to(root)}')
    print(f'cache-busted {changed} file(s) at {args.version}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
