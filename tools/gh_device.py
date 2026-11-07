# -*- coding: utf-8 -*-
"""GitHub device flow 登录：生成一次性 code，等你在浏览器里授权，然后拿 token。"""
import json
import sys
import time
import urllib.parse
import urllib.request

CLIENT_ID = '178c6fc778ccc68e1d6a'   # GitHub CLI 的公开 client id
SCOPE = 'repo'
STATE = r'E:\dsh-workspace\grail-war\tools\.gh_device.json'


def post(url, data, headers=None, retries=4):
    body = urllib.parse.urlencode(data).encode()
    last = None
    for i in range(retries):
        req = urllib.request.Request(url, data=body, method='POST')
        req.add_header('Accept', 'application/json')
        req.add_header('Content-Type', 'application/x-www-form-urlencoded')
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read().decode())
        except Exception as e:      # 网络抖动：退避重试
            last = e
            time.sleep(3 + i * 3)
    raise last


def start():
    d = post('https://github.com/login/device/code', {
        'client_id': CLIENT_ID,
        'scope': SCOPE,
    })
    if 'device_code' not in d:
        print('FAIL', json.dumps(d, ensure_ascii=False))
        return 1
    with open(STATE, 'w', encoding='utf-8') as f:
        json.dump(d, f)
    print('CODE ' + d['user_code'])
    print('URL  ' + d['verification_uri'])
    print('EXPIRES ' + str(d.get('expires_in', 900)))
    return 0


def poll():
    with open(STATE, encoding='utf-8') as f:
        d = json.load(f)
    deadline = time.time() + d.get('expires_in', 900)
    interval = d.get('interval', 5)
    while time.time() < deadline:
        r = post('https://github.com/login/oauth/access_token', {
            'client_id': CLIENT_ID,
            'device_code': d['device_code'],
            'grant_type': 'urn:ietf:params:oauth:grant-type:device_code',
        })
        if 'access_token' in r:
            tok = r['access_token']
            with open(r'E:\dsh-workspace\grail-war\tools\.gh_token', 'w', encoding='utf-8') as f:
                f.write(tok)
            print('TOKEN_OK')
            return 0
        err = r.get('error')
        if err == 'authorization_pending':
            time.sleep(interval)
            continue
        if err == 'slow_down':
            interval += 3
            time.sleep(interval)
            continue
        print('FAIL ' + json.dumps(r, ensure_ascii=False))
        return 1
    print('FAIL expired')
    return 1


if __name__ == '__main__':
    sys.exit(start() if sys.argv[1:2] == ['start'] else poll())
