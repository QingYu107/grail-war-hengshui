# -*- coding: utf-8 -*-
"""github.com 的 443 不通，但 api.github.com 通 —— 用 Git Data API 把工作区推上去。"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = r'E:\dsh-workspace\grail-war'
TOKEN_FILE = os.path.join(ROOT, 'tools', '.gh_token')
GIT = os.path.join(os.environ['USERPROFILE'], '.dsh', 'tools', 'git', 'cmd', 'git.exe')
OWNER = 'QingYu107'
REPO = 'grail-war-hengshui'
BRANCH = 'main'
MSG = '圣杯战争·衡水：单人网页游戏初版'


def token():
    with open(TOKEN_FILE, encoding='utf-8') as f:
        return f.read().strip()


def api(path, method='GET', payload=None, tok=None, timeout=120):
    url = 'https://api.github.com' + path
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('Authorization', 'Bearer ' + tok)
    req.add_header('User-Agent', 'dsh-publish')
    if data:
        req.add_header('Content-Type', 'application/json')
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                body = r.read().decode()
                return r.status, (json.loads(body) if body.strip() else {})
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            if e.code in (422, 409, 404, 403):
                return e.code, body[:400]
            time.sleep(2 + attempt * 3)
        except Exception:
            time.sleep(2 + attempt * 3)
    raise RuntimeError('api failed: ' + path)


def ls_files():
    p = subprocess.run([GIT, 'ls-files', '-z'], cwd=ROOT, capture_output=True)
    return [x.decode('utf-8') for x in p.stdout.split(b'\0') if x]


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
    tok = token()
    files = ls_files()
    print('files %d' % len(files))
    total = sum(os.path.getsize(os.path.join(ROOT, f)) for f in files)
    print('total %.1f MB' % (total / 1048576.0))

    shas = {}
    done = [0, 0]
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = [ex.submit(blob, tok, f) for f in files]
        for fu in futs:
            path, sha, size = fu.result()
            shas[path] = sha
            done[0] += 1
            done[1] += size
            if done[0] % 20 == 0:
                print('  %d/%d  %.1f MB' % (done[0], len(files), done[1] / 1048576.0))

    st_ref, ref = api('/repos/%s/%s/git/ref/heads/%s' % (OWNER, REPO, BRANCH), 'GET', None, tok)
    parent = ref['object']['sha'] if st_ref == 200 and isinstance(ref, dict) and ref.get('object') else None
    print('parent ' + str(parent))

    tree = [{'path': p, 'mode': '100644', 'type': 'blob', 'sha': s} for p, s in shas.items()]
    st, res = api('/repos/%s/%s/git/trees' % (OWNER, REPO), 'POST', {'tree': tree}, tok)
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
