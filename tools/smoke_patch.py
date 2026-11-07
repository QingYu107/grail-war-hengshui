# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\tools\smoke.js'
s = io.open(p, encoding='utf-8').read()
s = s.replace("require('../js/data/story_a.js');", "require('../js/data/story_prologue.js');\nrequire('../js/data/story_a.js');")
s = s.replace("var ids = Object.keys(G.STORY).filter(function (k) { return /^[1-7]$/.test(k); })",
              "var ids = Object.keys(G.STORY).filter(function (k) { return /^[0-7]$/.test(k); })")
s = s.replace("if (ids.join(',') !== '1,2,3,4,5,6,7')", "if (ids.join(',') !== '0,1,2,3,4,5,6,7')")
io.open(p,'w',encoding='utf-8').write(s)
print('ok')
