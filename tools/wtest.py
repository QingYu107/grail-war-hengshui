# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\assets\css\archive.css'
s = io.open(p, encoding='utf-8').read()
s += "\n/* TEST */\n@media (max-width: 960px){ #screen-game .paper { width: 320px !important; } }\n"
io.open(p,'w',encoding='utf-8').write(s)
