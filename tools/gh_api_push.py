# -*- coding: utf-8 -*-
"""增量推送：只把这次改动的文件做成 blob，其余用 base_tree 继承远端。
   原来的全量版本在 205 个文件 / 49 MB 时会撞上 GitHub 的 tree 超时（422）。
   用法：python tools/gh_api_push.py --inc     （默认就是增量）
        python tools/gh_api_push.py --full      （全量，文件少时用）"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = r'E:\dsh-workspace\grail-war'
TOKEN_FILE = os.path.join(ROOT, 'tools', '.gh_token')
GIT = os.path.join(os.environ['USERPROFILE'], '.dsh', 'tools', 'git', 'cmd', 'git.exe')
OWNER = 'QingYu107'
REPO = 'grail-war-hengshui'
BRANCH = 'main'
MSG = '剧情扩容 / 共通线 / SAN 分档 / 故障演出 / 设置与关系页'


def token():
    with open(TOKEN_FILE, encoding='utf-8') as f:
        return f.read().strip()


def api(path, method='GET', payload=None, tok=None, timeout=180):
    url = 'https://api.github.com' + path
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('Authorization', 'Bearer ' + tok)
    req.add_header('User-Agent', 'dsh-publish')
    if data:
        req.add_header('Content-Type', 'application/json')
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                body = r.read().decode()
                return r.status, (json.loads(body) if body.strip() else {})
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            if e.code in (422, 409, 404, 403):
                return e.code, body[:400]
            last = '%s %s' % (e.code, body[:200])
            time.sleep(2 + attempt * 3)
        except Exception as ex:          # noqa: BLE001
            last = str(ex)
            time.sleep(2 + attempt * 3)
    raise RuntimeError('api failed: %s (%s)' % (path, last))


def git(*args):
    p = subprocess.run([GIT] + list(args), cwd=ROOT, capture_output=True)
    return p.stdout.decode('utf-8', 'replace')


def staged_changes():
    """返回 [(status, path)]，status 为 A/M/D。用暂存区对比 HEAD。"""
    out = git('diff', '--cached', '--name-status')
    rows = []
    for line in out.splitlines():
        parts = line.split('\t')
        if len(parts) >= 2:
            rows.append((parts[0][:1], parts[1]))
    return rows


def blob(tok, path):
    full = os.path.join(ROOT, path)
    with open(full, 'rb') as f:
        raw = f.read()
    st, res = api('/repos/%s/%s/git/blobs' % (OWNER, REPO), 'POST',
                  {'content': base64.b64encode(raw).decode(), 'encoding': 'base64'}, tok)
    if st not in (200, 201):
        raise RuntimeError('blob fail %s: %s' % (path, res))
    return path, res['sha'], len(raw)


def main():
    mode = 'inc'
    if '--full' in sys.argv:
        mode = 'full'
    tok = token()

    st_ref, ref = api('/repos/%s/%s/git/ref/heads/%s' % (OWNER, REPO, BRANCH), 'GET', None, tok)
    parent = ref['object']['sha'] if st_ref == 200 and isinstance(ref, dict) and ref.get('object') else None
    print('parent ' + str(parent))

    base_tree = None
    if parent:
        st_c, commit = api('/repos/%s/%s/git/commits/%s' % (OWNER, REPO, parent), 'GET', None, tok)
        if st_c == 200 and commit.get('tree'):
            base_tree = commit['tree']['sha']
            print('base_tree ' + base_tree)

    if mode == 'full':
        files = [f for f in git('ls-files', '-z').split('\0') if f and os.path.exists(os.path.join(ROOT, f))]
        changes = [('M', f) for f in files]
    else:
        changes = staged_changes()
        if not changes:
            print('没有暂存改动，先 git add。')
            return 1
        # 二进制文件也要传，但删掉的只给 sha=null
        changes = [(s, p) for s, p in changes if s in ('A', 'M', 'D')]

    print('待推送 %d 个文件（%s）' % (len(changes), mode))
    todo = [(s, p) for s, p in changes if s != 'D' and os.path.exists(os.path.join(ROOT, p))]
    total = sum(os.path.getsize(os.path.join(ROOT, p)) for _, p in todo)
    print('其中内容 %d 个 / %.2f MB' % (len(todo), total / 1048576.0))

    shas = {}
    done = [0, 0]
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = [ex.submit(blob, tok, p) for _, p in todo]
        for fu in futs:
            path, sha, size = fu.result()
            shas[path] = sha
            done[0] += 1
            done[1] += size
            print('  %d/%d  %.2f MB  %s' % (done[0], len(todo), done[1] / 1048576.0, path))

    tree = []
    for status, p in changes:
        if status == 'D':
            tree.append({'path': p.replace('\\', '/'), 'mode': '100644', 'type': 'blob', 'sha': None})
        else:
            tree.append({'path': p.replace('\\', '/'), 'mode': '100644', 'type': 'blob', 'sha': shas[p]})

    payload = {'tree': tree}
    if base_tree:
        payload['base_tree'] = base_tree
    st, res = api('/repos/%s/%s/git/trees' % (OWNER, REPO), 'POST', payload, tok)
    if st not in (200, 201):
        print('TREE FAIL', res)
        return 1
    tree_sha = res['sha']
    print('tree ' + tree_sha)

    st, res = api('/repos/%s/%s/git/commits' % (OWNER, REPO), 'POST',
                  {'message': MSG, 'tree': tree_sha, 'parents': ([parent] if parent else [])}, tok)
    if st not in (200, 201):
        print('COMMIT FAIL', res)
        return 1
    commit_sha = res['sha']
    print('commit ' + commit_sha)

    st, res = api('/repos/%s/%s/git/refs/heads/%s' % (OWNER, REPO, BRANCH), 'PATCH',
                  {'sha': commit_sha, 'force': True}, tok)
    if st not in (200, 201):
        st, res = api('/repos/%s/%s/git/refs' % (OWNER, REPO), 'POST',
                      {'ref': 'refs/heads/' + BRANCH, 'sha': commit_sha}, tok)
    print('ref %s %s' % (st, res if isinstance(res, str) else res.get('ref', '')))
    print('URL https://github.com/%s/%s' % (OWNER, REPO))
    return 0


if __name__ == '__main__':
    sys.exit(main())
