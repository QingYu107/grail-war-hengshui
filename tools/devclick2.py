# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
u = u.replace("""      if (m[1] === 'click') {
        setTimeout(function () { var b = document.getElementById('btn-start'); if (b) b.click(); }, 250);""",
"""      if (m[1] === 'click') {
        setTimeout(function () { var b = document.getElementById('btn-start'); if (b) b.click(); }, 250);
        setTimeout(function () { var b = document.getElementById('btn-start'); if (b && b.textContent.indexOf('再点') >= 0) b.click(); }, 500);""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
