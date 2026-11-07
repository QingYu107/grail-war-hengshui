# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\engine.js'
e = io.open(p, encoding='utf-8').read()
for th in ['2', '3']:
    pass
e = e.replace("return (map[keyword] || []).some(function (t) { return (pe[t] || 0) >= 2; });",
              "return (map[keyword] || []).some(function (t) { return (pe[t] || 0) >= 3; });")
io.open(p,'w',encoding='utf-8').write(e)
print('ok')
