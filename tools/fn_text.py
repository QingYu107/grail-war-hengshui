# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
u = u.replace("""    if (o.check) {
      roll = E.roll(o.check.skill, o.check.bonus || 0);
      var br = roll.ok ? o.ok : o.fail;
      paras_ = br.text; fx = br.fx;
    } else {
      paras_ = o.text; fx = o.fx;
    }""",
"""    if (o.check) {
      roll = E.roll(o.check.skill, o.check.bonus || 0);
      var br = roll.ok ? o.ok : o.fail;
      paras_ = typeof br.text === 'function' ? br.text(E.state()) : br.text; fx = br.fx;
    } else {
      paras_ = typeof o.text === 'function' ? o.text(E.state()) : o.text; fx = o.fx;
    }""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
