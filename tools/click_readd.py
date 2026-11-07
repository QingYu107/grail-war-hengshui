# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
u = u.replace("""    if (m[1] === 'quiz') { screen('screen-quiz'); renderQuiz(); }""",
"""    if (m[1] === 'click') {
      setTimeout(function () { var b = document.getElementById('btn-start'); if (b) b.click(); }, 400);
    } else if (m[1] === 'quiz') { screen('screen-quiz'); renderQuiz(); }""")
io.open(p,'w',encoding='utf-8').write(u)

p2 = r'E:\dsh-workspace\grail-war\assets\css\archive.css'
s = io.open(p2, encoding='utf-8').read()
s = s.replace("#app { position: relative; z-index: 1; padding: 32px 18px 64px; width: 100%; overflow-x: hidden; }",
              "#app { position: relative; z-index: 1; padding: 32px 18px 104px; width: 100%; overflow-x: hidden; }")
io.open(p2,'w',encoding='utf-8').write(s)
print('ok')
