# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\assets\css\archive.css'
s = io.open(p, encoding='utf-8').read()
s = s.replace(""".audio-bar {
  position: fixed; right: 16px; bottom: 16px; z-index: 50;""",
""".audio-bar {
  position: fixed; left: 16px; right: auto; bottom: 16px; z-index: 50;""")
s = s.replace("  .audio-bar { right: 8px; bottom: 64px; }",
              "  .audio-bar { left: auto; right: 8px; bottom: 68px; }")
io.open(p,'w',encoding='utf-8').write(s)
print('ok')
