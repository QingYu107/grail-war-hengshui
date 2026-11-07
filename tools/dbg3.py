# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
old = "        b.textContent = 'win=' + window.innerWidth + ' dpr=' + window.devicePixelRatio +"
new = """        var wide = [];
        var nodes = document.querySelectorAll('#screen-game *');
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          if (n.offsetWidth > 350) wide.push((n.tagName.toLowerCase()) + '.' + String(n.className || '').split(' ')[0] + '=' + n.offsetWidth);
        }
        b.textContent = 'WIDE ' + wide.slice(0, 14).join(' | ') + '\\n' + 'win=' + window.innerWidth + ' dpr=' + window.devicePixelRatio +"""
if old in u and 'WIDE' not in u:
    u = u.replace(old, new)
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
