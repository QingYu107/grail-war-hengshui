# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\avg.js'
s = io.open(p, encoding='utf-8').read()
s = s.replace("'background:' + (cls === 'fx-summon' ? '#f4ecda' : '#0b0c0a') + ';';",
              "'background:' + (cls === 'fx-summon' ? '#f4ecda' : '#0b0c0a') + ';opacity:1 !important;animation:none !important;' + 'transition:opacity .45s ease;';")
io.open(p,'w',encoding='utf-8').write(s)

p2 = r'E:\dsh-workspace\grail-war\assets\css\avg.css'
c = io.open(p2, encoding='utf-8').read()
c = c.replace("""  background: #0a0b0a;
  animation: fxIn .28s ease both;
}""", """  background: #0a0b0a;
  opacity: 1;
}""")
c = c.replace(".fx-layer.leaving { animation: fxOut .45s ease both; }", ".fx-layer.leaving { opacity: 0; transition: opacity .45s ease; }")
io.open(p2,'w',encoding='utf-8').write(c)
print('ok')
