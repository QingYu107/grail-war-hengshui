# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
u = u.replace("""    if ((location.hash||'').indexOf('debugw') >= 0) { setTimeout(function(){ document.title = 'DEBUGW ' + window.innerWidth + ' scroll=' + document.documentElement.scrollWidth + ' body=' + document.body.scrollWidth; }, 400); }""",
"""    if ((location.hash||'').indexOf('debugw') >= 0) {
      setTimeout(function () {
        var pp = document.querySelector('.paper');
        var pr = document.querySelector('.prose');
        var b = document.createElement('div');
        b.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#000;color:#0f0;font:12px monospace;padding:6px;white-space:pre';
        b.textContent = 'win=' + window.innerWidth + ' dpr=' + window.devicePixelRatio +
          '\\ndoc=' + document.documentElement.scrollWidth + ' body=' + document.body.scrollWidth +
          '\\npaper=' + (pp ? pp.offsetWidth : -1) + ' prose=' + (pr ? pr.clientWidth : -1);
        document.body.appendChild(b);
      }, 500);
    }""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
