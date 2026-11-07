# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
if "m[1] === 'bond'" in u and "s.slot = 2" in u:
    u = u.replace("""    } else if (m[1] === 'bond') {
      E.create(preset); screen('screen-game');
      E.state().s.slot = 2; renderSlot();""",
"""    } else if (m[1] === 'bond') {
      E.create(preset); screen('screen-game');
      var sb = E.state(); sb.s.day = 2; sb.s.slot = 2; renderSlot();""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok', "s.day = 2" in u)
