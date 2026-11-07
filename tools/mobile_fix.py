# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\assets\css\archive.css'
s = io.open(p, encoding='utf-8').read()
s = s.replace("html, body {\n  margin: 0; padding: 0; min-height: 100%;",
              "html, body {\n  margin: 0; padding: 0; min-height: 100%; max-width: 100%; overflow-x: hidden;")
s = s.replace("#app { position: relative; z-index: 1; padding: 32px 18px 64px; }",
              "#app { position: relative; z-index: 1; padding: 32px 18px 64px; width: 100%; overflow-x: hidden; }")
s = s.replace("  max-width: 1080px;\n  margin: 0 auto;", "  width: 100%;\n  max-width: 1080px;\n  margin: 0 auto;")
s = s.replace(".prose { font-size:", ".prose, .prose p { overflow-wrap: anywhere; word-break: break-word; }\n.prose { font-size:")
s = s.replace(".hud .cell {\n  flex: 1 1 auto; min-width: 84px;", ".hud .cell {\n  flex: 1 1 30%; min-width: 0;")
s = s.replace(".hud .cell { min-width: 50%; }", ".hud .cell { flex: 1 1 46%; }")
s = s.replace(".hud .cell { min-width: 33%; border-bottom: 1px solid var(--line); }",
              ".hud .cell { flex: 1 1 30%; border-bottom: 1px solid var(--line); }")
s = s.replace(".game-grid { display: grid; grid-template-columns: minmax(0,1fr) 330px; gap: 30px; align-items: start; }",
              ".game-grid { display: grid; grid-template-columns: minmax(0,1fr) 330px; gap: 30px; align-items: start; }\n.game-grid > * { min-width: 0; }")
s = s.replace(".assign-grid { display: grid; grid-template-columns: 340px 1fr; gap: 34px; align-items: start; }",
              ".assign-grid { display: grid; grid-template-columns: 340px 1fr; gap: 34px; align-items: start; }\n.assign-grid > * { min-width: 0; }")
io.open(p,'w',encoding='utf-8').write(s)
print('css ok')

p2 = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p2, encoding='utf-8').read()
u = u.replace("'<p style=\"margin:0;font-size:13px;line-height:1.95;color:var(--ink-2)\">' + esc(log) + '</p>",
              "'<p style=\"margin:0;font-size:13px;line-height:1.95;color:var(--ink-2)\">' + esc(String(log).replace(/^校务日志：/, '')) + '</p>")
io.open(p2,'w',encoding='utf-8').write(u)
print('ui ok')
