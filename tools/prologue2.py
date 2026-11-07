# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\index.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('<script src="js/data/story_a.js"></script>',
              '<script src="js/data/story_prologue.js"></script>\n<script src="js/data/story_a.js"></script>')
io.open(p,'w',encoding='utf-8').write(s)

p2 = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p2, encoding='utf-8').read()
u = u.replace("$('game-day').textContent = 'DAY ' + st.s.day + ' / 7';",
              "$('game-day').textContent = st.s.day === 0 ? '序 章 · 第零夜' : 'DAY ' + st.s.day + ' / 7';")
io.open(p2,'w',encoding='utf-8').write(u)
print('ok')
