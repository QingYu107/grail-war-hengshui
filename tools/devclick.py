# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
if "dev==='click'" not in u and "m[1] === 'click'" not in u:
    u = u.replace("      if (m[1] === 'quiz') { screen('screen-quiz'); renderQuiz(); }",
"""      if (m[1] === 'click') {
        setTimeout(function () { var b = document.getElementById('btn-start'); if (b) b.click(); }, 250);
      } else if (m[1] === 'quiz') { screen('screen-quiz'); renderQuiz(); }""")
io.open(p,'w',encoding='utf-8').write(u)
print('ok', "m[1] === 'click'" in u)
