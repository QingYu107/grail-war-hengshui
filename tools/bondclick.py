# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
if "m[1] === 'bondclick'" not in u:
    u = u.replace("""    } else if (m[1] === 'bond') {""",
"""    } else if (m[1] === 'bondclick') {
      E.create(preset); screen('screen-game');
      var sb2 = E.state(); sb2.s.day = 2; sb2.s.slot = 2; renderSlot();
      setTimeout(function () {
        var cs = document.querySelectorAll('#opts .choice');
        if (cs.length) cs[cs.length - 1].click();
      }, 500);
    } else if (m[1] === 'bond') {""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
