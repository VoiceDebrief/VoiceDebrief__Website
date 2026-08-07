#!/usr/bin/env python3
"""Emit the engineering hub's data files (issue 036, review pack v0.1.20 doc 06).

The /engineering/ pages are static and render client-side from JSON that CI
emits at deploy time — the /versions/ pattern applied to the admin estate.
This script is the whole "backend": it writes into <site>/engineering/

  status.json   what shipped: version, commit, branch, timestamp, the test
                layers' results (passed in from the test job's artifact),
                deploy target and run link
  issues.json   the issue queue: every issue under issues/{open,blocked,done}
                with id, title, state, priority and created date
  docs.json     the doc inventory: every markdown doc in library/ and team/
                (minus team/humans — the human-only area stays out of the
                rendered index), with path, title and area

Run (CI, after tests, before cache-busting):
    python3 scripts/emit_engineering_json.py --site website \
        --version "$(cat version)" --target "github-pages (dev)" \
        [--results test-results.json]
"""

import argparse
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO_URL = 'https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription'


def git(args, default=''):
    try:
        return subprocess.check_output(['git'] + args, text=True).strip()
    except Exception:
        return default


def parse_front_matter(text: str) -> dict:
    m = re.match(r'\A---\n(.*?)\n---\n', text, re.S)
    if not m:
        return {}
    out = {}
    for line in m.group(1).splitlines():
        if ':' in line:
            k, v = line.split(':', 1)
            out[k.strip()] = v.strip()
    return out


def first_heading(text: str) -> str:
    for line in text.splitlines():
        if line.startswith('# '):
            return line[2:].strip()
    return ''


def build_status(version: str, target: str, results_path: str) -> dict:
    commit = os.environ.get('GITHUB_SHA') or git(['rev-parse', 'HEAD'])
    branch = os.environ.get('GITHUB_REF_NAME') or git(['rev-parse', '--abbrev-ref', 'HEAD'])
    run_id = os.environ.get('GITHUB_RUN_ID', '')
    tests = None
    if results_path and Path(results_path).is_file():
        tests = json.loads(Path(results_path).read_text(encoding='utf-8'))
    return {
        'note': 'Written by CI at deploy time (scripts/emit_engineering_json.py). '
                'The tests block is the gate this deploy passed — a deploy cannot '
                'happen over a red gate. Live-QA runs after the deploy; its result '
                'lives on the Actions run, not in this file.',
        'version': version,
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'branch': branch,
        'commit': commit,
        'commit_url': f'{REPO_URL}/commit/{commit}' if commit else '',
        'run_url': f'{REPO_URL}/actions/runs/{run_id}' if run_id else '',
        'deploy_target': target,
        'tests': tests,
    }


def build_issues(repo: Path) -> dict:
    issues = []
    for state in ('open', 'blocked', 'done'):
        folder = repo / 'issues' / state
        if not folder.is_dir():
            continue
        for f in sorted(folder.glob('[0-9]*.md')):
            text = f.read_text(encoding='utf-8')
            fm = parse_front_matter(text)
            issues.append({
                'id': f.name.split('-')[0],
                'title': first_heading(text) or f.stem,
                'state': state,
                'priority': fm.get('priority', ''),
                'created': fm.get('created', '')[:10],
                'url': f'{REPO_URL}/blob/dev/issues/{state}/{f.name}',
            })
    issues.sort(key=lambda i: i['id'])
    counts = {s: sum(1 for i in issues if i['state'] == s) for s in ('open', 'blocked', 'done')}
    return {
        'note': 'Rendered from issues/ by CI at deploy time — the queue as of this release.',
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'counts': counts,
        'issues': issues,
    }


def build_docs(repo: Path) -> dict:
    docs = []
    for area, root in (('library', repo / 'library'), ('team', repo / 'team')):
        for f in sorted(root.rglob('*.md')):
            rel = f.relative_to(repo).as_posix()
            if rel.startswith('team/humans/'):
                continue  # the human-only area stays out of the rendered index
            docs.append({
                'path': rel,
                'title': first_heading(f.read_text(encoding='utf-8')) or f.stem,
                'area': area,
                'url': f'{REPO_URL}/blob/dev/{rel}',
            })
    return {
        'note': 'The public doc estate as of this release (team/humans excluded).',
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'count': len(docs),
        'docs': docs,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--site', required=True, help='site root, e.g. website')
    ap.add_argument('--version', required=True, help='version string, e.g. v0.1.22')
    ap.add_argument('--target', default='github-pages (dev)', help='deploy target label')
    ap.add_argument('--results', default='', help='test-results.json from the test job')
    args = ap.parse_args()

    repo = Path(__file__).resolve().parent.parent
    out = Path(args.site) / 'engineering'
    out.mkdir(parents=True, exist_ok=True)

    for name, data in (('status.json', build_status(args.version, args.target, args.results)),
                       ('issues.json', build_issues(repo)),
                       ('docs.json', build_docs(repo))):
        (out / name).write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
        print(f'  wrote engineering/{name}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
