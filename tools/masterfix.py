# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\engine.js'
s = io.open(p, encoding='utf-8').read()
s = s.replace("if (m.servant === best) hit += 5.0;", "if (m.servant === best) hit += 7.0;")
io.open(p,'w',encoding='utf-8').write(s)
print('ok')
