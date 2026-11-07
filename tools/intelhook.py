# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
if "m[1] === 'intel'" not in u:
    u = u.replace("""    } else if (m[1] === 'bond') {""",
"""    } else if (m[1] === 'intel') {
      E.create(preset); screen('screen-game');
      var si = E.state();
      si.s.clues = { saber: 0, archer: 1, lancer: 2, rider: 3, caster: 4, assassin: 5, berserker: 2, ruler: 3 };
      ui.tab = 'intel';
      renderSlot();
    } else if (m[1] === 'bond') {""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
