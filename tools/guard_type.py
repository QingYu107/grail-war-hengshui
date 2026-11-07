# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
old = """    var startType = function () {
      try {
        AVG.typeParagraphs($('prose-box'), introTexts, { speed: 13 }, function () {});
      } catch (e) {
        $('prose-box').innerHTML = introTexts.map(function (t) { return '<p>' + t + '</p>'; }).join('');
      }
    };"""
new = """    var proseBox = $('prose-box');
    var startType = function () {
      if (!proseBox || !proseBox.isConnected) return;
      try {
        AVG.typeParagraphs(proseBox, introTexts, { speed: 13 }, function () {});
      } catch (e) {
        if (proseBox && proseBox.isConnected) {
          proseBox.innerHTML = introTexts.map(function (t) { return '<p>' + t + '</p>'; }).join('');
        }
      }
    };"""
assert old in u
u = u.replace(old, new)
io.open(p,'w',encoding='utf-8').write(u)

p2 = r'E:\dsh-workspace\grail-war\js\avg.js'
a = io.open(p2, encoding='utf-8').read()
a = a.replace("""  function typeParagraphs(container, texts, opts, done) {
    opts = opts || {};""",
"""  function typeParagraphs(container, texts, opts, done) {
    if (!container || !container.isConnected) { if (done) done(); return; }
    opts = opts || {};""")
a = a.replace("""      typingTimer = setInterval(function () {
        if (skipping) {""",
"""      typingTimer = setInterval(function () {
        if (!p.isConnected) { clearInterval(typingTimer); return; }
        if (skipping) {""")
io.open(p2,'w',encoding='utf-8').write(a)
print('ok')
