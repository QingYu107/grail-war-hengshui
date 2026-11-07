# -*- coding: utf-8 -*-
import io, re
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
start = u.find("    if ((location.hash||'').indexOf('debugw') >= 0) {")
if start >= 0:
    end = u.find("    // 预览钩子", start)
    # 删除 debug 块：从 if 到下一个已知片段
    nxt = u.find("    var qs = (location.hash", start)
    u = u[:start] + u[nxt:]
io.open(p,'w',encoding='utf-8').write(u)
print('debug removed:', 'debugw' not in u)
