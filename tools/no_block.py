# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()

u = u.replace("""      '<div class="choices" id="opts" style="margin-top:26px;visibility:hidden"></div>';""",
"""      '<div class="choices" id="opts" style="margin-top:26px"></div>';""")

old = """    var probe = stingerFor(slot, st);
    var introTexts = slot.intro.map(esc);
    var typing = false;
    var reveal = function () { opts.style.visibility = 'visible'; };
    var startType = function () {
      typing = true;
      window.GrailAVG.typeParagraphs($('prose-box'), introTexts, { speed: 13 }, function () {
        typing = false; reveal();
      });
    };
    if (probe) {
      st.s.flags[probe.key] = true;
      E.save();
      window.GrailAVG.stinger(probe.cfg.kind, probe.data, startType);
    } else {
      startType();
    }
    root.addEventListener('pointerdown', function () { if (typing) window.GrailAVG.skip(); }, { passive: true });"""
new = """    var probe = stingerFor(slot, st);
    var introTexts = slot.intro.map(esc);
    var AVG = window.GrailAVG || {
      typeParagraphs: function (box, texts, o, done) {
        box.innerHTML = texts.map(function (t) { return '<p>' + t + '</p>'; }).join('');
        if (done) done();
      },
      skip: function () {},
      stinger: function (k, d, done) { if (done) done(); }
    };
    var startType = function () {
      try {
        AVG.typeParagraphs($('prose-box'), introTexts, { speed: 13 }, function () {});
      } catch (e) {
        $('prose-box').innerHTML = introTexts.map(function (t) { return '<p>' + t + '</p>'; }).join('');
      }
    };
    if (probe) {
      st.s.flags[probe.key] = true;
      E.save();
      AVG.stinger(probe.cfg.kind, probe.data, startType);
    } else {
      startType();
    }
    root.addEventListener('pointerdown', function () { try { AVG.skip(); } catch (e) {} }, { passive: true });"""
assert old in u, 'reveal block missing'
u = u.replace(old, new)
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
