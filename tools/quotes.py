# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
anchor = """      '<h5>扮演提示</h5>' + sv.play.map(function (p) { return '<div class="li">' + esc(p) + '</div>'; }).join('') +
      '</div>';"""
new = """      '<h5>扮演提示</h5>' + sv.play.map(function (p) { return '<div class="li">' + esc(p) + '</div>'; }).join('') +
      (function () {
        var qs = (CODEX.servantQuotes || []).filter(function (q) { return q.role === sv.cls; })[0];
        if (!qs) return '';
        return '<h5>语录 · 备用弹药</h5>' + qs.lines.map(function (l) { return '<div class="li">' + esc(l) + '</div>'; }).join('');
      })() +
      '</div>';"""
if anchor in u:
    u = u.replace(anchor, new)
else:
    print('ANCHOR MISS')
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
