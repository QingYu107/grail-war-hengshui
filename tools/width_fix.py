# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\assets\css\archive.css'
s = io.open(p, encoding='utf-8').read()
s += """

/* ---------- 宽度兜底（防止子元素撑破视口） ---------- */
html, body { width: 100%; max-width: 100%; }
#app { width: 100% !important; max-width: 100vw; padding-left: 0 !important; padding-right: 0 !important; }
.paper { width: 100% !important; max-width: min(1080px, 100%) !important; margin: 0 auto !important; }
#screen-game .paper { max-width: min(1220px, 100%) !important; }
#story-root, .game-grid, .hud, .doc-head, .doc-foot, .prose, .card, .choices, .assignment { max-width: 100%; }
.hud { overflow: hidden; }
.scene-img img, .portrait img, .side-portrait img { max-width: 100%; }
@media (max-width: 960px) {
  .paper { padding: 26px 18px 48px !important; }
  #story-root, .game-grid > * { min-width: 0 !important; width: 100% !important; }
}
"""
io.open(p,'w',encoding='utf-8').write(s)
print('ok')
