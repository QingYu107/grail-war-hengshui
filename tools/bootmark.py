# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
u = u.replace("""  function boot() {
    initTitle(); initAudioBar(); initDrawer();""",
"""  function boot() {
    window.__BOOT = [];
    try { initTitle(); window.__BOOT.push('title'); } catch (e) { window.__BOOT.push('title ERR:' + e.message); }
    try { initAudioBar(); window.__BOOT.push('audio'); } catch (e) { window.__BOOT.push('audio ERR:' + e.message); }
    try { initDrawer(); window.__BOOT.push('drawer'); } catch (e) { window.__BOOT.push('drawer ERR:' + e.message); }""")
u = u.replace("mark('found=' + !!b + ' hasOnclick=' + !!(b && b.onclick) + ' disabled=' + (b && b.disabled));",
              "mark('found=' + !!b + ' hasOnclick=' + !!(b && b.onclick) + ' boot=' + (window.__BOOT || []).join(','));")
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
