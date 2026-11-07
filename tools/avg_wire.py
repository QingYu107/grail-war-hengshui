# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\index.html'
s = io.open(p, encoding='utf-8').read()
if 'avg.css' not in s:
    s = s.replace('<link rel="stylesheet" href="assets/css/archive.css">',
                  '<link rel="stylesheet" href="assets/css/archive.css">\n<link rel="stylesheet" href="assets/css/avg.css">')
if 'js/avg.js' not in s:
    s = s.replace('<script src="js/engine.js"></script>',
                  '<script src="js/avg.js"></script>\n<script src="js/data/bonds.js"></script>\n<script src="js/engine.js"></script>')
io.open(p,'w',encoding='utf-8').write(s)
print('index ok')

p2 = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p2, encoding='utf-8').read()

# 1) 插入 stinger 表
if 'var STINGER' not in u:
    u = u.replace("  /* ---------- 主循环 ---------- */",
"""  /* ---------- 关键节点演出 ---------- */
  var STINGER = {
    p2: { kind: 'broadcast', data: { lines: ['圣杯战争，第七次，开始。', '参赛者七名。', '……孙笑川。'] } },
    p3: { kind: 'summon', data: {} },
    d3d: { kind: 'roll', data: {} },
    d5c: { kind: 'impact', data: { title: '施工事故', sub: '无人员伤亡 · 校门东侧 · 正在调查' } },
    d6b: { kind: 'glitch', data: { msg: '走 廊 正 在 变 成 一 张 表' } },
    d7c: { kind: 'beast', data: { title: '攀比', sub: '你是第几？' } }
  };
  function stingerFor(slot, st) {
    var cfg = STINGER[slot.id];
    if (!cfg) return null;
    var key = 'fx_' + slot.id;
    if (st.s.flags[key]) return null;
    var data = {};
    Object.keys(cfg.data || {}).forEach(function (k) { data[k] = cfg.data[k]; });
    if (cfg.kind === 'summon') {
      var sv = G.servant(st.servantId);
      data.cls = sv.cls; data.name = sv.name;
    }
    if (cfg.kind === 'roll') {
      var pool = ['王梓', '李昊', '陈子豪', '刘思远', '赵一鸣', '周佳琪', '孙梦洁', '吴倩', '郑小北', '冯天乐', '蒋雨欣', '韩子墨', '曹宇', '谢欣然'];
      var arr = [];
      for (var i = 0; i < 12; i++) arr.push((i + 1) + '　' + pool[(i * 3 + 2) % pool.length]);
      data.names = arr;
    }
    return { cfg: cfg, data: data, key: key, st: st };
  }

  /* ---------- 主循环 ---------- */""")

# 2) 渲染：打字机 + 演出 + 羁绊选项
old = """    var root = $('story-root');
    root.innerHTML =
      '<div class="scene-head"><h2>' + esc(D.title) + '</h2><span class="meta">' + esc(slot.time) + '</span></div>' +
      '<div class="scene-place">' + esc(slot.place) + '</div>' +
      (st.s.slot === 0 ? '<div class="card" style="margin-bottom:20px"><h3>今日校务日志</h3><p style="margin:0;font-size:13px;line-height:1.95;color:var(--ink-2)">' + esc(String(log).replace(/^校务日志：/, '')) + '</p></div>' : '') +
      (D.scene ? '<div class="scene-img"><img src="' + D.scene + '" alt="" onerror="this.parentNode.style.display=\\'none\\'"></div>' : '') +
      '<div class="prose">' + paras(slot.intro.map(esc), true) + '</div>' +
      '<div class="choices" id="opts" style="margin-top:26px"></div>';

    var opts = $('opts');
    slot.options.forEach(function (o, idx) {"""
new = """    var root = $('story-root');
    var sceneImg = slot.img || D.scene;
    root.innerHTML =
      '<div class="scene-head"><h2>' + esc(D.title) + '</h2><span class="meta">' + esc(slot.time) + '</span></div>' +
      '<div class="scene-place">' + esc(slot.place) + '</div>' +
      (st.s.slot === 0 ? '<div class="card" style="margin-bottom:20px"><h3>今日校务日志</h3><p style="margin:0;font-size:13px;line-height:1.95;color:var(--ink-2)">' + esc(String(log).replace(/^校务日志：/, '')) + '</p></div>' : '') +
      (sceneImg ? '<div class="scene-img"><img src="' + sceneImg + '" alt="" onerror="this.parentNode.style.display=\\'none\\'"></div>' : '') +
      '<div class="prose" id="prose-box"></div>' +
      '<div class="choices" id="opts" style="margin-top:26px;visibility:hidden"></div>';

    var opts = $('opts');
    var allOpts = slot.options.slice();
    // 专属羁绊支线：挂到 d2c / d5c / d6c 三个时段
    var bonds = window.GRAIL_BONDS || {};
    var bond = bonds[st.servantId];
    if (bond && bond.nodes && bond.nodes[slot.id] && !st.s.flags['bonddone_' + slot.id]) {
      var bo = bond.nodes[slot.id];
      bo.__bond = true;
      allOpts.push(bo);
    }
    allOpts.forEach(function (o, idx) {"""
assert old in u
u = u.replace(old, new)

old2 = """      b.onclick = function () { choose(o); };
      opts.appendChild(b);
    });
    renderDossier();
    setTimeout(settle, 760);
    E.save();
  }"""
new2 = """      if (o.__bond) b.classList.add('bond');
      b.onclick = function () { choose(o); };
      opts.appendChild(b);
    });

    // 打字机 + 关键节点演出
    var probe = stingerFor(slot, st);
    var introTexts = slot.intro.map(esc);
    var reveal = function () { opts.style.visibility = 'visible'; };
    var typing = false;
    var startType = function () {
      typing = true;
      window.GrailAVG.typeParagraphs($('prose-box'), introTexts, { speed: 14 }, function () { typing = false; reveal(); });
    };
    if (probe) {
      st.s.flags[probe.key] = true;
      E.save();
      window.GrailAVG.stinger(probe.cfg.kind, probe.data, startType);
    } else {
      startType();
    }
    root.addEventListener('pointerdown', function () {
      if (typing) { window.GrailAVG.skip(); }
    }, { passive: true });

    renderDossier();
    setTimeout(settle, 760);
    E.save();
  }"""
assert old2 in u
u = u.replace(old2, new2)

# 3) 决战日样式
u = u.replace("    $('game-day').textContent = st.s.day === 0 ? '序 章 · 第零夜' : 'DAY ' + st.s.day + ' / 7';",
"""    $('game-day').textContent = st.s.day === 0 ? '序 章 · 第零夜' : 'DAY ' + st.s.day + ' / 7';
    document.body.classList.toggle('final-day', st.s.day === 7);""")

io.open(p2,'w',encoding='utf-8').write(u)
print('ui ok')
