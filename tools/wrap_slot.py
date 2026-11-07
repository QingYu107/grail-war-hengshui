# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
if 'function renderSlotInner' not in u:
    u = u.replace("  function renderSlot() {", """  var __slotWrapped = true;
  function renderSlotInner() {""", 1)
    u = u.replace("  function choose(o) {", """  function renderSlot() {
    try { renderSlotInner(); } catch (e) { fatal(e); }
  }

  function choose(o) {""", 1)
io.open(p,'w',encoding='utf-8').write(u)
print('ok', 'renderSlotInner' in u)
