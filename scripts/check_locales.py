#!/usr/bin/env python3
"""Locale parity check (issue 050, M1b) — run in CI beside the other --check gates.

Send's recorded failure was translation drift nobody could see: files diverging
from the source, keys quietly missing, a locale marked supported while half its
strings fell back to English. Generators there never checked. This does.

Four rules:

  1. Every key a locale ships must EXIST in en-gb. A key en-gb does not have is
     either a typo or a string someone added to a translation instead of to the
     source — both leave a value no fallback can ever reach.
  2. Every LIVE locale must be 100% key-complete in each file it declares. Being
     LIVE is a claim about the user's experience; a live locale with holes shows
     English mid-sentence, which reads worse than not offering the language.
     A DRAFT locale may have holes — that is what draft means.
  3. A locale must ship the files it declares in index.json, and declare the
     files it ships. The declaration IS the support statement.
  4. Every data-i18n key used in the app's HTML must exist in en-gb — otherwise
     the UI renders the key itself (i18n.js does that on purpose, so it is
     visible), and this catches it before a user does.

Run:  python3 scripts/check_locales.py
"""

import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'website/app')
LOCALES = os.path.join(APP, 'locales')
SOURCE = 'en-gb'


def keys_of(path):
    """Translatable keys in one domain file — _-prefixed keys are notes for the
    translator, not strings, and are deliberately not required elsewhere."""
    with open(path, encoding='utf-8') as f:
        return {k for k in json.load(f) if not k.startswith('_')}


def main():
    problems = []
    with open(os.path.join(LOCALES, 'index.json'), encoding='utf-8') as f:
        index = json.load(f)
    locales = index.get('locales', {})

    if SOURCE not in locales:
        print(f'ERROR  index.json does not list the source locale {SOURCE}', file=sys.stderr)
        return 1
    if index.get('default') not in locales:
        problems.append(f'index.json default "{index.get("default")}" is not a listed locale')

    # The source's keys, per domain.
    src = {}
    for domain in locales[SOURCE].get('files', []):
        p = os.path.join(LOCALES, SOURCE, f'{domain}.json')
        if not os.path.exists(p):
            problems.append(f'{SOURCE} declares "{domain}" but {domain}.json does not exist')
            continue
        src[domain] = keys_of(p)

    for name, meta in sorted(locales.items()):
        folder = os.path.join(LOCALES, name)
        declared = set(meta.get('files', []))
        if not os.path.isdir(folder):
            problems.append(f'locale "{name}" is listed but has no folder')
            continue
        present = {f[:-5] for f in os.listdir(folder) if f.endswith('.json')}

        for extra in sorted(present - declared):
            problems.append(f'{name}/{extra}.json exists but index.json does not declare it — '
                            f'the declaration is the support statement, so say it out loud')
        for missing in sorted(declared - present):
            problems.append(f'{name} declares "{missing}" but {name}/{missing}.json does not exist')

        if name == SOURCE:
            continue
        live = meta.get('status') == 'live'
        for domain in sorted(declared & present):
            if domain not in src:
                problems.append(f'{name} ships "{domain}", which {SOURCE} does not — '
                                f'add it to {SOURCE} first: it is the source of truth')
                continue
            ks = keys_of(os.path.join(folder, f'{domain}.json'))
            for k in sorted(ks - src[domain]):
                problems.append(f'{name}/{domain}.json has "{k}", which {SOURCE} does not — '
                                f'typo, or a string added to a translation instead of the source')
            if live:
                for k in sorted(src[domain] - ks):
                    problems.append(f'{name} is LIVE but {domain}.json is missing "{k}" — '
                                    f'a live locale showing English mid-sentence reads worse '
                                    f'than not offering the language; mark it draft or finish it')

    # 4. keys the markup asks for must exist.
    #    Component templates count as markup. They were outside this walk until a
    #    key added to wa-key-panel.html went unchecked — the component localises
    #    its own shadow DOM through the same applyIn(), so a key it names that
    #    en-gb lacks renders the key string inside the component, which is
    #    exactly the failure this rule exists to catch. The gate follows the
    #    mechanism, not the directory.
    used = set()
    for base in (APP, os.path.join(ROOT, 'website/components')):
        for root, _, files in os.walk(base):
            for f in files:
                if not f.endswith('.html'):
                    continue
                with open(os.path.join(root, f), encoding='utf-8') as fh:
                    for m in re.findall(r'data-i18n(?:-[a-z-]+)?="([^"]+)"', fh.read()):
                        used.add(m)
    for key in sorted(used):
        domain, _, leaf = key.partition('.')
        if domain not in src or leaf not in src[domain]:
            problems.append(f'markup uses data-i18n="{key}", which {SOURCE} does not define — '
                            f'the page would render the key itself')

    if problems:
        for p in problems:
            print(f'  ERROR  {p}', file=sys.stderr)
        return 1
    total = sum(len(v) for v in src.values())
    live = sum(1 for m in locales.values() if m.get('status') == 'live')
    print(f'locales ok: {len(locales)} locale(s) ({live} live), {len(src)} domain(s), '
          f'{total} source key(s), {len(used)} used in markup')
    return 0


if __name__ == '__main__':
    sys.exit(main())
