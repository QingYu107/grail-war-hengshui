# -*- coding: utf-8 -*-
import io, re
p = r'E:\dsh-workspace\grail-war\assets\css\archive.css'
s = io.open(p, encoding='utf-8').read()
s = s.replace("\n/* TEST */\n@media (max-width: 960px){ #screen-game .paper { width: 320px !important; } }\n", "")
s = s.replace("""

/* ---------- 宽度兜底 v2 ---------- */
.screen { overflow-x: clip; }
.paper { min-width: 0 !important; box-sizing: border-box !important; }
@media (max-width: 960px) {
  .paper { width: auto !important; max-width: none !important; margin: 0 !important; }
}
""", "")
s = s.replace("""

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
""", """
/* ---------- 宽度约束（保持块级流，避免长词撑破） ---------- */
html, body { width: 100%; }
.paper { min-width: 0; }
#story-root, .game-grid > *, .assign-grid > * { min-width: 0; }
.hud { max-width: 100%; }
.scene-img img, .portrait img, .side-portrait img { max-width: 100%; }
""")
io.open(p,'w',encoding='utf-8').write(s)
print('cleaned', '/* TEST */' in s)
