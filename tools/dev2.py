# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
s = io.open(p, encoding='utf-8').read()
s = s.replace("var qs = location.search || '';\n    var m = qs.match(/dev=(\\w+)/);",
              "var qs = (location.hash || '') + (location.search || '');\n    var m = qs.match(/dev=(\\w+)/);")
io.open(p,'w',encoding='utf-8').write(s)
print('ok', 'hash' in s)
