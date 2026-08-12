#!/usr/bin/env python3
"""Build the user guide from the QA-to-docs captures (issue 038, M-qtd-2).

The guide is not written by hand and is never hand-illustrated. Its pictures are
the screenshots the QA journeys took while PROVING the product works: if a shot
is on this page, a test drove the real app to that exact state on CI. That is the
whole point of QA-to-docs — docs that cannot quietly drift from the product,
because the same run that captures them also asserts the behaviour.

Inputs
  tests/qa-to-docs/journeys.json      the shot manifest: id, caption, slot
  website/user-guide/screenshots/     the baselines, committed by CI only

Outputs (generated, not committed — see .gitignore)
  website/user-guide/index.html       rendered from scripts/templates/user-guide.html
  website/user-guide/guide.json       the same structure as data, for agents

A shot with no baseline yet renders as an honest placeholder rather than a broken
image: on the very first CI run the manifest exists and the PNGs do not, and the
page must still build. Never invent a caption for a picture that was not taken.

Run:  python3 scripts/build_user_guide.py [--check] [--out website]
"""

import argparse, html, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'tests/qa-to-docs/journeys.json')
TEMPLATE = os.path.join(ROOT, 'scripts/templates/user-guide.html')

# The guide's shape. Slots in journeys.json are "<section>/<anchor>"; a shot
# whose section is not listed here is a manifest error, not a silent omission —
# adding a journey should force a deliberate decision about where it is taught.
SECTIONS = [
    ('getting-started', 'Getting started',
     'What you need before the first voice note: the page, and nothing else. No '
     'account, nothing to install, and no key until something is ready to run.'),
    ('one-pass', 'The one pass',
     'Drop the voice note in and everything happens in a single pass — transcript, '
     'a translation when you need one, the debrief, and an infographic if you asked '
     'for one. Your OpenRouter key is asked for at the moment it is needed, once.'),
    ('chat', 'Chatting with your materials',
     'Once the pass is done you can talk to what it produced — and ask the assistant '
     'to do the work, not just describe it.'),
]
SECTION_KEYS = [k for k, _, _ in SECTIONS]


def load_manifest(problems):
    if not os.path.exists(MANIFEST):
        problems.append(f'missing manifest: {os.path.relpath(MANIFEST, ROOT)}')
        return []
    with open(MANIFEST, encoding='utf-8') as f:
        shots = json.load(f).get('shots', [])
    seen_slots = set()
    out = []
    for s in shots:
        where = f'shot {s.get("id", "?")}'
        for field in ('id', 'caption', 'slot'):
            if not s.get(field):
                problems.append(f'{where}: missing "{field}"')
        slot = s.get('slot', '')
        if '/' not in slot:
            problems.append(f'{where}: slot "{slot}" must be "<section>/<anchor>"')
            continue
        section, anchor = slot.split('/', 1)
        if section not in SECTION_KEYS:
            problems.append(f'{where}: unknown section "{section}" — add it to SECTIONS '
                            f'in build_user_guide.py (known: {", ".join(SECTION_KEYS)})')
            continue
        if slot in seen_slots:
            problems.append(f'{where}: duplicate slot "{slot}" — two shots cannot teach the same step')
        seen_slots.add(slot)
        out.append({'id': s['id'], 'caption': s.get('caption', ''), 'section': section,
                    'anchor': anchor, 'journey': s.get('journey', '')})
    return out


def render(shots, shot_dir):
    """One <section> per guide section, one figure per shot, in manifest order."""
    blocks, captured, missing = [], 0, 0
    for key, label, blurb in SECTIONS:
        group = [s for s in shots if s['section'] == key]
        if not group:
            continue
        figures = []
        for s in group:
            png = f'{s["id"]}.png'
            exists = os.path.exists(os.path.join(shot_dir, png))
            captured += exists
            missing += not exists
            cap = html.escape(s['caption'], quote=False)
            if exists:
                media = (f'        <img src="screenshots/{png}" alt="{html.escape(s["caption"], quote=True)}"\n'
                         f'             loading="lazy" width="1280" height="800">')
            else:
                media = ('        <div class="shot__pending">This screenshot has not been captured yet — '
                         'it appears here automatically once CI has run the journey that takes it.</div>')
            figures.append(
                f'      <figure class="shot" id="{html.escape(s["anchor"], quote=True)}">\n'
                f'{media}\n'
                f'        <figcaption>{cap}</figcaption>\n'
                f'      </figure>')
        blocks.append(
            f'    <section class="guide-group" id="{key}">\n'
            f'      <h2>{html.escape(label, quote=False)}</h2>\n'
            f'      <p class="guide-group__blurb">{html.escape(blurb, quote=False)}</p>\n'
            + '\n'.join(figures) + '\n    </section>')

    if not blocks:
        body = ('    <p class="guide-empty">The guide is assembled from the QA journeys, and none are '
                'published yet. <a href="/app/">The app itself</a> is the quickest look in the meantime.</p>')
    else:
        body = '\n\n'.join(blocks)
    return body, captured, missing


def build(out_dir, check_only=False):
    problems = []
    shots = load_manifest(problems)
    shot_dir = os.path.join(out_dir, 'user-guide/screenshots')
    body, captured, missing = render(shots, shot_dir)

    if problems:
        for p in problems:
            print(f'  ERROR  {p}', file=sys.stderr)
        return 1

    if check_only:
        print(f'user guide ok: {len(shots)} shot(s) across {len(SECTIONS)} section(s); '
              f'{captured} captured, {missing} awaiting CI')
        return 0

    with open(TEMPLATE, encoding='utf-8') as f:
        page = f.read().replace('<!--GUIDE-->', body)
    dest = os.path.join(out_dir, 'user-guide')
    os.makedirs(dest, exist_ok=True)
    with open(os.path.join(dest, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page)
    with open(os.path.join(dest, 'guide.json'), 'w', encoding='utf-8') as f:
        json.dump({'note': 'Generated by scripts/build_user_guide.py from tests/qa-to-docs/journeys.json. '
                           'Every screenshot was taken by a passing QA journey.',
                   'sections': [{'key': k, 'label': l, 'blurb': b} for k, l, b in SECTIONS],
                   'shots': shots}, f, indent=2)
        f.write('\n')
    print(f'built the user guide: {len(shots)} shot(s), {captured} captured, {missing} awaiting CI')
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=os.path.join(ROOT, 'website'), help='site directory to write into')
    ap.add_argument('--check', action='store_true', help='validate the manifest, write nothing')
    args = ap.parse_args()
    return build(args.out, check_only=args.check)


if __name__ == '__main__':
    sys.exit(main())
