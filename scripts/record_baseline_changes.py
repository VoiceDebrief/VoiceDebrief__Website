#!/usr/bin/env python3
"""Turn a QA-to-docs run into committed baselines plus a reviewable change log.

Run by the commit-baselines job (issues 038 + 050) and by nothing else — it is
the step that makes a CI capture permanent.

The policy it implements (Dinis, 7 Aug): a changed screenshot is RECORDED, not
blocked. UX change is the normal state of a product going to market, and a pixel
threshold can only tell you that something moved — never whether it moved in the
right place. So this script never refuses an update. It writes down exactly what
moved, by how much, and at which commit, and leaves the judgement to an agent
reading the log: *did the change land where the work was supposed to land?*

Inputs (the run's `qa-to-docs` artifact)
  <captures>/changes.json    the run's verdict as data
  <captures>/candidates/     shots with no baseline yet
  <captures>/updated/        shots whose picture moved

Outputs (committed by the calling job)
  website/user-guide/screenshots/*.png        the baselines, updated in place
  website/user-guide/baseline-changes.md      the human log, newest first
  website/user-guide/baseline-changes.json    the same as data, for the agent

Both logs are append-only and keyed on the commit, so the record of how the UI
looked at any release survives even though the PNGs themselves are overwritten —
git history holds the pixels, this log holds the narrative.

Run:  python3 scripts/record_baseline_changes.py --captures <dir> \\
          --run-url <url> --run-number <n> --commit <sha> --repo-url <url>
"""

import argparse, datetime, json, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUIDE = os.path.join(ROOT, 'website/user-guide')
SHOTS = os.path.join(GUIDE, 'screenshots')
LOG_MD = os.path.join(GUIDE, 'baseline-changes.md')
LOG_JSON = os.path.join(GUIDE, 'baseline-changes.json')

HEADER = """# Screenshot baseline changes

*Part of the [user guide](https://whatsapp-voice-transcription.sgraph.ai/user-guide/) —
the record of every time the product's pictures moved.*

Written by CI (`scripts/record_baseline_changes.py`) on each `qa` push whose
QA-to-docs journeys produced a different picture from the committed baseline.

**A change here is not a failure.** The UI is expected to move; what matters is
whether it moved *where the work was supposed to move it*. That question is for a
reviewing agent, not for a pixel threshold — which is why CI records rather than
blocks. Each entry names the commit that caused the change, so the diff that
explains it is one click away, and the previous pixels are in git history.

Newest first.

---
"""


def load(captures):
    path = os.path.join(captures, 'changes.json')
    if not os.path.exists(path):
        # The run died before writing its verdict. Say so rather than silently
        # committing whatever PNGs happen to be lying around.
        print(f'ERROR: {path} missing — the QA-to-docs run did not complete', file=sys.stderr)
        sys.exit(1)
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def apply_captures(captures):
    """Copy new and changed shots over the baselines. Returns (added, updated)."""
    os.makedirs(SHOTS, exist_ok=True)
    counts = {}
    for kind, sub in (('added', 'candidates'), ('updated', 'updated')):
        src = os.path.join(captures, sub)
        names = sorted(os.listdir(src)) if os.path.isdir(src) else []
        for name in names:
            if name.endswith('.png'):
                shutil.copyfile(os.path.join(src, name), os.path.join(SHOTS, name))
        counts[kind] = [n for n in names if n.endswith('.png')]
    return counts['added'], counts['updated']


def entry(verdict, added, meta):
    """One log record: what moved, where it is taught, and what caused it."""
    return {
        'date': meta['date'],
        'commit': meta['commit'],
        'commit_url': f'{meta["repo_url"]}/commit/{meta["commit"]}',
        'run': meta['run_number'],
        'run_url': meta['run_url'],
        'base_version': meta['base_version'],
        'armed': [n[:-4] for n in added],
        'changes': verdict.get('changes', []),
    }


def render_entry(e):
    lines = [f'## {e["date"]} — run [#{e["run"]}]({e["run_url"]}) · '
             f'commit [`{e["commit"][:7]}`]({e["commit_url"]}) · base {e["base_version"]}', '']
    if e['armed']:
        lines += [f'**Armed for the first time:** {", ".join(f"`{a}`" for a in e["armed"])}', '']
    if e['changes']:
        lines += ['| Shot | Taught at | What moved |', '|---|---|---|']
        for c in e['changes']:
            moved = (f'{c["percent"]}% of pixels (threshold {c["threshold"]}%)'
                     if c['kind'] == 'changed' else f'resized {c["from"]} → {c["to"]}')
            lines.append(f'| `{c["id"]}` | {c["slot"]} | {moved} |')
        lines += ['', '*Review question: does that movement match what this commit set out to change?*', '']
    return '\n'.join(lines) + '\n---\n'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--captures', required=True, help='downloaded qa-to-docs artifact directory')
    ap.add_argument('--run-url', default=''), ap.add_argument('--run-number', default='?')
    ap.add_argument('--commit', default=''), ap.add_argument('--repo-url', default='')
    args = ap.parse_args()

    verdict = load(args.captures)
    added, updated = apply_captures(args.captures)

    if not added and not verdict.get('changes'):
        print('nothing moved — baselines already current, no log entry written')
        return 0

    version_file = os.path.join(ROOT, 'version')
    meta = {
        'date': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC'),
        'commit': args.commit or 'unknown',
        'repo_url': args.repo_url.rstrip('/'),
        'run_number': args.run_number,
        'run_url': args.run_url,
        'base_version': open(version_file).read().strip() if os.path.exists(version_file) else 'unknown',
    }
    e = entry(verdict, added, meta)

    # JSON first — it is the agent's input, and must stay parseable even if the
    # markdown below is later hand-edited by a human adding review notes.
    history = []
    if os.path.exists(LOG_JSON):
        with open(LOG_JSON, encoding='utf-8') as f:
            history = json.load(f).get('entries', [])
    history.insert(0, e)
    with open(LOG_JSON, 'w', encoding='utf-8') as f:
        json.dump({'note': 'Written by scripts/record_baseline_changes.py on each qa push whose '
                           'screenshots moved. A change is a record, not a failure — the review question '
                           'is whether the movement matches the work the commit set out to do.',
                   'entries': history}, f, indent=2)
        f.write('\n')

    body = ''
    if os.path.exists(LOG_MD):
        with open(LOG_MD, encoding='utf-8') as f:
            existing = f.read()
        body = existing.split('---\n', 1)[1] if '---\n' in existing else existing
    with open(LOG_MD, 'w', encoding='utf-8') as f:
        f.write(HEADER + '\n' + render_entry(e) + body)

    print(f'recorded: {len(added)} armed, {len(verdict.get("changes", []))} changed '
          f'(run {meta["run_number"]}, commit {meta["commit"][:7]})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
