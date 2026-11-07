# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\avg.js'
s = io.open(p, encoding='utf-8').read()
anchor = """  function stinger(kind, data, done) {"""
helper = """  function settleFx() {
    var els = document.querySelectorAll('.fx-layer .t1, .fx-layer .t2, .fx-layer .t3, .fx-layer .msg, .fx-layer .line, .fx-layer .col span, .fx-layer .card');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var op = window.getComputedStyle ? parseFloat(window.getComputedStyle(el).opacity) : 1;
      if (!op) { el.style.animation = 'none'; el.style.opacity = '1'; el.style.transform = 'none'; }
    }
  }

  function stinger(kind, data, done) {"""
if 'settleFx' not in s:
    s = s.replace(anchor, helper)
    s = s.replace("""    try {
      if (window.GrailAudio) {""",
"""    setTimeout(settleFx, 700);
    setTimeout(settleFx, 1600);
    try {
      if (window.GrailAudio) {""")
io.open(p,'w',encoding='utf-8').write(s)
print('ok')
