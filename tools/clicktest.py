# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
u = u.replace("""      if (m[1] === 'click') {
        setTimeout(function () { var b = document.getElementById('btn-start'); if (b) b.click(); }, 250);
        setTimeout(function () { var b = document.getElementById('btn-start'); if (b && b.textContent.indexOf('再点') >= 0) b.click(); }, 500);""",
"""      if (m[1] === 'click') {
        var mark = function (t) {
          var d = document.createElement('div');
          d.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;background:#000;color:#0f0;font:12px monospace;padding:4px';
          d.textContent = 'CLICKTEST ' + t; document.body.appendChild(d);
        };
        setTimeout(function () {
          var b = document.getElementById('btn-start');
          mark('found=' + !!b + ' hasOnclick=' + !!(b && b.onclick) + ' disabled=' + (b && b.disabled));
          if (b && b.onclick) b.onclick();
        }, 300);""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
