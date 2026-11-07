# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\assets\css\archive.css'
s = io.open(p, encoding='utf-8').read()
s += """

/* ---------- 宽度兜底 v2 ---------- */
.screen { overflow-x: clip; }
.paper { min-width: 0 !important; box-sizing: border-box !important; }
@media (max-width: 960px) {
  .paper { width: auto !important; max-width: none !important; margin: 0 !important; }
}
"""
io.open(p,'w',encoding='utf-8').write(s)
print('ok')
