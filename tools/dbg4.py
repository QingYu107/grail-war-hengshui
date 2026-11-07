# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
old = "        b.textContent = 'WIDE ' + wide.slice(0, 14).join(' | ') + '\\n' + 'win=' + window.innerWidth + ' dpr=' + window.devicePixelRatio +"
new = """        function rw(sel) { var e = document.querySelector(sel); if (!e) return sel + '=none'; var r = e.getBoundingClientRect(); return sel + '=' + Math.round(r.width) + '@' + Math.round(r.left); }
        b.textContent = rw('html') + ' ' + rw('body') + ' ' + rw('#app') + ' ' + rw('#screen-game') + ' ' + rw('#screen-game .paper') + ' ' + rw('.game-grid') + ' ' + rw('#story-root') + '\\n' + 'WIDE ' + wide.slice(0, 8).join(' | ') + '\\n' + 'win=' + window.innerWidth + ' dpr=' + window.devicePixelRatio +"""
if 'rw(' not in u:
    u = u.replace(old, new)
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
