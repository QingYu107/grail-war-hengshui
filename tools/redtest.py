# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\avg.js'
s = io.open(p, encoding='utf-8').read()
s = s.replace("(cls === 'fx-summon' ? '#f4ecda' : '#0b0c0a')", "'#ff0000'")
io.open(p,'w',encoding='utf-8').write(s)
print('red test')
