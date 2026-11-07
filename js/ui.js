/* UI 渲染与流程 */
(function () {
  'use strict';
  var G = window.GRAIL;
  var E = G.Engine;
  var CODEX = window.GRAIL_CODEX || {};
  var ui = { q: 0, answers: {}, beat: null, snapshot: null, tab: 'servant', wishOpen: false, mapOpen: false };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function paras(arr, drop) {
    return (arr || []).map(function (t, i) {
      var cls = 'reveal' + (i === 0 && drop ? ' drop' : '');
      return '<p class="' + cls + '" style="animation-delay:' + (i * 90) + 'ms">' + t + '</p>';
    }).join('');
  }
  function settle() {
    var nodes = document.querySelectorAll('.reveal');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('settled');
  }
  function screen(id) {
    ['screen-title', 'screen-quiz', 'screen-assign', 'screen-game', 'screen-ending'].forEach(function (s) {
      var n = $(s); if (n) n.classList.toggle('is-active', s === id);
    });
    void (document.body && document.body.offsetWidth);
    setTimeout(settle, 760);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }
  function audio(theme) {
    try { if (window.GrailAudio) window.GrailAudio.play(theme); } catch (e) {}
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- 封面 ---------- */
  var started = false;

  /* ---------- 存档面板 ---------- */
  function openSlots(mode) {
    var old = document.getElementById('slot-layer');
    if (old) old.remove();
    var saves = E.listSaves();
    var rows = saves.map(function (s) {
      var t = s.empty ? '空档案位' : ('Day ' + s.day + '　' + (G.servant(s.servant) ? G.servant(s.servant).cls : '') +
        '　SAN ' + s.san + '　' + new Date(s.t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }));
      return '<button class="slot-row' + (s.empty ? ' empty' : '') + '" data-slot="' + s.slot + '">' +
        '<span class="sn">档案 ' + s.slot + '</span><span class="st">' + t + '</span></button>';
    }).join('');
    var layer = document.createElement('div');
    layer.id = 'slot-layer';
    layer.className = 'modal-layer';
    layer.innerHTML = '<div class="modal">' +
      '<div class="mk">' + (mode === 'save' ? '存入哪一格' : '读取哪一份') + '</div>' +
      rows +
      '<div class="modal-foot"><button class="btn btn--ghost" id="slot-close">取消</button>' +
      (mode === 'save' ? '<button class="btn" id="slot-del">删除当前格</button>' : '') + '</div></div>';
    document.body.appendChild(layer);
    layer.onclick = function (e) { if (e.target === layer) layer.remove(); };
    document.getElementById('slot-close').onclick = function () { layer.remove(); };
    layer.querySelectorAll('.slot-row').forEach(function (b) {
      b.onclick = function () {
        var n = +b.getAttribute('data-slot');
        if (mode === 'save') {
          E.save(n);
          toast('已存入档案 ' + n);
          layer.remove();
        } else {
          if (E.load(n)) {
            audio(G.servant(E.state().servantId).theme);
            screen('screen-game');
            renderSlot();
            layer.remove();
          } else { toast('那一格是空的'); }
        }
      };
    });
  }

  /* ---------- 档案馆（通关后解锁） ---------- */
  var AR_KEY = 'grail_archive_v1';
  function readArchive() {
    try { return JSON.parse(localStorage.getItem(AR_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeArchive(a) {
    try { localStorage.setItem(AR_KEY, JSON.stringify(a)); } catch (e) {}
  }
  function archiveRecord(endingId, st) {
    var a = readArchive();
    a.endings = a.endings || {};
    a.servants = a.servants || {};
    a.endings[endingId] = (a.endings[endingId] || 0) + 1;
    if (st && st.servantId) a.servants[st.servantId] = (a.servants[st.servantId] || 0) + 1;
    a.cleared = (a.cleared || 0) + 1;
    writeArchive(a);
  }
  function openArchive() {
    var a = readArchive();
    var seen = a.endings || {};
    var ids = Object.keys(G.ENDINGS || {});
    var endingCards = ids.map(function (id) {
      var e = G.ENDINGS[id];
      var got = seen[id] || 0;
      return '<div class="ac-card' + (got ? '' : ' locked') + '">' +
        '<b>' + (got ? esc(e.name) : '？？？') + '</b>' +
        '<span>' + (got ? esc(e.en || '') : '未解锁') + (got > 1 ? '　×' + got : '') + '</span></div>';
    }).join('');
    var svIds = Object.keys(a.servants || {});
    var svLine = svIds.length ? svIds.map(function (id) {
      var s = G.servant(id);
      return s ? s.cls + ' · ' + s.name : id;
    }).join('　｜　') : '还没有带走任何一位。';

    var layer = document.createElement('div');
    layer.id = 'archive-layer';
    layer.className = 'modal-layer';
    layer.innerHTML = '<div class="modal wide">' +
      '<div class="mk">档 案 馆</div>' +
      '<div class="ac-stat">通关 ' + (a.cleared || 0) + ' 次　·　已见结局 ' + Object.keys(seen).length + ' / ' + ids.length + '　·　同行从者 ' + svIds.length + ' / 9</div>' +
      '<h5>结局图鉴</h5><div class="ac-grid">' + endingCards + '</div>' +
      '<h5>同行过的从者</h5><p>' + svLine + '</p>' +
      '<p class="ac-tip">没到手的内容不会提前剧透。再走一遍，把缺的补上。</p>' +
      '<div class="modal-foot"><button class="btn btn--solid" id="ac-close">关上</button></div></div>';
    document.body.appendChild(layer);
    layer.onclick = function (e) { if (e.target === layer) layer.remove(); };
    document.getElementById('ac-close').onclick = function () { layer.remove(); };
  }

  function initTitle() {
    var has = E.hasSave();
    $('btn-continue').disabled = !has;
    $('start-note').innerHTML = has
      ? '检测到未完成的档案。继续将从上次停下的时段开始。'
      : '档案室提示：登记表共九问，答案决定你会召唤到谁。此过程不可撤销。';
    var confirmTick = 0;
    $('btn-start').onclick = function () {
      // 不用原生 confirm（部分内置浏览器会静默拦截），改成按钮二次确认
      if (has && confirmTick === 0) {
        confirmTick = 1;
        $('btn-start').textContent = '再点一次 · 覆盖旧档案';
        $('btn-start').classList.add('btn--red');
        setTimeout(function () {
          confirmTick = 0;
          $('btn-start').textContent = '拆封档案';
          $('btn-start').classList.remove('btn--red');
        }, 4000);
        return;
      }
      E.clearSave(); ui.q = 0; ui.answers = {};
      audio('quiz'); screen('screen-quiz'); renderQuiz();
    };
    $('btn-continue').onclick = function () {
      if (!E.load()) { toast('没有找到可继续的档案'); return; }
      audio(G.servant(E.state().servantId).theme);
      screen('screen-game'); renderSlot();
    };
    $('btn-about').onclick = function () { showAbout(); };
    var ba = $('btn-archive'); if (ba) ba.onclick = function () { openArchive(); };
  }

  function showAbout() {
    var old = document.getElementById('about-layer');
    if (old) old.remove();
    var layer = document.createElement('div');
    layer.id = 'about-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(9,11,10,.72);display:flex;align-items:center;justify-content:center;padding:20px';
    layer.innerHTML = '<div style="background:#f4ecda;color:#1c1a16;max-width:720px;width:100%;max-height:84vh;overflow:auto;padding:32px 34px;font-family:var(--serif);line-height:2;box-shadow:0 20px 60px rgba(0,0,0,.5)">' +
      '<div style="font-family:var(--hei);font-size:11px;letter-spacing:.3em;color:#8c2b22;margin-bottom:10px">档案说明</div>' +
      '<h2 style="margin:0 0 12px;font-size:24px">这份东西怎么玩</h2>' +
      '<p>改编自《圣杯战争·衡水：凌晨四点的圣杯》（COC 7th 非官方同人模组），单人化处理：七组御主中，其余六组由系统扮演。</p>' +
      '<p>九道登记题决定你的从者、御主卡与职介线。相性分 A+ / A / C / E 四档，取决于答案命中了从者几个关键词。</p>' +
      '<p>序章加七天，每个时段一次行动。SAN 是唯一的血条，曝光度满 10 会终止战争，兽的进度条每过一夜涨一格——当天你踩过刹车就不涨。</p>' +
      '<p>结局 11 个，判定顺序：兽满 → 曝光满 → 门开 → 归因 → 全灭 → 断电 → 兽饿死 → 七人齐 → 许愿。</p>' +
      '<p style="color:#6b6355;font-size:13px">架空谐仿创作，人物与机构均为虚构处理，与现实中的任何个人、团体、学校无关。</p>' +
      '<button class="btn btn--solid" id="about-close" style="margin-top:10px">知道了</button></div>';
    document.body.appendChild(layer);
    layer.onclick = function (e) { if (e.target === layer) layer.remove(); };
    document.getElementById('about-close').onclick = function () { layer.remove(); };
  }

  /* ---------- 问卷 ---------- */
  function renderQuiz() {
    var root = $('quiz-root');
    var q = G.QUIZ[ui.q];
    var pct = Math.round((ui.q) / G.QUIZ.length * 100);
    var head = '<div class="doc-head"><span>入学登记表</span><span class="mid">冀州第一中学 · 新生/在职人员</span>' +
      '<span class="no">表 Ⅶ－0 1 7 8</span></div>' +
      '<div class="q-progress">' + G.QUIZ.map(function (_, i) {
        return '<i class="' + (i < ui.q ? 'done' : i === ui.q ? 'on' : '') + '"></i>';
      }).join('') + '</div>';

    var body = '<div class="q-no">' + q.no + ' / 共 ' + G.QUIZ.length + ' 问</div>' +
      '<h2 class="q-title">' + q.title + '</h2>' +
      '<div class="q-hint">' + q.hint + '</div>' +
      '<div class="choices">' + q.options.map(function (o) {
        return '<button class="choice" data-k="' + o.key + '"><span class="k">' + o.key + '</span>' +
          '<span>' + o.label + '</span></button>';
      }).join('') + '</div>';

    var foot = '<div class="btn-row">' +
      (ui.q > 0 ? '<button class="btn btn--ghost" id="q-back">上一问</button>' : '') +
      '</div>';

    root.innerHTML = head + body + foot +
      '<div class="doc-foot"><span>请如实填写。教务处不会核对。</span><span>第 ' + (ui.q + 2) + ' 页 / 共 81 页</span></div>';

    root.querySelectorAll('.choice').forEach(function (b) {
      b.onclick = function () {
        ui.answers[q.id] = b.getAttribute('data-k');
        if (window.GrailAudio) window.GrailAudio.play('quiz');
        if (ui.q < G.QUIZ.length - 1) { ui.q++; renderQuiz(); }
        else assign();
      };
    });
    var back = $('q-back');
    if (back) back.onclick = function () { ui.q--; renderQuiz(); };
    void pct;
  }

  /* ---------- 分配 ---------- */
  function assign() {
    var st = E.create(ui.answers);
    var m = G.master(st.masterId), sv = G.servant(st.servantId), r = G.route(st.routeId);
    var a = st.affinity;
    var root = $('assign-root');
    screen('screen-assign');
    var levelNote = a.level === 'A+' ? '完美相性：命中全部三个关键词。该从者全属性 +5，附赠一句专属台词。'
      : a.level === 'A' ? '正常召唤：命中两个关键词。按档案数据执行。'
        : a.level === 'C' ? '勉强召唤：只命中一个关键词。该从者全属性 −10，每日额外消耗 2 MP。'
          : '错位召唤：一个关键词都没有命中。它带着「暴走」登场——第一次战斗前须通过 POW 检定。';

    root.innerHTML =
      '<div class="doc-head"><span>相性判定书</span><span class="mid">依据 · 校园车卡规则 6.1 / 相性判定 5.5</span><span class="no">' + r.en + '-' + sv.cls + '</span></div>' +
      '<div class="assign-grid">' +
      '<div>' +
      '<div class="portrait"><img src="' + sv.portrait + '" alt="' + esc(sv.name) + '" onerror="this.style.display=\'none\'">' +
      '<div class="stamp">' + sv.cls + '</div>' +
      '<div class="cap"><span>' + esc(sv.name) + '</span><span>' + (a.level === 'A+' ? 'A+' : a.level) + '</span></div></div>' +
      '<div class="card" style="margin-top:16px"><h3>御主 · ' + r.name + '线</h3>' +
      '<div style="font-size:13px;line-height:1.9;color:var(--ink-2)">' + r.desc + '</div>' +
      '<div class="tagrow"><span class="tag hit">' + r.line + '</span></div></div>' +
      '</div>' +

      '<div>' +
      '<div class="card"><h3>御主档案</h3><h2>' + esc(m.name) + '</h2>' +
      '<div class="en">' + esc(m.tag) + ' ｜ ' + esc(m.gender) + ' · ' + m.age + ' · ' + esc(m.klass) + '</div>' +
      '<div style="height:14px"></div><dl class="kv">' +
      '<dt>身份</dt><dd>' + esc(m.job) + '（信用 ' + m.credit + '）</dd>' +
      '<dt>欲望</dt><dd>' + esc(m.desire) + '</dd>' +
      '<dt>恐惧</dt><dd>' + esc(m.fear) + '</dd>' +
      '<dt>口头禅</dt><dd>' + esc(m.catch) + '</dd>' +
      '<dt>作息</dt><dd>' + esc(m.schedule) + '</dd>' +
      '<dt>秘密</dt><dd>' + esc(m.secret) + '</dd>' +
      '</dl>' +
      '<div style="margin-top:14px;border-top:1px dashed var(--line);padding-top:10px">' +
      '<div style="font-family:var(--hei);font-size:10.5px;letter-spacing:.22em;color:var(--red);margin-bottom:6px">登记表自述（你写的）</div>' +
      '<dl class="kv">' +
      (st.four.desire ? '<dt>想要</dt><dd>' + esc(st.four.desire) + '</dd>' : '') +
      (st.four.fear ? '<dt>怕</dt><dd>' + esc(st.four.fear) + '</dd>' : '') +
      (st.four.catch ? '<dt>口头禅</dt><dd>' + esc(st.four.catch) + '</dd>' : '') +
      (st.four.schedule ? '<dt>作息</dt><dd>' + esc(st.four.schedule) + '</dd>' : '') +
      '</dl></div>' +
      '<p style="margin:12px 0 0;font-family:var(--hei);font-size:11px;letter-spacing:.06em;color:var(--ink-3)">（御主卡模板取自最接近的预设卡；相性判定只取你的答案。）</p></div>' +

      '<div class="card"><h3>从者 · ' + sv.cls + '</h3><h2>' + esc(sv.name) + '</h2>' +
      '<div class="en">' + esc(sv.alias) + ' ｜ 威胁度 ' + sv.risk + '</div>' +
      '<div style="margin:12px 0 6px" class="statgrid">' +
      ['STR', 'DEX', 'CON', 'SIZ', 'APP', 'INT', 'POW', 'EDU'].map(function (k) {
        return '<div><b>' + sv.stats[k] + '</b><span>' + k + '</span></div>';
      }).join('') + '</div>' +
      '<div class="tagrow">' + sv.keywords.map(function (k) {
        return '<span class="tag ' + (a.hits.indexOf(k) >= 0 ? 'hit' : '') + '">' + k + '</span>';
      }).join('') + '</div>' +
      '<p style="font-size:13.5px;line-height:1.95;margin:14px 0 0;color:var(--ink-2)">' + levelNote + '</p>' +
      '</div>' +

      '<div class="card"><h3>你的属性</h3><div class="statgrid">' +
      ['str', 'con', 'dex', 'app', 'int', 'pow', 'edu'].map(function (k) {
        return '<div><b>' + st.s[k] + '</b><span>' + k.toUpperCase() + '</span></div>';
      }).join('') + '<div><b>' + st.s.luck + '</b><span>LUCK</span></div></div>' +
      '<dl class="kv" style="margin-top:14px"><dt>SAN</dt><dd>' + st.s.san + ' / ' + st.s.sanMax + '</dd>' +
      '<dt>MP</dt><dd>' + st.s.mp + ' / ' + st.s.mpMax + '</dd>' +
      '<dt>令咒</dt><dd>' + '■'.repeat(st.s.command) + '□'.repeat(3 - st.s.command) + '</dd>' +
      '<dt>技能</dt><dd>' + m.skills.map(function (kv) { return kv[0] + ' ' + kv[1]; }).join('　') + '</dd></dl>' +
      '</div>' +

      '<div class="btn-row"><button class="btn btn--solid" id="btn-sign">签收 · 进入第一天</button>' +
      '<button class="btn btn--ghost" id="btn-redo">重新填表</button></div>' +
      '</div></div>' +

      '<div class="doc-foot"><span>相性命中：' + (a.hits.length ? a.hits.join(' / ') : '无') + '</span><span>判 定 人：教务处</span></div>';

    $('btn-sign').onclick = function () {
      E.save();
      audio(sv.theme);
      screen('screen-game');
      renderSlot();
      toast('左手背上的印记开始发烫');
    };
    $('btn-redo').onclick = function () { ui.q = 0; ui.answers = {}; screen('screen-quiz'); renderQuiz(); };
  }

  /* ---------- HUD ---------- */
  function renderHud() {
    var s = E.state().s;
    var beastPips = '';
    for (var i = 0; i < 7; i++) beastPips += '<i class="' + (i < s.beast ? 'on' : '') + '"></i>';
    var expPips = '';
    for (var j = 0; j < 10; j++) expPips += '<i class="' + (j < s.exposure ? 'on ink' : '') + '"></i>';
    $('hud').innerHTML =
      '<div class="cell"><span class="lab">SAN</span><span class="val ' + (s.san <= 20 ? 'danger' : '') + '">' + s.san + '<small>/' + s.sanMax + '</small></span></div>' +
      '<div class="cell"><span class="lab">曝 光 度</span><span class="val ' + (s.exposure >= 7 ? 'danger' : '') + '">' + s.exposure + '<small>/10</small></span>' +
      '<span class="pips">' + expPips + '</span></div>' +
      '<div class="cell"><span class="lab">扣 分</span><span class="val ' + (s.demerit >= 8 ? 'danger' : '') + '">' + s.demerit + '<small>/10</small></span></div>' +
      '<div class="cell"><span class="lab">令 咒</span><span class="val">' + '■'.repeat(s.command) + '<small>' + '□'.repeat(3 - s.command) + '</small></span></div>' +
      '<div class="cell"><span class="lab">兽 · Ⅳ</span><span class="val ' + (s.beast >= 5 ? 'danger' : '') + '">' + s.beast + '<small>/7</small></span>' +
      '<span class="pips">' + beastPips + '</span></div>' +
      '<div class="cell"><span class="lab">MP</span><span class="val">' + s.mp + '<small>/' + s.mpMax + '</small></span></div>';
  }

  /* ---------- 主循环 ---------- */
  /* 每个时段配一张场景图（找不到就退回当日默认图） */
  var SLOT_IMG = {
    p1: 'assets/img/scene_honor.jpg', p2: 'assets/img/scene_corridor.jpg', p3: 'assets/img/scene_dorm.jpg',
    d1a: 'assets/img/scene_track.jpg', d1b: 'assets/img/scene_canteen.jpg', d1c: 'assets/img/scene_roofnight.jpg',
    d2a: 'assets/img/scene_classroom_night.jpg', d2b: 'assets/img/scene_canteen.jpg', d2c: 'assets/img/scene_dorm.jpg',
    d3a: 'assets/img/scene_exam.jpg', d3b: 'assets/img/scene_exam.jpg', d3c: 'assets/img/scene_exam.jpg', d3d: 'assets/img/scene_honor.jpg',
    d4a: 'assets/img/scene_gate.jpg', d4b: 'assets/img/scene_classroom_night.jpg', d4c: 'assets/img/scene_honor.jpg',
    d5a: 'assets/img/scene_dorm.jpg', d5b: 'assets/img/scene_track.jpg', d5c: 'assets/img/scene_gate.jpg',
    d6a: 'assets/img/scene_radio.jpg', d6b: 'assets/img/scene_beast.jpg', d6c: 'assets/img/scene_arena.jpg',
    d7a: 'assets/img/scene_gate.jpg', d7b: 'assets/img/scene_arena.jpg', d7c: 'assets/img/scene_led.jpg'
  };

  function slotImage(slot, day) {
    return (slot && SLOT_IMG[slot.id]) || (day && day.scene) || '';
  }

  /* ---------- 关键节点演出 ---------- */
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
      data.cls = sv.cls; data.name = sv.name; data.id = sv.id;
    }
    if (cfg.kind === 'roll') {
      var pool = ['王梓', '李昊', '陈子豪', '刘思远', '赵一鸣', '周佳琪', '孙梦洁', '吴倩', '郑小北', '冯天乐', '蒋雨欣', '韩子墨', '曹宇', '谢欣然'];
      var arr = [];
      for (var i = 0; i < 12; i++) arr.push((i + 1) + '　' + pool[(i * 3 + 2) % pool.length]);
      data.names = arr;
    }
    return { cfg: cfg, data: data, key: key, st: st };
  }

  function reqOk(req) {
    if (!req) return { ok: true };
    var s = E.state();
    if (req.route && s.routeId !== req.route) return { ok: false, why: '需要「' + G.route(req.route).name + '」线' };
    if (req.flag && !s.s.flags[req.flag]) return { ok: false, why: '条件未满足' };
    if (req.command && s.s.command < req.command) return { ok: false, why: '令咒不足' };
    if (req.allies && s.s.allies < req.allies) return { ok: false, why: '盟友不足（需 ' + req.allies + '）' };
    if (req.clueCount) {
      var n = 0; Object.keys(s.s.clues).forEach(function (k) { if (s.s.clues[k] >= 3) n++; });
      if (n < req.clueCount) return { ok: false, why: '需要 ' + req.clueCount + ' 个真名（现 ' + n + '）' };
    }
    return { ok: true };
  }

  function currentDay() { var st = E.state(); return G.STORY[st.s.day]; }
  function currentSlot() { var st = E.state(), D = currentDay(); return D && D.slots[st.s.slot]; }

  var __slotWrapped = true;
  function renderSlotInner() {
    var st = E.state(), D = currentDay();
    if (!D) { finish(); return; }
    var slot = currentSlot();
    if (!slot) { advanceDay(); return; }
    // 每天一次自由行动：地图 → 地点 → 事件
    if (st.s.day >= 1 && st.s.slot === 0 && !st.s.flags['free_' + st.s.day] && !ui.mapOpen) {
      ui.mapOpen = true;
      renderMapScreen();
      return;
    }
    ui.beat = null; ui.snapshot = null;

    $('game-day').textContent = st.s.day === 0 ? '序 章 · 第零夜' : 'DAY ' + st.s.day + ' / 7';
    document.body.classList.toggle('final-day', st.s.day === 7);
    $('game-clock').textContent = slot.time;
    $('game-foot').textContent = '第 ' + (10 + (st.s.day - 1) * 8 + st.s.slot * 2) + ' 页 / 共 81 页';
    renderHud();

    var card = (CODEX.dayCards || []).filter(function (d) { return d.day === st.s.day; })[0];
    var log = (card && card.log) || D.log;

    var root = $('story-root');
    root.innerHTML =
      '<div class="scene-head"><h2>' + esc(D.title) + '</h2><span class="meta">' + esc(slot.time) + '</span></div>' +
      '<div class="scene-place">' + esc(slot.place) + '</div>' +
      (st.s.slot === 0 ? '<div class="card" style="margin-bottom:20px"><h3>今日校务日志</h3><p style="margin:0;font-size:13px;line-height:1.95;color:var(--ink-2)">' + esc(log) + '</p></div>' : '') +
      (slotImage(slot, D) ? '<div class="scene-img"><img loading="lazy" decoding="async" src="' + slotImage(slot, D) + '" alt="" onerror="this.parentNode.style.display=\'none\'"></div>' : '') +
      '<div class="prose" id="prose-box"></div>' +
      '<div class="choices" id="opts" style="margin-top:26px"></div>';

    var opts = $('opts');
    var allOpts = slot.options.slice();
    var bondBook = window.GRAIL_BONDS || {};
    var bond = bondBook[st.servantId];
    if (bond && bond.nodes && bond.nodes[slot.id] && !st.s.flags['bonddone_' + slot.id]) {
      var bo = JSON.parse(JSON.stringify(bond.nodes[slot.id]));
      bo.__bond = true;
      allOpts.push(bo);
    }
    allOpts.forEach(function (o, idx) {
      var chk = reqOk(o.req);
      var b = el('button', 'choice');
      var letter = 'ABCD'[idx] || '·';
      var target = o.check ? '　目标 ' + E.clamp(E.skillValue(o.check.skill) + (o.check.bonus || 0), 1, 99) : '';
      b.innerHTML = '<span class="k">' + letter + '</span><span>' + esc(o.label) +
        (o.sub ? '<span class="sub">' + esc(o.sub) + target + '</span>' : '') +
        (!chk.ok ? '<span class="sub" style="color:var(--red)">未解锁：' + esc(chk.why) + '</span>' : '') + '</span>';
      if (!chk.ok) b.disabled = true;
      if (o.__bond) b.classList.add('bond');
      b.onclick = function () { choose(o); };
      opts.appendChild(b);
    });

    var probe = stingerFor(slot, st);
    var introTexts = slot.intro.map(esc);
    var AVG = window.GrailAVG || {
      typeParagraphs: function (box, texts, o, done) {
        box.innerHTML = texts.map(function (t) { return '<p>' + t + '</p>'; }).join('');
        if (done) done();
      },
      skip: function () {},
      stinger: function (k, d, done) { if (done) done(); }
    };
    var proseBox = $('prose-box');
    var startType = function () {
      if (!proseBox || !proseBox.isConnected) return;
      try {
        AVG.typeParagraphs(proseBox, introTexts, { speed: 13 }, function () {});
      } catch (e) {
        if (proseBox && proseBox.isConnected) {
          proseBox.innerHTML = introTexts.map(function (t) { return '<p>' + t + '</p>'; }).join('');
        }
      }
    };
    if (probe) {
      st.s.flags[probe.key] = true;
      E.save();
      AVG.stinger(probe.cfg.kind, probe.data, startType);
    } else {
      startType();
    }
    root.addEventListener('pointerdown', function () { try { AVG.skip(); } catch (e) {} }, { passive: true });

    renderDossier();
    setTimeout(settle, 900);
    try { burstForSlot(slot, D, st); } catch (e) { /* 演出失败不影响流程 */ }
    E.save();
  }

  function renderSlot() {
    try { renderSlotInner(); } catch (e) { fatal(e); }
  }

  function choose(o) {
    if (o.id === 'd7c1') { renderWish(); return; }
    if (o.battle) { startBattle(o); return; }
    if (o.exam) { startExam(o); return; }
    var st = E.state();
    var before = { exp: st.s.exposure, beast: st.s.beast };
    ui.snapshot = clone(st);
    var out = resolve(o);
    ui.beat = out;
    renderBeat(out);
    try {
      var after = E.state().s;
      var jumped = after.exposure - before.exp >= 2 || after.beast > before.beast;
      if (window.GrailAVG && window.GrailAVG.glitchBurst && jumped) {
        setTimeout(function () { window.GrailAVG.glitchBurst(null, { dur: 380, shake: true }); }, 260);
      }
    } catch (e) { /* 忽略 */ }
  }

  /* 许愿分支 */
  function renderWish() {
    var st = E.state();
    ui.snapshot = clone(st);
    var slot = currentSlot();
    var root = $('story-root');
    var list = (G.STORY.WISHES || []).filter(function (w) {
      return !w.teacherOnly || G.master(st.masterId).job === '教师';
    });
    root.innerHTML =
      '<div class="scene-head"><h2>' + esc(slot.place) + '</h2><span class="meta">04:00</span></div>' +
      '<div class="prose">' + paras([
        '你把手按在屏上。它不烫，是温的，像一个人的额头。',
        '「说吧。」那个声音说。',
        '你张开嘴。这一瞬间你忽然发现，你其实早就想好了——从第一天凌晨四点开始，你就一直在想这件事。'
      ], true) + '</div>' +
      '<div class="q-no" style="margin-top:24px">你要说的是——</div>' +
      '<div class="choices" id="wish-list"></div>';
    var box = $('wish-list');
    list.forEach(function (w) {
      var b = el('button', 'choice');
      b.innerHTML = '<span class="k">愿</span><span>' + esc(w.label) + '<span class="sub">' + esc(w.sub || '') + '</span></span>';
      b.onclick = function () {
        var notes = E.apply(w.fx);
        var beat = { o: w, paras: w.text, roll: null, notes: notes, ok: true };
        renderBeat(beat);
        var acts = $('beat-actions');
        acts.innerHTML = '';
        var nb = el('button', 'btn btn--solid', '看结果');
        nb.onclick = function () { finish(); };
        acts.appendChild(nb);
      };
      box.appendChild(b);
    });
  }


  function resolve(o) {
    var paras_, roll = null, fx = null;
    if (o.check) {
      roll = E.roll(o.check.skill, o.check.bonus || 0);
      var br = roll.ok ? o.ok : o.fail;
      paras_ = typeof br.text === 'function' ? br.text(E.state()) : br.text; fx = br.fx;
    } else {
      paras_ = typeof o.text === 'function' ? o.text(E.state()) : o.text; fx = o.fx;
    }
    var notes = E.apply(fx);
    var clue = null;
    if (fx && fx.clue) {
      var cid = typeof fx.clue === 'string' ? fx.clue : Object.keys(fx.clue)[0];
      var clv = typeof fx.clue === 'string' ? 3 : fx.clue[cid];
      clue = { id: cid, lv: clv };
    }
    return { o: o, paras: paras_, roll: roll, notes: notes, cue: clue, clue: clue, ok: roll ? roll.ok : null };
  }

  /* 情报等级 → 形象素材
     0/1 目击：扭曲态（几乎认不出，只有一团在动的影）
     2   ：剪影（轮廓开始成形，仍在雾里）
     3/4 ：显影
     5   ：完全凝实 */
  function intelView(id, lv) {
    var s2 = G.servant(id);
    if (!s2) {
      // 非从者（比如「兽」）：直接给它一张场景图当脸
      return { src: 'assets/img/scene_beast.jpg', cls: 'tint-3' };
    }
    var base = s2.portrait;
    var stem = /servant_([a-z]+)\./.exec(base);
    var sid = stem ? stem[1] : id;
    if (lv <= 1) return { src: 'assets/img/sil/' + sid + '_warp.png', cls: 'sil sil-0' };
    if (lv === 2) return { src: 'assets/img/sil/' + sid + '_sil.png', cls: 'sil sil-2' };
    if (lv === 3) return { src: base, cls: 'tint-3' };
    if (lv === 4) return { src: base, cls: 'tint-4' };
    return { src: base, cls: '' };
  }

  /* ---------- 回合制战斗 ---------- */
  var B_ACTIVE = null;

  function randomFoeId() {
    var st = E.state();
    var ids = ['saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker', 'ruler', 'foreigner'];
    var pool = ids.filter(function (id) {
      if (id === st.s.servantId) return false;
      if (st.s.flags['ally_' + id]) return false;
      if (st.s.flags['beat_' + id]) return false;
      return true;
    });
    if (!pool.length) pool = ids.filter(function (id) { return id !== st.s.servantId; });
    // 偏一点：没解明的更容易撞上
    var unknown = pool.filter(function (id) { return (st.s.clues[id] || 0) < 3; });
    var from = unknown.length && Math.random() < 0.65 ? unknown : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  function startBattle(o) {
    var cfg = o.battle;
    if (cfg.foe === 'auto') cfg.foe = randomFoeId();
    var st = E.state();
    var B;
    try {
      B = window.GRAIL_BATTLE.create({
        foeId: cfg.foe,
        reveal: (st.s.clues[cfg.foe] || 0) >= 3 || !!cfg.reveal,
        clueLv: cfg.clueLv || 3,
        scale: cfg.scale || 1,
        allies: cfg.allies || 0,
        onEvent: function (kind, info) {
          if (kind === 'myNoble') nobleCut(info.me, info.name);
          if (kind === 'foeNoble') {
            try { if (window.GrailAudio) window.GrailAudio.play(info.foe.theme); } catch (e) {}
            try {
              if (window.GrailAVG && window.GrailAVG.glitchBurst) window.GrailAVG.glitchBurst('scene_arena', { dur: 700, hard: true });
            } catch (e) {}
          }
        }
      });
    } catch (e) { fatal(e); return; }
    B_ACTIVE = B;
    ui.beat = { o: o, paras: cfg.intro || ['你先动了手。'], notes: [], roll: null, ok: true, battle: true };
    battleTransition(function () { renderBattleScreen(o, B); });
  }

  /* 进战斗：闪白 + 斜纹扫过，把画面「切」过去 */
  function battleTransition(done) {
    var l = document.createElement('div');
    l.className = 'battle-trans';
    l.innerHTML = '<span class="mark">遭 遇</span>';
    document.body.appendChild(l);
    setTimeout(function () { l.classList.add('sweep'); }, 40);
    setTimeout(function () { l.classList.add('leaving'); }, 520);
    setTimeout(function () { l.remove(); if (done) done(); }, 980);
  }

  function nobleCut(sv, name) {
    try {
      if (window.GrailAudio) window.GrailAudio.play(sv.theme);
      if (window.GrailAVG && window.GrailAVG.stinger) {
        window.GrailAVG.stinger('noble', { cls: sv.cls, title: name, sub: sv.one || '', color: sv.tint || '#b23a2e' });
      }
    } catch (e) {}
  }

  function renderBattleScreen(o, B) {
    var st = B.state();
    var foe = B.foe;
    var layer = $('battle-layer');
    if (!layer) return;
    layer.classList.add('on');

    var lv = Math.min(5, (E.state().s.clues[foe.id] || 0));
    if (B.reveal) lv = 5;
    var iv = intelView(foe.id, lv);
    var mine = G.servant(E.state().servantId);
    var hpPct = Math.max(0, Math.round(st.foeHp / st.foeHpMax * 100));
    var myPct = Math.max(0, Math.round(st.myHp / st.myHpMax * 100));
    var mpPct = Math.max(0, Math.round(st.mp / st.mpMax * 100));
    var slot = currentSlot();
    var bg = slotImage(slot, currentDay()) || 'assets/img/scene_arena.jpg';
    var lines = st.log.slice(-3).map(function (l) {
      return '<div class="bline ' + (l.tone || '') + '">' + esc(l.t) + '</div>';
    }).join('');

    layer.innerHTML =
      '<div class="bstage">' +
      '<div class="bscene" style="background-image:url(\'' + bg + '\')"></div>' +
      '<div class="bfog"></div>' +
      '<div class="bveil"></div>' +
      '<div class="btop"><span>' + esc(o.battle.title || '遭遇战') + '</span><span>回合 ' + st.turn + '</span></div>' +
      '<div class="bside foe">' +
      '<div class="bname">' + esc(st.foeName) + '</div>' +
      '<div class="bsub">' + (B.reveal ? esc(foe.alias || '') + ' ／ ' + esc(foe.risk || '') : '档案未解明') + '</div>' +
      '<div class="bhp"><i style="width:' + hpPct + '%"></i></div>' +
      '<div class="bnum">' + st.foeHp + ' / ' + st.foeHpMax + '</div>' +
      '<img loading="lazy" decoding="async" class="fsprite ' + iv.cls + '" src="' + iv.src + '" alt="" onerror="this.style.display=\'none\'">' +
      '</div>' +
      '<div class="bside me">' +
      '<img loading="lazy" decoding="async" class="msprite" src="' + mine.portrait + '" alt="" onerror="this.style.display=\'none\'">' +
      '<div class="mname">' + esc(mine.cls) + ' · ' + esc(mine.name) + '</div>' +
      '<div class="bhp mine"><i style="width:' + myPct + '%"></i></div>' +
      '<div class="bnum">HP ' + st.myHp + '/' + st.myHpMax + '　MP ' + st.mp + '/' + st.mpMax + '　SAN ' + st.san + '</div>' +
      '</div>' +
      '<div class="bbox">' +
      '<div class="btext">' + lines + '</div>' +
      (st.over ? '<div class="bover">' + (st.over === 'win' ? '它散了。' : st.over === 'flee' ? '你退了出来。' : '你倒下了。') + '</div>'
        : '<div class="bmenu">' +
        '<button class="btn btn--solid" data-a="attack">交手</button>' +
        '<button class="btn" data-a="guard">架住</button>' +
        '<button class="btn' + (st.canNoble ? ' btn--red' : '') + '" data-a="noble"' + (st.canNoble ? '' : ' disabled') + '>宝具</button>' +
        '<button class="btn btn--ghost" data-a="flee">撤</button>' +
        '</div>') +
      '</div>' +
      '</div>';

    if (!st.over) {
      layer.querySelectorAll('.bmenu .btn').forEach(function (btn) {
        btn.onclick = function () {
          var kind = btn.getAttribute('data-a');
          B.act(kind);
          renderBattleScreen(o, B);
        };
      });
      return;
    }

    var out = B.settle();
    var isBeast = foe.id === 'beast';
    var res = st.over === 'win'
      ? (isBeast
        ? '<p>那块屏碎了。碎之前它还在跳，跳到 0 的时候，整栋楼的灯一起亮了。' +
          '你听见楼下有人在喊名字，喊的是活的那些。<br>兽 · Ⅳ 进度清零。</p>'
        : '<p>你赢了。' + esc(foe.cls) + ' 的轮廓散了，散之前你记住了它的脸——情报等级升到 ' + E.roman(out.clue || 3) + '。SAN −' + out.sanLoss + '。</p>')
      : st.over === 'flee'
        ? '<p>你退开了。' + esc(foe.cls) + ' 没有追。SAN −' + out.sanLoss + '。</p>'
        : out.died
          ? '<p>你倒在地上，听见走廊尽头有人在念名字。这次念到了你。</p>'
          : '<p>你输了。令咒烧掉一划，把你从那一击里拽了出来。SAN −' + out.sanLoss + '，令咒 −1。</p>';
    layer.querySelector('.bbox').innerHTML = '<div class="btext">' + res + '</div>' +
      (out.died ? '' : '<div class="bmenu one"><button class="btn btn--solid" id="bt-done">继续</button></div>');
    var bd = $('bt-done');
    if (bd) {
      bd.onclick = function () {
        layer.classList.remove('on');
        layer.innerHTML = '';
        if (out.died) { finish(); return; }
        var beat = {
          o: o,
          paras: [st.over === 'win' ? '你站在原地喘了一会儿。手背上的印记比刚才淡了一点。' : '你扶着墙往外走。走廊里的纸被风翻了一页。'],
          roll: null, notes: [], ok: true
        };
        renderBeat(beat);
      };
    }
    renderHud();
    renderDossier();
  }

  /* ---------- 定向故障编排 ---------- */
  var GLITCH_CUE = {
    d3d: { key: 'scene_exam', dur: 300, times: [0, 1700, 3400], hard: false },
    d6a: { key: 'scene_radio', dur: 620, times: [0], hard: false },
    d6b: { key: 'scene_beast', dur: 900, times: [0, 4200, 8400], hard: true },
    d7c: { key: 'scene_led', dur: 1150, times: [0, 2300], hard: true },
    d2c: { key: 'scene_dorm', dur: 380, times: [0], hard: false },
    d5c: { key: 'scene_gate', dur: 520, times: [900], hard: false }
  };
  function burstForSlot(slot, D, st) {
    if (!window.GrailAVG || !window.GrailAVG.glitchBurst) return;
    var cue = GLITCH_CUE[slot.id];
    if (cue) {
      cue.times.forEach(function (t) {
        setTimeout(function () { window.GrailAVG.glitchBurst(cue.key, { dur: cue.dur, hard: cue.hard }); }, 420 + t);
      });
      return;
    }
    var imgPath = slotImage(slot, D) || '';
    var mk = /scene_([a-z]+)\.jpg/.exec(imgPath);
    var sceneKey = mk ? 'scene_' + mk[1] : '';
    var hot = st.s.exposure >= 6 || st.s.beast >= 5;
    if (sceneKey && Math.random() < (hot ? 0.3 : 0.06)) {
      setTimeout(function () { window.GrailAVG.glitchBurst(sceneKey, { dur: 380 }); }, 520);
    }
  }


  /* ---------- 月考小游戏 ---------- */
  var EXAM = { qs: [], idx: 0, ans: [], from: null };

  function pickExam() {
    var all = (window.GRAIL_EXAM || []).slice();
    if (all.length < 5) return all;
    var bySubj = {};
    all.forEach(function (q) { (bySubj[q.subj] = bySubj[q.subj] || []).push(q); });
    var subjs = Object.keys(bySubj);
    subjs.sort(function () { return Math.random() - 0.5; });
    var out = [];
    subjs.slice(0, 5).forEach(function (s) {
      var arr = bySubj[s];
      out.push(arr[Math.floor(Math.random() * arr.length)]);
    });
    while (out.length < 5) out.push(all[Math.floor(Math.random() * all.length)]);
    return out.slice(0, 5);
  }

  function startExam(o) {
    EXAM.qs = pickExam();
    EXAM.idx = 0;
    EXAM.ans = [];
    EXAM.from = o;
    renderExamQuestion();
  }

  function renderExamQuestion() {
    var i = EXAM.idx;
    var q = EXAM.qs[i];
    var root = $('story-root');
    var pips = EXAM.qs.map(function (_, k) {
      return '<i class="' + (k < i ? 'done' : k === i ? 'on' : '') + '"></i>';
    }).join('');
    root.innerHTML =
      '<div class="scene-head"><h2>月考试卷</h2><span class="meta">第 ' + (i + 1) + ' / ' + EXAM.qs.length + ' 题</span></div>' +
      '<div class="q-progress">' + pips + '</div>' +
      '<div class="q-no">' + esc(q.subj) + '　·　' + esc(q.id) + '</div>' +
      '<h2 class="q-title">' + esc(q.q) + '</h2>' +
      '<div class="choices" id="opts"></div>' +
      '<div class="doc-foot"><span>答题卡涂错不补。想清楚再落笔。</span><span>第 ' + (i + 2) + ' 页 / 共 81 页</span></div>';
    var box = $('opts');
    q.opts.forEach(function (t, k) {
      var b = el('button', 'choice');
      b.innerHTML = '<span class="k">' + 'ABCD'[k] + '</span><span>' + esc(t) + '</span>';
      b.onclick = function () {
        EXAM.ans.push(k);
        EXAM.idx++;
        if (EXAM.idx < EXAM.qs.length) renderExamQuestion();
        else renderExamResult();
      };
      box.appendChild(b);
    });
  }

  function renderExamResult() {
    var right = 0;
    var rows = EXAM.qs.map(function (q, i) {
      var ok = EXAM.ans[i] === q.a;
      if (ok) right++;
      return '<div class="exam-row ' + (ok ? 'ok' : 'no') + '">' +
        '<b>' + (ok ? '✓' : '✕') + '</b><span>' + esc(q.q) + '</span>' +
        '<i>你选 ' + 'ABCD'[EXAM.ans[i]] + '／正解 ' + 'ABCD'[q.a] + '</i>' +
        '<em>' + esc(q.why) + '</em></div>';
    }).join('');
    var grade, note, fx;
    if (right === 5) { grade = 'A'; note = '年级前十。教务处把你的卷子抽出来贴在办公室。'; fx = { demerit: -1, exposure: -1, san: 1, flag: 'examA', log: '月考拿了 A。' }; }
    else if (right === 4) { grade = 'B'; note = '稳。老师在你的名字旁边画了一个圈。'; fx = { san: 1, flag: 'examB', log: '月考拿了 B。' }; }
    else if (right === 3) { grade = 'C'; note = '中游。没人记得你考了多少。'; fx = { flag: 'examC', log: '月考拿了 C。' }; }
    else if (right === 2) { grade = 'D'; note = '后排多了一个空位，不是你的。'; fx = { demerit: 1, exposure: 1, flag: 'examD', log: '月考拿了 D。' }; }
    else { grade = 'E'; note = '全校通报。班主任在门口等你。'; fx = { demerit: 2, exposure: 2, san: -2, flag: 'examE', log: '月考拿了 E，全校通报。' }; }
    if (right >= 4) fx.examBonus = right * 2;
    var notes = E.apply(fx);
    renderHud();
    var root = $('story-root');
    root.innerHTML =
      '<div class="scene-head"><h2>批改</h2><span class="meta">' + right + ' / ' + EXAM.qs.length + '</span></div>' +
      '<div class="exam-grade g-' + grade + '"><b>' + grade + '</b><span>' + esc(note) + '</span></div>' +
      '<div class="exam-list">' + rows + '</div>' +
      (notes.length ? '<div class="effects">' + notes.map(function (n) {
        return '<span class="' + (/−|-/.test(n) ? 'down' : 'up') + '">' + esc(n) + '</span>';
      }).join('') + '</div>' : '') +
      '<div class="btn-row"><button class="btn btn--solid" id="exam-done">交卷</button></div>';
    E.save();
    $('exam-done').onclick = function () {
      var beat = {
        o: EXAM.from || {},
        paras: ['你把卷子交上去。走出考场的时候，走廊里的灯刚好灭了一盏。'],
        roll: null, notes: [], ok: true
      };
      renderBeat(beat);
    };
  }

  /* ---------- 自由行动：地图 → 地点 → 事件 ---------- */
  function renderMapScreen() {
    var st = E.state();
    var M = window.GRAIL_MAP || { places: [] };
    var root = $('story-root');
    var cards = (M.places || []).map(function (p) {
      var visited = st.s.flags['visit_' + p.id] ? ' visited' : '';
      var risk = '★★★★'.slice(0, p.risk) + '☆☆☆☆'.slice(0, 4 - p.risk);
      return '<button class="map-card' + visited + '" data-p="' + p.id + '">' +
        '<span class="mp-img" style="background-image:url(' + p.img + ')"></span>' +
        '<span class="mp-body"><b>' + esc(p.name) + '</b>' +
        '<span class="mp-desc">' + esc(p.desc) + '</span>' +
        '<i>风险 ' + risk + (st.s.flags['visit_' + p.id] ? '　· 去过' : '') + '</i></span></button>';
    }).join('');
    root.innerHTML =
      '<div class="scene-head"><h2>自由行动</h2><span class="meta">' + (st.s.day === 0 ? '第零夜' : 'Day ' + st.s.day) + '</span></div>' +
      '<div class="scene-place">今天还剩一次行动。去哪，你自己定。</div>' +
      '<div class="map-grid">' + cards + '</div>';
    root.querySelectorAll('.map-card').forEach(function (b) {
      b.onclick = function () { enterPlace(b.getAttribute('data-p')); };
    });
    renderHud();
    renderDossier();
  }

  function evOk(e, st) {
    if (!e) return false;
    if (e.once && st.s.flags['ev_' + e.id]) return false;
    if (e.day && (st.s.day < e.day[0] || st.s.day > e.day[1])) return false;
    if (e.req && e.req.flag && !st.s.flags[e.req.flag]) return false;
    if (e.req && e.req.notFlag && st.s.flags[e.req.notFlag]) return false;
    return true;
  }

  function pickMapEvent(pid) {
    var st = E.state();
    var M = window.GRAIL_MAP || { events: [] };
    var NPC = window.GRAIL_NPC_EVENTS || [];
    var pool = [];
    (M.events || []).forEach(function (e) {
      if (e.place === pid && evOk(e, st)) pool.push(e);
    });
    (NPC || []).forEach(function (e) {
      if (e.place === pid && evOk(e, st)) pool.push(e);
    });
    if (!pool.length) return null;
    // 没看过的优先，同类里随机：固定事件和其他御主的支线都有机会冒出来
    var fresh = pool.filter(function (e) { return !st.s.flags['ev_' + e.id]; });
    var from = fresh.length ? fresh : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  function enterPlace(pid) {
    var st = E.state();
    st.s.flags['visit_' + pid] = true;
    var ev = pickMapEvent(pid);
    var root = $('story-root');
    if (!ev) {
      var p = ((window.GRAIL_MAP || {}).places || []).filter(function (x) { return x.id === pid; })[0] || { name: '这里' };
      st.s.san = Math.min(st.s.sanMax, st.s.san + 1);
      E.addLog('你去了' + p.name + '，什么也没发生。');
      st.s.flags['free_' + st.s.day] = true;
      ui.mapOpen = false;
      E.save();
      root.innerHTML =
        '<div class="scene-head"><h2>' + esc(p.name) + '</h2><span class="meta">自由行动</span></div>' +
        '<div class="prose"><p>' + esc(p.desc) + '</p><p>你在那儿站了一会儿。今天没有别的事发生。</p></div>' +
        '<div class="effects"><span class="up">SAN +1</span></div>' +
        '<div class="btn-row"><button class="btn btn--solid" id="map-back">回去</button></div>';
      $('map-back').onclick = function () { renderSlot(); };
      return;
    }
    try {
      if (window.GrailAudio) window.GrailAudio.play(pid === 'hill' || pid === 'club' ? 'beast' : 'daily');
    } catch (e) {}
    renderMapEvent(ev, pid);
  }

  function renderMapEvent(ev, pid) {
    var st = E.state();
    var root = $('story-root');
    var p = ((window.GRAIL_MAP || {}).places || []).filter(function (x) { return x.id === pid; })[0] || { name: '' };
    var html = '<div class="scene-head"><h2>' + esc(p.name) + '</h2><span class="meta">自由行动</span></div>' +
      (ev.title ? '<div class="scene-place">' + esc(ev.title) + (ev.who ? '　· ' + esc(ev.who) : '') + '</div>' : '') +
      '<div class="prose">' + (ev.intro || []).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' +
      '<div class="choices" id="opts"></div><div class="btn-row" id="beat-actions"></div>';
    root.innerHTML = html;
    var box = $('opts');
    (ev.options || []).forEach(function (o, idx) {
      var b = el('button', 'choice');
      var chk = reqOk(o.req);
      var target = o.check ? '　目标 ' + E.clamp(E.skillValue(o.check.skill) + (o.check.bonus || 0), 1, 99) : '';
      b.innerHTML = '<span class="k">' + ('ABCD'[idx] || '·') + '</span><span>' + esc(o.label) +
        (o.sub ? '<span class="sub">' + esc(o.sub) + target + '</span>' : '') + '</span>';
      if (!chk.ok) b.disabled = true;
      b.onclick = function () { mapChoose(ev, pid, o); };
      box.appendChild(b);
    });
    renderHud();
    renderDossier();
  }

  function mapChoose(ev, pid, o) {
    var out = resolve(o);
    var root = $('story-root');
    var st = E.state();
    var clue = out.clue;
    // 事件相关的从者 BGM：拿到情报就让那个人「响一下」
    if (clue && window.GrailAudio) {
      try { window.GrailAudio.play(clue.id); } catch (e) {}
    }
    var _po = ((window.GRAIL_MAP || {}).places || []).filter(function (x) { return x.id === pid; })[0] || { name: '' };
    var html = '<div class="scene-head"><h2>' + esc(_po.name) + '</h2><span class="meta">自由行动</span></div>' +
      '<div class="prose">' + paras(out.paras.map(esc), true) + '</div>' +
      (out.roll ? '<div class="dice"><span>检定 · ' + esc(out.roll.skill) + '</span><span>1D100 = <b>' + out.roll.die + '</b></span>' +
        '<span>目标 ' + out.roll.target + '</span><span class="' + (out.roll.ok ? 'ok' : 'no') + ' lv">' + esc(out.roll.level) + '</span></div>' : '') +
      (out.notes && out.notes.length ? '<div class="effects">' + out.notes.map(function (n) {
        var down = /−|-[0-9]/.test(n) || /扣|失/.test(n);
        return '<span class="' + (down ? 'down' : 'up') + '">' + esc(n) + '</span>';
      }).join('') + '</div>' : '') +
      '<div class="btn-row"><button class="btn btn--solid" id="map-done">继续</button></div>';
    root.innerHTML = html;
    st.s.flags['ev_' + ev.id] = true;
    st.s.flags['free_' + st.s.day] = true;
    ui.mapOpen = false;
    E.save();
    $('map-done').onclick = function () {
      try { if (window.GrailAudio) window.GrailAudio.play('daily'); } catch (e) {}
      renderSlot();
    };
    renderHud();
    renderDossier();
  }

  function renderBeat(b) {
    var slot = currentSlot();
    var root = $('story-root');
    var html = '<div class="scene-head"><h2>' + esc(slot.place) + '</h2><span class="meta">' + esc(slot.time) + '</span></div>' +
      '<div class="prose">' + paras(b.paras.map(esc), true) + '</div>';

    if (b.roll) {
      html += '<div class="dice"><span>检定 · ' + esc(b.roll.skill) + '</span>' +
        '<span>1D100 = <b>' + b.roll.die + '</b></span>' +
        '<span>目标 ' + b.roll.target + '</span>' +
        '<span class="' + (b.roll.ok ? 'ok' : 'no') + ' lv">' + esc(b.roll.level) + '</span></div>';
    }
    if (b.clue) {
      var sv2 = G.servant(b.clue.id);
      var lv2 = Math.min(b.clue.lv, 5);
      var iv = intelView(b.clue.id, lv2);
      html += '<div class="sighting just-revealed"><div class="thumb"><img class="' + iv.cls + '" src="' + iv.src + '" alt="" onerror="this.parentNode.style.display=\'none\'"></div>' +
        '<div class="txt">目击记录 · ' + sv2.cls + '<b>' + (b.clue.lv >= 3 ? esc(sv2.name) : '未解明') + '</b>' +
        '情报等级 <em>' + E.roman(b.clue.lv) + '</em>　' + (b.clue.lv >= 3 ? '真名推定完成' : '轮廓仍在雾里') + '</div></div>';
    }
    if (b.notes && b.notes.length) {
      html += '<div class="effects">' + b.notes.map(function (n) {
        var down = /−|-[0-9]/.test(n) || /扣|失/.test(n);
        return '<span class="' + (down ? 'down' : 'up') + '">' + esc(n) + '</span>';
      }).join('') + '</div>';
    }
    html += '<div class="btn-row" id="beat-actions"></div>';
    root.innerHTML = html;

    var acts = $('beat-actions');
    var st = E.state();
    if (b.roll && !b.roll.ok && st.s.command > 0) {
      var rb = el('button', 'btn btn--red', '用一划令咒重掷');
      rb.onclick = function () { reroll(b); };
      acts.appendChild(rb);
    }
    var nb = el('button', 'btn btn--solid', '继续');
    nb.onclick = function () { advance(); };
    acts.appendChild(nb);
    renderHud();
    renderDossier();
    setTimeout(settle, 700);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reroll(b) {
    var st = E.state();
    // 还原到选择前，扣除令咒与 SAN
    E.setState(ui.snapshot);
    st = E.state();
    st.s.command = Math.max(0, st.s.command - 1);
    var loss = 1 + Math.floor(Math.random() * 3);
    st.s.san = Math.max(0, st.s.san - loss);
    E.addLog('你用掉一划令咒重掷（SAN −' + loss + '）');
    var o = b.o;
    var roll = E.roll(o.check.skill, (o.check.bonus || 0) + 30);
    var br = roll.ok ? o.ok : o.fail;
    var notes = E.apply(br.fx);
    notes.unshift('令咒 −1', 'SAN −' + loss);
    var nb = { o: o, paras: br.text, roll: roll, notes: notes, ok: roll.ok };
    ui.snapshot = clone(E.state());
    // 重掷后不可再掷（保留快照为当前状态）
    renderBeat(nb);
    // 去掉重掷按钮
    var acts = $('beat-actions');
    if (acts && acts.firstChild) acts.removeChild(acts.firstChild);
  }

  function advance() {
    var st = E.state();
    st.s.slot++;
    var D = currentDay();
    if (!D || st.s.slot >= D.slots.length) { advanceDay(); return; }
    E.save(); screen('screen-game'); renderSlot();
  }

  function advanceDay() {
    var st = E.state();
    var D = currentDay();
    // 结算夜晚：兽 +1
    if (st.s.slot >= (D ? D.slots.length : 0)) {
      var prevDay = st.s.day;
      st.s.day++;
      st.s.slot = 0;
      // 夜晚填格：这一天如果你什么都没踩住，就 +1（序章之夜不计）
      if (prevDay >= 1 && st.s.beastCutDay !== prevDay) {
        st.s.beast = Math.min(7, st.s.beast + 1);
        E.addLog('Day ' + prevDay + ' 结束：兽进度 +1（当前 ' + st.s.beast + '/7）');
      } else if (prevDay >= 1) {
        E.addLog('Day ' + prevDay + ' 结束：你踩住了刹车，兽没有动。');
      }
      if (st.s.day > 7) { finish(); return; }
      if (st.s.beast >= 7) { finish(); return; }
      if (st.s.demerit >= 10) { st.s.demerit = 0; st.s.exposure = Math.min(10, st.s.exposure + 2); st.s.flags.parentMeetingNow = true; E.addLog('扣分满 10：家长会，曝光 +2'); }
      if (st.s.exposure >= 10) { finish(); return; }
      if (st.s.day === 7 && (st.s.flags.videoViral || st.s.flags.sawVideoLive) && !st.s.flags.accountDead) {
        st.s.flags.doorOpen = true;
        E.addLog('Day 7：那个账号的播放量，已经没有人能算出总数了。');
      }
      E.save();
      audio(st.s.day >= 6 ? 'beast' : 'daily');
      const nxt = G.STORY[st.s.day];
      toast(nxt ? 'DAY ' + st.s.day + ' · ' + nxt.title : '');
      renderSlot();
      return;
    }
    E.save(); renderSlot();
  }

  /* ---------- 词条门控：接触过才解明 ---------- */
  var CODEX_GATE = {
    term: {
      '兽 · Ⅳ「攀比」': function (s) { return !!s.flags.knowBeast || s.beast >= 1; },
      '月假': function (s) { return s.day >= 4 || !!s.flags.leftSchool; },
      '宝具': function (s) { return !!s.flags.summoned; },
      '灵体化': function (s) { return !!s.flags.summoned; },
      '情报等级': function (s) { return Object.keys(s.clues).length > 0; }
    },
    place: {
      '行政楼顶 · 倒数牌': function () { return true; },
      '高三楼 C 座': function (s) { return s.day >= 1; },
      '食堂后厨': function (s) { return s.day >= 1; },
      '校医室': function (s) { return s.day >= 2; },
      '男生宿舍天台': function (s) { return s.day >= 2 || !!s.flags.metRuler; },
      '车棚': function (s) { return !!s.flags.metJiahao || s.day >= 1; },
      '体育馆 · 旧澡堂': function (s) { return s.day >= 3; },
      '图书馆 3F 封存库': function (s) { return s.day >= 4; },
      '后山 · 旧坟地': function (s) { return s.day >= 4 || !!s.flags.hillSeen; },
      '旧防空洞': function (s) { return s.day >= 5; },
      '5G 基站 · 高压线': function (s) { return s.day >= 5; },
      '操场跑道': function (s) { return s.day >= 6 || !!s.flags.arenaSeen; }
    },
    faction: {
      '教务处（监督管理委员会）': function () { return true; },
      '食堂与小卖部（魔术协会远东支部）': function (s) { return s.day >= 2; },
      '学生会（中立情报商）': function (s) { return s.day >= 2 || !!s.flags.metLin; },
      '校医室（圣堂教会第八秘迹会）': function (s) { return s.day >= 3; }
    }
  };
  var SPEEDS = [{ v: 1.9, n: '慢' }, { v: 1, n: '中' }, { v: 0.55, n: '快' }, { v: 0, n: '瞬显' }];
  function speedIdx() {
    try { var v = localStorage.getItem('grail_speed'); if (v != null) { var i = +v; if (i >= 0 && i < SPEEDS.length) return i; } } catch (e) {}
    return 1;
  }
  function speedLabel() { return SPEEDS[speedIdx()].n; }
  function cycleSpeed() {
    var i = (speedIdx() + 1) % SPEEDS.length;
    try { localStorage.setItem('grail_speed', String(i)); } catch (e) {}
    toast('文字速度：' + SPEEDS[i].n);
  }

  function codexOpen(kind, name, st) {
    var fn = (CODEX_GATE[kind] || {})[name];
    if (!fn) return true;
    try { return !!fn(st.s); } catch (e) { return true; }
  }

  /* ---------- 档案夹 ---------- */
  function renderDossier() {
    var st = E.state(); if (!st) return;
    var sv = G.servant(st.servantId), m = G.master(st.masterId), r = G.route(st.routeId);
    var html = '<div class="side-card"><div class="side-portrait"><img src="' + sv.portrait + '" alt="" onerror="this.style.display=\'none\'"></div>' +
      '<div class="body"><div style="font-family:var(--hei);font-size:10px;letter-spacing:.24em;color:var(--ink-3)">' + sv.cls + ' ｜ 相性 ' + st.affinity.level + '</div>' +
      '<div style="font-size:18px;margin:2px 0 2px">' + esc(sv.name) + '</div>' +
      '<div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-3)">' + esc(sv.alias) + '</div></div></div>';

    html += '<div class="side-card"><div class="tabs">' +
      ['servant:从者', 'intel:情报', 'codex:词条', 'audio:音源', 'log:记录'].map(function (t) {
        var k = t.split(':')[0];
        return '<button data-tab="' + k + '" class="' + (ui.tab === k ? 'on' : '') + '">' + t.split(':')[1] + '</button>';
      }).join('') + '</div>';

    // 从者
    html += '<div class="tab-panel ' + (ui.tab === 'servant' ? 'on' : '') + '" data-panel="servant">' +
      '<div class="statgrid">' + ['STR', 'DEX', 'CON', 'POW'].map(function (k) {
        return '<div><b>' + sv.stats[k] + '</b><span>' + k + '</span></div>';
      }).join('') + '</div>' +
      sv.classSkills.map(function (s) { return '<h5>' + esc(s[0]) + '</h5><p>' + esc(s[1]) + '</p>'; }).join('') +
      sv.skills.map(function (s) { return '<h5>' + esc(s[0]) + '</h5><p>' + esc(s[1]) + '</p>'; }).join('') +
      '<h5>宝具</h5>' + sv.noble.map(function (n) {
        return '<p><b>' + esc(n[0]) + '</b><br><span style="font-family:var(--mono);font-size:10.5px;color:var(--ink-3)">' + esc(n[1]) + '</span><br>' + esc(n[2]) + '</p>';
      }).join('') +
      '<h5>传说弱点</h5><p><b>' + esc(sv.weakness[0]) + '</b><br>' + esc(sv.weakness[1]) + '</p>' +
      '<h5>扮演提示</h5>' + sv.play.map(function (p) { return '<div class="li">' + esc(p) + '</div>'; }).join('') +
      (function () {
        var qs = (CODEX.servantQuotes || []).filter(function (q) { return q.role === sv.cls; })[0];
        if (!qs) return '';
        return '<h5>语录 · 备用弹药</h5>' + qs.lines.map(function (l) { return '<div class="li">' + esc(l) + '</div>'; }).join('');
      })() +
      '</div>';

    // 情报
    var intel = '<div class="intel-grid">';
    ['saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker', 'ruler'].forEach(function (id) {
      var s2 = G.servant(id), lv = st.s.clues[id] || 0;
      var mine = (id === st.servantId);
      if (mine) lv = 5;
      var known = lv >= 3;
      var seenKey = 'seen_' + id;
      var prev = st.s.flags[seenKey] || 0;
      var just = (!mine && lv > prev) ? ' just-revealed' : '';
      if (!mine && lv > prev) st.s.flags[seenKey] = lv;
      var iv2 = intelView(id, Math.min(lv, 5));
      intel += '<div class="intel-card' + just + '">' +
        '<div class="ip" data-mark="' + (lv ? E.roman(lv) : '？') + '">' +
        '<img loading="lazy" decoding="async" class="' + iv2.cls + '" src="' + iv2.src + '" alt="" onerror="this.style.display=\'none\'"></div>' +
        '<div class="in"><b>' + (known || mine ? esc(s2.name) : '？？？') + '</b>' +
        s2.cls + (mine ? ' · 你的从者' : (lv ? '' : ' · 未解明')) + '</div></div>';
    });
    intel += '</div>';
    intel += '<h5>你的职介线</h5><p>' + esc(r.name) + '：' + esc(r.perk) + '</p>' +
      '<h5>在场御主</h5><p>' + st.s.alive + ' / 7　盟友 ' + st.s.allies + '</p>' +
      '<p style="color:var(--ink-3)">情报等级 Ⅰ 传闻 / Ⅱ 外观 / Ⅲ 真名 / Ⅳ 弱点 / Ⅴ 宝具。等级越高，那张脸越清楚。</p>';
    html += '<div class="tab-panel ' + (ui.tab === 'intel' ? 'on' : '') + '" data-panel="intel">' + intel + '</div>';

    // 词条（只显示已经接触到的部分，其余留占位）
    var cx = '';
    var secretLine = function (n) {
      return '<p class="codex-locked"><b>未接触</b>　<span>' + n + ' 条尚未解明</span></p>';
    };
    if (CODEX.terms) {
      var openTerms = [], lockTerms = 0;
      CODEX.terms.forEach(function (t) {
        if (codexOpen('term', t.term, st)) openTerms.push(t); else lockTerms++;
      });
      cx += '<h5>名词档案</h5>' + openTerms.map(function (t) {
        return '<p><b>' + esc(t.term) + '</b>　<span style="font-family:var(--mono);font-size:10px;color:var(--ink-3)">' + esc(t.en || '') + '</span><br>' + esc(t.desc) + '</p>';
      }).join('') + (lockTerms ? secretLine(lockTerms) : '');
    }
    if (CODEX.places) {
      var openP = [], lockP = 0;
      CODEX.places.forEach(function (p) {
        if (codexOpen('place', p.name, st)) openP.push(p); else lockP++;
      });
      cx += '<h5>去过的地方</h5>' + openP.map(function (p) {
        return '<p><b>' + esc(p.name) + '</b>　<span style="font-size:10.5px;color:var(--ink-3)">' + esc(p.risk || '') + '</span><br>' + esc(p.desc) + '</p>';
      }).join('') + (lockP ? secretLine(lockP) : '');
    }
    if (CODEX.factions) {
      var openF = [], lockF = 0;
      CODEX.factions.forEach(function (f) {
        if (codexOpen('faction', f.name, st)) openF.push(f); else lockF++;
      });
      cx += '<h5>势力</h5>' + openF.map(function (f) {
        return '<p><b>' + esc(f.name) + '</b><br>' + esc(f.desc) + '</p>';
      }).join('') + (lockF ? secretLine(lockF) : '');
    }
    cx += '<p class="codex-tip">没解明的内容不会提前出现。想补全，去档案馆（通关后开放）。</p>';
    html += '<div class="tab-panel ' + (ui.tab === 'codex' ? 'on' : '') + '" data-panel="codex">' + (cx || '<p>档案尚未录入。</p>') + '</div>';

    // 音源（名单不解明就不给看）
    var au = '';
    if (window.GrailAudio && window.GrailAudio.tracks) {
      var mineId = st.servantId, knownCount = 0, hiddenCount = 0;
      au += '<h5>在场频段</h5>';
      window.GrailAudio.tracks.forEach(function (t) {
        var sv2 = G.servant(t.id);
        var lv = (t.id === mineId) ? 5 : (st.s.clues[t.id] || 0);
        if (lv < 3) {
          hiddenCount++;
          au += '<p class="codex-locked"><b>— — —</b>　<span>一个还没对上号的频段</span></p>';
          return;
        }
        knownCount++;
        au += '<p><b>' + (sv2 ? sv2.cls + ' · ' + sv2.name : t.id) + '</b>　' + esc(t.title) +
          '　<span style="font-size:10.5px;color:var(--ink-3)">' + esc(t.artist || '') + '</span><br>' +
          '<span style="font-size:11.5px;color:var(--ink-3)">' + esc(t.note || '') + '</span><br>' +
          '<a href="' + t.links.netease + '" target="_blank" rel="noopener" style="color:var(--blue);font-size:11px">网易云</a>　' +
          '<a href="' + t.links.bilibili + '" target="_blank" rel="noopener" style="color:var(--blue);font-size:11px">B站</a></p>';
      });
      au += '<p style="font-size:11px;color:var(--ink-3);border-top:1px solid var(--line);padding-top:8px">' +
        '已对上 ' + knownCount + ' 个频段，还有 ' + hiddenCount + ' 个没解明。别人的主题曲只在两种时候响：宝具释放、真名解放。</p>';
    } else {
      au = '<p>音频模块未加载。</p>';
    }
    html += '<div class="tab-panel ' + (ui.tab === 'audio' ? 'on' : '') + '" data-panel="audio">' + au + '</div>';

    // 记录
    var logs = (st.log || []).slice(-40).reverse().map(function (l) { return '<div class="log-line">' + esc(l) + '</div>'; }).join('');
    html += '<div class="tab-panel ' + (ui.tab === 'log' ? 'on' : '') + '" data-panel="log">' +
      (logs || '<p>暂无记录。</p>') + '</div></div>';

    html += '<div class="side-card"><div class="body" style="font-family:var(--hei);font-size:11px;letter-spacing:.1em;color:var(--ink-3)">' +
      '御主 ' + esc(m.name) + '　｜　' + esc(r.name) + '线<br>' +
      '<button id="btn-save" style="all:unset;cursor:pointer;border-bottom:1px solid var(--line);margin-top:8px;display:inline-block">手动存档</button>　' +
      '<button id="btn-speed" style="all:unset;cursor:pointer;border-bottom:1px solid var(--line);margin-left:10px">文字：' + speedLabel() + '</button>　' +
      '<button id="btn-quit" style="all:unset;cursor:pointer;border-bottom:1px solid var(--line)">回到封面</button>' +
      '</div></div>';

    $('dossier').innerHTML = html;
    $('dossier').querySelectorAll('.tabs button').forEach(function (b) {
      b.onclick = function () { ui.tab = b.getAttribute('data-tab'); renderDossier(); };
    });
    var bs = $('btn-save'); if (bs) bs.onclick = function () { openSlots('save'); };
    var bsp = $('btn-speed');
    if (bsp) bsp.onclick = function () { cycleSpeed(); renderDossier(); };
    var bq = $('btn-quit'); if (bq) bq.onclick = function () { E.save(); screen('screen-title'); initTitle(); audio('title'); };
  }

  /* ---------- 结局 ---------- */
  function finish() {
    var st = E.state();
    // 决战线：若最后选项是许愿，则进入许愿分支
    var id = G.judgeEnding(st);
    var e = G.ENDINGS[id];
    var world = G.WORLD[Math.floor(Math.random() * G.WORLD.length)];
    var epi = '';
    if (CODEX.epilogues && CODEX.epilogues[id]) epi = CODEX.epilogues[id];
    var sv = G.servant(st.servantId), m = G.master(st.masterId);

    // 结案前：一次重故障，把「档案」撕开
    try {
      if (window.GrailAVG && window.GrailAVG.glitchBurst) {
        window.GrailAVG.glitchBurst('scene_led', { dur: 680, hard: true });
        setTimeout(function () { window.GrailAVG.glitchBurst(null, { dur: 420 }); }, 260);
      }
    } catch (e) { }

    try { archiveRecord(id, st); } catch (e) {}

    var root = $('ending-root');
    root.innerHTML =
      '<div class="doc-head"><span>结案报告</span><span class="mid">冀州第一中学 · 第七次圣杯战争</span><span class="no">' + id + '</span></div>' +
      '<div class="ending-head"><div class="ending-no">' + e.no + ' ｜ ' + esc(e.en) + '</div>' +
      '<h1 class="ending-name">' + esc(e.name) + '</h1>' +
      '<div class="ending-one">' + esc(e.one) + '</div></div>' +
      '<div class="ending-body">' + e.text.map(function (p) { return '<p class="reveal">' + esc(p) + '</p>'; }).join('') + '</div>' +
      (epi ? '<div class="ending-body" style="margin-top:26px">' + String(epi).split(/\n\n+/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' : '') +
      (extraAfter.length ? '<div class="ending-body" style="margin-top:26px">' + extraAfter.map(function (p) { return '<p class="reveal">' + esc(p) + '</p>'; }).join('') + '</div>' : '') +
      (extraServant ? '<div class="ending-body" style="margin-top:26px"><div style="font-family:var(--mono);font-size:10px;letter-spacing:.3em;color:var(--red);margin-bottom:8px">从者 · ' + esc(sv.cls) + '</div><p>' + esc(extraServant) + '</p></div>' : '') +
      '<div class="ending-tail">' + esc(e.tail) + '</div>' +
      '<div class="world-card"><div class="hd">世界状态 · 1D10</div>' + esc(world) + '</div>' +
      '<table class="score-table">' +
      '<tr><td>最终 SAN</td><td>' + st.s.san + ' / ' + st.s.sanMax + '</td></tr>' +
      '<tr><td>曝光度</td><td>' + st.s.exposure + ' / 10</td></tr>' +
      '<tr><td>兽 · Ⅳ 进度</td><td>' + st.s.beast + ' / 7</td></tr>' +
      '<tr><td>令咒剩余</td><td>' + st.s.command + ' / 3</td></tr>' +
      '<tr><td>掌握的真名</td><td>' + Object.keys(st.s.clues).filter(function (k) { return st.s.clues[k] >= 3; }).length + ' / 8</td></tr>' +
      '<tr><td>御主 · 从者</td><td>' + esc(m.name) + ' ／ ' + esc(sv.name) + '</td></tr>' +
      '</table>' +
      '<div class="ending-body" style="margin-top:34px;text-align:center;font-family:var(--hei);letter-spacing:.2em;color:var(--ink-3);font-size:12px">' +
      '距高考还有 ' + Math.max(0, 178 - st.s.day - 3) + ' 天</div>' +
      '<div class="btn-row" style="justify-content:center">' +
      '<button class="btn btn--solid" id="btn-again">重新入学</button>' +
      '<button class="btn" id="btn-backtitle">回到封面</button></div>' +
      '<div class="doc-foot"><span>教务处 · 备案</span><span>第 81 页 / 共 81 页</span><span>严禁外传</span></div>';

    audio(e.tone === 'warm' ? 'ending_warm' : 'ending_dark');
    screen('screen-ending');
    if (id === 'E9' && window.GrailAVG) {
      window.GrailAVG.stinger('beast', { title: '满分', sub: '你是第几？' }, function () {});
    }
    setTimeout(settle, 700);
    E.clearSave();
    $('btn-again').onclick = function () { ui.q = 0; ui.answers = {}; screen('screen-quiz'); audio('quiz'); renderQuiz(); };
    $('btn-backtitle').onclick = function () { screen('screen-title'); initTitle(); audio('title'); };
  }

  /* ---------- 音量 ---------- */
  function initAudioBar() {
    var mute = $('btn-mute'), vol = $('vol'), now = $('audio-now');
    function paint() {
      if (!window.GrailAudio) return;
      mute.textContent = window.GrailAudio.isMuted() ? '×' : '♪';
      vol.value = Math.round(window.GrailAudio.getVolume() * 100);
      var cur = window.GrailAudio.current();
      var t = (window.GrailAudio.themes && window.GrailAudio.themes[cur]) || null;
      now.textContent = t && t.title ? t.title : (cur || '—');
    }
    mute.onclick = function () { if (window.GrailAudio) { window.GrailAudio.toggleMute(); paint(); } };
    vol.oninput = function () { if (window.GrailAudio) window.GrailAudio.setVolume(vol.value / 100); paint(); };
    if (window.GrailAudio) window.GrailAudio.onStateChange(paint);
    paint();
    var first = function () {
      if (window.GrailAudio) { window.GrailAudio.init(); window.GrailAudio.setVolume(vol.value / 100); }
      document.removeEventListener('pointerdown', first);
      paint();
    };
    document.addEventListener('pointerdown', first, { once: true });
  }

  /* ---------- 手机抽屉 ---------- */
  function initDrawer() {
    var t = $('side-toggle'), side = $('side');
    t.onclick = function () {
      side.classList.toggle('open');
      $('side-mark').textContent = side.classList.contains('open') ? '－' : '＋';
    };
  }

  /* ---------- 启动 ---------- */
  function fatal(e) {
    var d = document.getElementById('errbox') || (function () {
      var x = document.createElement('div'); x.id = 'errbox';
      x.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#8c2b22;color:#f4ecda;font:12px/1.7 monospace;padding:10px 14px;max-height:46vh;overflow:auto;white-space:pre-wrap';
      document.body.appendChild(x); return x;
    })();
    d.textContent += '[BOOT] ' + (e && e.message ? e.message : e) + '\n' + ((e && e.stack) || '') + '\n';
  }

  function devHook() {
    var qs = (location.hash || '') + (location.search || '');
    var m = qs.match(/dev=(\w+)/);
    if (!m) return;
    var preset = { q1: 'A', q2: 'B', q3: 'A', q4: 'B', q5: 'A', q6: 'A' };
    ui.answers = preset;
    if (m[1] === 'click') {
      setTimeout(function () { var b = document.getElementById('btn-start'); if (b) b.click(); }, 400);
    } else if (m[1] === 'quiz') { screen('screen-quiz'); renderQuiz(); }
    else if (m[1] === 'assign') { assign(); screen('screen-assign'); }
    else if (m[1] === 'ending') {
      E.create(preset);
      var st0 = E.state();
      st0.s.beast = 2; st0.s.exposure = 4; st0.s.flags.wishWin = true;
      st0.log = ['你许愿：让我赢。'];
      finish();
    } else if (m[1] === 'beat') {
      E.create(preset); screen('screen-game'); renderSlot();
      setTimeout(function () {
        var c = document.querySelector('#opts .choice');
        if (c) c.click();
      }, 200);
    } else if (m[1] === 'beast') {
      E.create(preset); screen('screen-game'); renderSlot();
      setTimeout(function () { window.GrailAVG.stinger('beast', { title: '攀比', sub: '你是第几？' }, function () {}); }, 400);
    } else if (m[1] === 'bondclick') {
      E.create(preset); screen('screen-game');
      var sb2 = E.state(); sb2.s.day = 2; sb2.s.slot = 2; renderSlot();
      setTimeout(function () {
        var cs = document.querySelectorAll('#opts .choice');
        if (cs.length) cs[cs.length - 1].click();
      }, 500);
    } else if (m[1] === 'auto') {
      E.create(preset); screen('screen-game'); renderSlot();
      var steps = 0;
      var tick = setInterval(function () {
        steps++;
        if (steps > 40) { clearInterval(tick); return; }
        var c = document.querySelector('#opts .choice:not([disabled])');
        var nb = document.querySelector('#beat-actions .btn--solid');
        var wish = document.querySelector('#wish-list .choice');
        if (wish) { wish.click(); return; }
        if (c) { c.click(); return; }
        if (nb) { nb.click(); return; }
      }, 420);
    } else if (m[1] === 'exam') {
      E.create(preset); screen('screen-game'); renderSlot();
      setTimeout(function () { startExam({ label: '月考' }); }, 300);
    } else if (m[1] === 'map') {
      E.create(preset); screen('screen-game');
      var sm = E.state(); sm.s.day = 1; sm.s.slot = 0; renderSlot();
    } else if (m[1] === 'noble') {
      E.create(preset); screen('screen-game'); renderSlot();
      var svn = G.servant(E.state().servantId);
      setTimeout(function () {
        window.GrailAVG.stinger('noble', { cls: svn.cls, title: svn.noble[0][0], sub: svn.one || '', color: svn.tint || '#b23a2e' }, function () {});
      }, 400);
    } else if (m[1] === 'summon') {
      E.create(preset); screen('screen-game'); renderSlot();
      var svs = G.servant(E.state().servantId);
      setTimeout(function () {
        window.GrailAVG.stinger('summon', { cls: svs.cls, name: svs.name, id: svs.id }, function () {});
      }, 400);
    } else if (m[1] === 'beastfight') {
      E.create(preset); screen('screen-game');
      var sb = E.state(); sb.s.day = 7; sb.s.slot = 2; sb.s.allies = 3; renderSlot();
    } else if (m[1] === 'd6b') {
      E.create(preset); screen('screen-game');
      var s6 = E.state(); s6.s.day = 6; s6.s.slot = 1; renderSlot();
    } else if (m[1] === 'battle') {
      E.create(preset); screen('screen-game'); renderSlot();
      setTimeout(function () {
        startBattle({ battle: { foe: 'archer', title: '车棚里的遭遇', clueLv: 3 }, label: '对上 ARCHER' });
      }, 300);
    } else if (m[1] === 'burst') {
      E.create(preset); screen('screen-game'); renderSlot();
      setInterval(function () {
        if (window.GrailAVG && window.GrailAVG.glitchBurst) window.GrailAVG.glitchBurst('scene_radio', { dur: 900 });
      }, 1100);
    } else if (m[1] === 'intel') {
      E.create(preset); screen('screen-game');
      var si = E.state();
      si.s.clues = { saber: 0, archer: 1, lancer: 2, rider: 3, caster: 4, assassin: 5, berserker: 2, ruler: 3 };
      ui.tab = 'intel';
      renderSlot();
    } else if (m[1] === 'e2e') {
      // 全流程自测：封面 → 九题 → 相性 → 签收 → 推进若干时段。结果写入 #e2e-out
      var out = document.createElement('pre');
      out.id = 'e2e-out';
      out.style.cssText = 'position:fixed;left:0;top:0;z-index:99998;background:#0b0f0d;color:#c8f0c0;font:12px/1.55 monospace;padding:10px;margin:0;max-width:100%;white-space:pre-wrap';
      document.body.appendChild(out);
      var lines = [];
      var log = function (s) { lines.push(s); out.textContent = 'RESULT\n' + lines.join('\n'); };
      var errOf = function () {
        var e = document.getElementById('errbox');
        return e ? e.textContent.replace(/\s+/g, ' ').slice(0, 260) : 'none';
      };
      var step = function (ms, fn) { setTimeout(fn, ms); };
      var seq = [];
      var run = function () {
        if (!seq.length) { log('DONE errbox: ' + errOf()); return; }
        var it = seq.shift();
        try { it[0](); } catch (e) { log('EXCEPTION ' + e.message); }
        step(it[1] || 140, run);
      };
      seq.push([function () {
        E.clearSave(); ui.q = 0; ui.answers = {};
        log('errbox boot: ' + errOf());
        var b = document.getElementById('btn-start');
        log('cover btn: ' + !!b); if (b) b.click();
      }, 260]);
      seq.push([function () {
        if (!document.querySelector('#screen-quiz.is-active')) {
          var b = document.getElementById('btn-start'); if (b) b.click();
        }
        log('quiz active: ' + !!document.querySelector('#screen-quiz.is-active') + ' / choices ' + document.querySelectorAll('#quiz-root .choice').length);
      }, 200]);
      for (var qi = 0; qi < 12; qi++) {
        seq.push([function () {
          var on = document.querySelector('#screen-quiz.is-active');
          if (!on) return;
          var cs = document.querySelectorAll('#quiz-root .choice');
          if (!cs.length) { log('no choice!'); return; }
          cs[0].click();
          log('answer ' + (ui.q + 1) + ' -> ' + (document.querySelector('#screen-assign.is-active') ? 'ASSIGN' : (document.querySelector('#screen-quiz.is-active') ? 'quiz' : 'other')));
        }, 120]);
      }
      seq.push([function () {
        log('assign active: ' + !!document.querySelector('#screen-assign.is-active') + ' errbox: ' + errOf());
        var s = document.getElementById('btn-sign');
        log('sign btn: ' + !!s); if (s) s.click();
      }, 320]);
      seq.push([function () {
        log('game active: ' + !!document.querySelector('#screen-game.is-active'));
        var sr = document.getElementById('story-root');
        log('story chars: ' + (sr ? sr.textContent.trim().length : -1) + ' / beats btn ' + document.querySelectorAll('#story-root .btn').length);
        log('hud cells: ' + document.querySelectorAll('#hud .cell').length + ' / dossier ' + (document.getElementById('dossier') || {}).innerHTML.length);
      }, 260]);
      for (var pi = 0; pi < 8; pi++) {
        seq.push([function () {
          var opts = document.querySelectorAll('#opts .choice:not([disabled])');
          var next = document.querySelector('#beat-actions .btn--solid');
          var wish = document.querySelector('#wish-list .choice');
          if (wish) { wish.click(); log('wish picked'); return; }
          if (opts.length) { opts[0].click(); log('option picked'); return; }
          if (next) { next.click(); log('continue -> slot ' + (E.state() ? E.state().s.slot : '?')); return; }
          log('STUCK: no option / no continue');
        }, 460]);
      }
      seq.push([function () {
        var st = E.state();
        log('state: day ' + (st ? st.s.day : '?') + ' slot ' + (st ? st.s.slot : '?') + ' san ' + (st ? st.s.san : '?'));
        log('audio now: ' + (document.getElementById('audio-now') || {}).textContent);
        log('GrailAudio: ' + (window.GrailAudio ? 'ok tracks=' + (window.GrailAudio.tracks || []).length : 'MISSING'));
        log('DONE errbox: ' + errOf());
      }, 200]);
      run();
    } else if (m[1] === 'bond') {
      E.create(preset); screen('screen-game');
      var sb = E.state(); sb.s.day = 2; sb.s.slot = 2; renderSlot();
    } else { E.create(preset); screen('screen-game'); renderSlot(); }
  }

  function boot() {
    try { initTitle(); } catch (e) { fatal(e); }
    try { initAudioBar(); } catch (e) { fatal(e); }
    try { initDrawer(); } catch (e) { fatal(e); }
    try { screen('screen-title'); audio('title'); } catch (e) { fatal(e); }
    try { devHook(); } catch (e) { fatal(e); }
    window.addEventListener('beforeunload', function () { try { if (E.state()) E.save(); } catch (e) {} });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
