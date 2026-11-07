# -*- coding: utf-8 -*-
"""用 device flow 拿到的 token：建仓库 → 配 remote → 推送 main。"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

ROOT = r'E:\dsh-workspace\grail-war'
TOKEN_FILE = os.path.join(ROOT, 'tools', '.gh_token')
GIT = os.path.join(os.environ['USERPROFILE'], '.dsh', 'tools', 'git', 'cmd', 'git.exe')
REPO = sys.argv[1] if len(sys.argv) > 1 else 'grail-war-hengshui'
DESC = '圣杯战争 · 衡水：凌晨四点的圣杯 —— 档案纸风格的单人网页文字游戏（COC 7th 同人改编）'


def api(path, method='GET', payload=None, token=None):
    url = 'https://api.github.com' + path
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('Authorization', 'Bearer ' + token)
    req.add_header('User-Agent', 'dsh-publish')
    if data:
        req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, timeout=45) as r:
        body = r.read().decode()
        return r.status, (json.loads(body) if body.strip() else {})


def git(*args, token=None, extra=None):
    cmd = [GIT] + list(args)
    env = dict(os.environ)
    env['GIT_TERMINAL_PROMPT'] = '0'
    if extra:
        cmd = [GIT, '-c', extra] + list(args)
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, env=env)
    if p.returncode != 0:
        print('GIT FAIL', args[:2], p.stderr.strip()[:400])
    return p.returncode, (p.stdout + p.stderr).strip()


def main():
    with open(TOKEN_FILE, encoding='utf-8') as f:
        token = f.read().strip()
    if not token:
        print('NO_TOKEN')
        return 1

    st, me = api('/user', token=token)
    login = me.get('login')
    print('USER ' + str(login))

    st, repo = api('/repos/%s/%s' % (login, REPO), token=token) if True else (0, {})
    if st == 200:
        print('REPO exists ' + repo.get('html_url', ''))
    else:
        st, repo = api('/user/repos', 'POST', {'name': REPO, 'description': DESC, 'private': False, 'has_issues': True}, token)
        print('REPO created ' + str(repo.get('html_url', st)))

    url = repo.get('html_url') or ('https://github.com/%s/%s' % (login, REPO))
    clone = 'https://github.com/%s/%s.git' % (login, REPO)

    git('remote', 'remove', 'origin')
    git('remote', 'add', 'origin', clone)

    auth = base64.b64encode(('x-access-token:' + token).encode()).decode()
    header = 'http.extraheader=AUTHORIZATION: basic ' + auth

    for attempt in range(3):
        code, out = git('push', '-u', 'origin', 'main', extra=header)
        if code == 0:
            print('PUSH OK')
            print('URL ' + url)
            return 0
        print('push retry %d' % (attempt + 1))
        time.sleep(4)
    print('PUSH FAILED')
    print('URL ' + url)
    return 1


if __name__ == '__main__':
    sys.exit(main())
