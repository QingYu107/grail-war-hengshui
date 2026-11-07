# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()

old = """    root.innerHTML =
      '<div class="scene-head"><h2>' + esc(D.title) + '</h2><span class="meta">' + esc(slot.time) + '</span></div>' +
      '<div class="scene-place">' + esc(slot.place) + '</div>' +
      (st.s.slot === 0 ? '<div class="card" style="margin-bottom:20px"><h3>今日校务日志</h3><p style="margin:0;font-size:13px;line-height:1.95;color:var(--ink-2)">' + esc(log) + '</p></div>' : '') +
      (D.scene ? '<div class="scene-img"><img src="' + D.scene + '" alt="" onerror="this.parentNode.style.display=\\'none\\'"></div>' : '') +
      '<div class="prose">' + paras(slot.intro.map(esc), true) + '</div>' +
      '<div class="choices" id="opts" style="margin-top:26px"></div>';

    var opts = $('opts');
    slot.options.forEach(function (o, idx) {"""
new = """    root.innerHTML =
      '<div class="scene-head"><h2>' + esc(D.title) + '</h2><span class="meta">' + esc(slot.time) + '</span></div>' +
      '<div class="scene-place">' + esc(slot.place) + '</div>' +
      (st.s.slot === 0 ? '<div class="card" style="margin-bottom:20px"><h3>今日校务日志</h3><p style="margin:0;font-size:13px;line-height:1.95;color:var(--ink-2)">' + esc(log) + '</p></div>' : '') +
      ((slot.img || D.scene) ? '<div class="scene-img"><img src="' + (slot.img || D.scene) + '" alt="" onerror="this.parentNode.style.display=\\'none\\'"></div>' : '') +
      '<div class="prose" id="prose-box"></div>' +
      '<div class="choices" id="opts" style="margin-top:26px;visibility:hidden"></div>';

    var opts = $('opts');
    var allOpts = slot.options.slice();
    var bondBook = window.GRAIL_BONDS || {};
    var bond = bondBook[st.servantId];
    if (bond && bond.nodes && bond.nodes[slot.id] && !st.s.flags['bonddone_' + slot.id]) {
      var bo = JSON.parse(JSON.stringify(bond.nodes[slot.id]));
      bo.__bond = true;
      allOpts.push(bo);
    }
    allOpts.forEach(function (o, idx) {"""
assert old in u, 'A'
u = u.replace(old, new)

old2 = """      if (!chk.ok) b.disabled = true;
      b.onclick = function () { choose(o); };
      opts.appendChild(b);
    });
    renderDossier();
    setTimeout(settle, 760);
    E.save();
  }"""
new2 = """      if (!chk.ok) b.disabled = true;
      if (o.__bond) b.classList.add('bond');
      b.onclick = function () { choose(o); };
      opts.appendChild(b);
    });

    var probe = stingerFor(slot, st);
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
    root.addEventListener('pointerdown', function () { if (typing) window.GrailAVG.skip(); }, { passive: true });

    renderDossier();
    setTimeout(settle, 900);
    E.save();
  }"""
assert old2 in u, 'B'
u = u.replace(old2, new2)

u = u.replace("    $('game-day').textContent = st.s.day === 0 ? '序 章 · 第零夜' : 'DAY ' + st.s.day + ' / 7';",
"""    $('game-day').textContent = st.s.day === 0 ? '序 章 · 第零夜' : 'DAY ' + st.s.day + ' / 7';
    document.body.classList.toggle('final-day', st.s.day === 7);""")

io.open(p,'w',encoding='utf-8').write(u)
print('ok')
