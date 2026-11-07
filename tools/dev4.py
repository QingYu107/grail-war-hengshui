# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
u = u.replace("""      } else { E.create(preset); screen('screen-game'); renderSlot(); }""",
"""      } else if (m[1] === 'beat') {
        E.create(preset); screen('screen-game'); renderSlot();
        setTimeout(function () {
          var c = document.querySelector('#opts .choice');
          if (c) c.click();
        }, 120);
      } else { E.create(preset); screen('screen-game'); renderSlot(); }""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
