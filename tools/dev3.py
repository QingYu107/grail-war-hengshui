# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
u = u.replace("""      else if (m[1] === 'assign') { assign(); screen('screen-assign'); }
      else { E.create(preset); screen('screen-game'); renderSlot(); }""",
"""      else if (m[1] === 'assign') { assign(); screen('screen-assign'); }
      else if (m[1] === 'ending') {
        E.create(preset);
        var st0 = E.state();
        st0.s.beast = 2; st0.s.exposure = 4; st0.s.flags.wishWin = true;
        st0.log = ['你许愿：让我赢。'];
        finish();
      } else { E.create(preset); screen('screen-game'); renderSlot(); }""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
