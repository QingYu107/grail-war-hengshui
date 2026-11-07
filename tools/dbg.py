# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
if 'DEBUGW' not in u:
    u = u.replace("  function boot() {", "  function boot() {\n    if ((location.hash||'').indexOf('debugw') >= 0) { setTimeout(function(){ document.title = 'DEBUGW ' + window.innerWidth + ' scroll=' + document.documentElement.scrollWidth + ' body=' + document.body.scrollWidth; }, 400); }")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
