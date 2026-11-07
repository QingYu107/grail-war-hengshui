# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\assets\css\archive.css'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""@keyframes screenIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}""",
"""@keyframes screenIn {
  from { transform: translateY(10px); filter: brightness(1.06); }
  to { transform: none; filter: none; }
}""")
s = s.replace(".reveal { opacity: 0; transform: translateY(6px); animation: rv .5s ease forwards; }",
              ".reveal { opacity: 0; transform: translateY(6px); animation: rv .5s ease forwards; }\n.reveal.settled { opacity: 1 !important; transform: none !important; animation: none !important; }")
io.open(p,'w',encoding='utf-8').write(s)

p2 = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p2, encoding='utf-8').read()
u = u.replace("""  function screen(id) {""",
"""  function settle() {
    var nodes = document.querySelectorAll('.reveal');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('settled');
  }
  function screen(id) {""")
u = u.replace("""    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  var toastTimer = null;""",
"""    void (document.body && document.body.offsetWidth);
    setTimeout(settle, 760);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  var toastTimer = null;""")
# 每次渲染后兜底
u = u.replace("    renderDossier();\n    E.save();\n  }\n\n  function choose(o)", "    renderDossier();\n    setTimeout(settle, 760);\n    E.save();\n  }\n\n  function choose(o)")
u = u.replace("    renderHud();\n    renderDossier();\n    window.scrollTo({ top: 0, behavior: 'smooth' });", "    renderHud();\n    renderDossier();\n    setTimeout(settle, 700);\n    window.scrollTo({ top: 0, behavior: 'smooth' });")
u = u.replace("    audio(e.tone === 'warm' ? 'ending_warm' : 'ending_dark');\n    screen('screen-ending');", "    audio(e.tone === 'warm' ? 'ending_warm' : 'ending_dark');\n    screen('screen-ending');\n    setTimeout(settle, 700);")
io.open(p2,'w',encoding='utf-8').write(u)
print('ok', u.count('settle'))
