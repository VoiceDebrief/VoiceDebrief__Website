#!/usr/bin/env python3
"""build_content.py — turn content/ into the site's published pages (issue 036).

    content/updates/YYYY/MM/DD/<version>__update__<slug>.md   one post per file
    content/versions/<version>.md                             one release per file
    content/videos/<slug>.md                                  one video per file
                    │
                    ▼  (this script, run in CI before the cache-buster)
    website/updates/index.html     the rendered Updates page
    website/updates/updates.json   the machine-readable manifest ("the centre file")
    website/updates/feed.xml       RSS, for anyone following along
    website/versions/versions.json the data the Versions page already fetches
    website/videos/index.html      the rendered Videos page
    website/videos/videos.json     the video manifest (also read by other pages)

Why it exists: publishing used to mean splicing an <article> block into
presentation HTML by hand — fragile for a person, worse for an agent, and a
guaranteed conflict when two of them publish on the same day. Now an agent
writes ONE markdown file and nothing else; ordering, links, ids and markup are
derived here. Nothing in website/ that this script writes is committed.

Deliberately stdlib-only, like scripts/stamp_cache_busters.py.

Usage:
    python3 scripts/build_content.py                 # build into website/
    python3 scripts/build_content.py --check         # validate only, write nothing
    python3 scripts/build_content.py --out /tmp/x    # build elsewhere (tests)
"""

import argparse, datetime, glob, html, json, os, re, sys

REPO_URL = 'https://github.com/sgraph-ai/SGraph-AI__SaaS__WhatsApp__Audio__Transcription'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION_RE = re.compile(r'^v\d+\.\d+\.\d+$')
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']
DAYS_RFC = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
MONTHS_RFC = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

LIST_KEYS = {'issues', 'tags'}
VIDEO_KINDS = ('short', 'demo', 'explainer')   # also the display order
# A YouTube id is 11 chars of [A-Za-z0-9_-]. Validated so a typo fails the build
# rather than shipping a dead embed.
YT_ID_RE = re.compile(r'^[A-Za-z0-9_-]{11}$')


class ContentError(Exception):
    """A content problem that must fail the build rather than ship broken."""


# --- frontmatter ---------------------------------------------------------------

def parse_frontmatter(text, where):
    """Flat `key: value` frontmatter — no YAML dependency, nothing nested to get
    wrong. Values in LIST_KEYS are comma-separated lists."""
    if not text.startswith('---'):
        raise ContentError(f'{where}: must start with a --- frontmatter block')
    end = text.find('\n---', 3)
    if end < 0:
        raise ContentError(f'{where}: frontmatter is not closed with ---')
    meta, body = {}, text[end + 4:].lstrip('\n')
    for i, line in enumerate(text[3:end].strip().split('\n'), 1):
        if not line.strip():
            continue
        if ':' not in line:
            raise ContentError(f'{where}: frontmatter line {i} is not `key: value` — {line!r}')
        k, v = line.split(':', 1)
        k, v = k.strip(), v.strip()
        meta[k] = [x.strip() for x in v.split(',') if x.strip()] if k in LIST_KEYS else v
    return meta, body


# --- markdown ------------------------------------------------------------------

def _inline(s):
    """Escape first, then apply the small inline set. Content is ours, but a page
    is never built by trusting a string."""
    s = html.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![*\w])\*([^*\n]+)\*', r'<em>\1</em>', s)
    def link(m):
        text, href = m.group(1), m.group(2)
        if not re.match(r'^(https?://|/|#|mailto:)', href):
            raise ContentError(f'link target must be absolute, root-relative or an anchor: {href!r}')
        return f'<a href="{html.escape(href, quote=True)}">{text}</a>'
    return re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', link, s)


def md_to_html(md, where=''):
    """Headings, paragraphs, bullet/numbered lists, quotes, fenced code, rules."""
    out, para, lst, fence = [], [], None, None
    def flush_para():
        if para:
            out.append('<p>' + _inline(' '.join(para)) + '</p>')
            para.clear()
    def flush_list():
        nonlocal lst
        if lst:
            out.append(f'</{lst}>')
            lst = None
    for raw in md.replace('\r', '').split('\n'):
        line = raw.rstrip()
        if fence is not None:
            if line.strip().startswith('```'):
                out.append('<pre><code>' + html.escape('\n'.join(fence)) + '</code></pre>')
                fence = None
            else:
                fence.append(raw)
            continue
        if line.strip().startswith('```'):
            flush_para(); flush_list(); fence = []
            continue
        if not line.strip():
            flush_para(); flush_list()
            continue
        h = re.match(r'^(#{1,4})\s+(.*)$', line)
        if h:
            flush_para(); flush_list()
            lvl = min(len(h.group(1)) + 2, 6)     # page owns <h1>; posts start at <h3>
            out.append(f'<h{lvl}>{_inline(h.group(2))}</h{lvl}>')
            continue
        if re.match(r'^(-{3,}|\*{3,})$', line.strip()):
            flush_para(); flush_list(); out.append('<hr>')
            continue
        ul = re.match(r'^\s*[-*+]\s+(.*)$', line)
        ol = re.match(r'^\s*\d+[.)]\s+(.*)$', line)
        if ul or ol:
            flush_para()
            want = 'ul' if ul else 'ol'
            if lst != want:
                flush_list(); out.append(f'<{want}>'); lst = want
            out.append('<li>' + _inline((ul or ol).group(1)) + '</li>')
            continue
        q = re.match(r'^\s*>\s?(.*)$', line)
        if q:
            flush_para(); flush_list()
            out.append('<blockquote>' + _inline(q.group(1)) + '</blockquote>')
            continue
        para.append(line.strip())
    if fence is not None:
        raise ContentError(f'{where}: unclosed ``` code fence')
    flush_para(); flush_list()
    return '\n'.join(out)


def md_to_text(md):
    """Plain text for summaries, RSS descriptions and the manifest."""
    t = re.sub(r'`([^`]+)`', r'\1', md)
    t = re.sub(r'\*\*([^*]+)\*\*', r'\1', t)
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)
    t = re.sub(r'^\s*([-*+]|\d+[.)])\s+', '', t, flags=re.M)
    t = re.sub(r'^#{1,6}\s+', '', t, flags=re.M)
    return re.sub(r'\s+', ' ', t).strip()


# --- links the author never has to write --------------------------------------

# The branch the generated blob/ links point at. Each estate builds links to
# ITSELF (--ref): the qa preview must not link dev for files that only exist on
# qa yet — the live-QA link check caught exactly that (three 404s, 7 Aug).
REF = 'dev'


def issue_links(numbers, problems, where):
    """Resolve `issues: 035` to the file wherever it lives NOW. Hand-written issue
    URLs went stale the moment an issue moved open/ -> done/ (and one shipped
    pointing at a branch that keeps moving)."""
    links = []
    for n in numbers:
        if not re.match(r'^\d{3}$', n):
            problems.append(f'{where}: issue must be a three-digit number, got {n!r}')
            continue
        hits = glob.glob(os.path.join(ROOT, 'issues', '*', f'{n}-*.md'))
        if not hits:
            problems.append(f'{where}: issue {n} does not exist under issues/')
            continue
        rel = os.path.relpath(sorted(hits)[0], ROOT)
        links.append({'n': n, 'href': f'{REPO_URL}/blob/{REF}/{rel}',
                      'label': f'issue {n} — the full write-up'})
    return links


def compare_link(version, ordered_versions):
    """The diff against the previous RELEASED version — derived from the version
    list, so it can never point at a moving branch."""
    if version not in ordered_versions:
        return None
    i = ordered_versions.index(version)
    if i + 1 >= len(ordered_versions):
        return {'href': f'{REPO_URL}/releases/tag/{version}', 'label': f'{version} — the first tag'}
    prev = ordered_versions[i + 1]
    return {'href': f'{REPO_URL}/compare/{prev}...{version}', 'label': f'{version} — what changed'}


# --- loading -------------------------------------------------------------------

def load_versions(problems):
    versions = []
    for path in sorted(glob.glob(os.path.join(ROOT, 'content', 'versions', '*.md'))):
        where = os.path.relpath(path, ROOT)
        try:
            meta, body = parse_frontmatter(open(path, encoding='utf-8').read(), where)
        except ContentError as e:
            problems.append(str(e)); continue
        v = meta.get('version') or os.path.basename(path)[:-3]
        if not VERSION_RE.match(v):
            problems.append(f'{where}: version must look like v1.2.3, got {v!r}'); continue
        if not DATE_RE.match(meta.get('date', '')):
            problems.append(f'{where}: date must be YYYY-MM-DD'); continue
        if not meta.get('title'):
            problems.append(f'{where}: title is required'); continue
        changes = [md_to_text(m.group(1)) for m in re.finditer(r'^\s*[-*+]\s+(.*)$', body, re.M)]
        if not changes:
            problems.append(f'{where}: needs at least one `- ` bullet describing the release')
        versions.append({'v': v, 'date': meta['date'], 'title': meta['title'], 'changes': changes})
    versions.sort(key=lambda x: (x['date'], [int(n) for n in x['v'][1:].split('.')]), reverse=True)
    return versions


def load_videos(problems):
    """One file per video. No YouTube API call, no scraping: an agent that has the
    URL has everything, and a video with a missing/duff id fails the build."""
    videos, seen = [], {}
    for path in sorted(glob.glob(os.path.join(ROOT, 'content', 'videos', '*.md'))):
        where = os.path.relpath(path, ROOT)
        try:
            meta, body = parse_frontmatter(open(path, encoding='utf-8').read(), where)
        except ContentError as e:
            problems.append(str(e)); continue

        status = meta.get('status', 'published')
        if status not in ('published', 'draft'):
            problems.append(f'{where}: status must be published or draft, got {status!r}')
        if not meta.get('title'):
            problems.append(f'{where}: title is required'); continue
        if not DATE_RE.match(meta.get('date', '')):
            problems.append(f'{where}: date is required and must be YYYY-MM-DD'); continue
        kind = meta.get('kind', 'demo')
        if kind not in VIDEO_KINDS:
            problems.append(f'{where}: kind must be one of {", ".join(VIDEO_KINDS)}, got {kind!r}')
        yt = meta.get('youtube_id', '')
        # A draft may be written before the video is uploaded; a PUBLISHED video
        # without a real id would render a dead player, so that fails the build.
        if status == 'published' and not YT_ID_RE.match(yt):
            problems.append(f'{where}: published videos need a valid 11-character youtube_id '
                            f'(got {yt!r}) — keep it `status: draft` until you have one')
        dur = meta.get('duration', '')
        if dur and not re.match(r'^\d{1,2}:\d{2}$', dur):
            problems.append(f'{where}: duration must look like 2:23, got {dur!r}')

        slug = meta.get('slug') or os.path.basename(path)[:-3]
        slug = re.sub(r'[^a-z0-9-]+', '-', slug.lower()).strip('-')
        if slug in seen:
            problems.append(f'{where}: slug {slug!r} already used by {seen[slug]}')
        seen[slug] = where

        d = datetime.date.fromisoformat(meta['date'])
        videos.append({
            'slug': slug, 'title': meta['title'], 'date': meta['date'],
            'date_label': f'{d.day} {MONTHS[d.month - 1]} {d.year}',
            'kind': kind, 'youtube_id': yt, 'duration': dur,
            'version': meta.get('version'), 'tags': meta.get('tags', []),
            'status': status, 'blurb': md_to_text(body)[:400],
            'html': md_to_html(body, where), 'source': where,
        })
    # same-day videos tie on date; the version they demo restores publishing order
    videos.sort(key=lambda v: (v['date'], [int(n) for n in (v['version'] or 'v0.0.0')[1:].split('.')]),
                reverse=True)
    return videos


def load_posts(ordered_versions, problems):
    posts, seen = [], {}
    for path in sorted(glob.glob(os.path.join(ROOT, 'content', 'updates', '**', '*.md'), recursive=True)):
        where = os.path.relpath(path, ROOT)
        try:
            meta, body = parse_frontmatter(open(path, encoding='utf-8').read(), where)
        except ContentError as e:
            problems.append(str(e)); continue

        status = meta.get('status', 'published')
        if status not in ('published', 'draft'):
            problems.append(f'{where}: status must be published or draft, got {status!r}')
        if not meta.get('title'):
            problems.append(f'{where}: title is required'); continue
        if not DATE_RE.match(meta.get('date', '')):
            problems.append(f'{where}: date is required and must be YYYY-MM-DD'); continue
        version = meta.get('version')
        if version and not VERSION_RE.match(version):
            problems.append(f'{where}: version must look like v1.2.3, got {version!r}')
            version = None
        if not body.strip():
            problems.append(f'{where}: the post has no body'); continue

        # the path must agree with the frontmatter date — the folder IS the date
        parts = os.path.relpath(path, os.path.join(ROOT, 'content', 'updates')).split(os.sep)
        if len(parts) >= 4 and '-'.join(parts[:3]) != meta['date']:
            problems.append(f"{where}: folder date {'/'.join(parts[:3])} does not match `date: {meta['date']}`")

        slug = meta.get('slug') or re.sub(r'^v[\d.]+__update__', '', os.path.basename(path)[:-3])
        slug = re.sub(r'[^a-z0-9-]+', '-', slug.lower()).strip('-')
        if slug in seen:
            problems.append(f'{where}: slug {slug!r} already used by {seen[slug]}')
        seen[slug] = where

        try:
            body_html = md_to_html(body, where)
        except ContentError as e:
            problems.append(str(e)); continue

        d = datetime.date.fromisoformat(meta['date'])
        links = []
        if version:
            cl = compare_link(version, ordered_versions)
            if cl:
                links.append(cl)
            else:
                problems.append(f'{where}: version {version} has no content/versions/{version}.md')
        links += issue_links(meta.get('issues', []), problems, where)
        if meta.get('link_href'):
            links.append({'href': meta['link_href'], 'label': meta.get('link_label', 'more')})

        posts.append({
            'slug': slug, 'title': meta['title'], 'date': meta['date'],
            'date_label': f'{d.day} {MONTHS[d.month - 1]} {d.year}',
            'version': version, 'issues': meta.get('issues', []), 'tags': meta.get('tags', []),
            'status': status, 'summary': md_to_text(body)[:400],
            'links': links, 'html': body_html, 'source': where,
        })
    posts.sort(key=lambda p: (p['date'], p['version'] or ''), reverse=True)
    return posts


# --- rendering -----------------------------------------------------------------

def render_index(posts, template):
    articles = []
    for p in posts:
        meta = f"<span>{html.escape(p['date_label'], quote=False)}</span>"
        for l in p['links']:
            meta += f" · <a class=\"v\" href=\"{html.escape(l['href'], quote=True)}\">{html.escape(l['label'], quote=False)}</a>"
        tags = ''.join(f'<span class="tag">{html.escape(t, quote=False)}</span>' for t in p['tags'])
        articles.append(
            f'    <article id="{p["slug"]}">\n'
            f'      <h2><a class="permalink" href="#{p["slug"]}">{html.escape(p["title"], quote=False)}</a></h2>\n'
            f'      <div class="meta">{meta}{tags}</div>\n'
            f'{p["html"]}\n'
            f'    </article>')
    return template.replace('<!--POSTS-->', '\n\n'.join(articles))


# Grouped by editorial role rather than by YouTube's format: a "short" here is a
# quick look at one thing, whatever the platform calls it.
KIND_LABEL = {'short': 'Quick looks', 'demo': 'Full demos', 'explainer': 'How it works, explained'}
KIND_BLURB = {
    'short': 'A couple of minutes each — one feature, working, start to finish.',
    'demo': 'The product doing the whole job, end to end.',
    'explainer': 'Why it is built this way, what it costs, and what happens to your audio.',
}


def render_videos(videos, template):
    """Cards, not embeds. Nothing is requested from YouTube until a visitor
    presses play — this product's promise is that it does not track you, and a
    page full of auto-loading third-party players would quietly break it."""
    sections = []
    for kind in VIDEO_KINDS:
        group = [v for v in videos if v['kind'] == kind]
        if not group:
            continue
        cards = []
        for v in group:
            dur = f'<span class="dur">{html.escape(v["duration"], quote=False)}</span>' if v['duration'] else ''
            ver = (f' · <a href="/versions/">{html.escape(v["version"], quote=False)}</a>'
                   if v['version'] else '')
            cards.append(
                f'      <article class="vid" id="{v["slug"]}">\n'
                f'        <button class="vid__play" type="button" data-yt="{v["youtube_id"]}"\n'
                f'                aria-label="Play: {html.escape(v["title"], quote=True)}">\n'
                f'          <span class="vid__tri">▶</span>{dur}\n'
                f'        </button>\n'
                f'        <div class="vid__body">\n'
                f'          <h3>{html.escape(v["title"], quote=False)}</h3>\n'
                f'          <div class="vid__meta">{html.escape(v["date_label"], quote=False)}{ver}</div>\n'
                f'{v["html"]}\n'
                f'        </div>\n'
                f'      </article>')
        sections.append(
            f'    <section class="vid-group">\n'
            f'      <h2>{KIND_LABEL[kind]}</h2>\n'
            f'      <p class="vid-group__blurb">{KIND_BLURB[kind]}</p>\n'
            f'      <div class="vid-grid">\n' + '\n'.join(cards) + '\n      </div>\n    </section>')
    if not sections:
        body = ('    <p class="vid-empty">No videos are published yet — the first demos land here '
                'shortly. In the meantime, <a href="/app/">the app itself</a> is the quickest look.</p>')
    else:
        note = ('    <p class="vid-note">Every card below is a still page until you click it. '
                'Pressing play loads the player from <code>youtube-nocookie.com</code> — at that '
                'point YouTube sees you, as it would on any site. Until then, nothing leaves '
                'this page.</p>')
        body = note + '\n\n' + '\n\n'.join(sections)
    return template.replace('<!--VIDEOS-->', body)


def render_feed(posts):
    items = []
    for p in posts[:20]:
        d = datetime.date.fromisoformat(p['date'])
        pub = (f'{DAYS_RFC[d.weekday()]}, {d.day:02d} {MONTHS_RFC[d.month - 1]} {d.year} '
               f'09:00:00 +0000')
        link = f'https://voicedebrief.ai/updates/#{p["slug"]}'
        items.append(
            '    <item>\n'
            f'      <title>{html.escape(p["title"])}</title>\n'
            f'      <link>{link}</link>\n'
            f'      <guid isPermaLink="false">{p["slug"]}</guid>\n'
            f'      <pubDate>{pub}</pubDate>\n'
            f'      <description>{html.escape(p["summary"])}</description>\n'
            '    </item>')
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<rss version="2.0">\n  <channel>\n'
            '    <title>VoiceDebrief — Updates</title>\n'
            '    <link>https://voicedebrief.ai/updates/</link>\n'
            '    <description>What shipped, and what it means for you.</description>\n'
            + '\n'.join(items) + '\n  </channel>\n</rss>\n')


# --- main ----------------------------------------------------------------------

def build(out_dir, check_only=False):
    problems = []
    versions = load_versions(problems)
    ordered = [v['v'] for v in versions]
    posts = load_posts(ordered, problems)
    videos = load_videos(problems)

    if problems:
        print('Content problems — nothing was written:', file=sys.stderr)
        for p in problems:
            print(f'  ✗ {p}', file=sys.stderr)
        return 1

    published = [p for p in posts if p['status'] == 'published']
    live_videos = [v for v in videos if v['status'] == 'published']
    drafts = (len(posts) - len(published)) + (len(videos) - len(live_videos))

    if check_only:
        print(f'content ok: {len(published)} published post(s), {len(live_videos)} video(s)'
              f'{f", {drafts} draft(s)" if drafts else ""}, {len(versions)} version(s)')
        return 0

    tpl = lambda name: open(os.path.join(ROOT, 'scripts', 'templates', name), encoding='utf-8').read()

    updates_dir = os.path.join(out_dir, 'updates')
    versions_dir = os.path.join(out_dir, 'versions')
    videos_dir = os.path.join(out_dir, 'videos')
    for d in (updates_dir, versions_dir, videos_dir):
        os.makedirs(d, exist_ok=True)

    with open(os.path.join(videos_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(render_videos(live_videos, tpl('videos.html')))
    with open(os.path.join(videos_dir, 'videos.json'), 'w', encoding='utf-8') as f:
        json.dump({'generated_from': 'content/videos/ — do not edit by hand',
                   'count': len(live_videos),
                   'videos': [{k: v for k, v in vid.items() if k != 'html'} for vid in live_videos]},
                  f, indent=2, ensure_ascii=False)
        f.write('\n')

    with open(os.path.join(updates_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(render_index(published, tpl('updates.html')))
    with open(os.path.join(updates_dir, 'updates.json'), 'w', encoding='utf-8') as f:
        json.dump({'generated_from': 'content/updates/ — do not edit by hand',
                   'count': len(published),
                   'posts': [{k: v for k, v in p.items() if k != 'html'} for p in published]},
                  f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(os.path.join(updates_dir, 'feed.xml'), 'w', encoding='utf-8') as f:
        f.write(render_feed(published))
    with open(os.path.join(versions_dir, 'versions.json'), 'w', encoding='utf-8') as f:
        json.dump({'note': 'Generated from content/versions/ by scripts/build_content.py — do not edit by hand.',
                   'versions': versions}, f, indent=2, ensure_ascii=False)
        f.write('\n')

    # sitemap.xml — the pages a crawler should know about, lastmod derived from
    # the content (never from the clock: same content, same sitemap). URLs always
    # name the production domain; the QA estate is noindexed at deploy anyway.
    site = 'https://voicedebrief.ai'
    content_mod = max([p['date'] for p in published] + [v['date'] for v in versions])
    pages = [('/', content_mod), ('/app/', None), ('/updates/', max(p['date'] for p in published)),
             ('/versions/', max(v['date'] for v in versions)),
             ('/videos/', max((v['date'] for v in live_videos), default=None)),
             # Nobody can use the product without a key, so the page that gets
             # them one is a landing page in its own right, not an appendix.
             ('/openrouter-key/', None), ('/user-guide/', None),
             ('/library/', None), ('/tools/', None), ('/tools/extract-audio/', None), ('/tools/text-to-speech/', None),
             ('/engineering/', None), ('/engineering/pipeline/', None),
             ('/engineering/testing/', None), ('/engineering/docs/', None),
             ('/engineering/security/', None), ('/engineering/team/', None),
             ('/engineering/concepts/', None), ('/engineering/wasm/', None)]
    with open(os.path.join(out_dir, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for path, lastmod in pages:
            f.write(f'  <url><loc>{site}{path}</loc>'
                    + (f'<lastmod>{lastmod}</lastmod>' if lastmod else '') + '</url>\n')
        f.write('</urlset>\n')

    print(f'built {len(published)} post(s), {len(live_videos)} video(s)'
          f'{f" (+{drafts} draft held back)" if drafts else ""} and {len(versions)} version(s) '
          f'into {os.path.relpath(out_dir, ROOT)}/')
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=os.path.join(ROOT, 'website'), help='site directory to write into')
    ap.add_argument('--check', action='store_true', help='validate content, write nothing')
    ap.add_argument('--ref', default='dev',
                    help='branch the generated blob/ links point at — the branch being built (dev|qa)')
    args = ap.parse_args()
    global REF
    REF = args.ref
    try:
        return build(args.out, check_only=args.check)
    except ContentError as e:
        print(f'✗ {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
