# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
if "m[1] === 'auto'" not in u:
    u = u.replace("""    } else if (m[1] === 'bond') {""",
"""    } else if (m[1] === 'auto') {
      E.create(preset); screen('screen-game');
      var steps = 0;
      var tick = setInterval(function () {
        steps++;
        if (steps > 40) { clearInterval(tick); return; }
        var c = document.querySelector('#opts .choice:not([disabled])');
        var nb = document.querySelector('#beat-actions .btn--solid');
        var wish = document.querySelector('#wish-list .choice');
        if (wish) { wish.click(); return; }
        if (c) { c.click(); return; }
        if (nb) { nb.click(); return; }
      }, 420);
    } else if (m[1] === 'bond') {""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
