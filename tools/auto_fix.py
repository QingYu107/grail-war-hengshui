# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
u = u.replace("""    } else if (m[1] === 'auto') {
      E.create(preset); screen('screen-game');
      var steps = 0;""",
"""    } else if (m[1] === 'auto') {
      E.create(preset); screen('screen-game'); renderSlot();
      var steps = 0;""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
