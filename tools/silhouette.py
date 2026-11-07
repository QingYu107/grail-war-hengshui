# -*- coding: utf-8 -*-
import io

# ---------- CSS ----------
p = r'E:\dsh-workspace\grail-war\assets\css\avg.css'
c = io.open(p, encoding='utf-8').read()
if '.sil-0' not in c:
    c += """

/* ---------- 未解明从者：剪影 → 凝实 ---------- */
.intel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.intel-card { border: 1px solid var(--line); background: rgba(255,255,255,.16); overflow: hidden; }
.intel-card .ip { position: relative; aspect-ratio: 3 / 4; background: #12100d; overflow: hidden; }
.intel-card .ip img { width: 100%; height: 100%; object-fit: cover; display: block; transition: filter .6s ease, opacity .6s ease; }
.intel-card .in { padding: 7px 8px 8px; font-family: var(--hei); font-size: 10.5px; letter-spacing: .08em; color: var(--ink-2); }
.intel-card .in b { display: block; font-family: var(--serif); font-size: 13px; letter-spacing: .04em; color: var(--ink); margin-bottom: 2px; }
.intel-card .in i { font-style: normal; color: var(--red); font-family: var(--mono); }
.intel-card .ip::after {
  content: attr(data-mark); position: absolute; right: 6px; top: 6px;
  font-family: var(--mono); font-size: 9px; letter-spacing: .12em; color: var(--red);
  border: 1px solid var(--red); padding: 1px 4px; opacity: .85; background: rgba(0,0,0,.28);
}

/* 情报等级 → 可见度 */
.sil-0 { filter: brightness(0) contrast(3) blur(0.4px); opacity: .92; }
.sil-1 { filter: brightness(.10) contrast(2.4) blur(2px) grayscale(1); opacity: .95; }
.sil-2 { filter: brightness(.28) contrast(1.9) blur(2.4px) grayscale(1); }
.sil-3 { filter: brightness(.62) contrast(1.5) blur(1.4px) grayscale(.85); }
.sil-4 { filter: brightness(.9) contrast(1.2) blur(.5px) grayscale(.5); }
.sil-5 { filter: none; }

/* 拿到情报的那一下：从剪影里“凝”出来 */
@keyframes condense {
  0% { filter: brightness(0) contrast(3) blur(6px); opacity: .4; transform: scale(1.04); }
  55% { filter: brightness(.7) contrast(1.4) blur(1px); opacity: 1; }
  100% { transform: none; }
}
.intel-card.just-revealed .ip img { animation: condense 1.1s ease both; }

/* 场景里的目击卡 */
.sighting {
  display: flex; gap: 14px; align-items: center; margin: 18px 0 4px;
  border: 1px solid var(--line); border-left: 3px solid var(--red);
  background: rgba(255,255,255,.18); padding: 10px 12px;
}
.sighting .thumb { width: 74px; height: 98px; flex: 0 0 74px; overflow: hidden; border: 1px solid var(--ink); background: #12100d; }
.sighting .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sighting .txt { font-family: var(--hei); font-size: 11px; line-height: 1.8; letter-spacing: .06em; color: var(--ink-2); }
.sighting .txt b { display: block; font-family: var(--serif); font-size: 15px; letter-spacing: .06em; color: var(--ink); margin-bottom: 2px; }
.sighting .txt em { font-style: normal; color: var(--red); font-family: var(--mono); letter-spacing: .12em; }
"""
    io.open(p, 'w', encoding='utf-8').write(c)
    print('css ok')

# ---------- UI ----------
u_path = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(u_path, encoding='utf-8').read()

# 1) 情报面板改成卡片网格
old_intel = """    // 情报
    var intel = '';
    ['saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker', 'ruler'].forEach(function (id) {
      var s2 = G.servant(id), lv = st.s.clues[id] || 0;
      intel += '<div class="clue-row ' + (lv ? '' : 'unknown') + '"><span class="nm">' + s2.cls + '　' + (lv >= 3 ? esc(s2.name) : '？？？') + '</span>' +
        '<span class="lv">' + (lv ? E.roman(lv) : '—') + '</span></div>';
    });
    intel += '<h5>你的职介线</h5><p>' + esc(r.name) + '：' + esc(r.perk) + '</p>' +
      '<h5>在场御主</h5><p>' + st.s.alive + ' / 7　盟友 ' + st.s.allies + '</p>';"""
new_intel = """    // 情报
    var intel = '<div class="intel-grid">';
    ['saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker', 'ruler'].forEach(function (id) {
      var s2 = G.servant(id), lv = st.s.clues[id] || 0;
      if (id === st.servantId) lv = 5;
      var known = lv >= 3;
      var just = st.s.flags['reveal_' + id] ? '' : '';
      intel += '<div class="intel-card' + just + '">' +
        '<div class="ip" data-mark="' + (lv ? E.roman(lv) : '？') + '">' +
        '<img class="sil-' + Math.min(lv, 5) + '" src="' + s2.portrait + '" alt="" onerror="this.style.display=\\'none\\'"></div>' +
        '<div class="in"><b>' + (known ? esc(s2.name) : (id === st.servantId ? esc(s2.name) : '？？？')) + '</b>' +
        s2.cls + (id === st.servantId ? ' · 你的从者' : '') + '</div></div>';
    });
    intel += '</div>';
    intel += '<h5>你的职介线</h5><p>' + esc(r.name) + '：' + esc(r.perk) + '</p>' +
      '<h5>在场御主</h5><p>' + st.s.alive + ' / 7　盟友 ' + st.s.allies + '</p>' +
      '<p style="color:var(--ink-3)">情报等级 Ⅰ 传闻 / Ⅱ 外观 / Ⅲ 真名 / Ⅳ 弱点 / Ⅴ 宝具。等级越高，那张脸越清楚。</p>';"""
if old_intel in u:
    u = u.replace(old_intel, new_intel)
    print('intel grid ok')
else:
    print('intel MISS')

# 2) 目击卡：选项里带 clue 时，在结果下方展示剪影/画像
u = u.replace("""    if (b.notes && b.notes.length) {""",
"""    if (b.clue) {
      var sv2 = G.servant(b.clue.id);
      var lv2 = Math.min(b.clue.lv, 5);
      html += '<div class="sighting"><div class="thumb"><img class="sil-' + lv2 + '" src="' + sv2.portrait + '" alt="" onerror="this.parentNode.style.display=\\'none\\'"></div>' +
        '<div class="txt">目击记录 · ' + sv2.cls + '<b>' + (b.clue.lv >= 3 ? esc(sv2.name) : '未解明') + '</b>' +
        '情报等级 <em>' + E.roman(b.clue.lv) + '</em>　' + (b.clue.lv >= 3 ? '真名推定完成' : '轮廓仍在雾里') + '</div></div>';
    }
    if (b.notes && b.notes.length) {""")

# 3) resolve 里把 clue 提取出来
u = u.replace("""    var notes = E.apply(fx);
    return { o: o, paras: paras_, roll: roll, notes: notes, ok: roll ? roll.ok : null };""",
"""    var notes = E.apply(fx);
    var clue = null;
    if (fx && fx.clue) {
      var cid = typeof fx.clue === 'string' ? fx.clue : Object.keys(fx.clue)[0];
      var clv = typeof fx.clue === 'string' ? 3 : fx.clue[cid];
      clue = { id: cid, lv: clv };
    }
    return { o: o, paras: paras_, roll: roll, notes: notes, cue: clue, clue: clue, ok: roll ? roll.ok : null };""")

io.open(u_path, 'w', encoding='utf-8').write(u)
print('ui done')
