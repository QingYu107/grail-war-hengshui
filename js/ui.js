/* UI 渲染与流程 */
(function () {
  'use strict';
  var G = window.GRAIL;
  var E = G.Engine;
  var CODEX = window.GRAIL_CODEX || {};
  var ui = { q: 0, answers: {}, beat: null, snapshot: null, tab: 'servant', wishOpen: false, mapOpen: false };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  /* 正文白名单：数据里只允许 <span class="dialog"> 这一种行内标记。
     先整体转义，再把白名单标签放回来 —— 别的尖括号仍旧当文本处理。 */
  function rich(s) {
    return esc(s)
      .replace(/&lt;span class="dialog"&gt;/g, '<span class="dialog">')
      .replace(/&lt;\/span&gt;/g, '</span>');
  }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  /* 关键词高亮：让正文有节奏，而不是一整块灰 */
  var KW = ['倒数牌', '圣杯战争', '圣杯', '令咒', '灵体化', '真名', '宝具', '曝光', '扣分', '职阶', '御主', '从者'];
  function markup(t) {
    var s = String(t);
    KW.forEach(function (k) {
      s = s.split(k).join('<em class="kw">' + k + '</em>');
    });
    return s;
  }
  /* 文字速度：以前只作用于打字机，正文的逐段浮现还是固定 90ms，
     把「快 / 瞬显」调了也看不出区别。这里让正文一起走同一档。 */
  var SPEED_MULT = [1.9, 1, 0.55, 0];
  function speedMult() {
    try {
      var v = localStorage.getItem('grail_speed');
      if (v != null && SPEED_MULT[+v] != null) return SPEED_MULT[+v];
    } catch (e) {}
    return 1;
  }
  function paras(arr, drop) {
    var m = speedMult(), instant = m === 0;
    return (arr || []).map(function (t, i) {
      var cls = 'reveal' + (i === 0 && drop ? ' drop' : '') + (instant ? ' settled' : '');
      var raw = String(t).trim();
      if (/^「[^「」]{2,}」$/.test(raw) || /^「[^「」]{2,}」[。！？…]?$/.test(raw)) cls += ' dialogue';
      var delay = Math.round(i * 90 * m), dur = Math.round(500 * Math.max(0.4, m));
      return '<p class="' + cls + '" style="animation-delay:' + delay + 'ms;animation-duration:' + dur + 'ms">' + markup(t) + '</p>';
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
  /* 场景 BGM：后段（Day 6 起）整体转成「异物」的底噪 */
  function sceneTheme() {
    var st = E.state();
    return (st && st.s.day >= 6) ? 'beast' : 'daily';
  }
  /* 从者曲只属于宝具 / 召唤那一幕；离开那一幕就交还场景曲 */
  function backToScene() {
    try {
      if (!window.GrailAudio) return;
      var cur = window.GrailAudio.current();
      if (cur && G.servant(cur)) audio(sceneTheme());
    } catch (e) {}
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
            audio(sceneTheme());
            screen('screen-game');
            renderSlot();
            layer.remove();
          } else { toast('那一格是空的'); }
        }
      };
    });
  }

  /* ---------- 设置页 ----------
     音量以前只有底部那条小滑杆，静音则只静 BGM、音效照响。
     这里把「声音 / 文字 / 动效 / 存档」四块收进一个页面，封面和游戏内都能进来。 */
  var SETTINGS_KEY = 'grail_settings_v1';
  function settings(fresh) {
    var d = { vol: 55, muted: false, sfx: true, speed: 1, fx: 'full' };
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        Object.keys(d).forEach(function (k) { if (o[k] != null) d[k] = o[k]; });
      } else if (!fresh) {
        /* 兼容旧版本：以前音量与静音只存在 audio 模块里，速度单独一个键 */
        if (window.GrailAudio) {
          d.muted = !!window.GrailAudio.isMuted();
          var v = window.GrailAudio.getVolume();
          if (typeof v === 'number') d.vol = Math.round(v * 100);
        }
        var sv = localStorage.getItem('grail_speed');
        if (sv != null) d.speed = +sv;
      }
    } catch (e) {}
    return d;
  }
  function saveSettings(o) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(o)); } catch (e) {}
    applySettings(o);
  }
  function applySettings(o) {
    try {
      if (window.GrailAudio) {
        window.GrailAudio.setVolume((o.vol == null ? 55 : o.vol) / 100);
        if (window.GrailAudio.isMuted() !== !!o.muted) window.GrailAudio.toggleMute();
      }
      /* 静音以前只管 BGM：打字、骰子、盖章还在响，玩家会以为是 bug。 */
      if (window.GrailSFX) window.GrailSFX.setMuted(!o.sfx || !!o.muted);
      localStorage.setItem('grail_speed', String(o.speed == null ? 1 : o.speed));
      localStorage.setItem('grail_fx', o.fx === 'lite' ? 'lite' : 'full');
    } catch (e) {}
    var vol = $('vol'), mute = $('btn-mute');
    if (vol) vol.value = Math.round(o.vol == null ? 55 : o.vol);
    if (mute) mute.textContent = o.muted ? '×' : '♪';
  }
  /* 动效强度：lite 时不抖屏、故障闪减半，其余演出照旧 */
  function fxLite() {
    try { return localStorage.getItem('grail_fx') === 'lite'; } catch (e) { return false; }
  }

  function openSettings() {
    var old = document.getElementById('set-layer');
    if (old) old.remove();
    var cur = settings(false);
    var speeds = ['慢', '中', '快', '瞬显'];
    var layer = document.createElement('div');
    layer.id = 'set-layer';
    layer.className = 'modal-layer';
    var saveRows = E.listSaves().map(function (s) {
      var t = s.empty ? '空档案位' : ('Day ' + s.day + '　' + (G.servant(s.servant) ? G.servant(s.servant).cls : '') +
        '　SAN ' + s.san + (s.bond ? '　羁绊 LV.' + s.bond : ''));
      return '<div class="set-slot"><span class="sn">档案 ' + s.slot + '</span>' +
        '<span class="st">' + esc(t) + '</span>' +
        '<button class="mini" data-act="load" data-slot="' + s.slot + '"' + (s.empty ? ' disabled' : '') + '>读取</button>' +
        '<button class="mini" data-act="save" data-slot="' + s.slot + '">存入</button>' +
        '<button class="mini danger" data-act="del" data-slot="' + s.slot + '"' + (s.empty ? ' disabled' : '') + '>删除</button></div>';
    }).join('');
    layer.innerHTML =
      '<div class="modal wide set-modal">' +
      '<div class="mk">设 置</div>' +

      '<div class="set-sec"><h5>声音</h5>' +
      '<div class="set-row"><span>主音量</span><input id="set-vol" type="range" min="0" max="100" value="' + (cur.vol == null ? 55 : cur.vol) + '">' +
      '<b id="set-vol-v">' + (cur.vol == null ? 55 : cur.vol) + '</b></div>' +
      '<div class="set-row"><span>全部静音</span><button class="switch' + (cur.muted ? ' on' : '') + '" id="set-mute">' + (cur.muted ? '开' : '关') + '</button></div>' +
      '<div class="set-row"><span>音效（打字 / 骰子 / 盖章）</span><button class="switch' + (cur.sfx ? ' on' : '') + '" id="set-sfx">' + (cur.sfx ? '开' : '关') + '</button></div>' +
      '</div>' +

      '<div class="set-sec"><h5>文字</h5>' +
      '<div class="set-row"><span>速度</span><div class="seg" id="set-speed">' +
      speeds.map(function (n, i) {
        return '<button class="mini' + (cur.speed === i ? ' on' : '') + '" data-speed="' + i + '">' + n + '</button>';
      }).join('') + '</div></div>' +
      '<p class="set-tip">「瞬显」会把正文和打字机一起关掉，只看结果。</p>' +
      '</div>' +

      '<div class="set-sec"><h5>画面</h5>' +
      '<div class="set-row"><span>故障闪与抖屏</span><div class="seg" id="set-fx">' +
      '<button class="mini' + (cur.fx !== 'lite' ? ' on' : '') + '" data-fx="full">全开</button>' +
      '<button class="mini' + (cur.fx === 'lite' ? ' on' : '') + '" data-fx="lite">减弱</button>' +
      '</div></div>' +
      '<p class="set-tip">「减弱」不关演出，只是不再抖屏、故障闪变短。</p>' +
      '</div>' +

      '<div class="set-sec"><h5>存档</h5>' + (saveRows || '<p>没有档案位。</p>') +
      '<p class="set-tip">自动存档随时在写，不会顶掉这三个位置。</p></div>' +

      '<div class="set-sec"><h5>重置</h5>' +
      '<div class="set-row"><span>清空全部进度（存档 / 档案馆 / 设置）</span>' +
      '<button class="mini danger" id="set-wipe">清空</button></div></div>' +

      '<div class="modal-foot"><button class="btn btn--solid" id="set-close">关上</button></div>' +
      '</div>';
    document.body.appendChild(layer);
    layer.onclick = function (e) { if (e.target === layer) layer.remove(); };
    layer.querySelector('#set-close').onclick = function () { layer.remove(); };

    function refresh() {
      var s = settings(false);
      var bm = layer.querySelector('#set-mute'), bs = layer.querySelector('#set-sfx');
      if (bm) { bm.classList.toggle('on', !!s.muted); bm.textContent = s.muted ? '开' : '关'; }
      if (bs) { bs.classList.toggle('on', !!s.sfx); bs.textContent = s.sfx ? '开' : '关'; }
      layer.querySelectorAll('#set-speed .mini').forEach(function (b) {
        b.classList.toggle('on', +b.getAttribute('data-speed') === s.speed);
      });
      layer.querySelectorAll('#set-fx .mini').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-fx') === s.fx);
      });
    }
    var vol = layer.querySelector('#set-vol');
    vol.oninput = function () {
      var s = settings(false); s.vol = +vol.value;
      layer.querySelector('#set-vol-v').textContent = s.vol;
      saveSettings(s);
    };
    layer.querySelector('#set-mute').onclick = function () {
      var s = settings(false); s.muted = !s.muted; saveSettings(s); refresh();
    };
    layer.querySelector('#set-sfx').onclick = function () {
      var s = settings(false); s.sfx = !s.sfx; saveSettings(s); refresh();
    };
    layer.querySelectorAll('#set-speed .mini').forEach(function (b) {
      b.onclick = function () {
        var s = settings(false); s.speed = +b.getAttribute('data-speed');
        saveSettings(s); refresh(); renderDossier();
      };
    });
    layer.querySelectorAll('#set-fx .mini').forEach(function (b) {
      b.onclick = function () {
        var s = settings(false); s.fx = b.getAttribute('data-fx');
        saveSettings(s); refresh();
      };
    });
    layer.querySelectorAll('.set-slot .mini').forEach(function (b) {
      b.onclick = function () {
        var n = +b.getAttribute('data-slot'), act = b.getAttribute('data-act');
        if (act === 'save') {
          if (!E.state()) { toast('还没开局，没有可存的进度'); return; }
          E.save(n); toast('已存入档案 ' + n); layer.remove(); openSettings(); return;
        }
        if (act === 'load') {
          if (!E.load(n)) { toast('那一格是空的'); return; }
          resetSession(); audio(sceneTheme()); screen('screen-game'); layer.remove(); renderSlot();
          toast('读取档案 ' + n);
          return;
        }
        if (act === 'del') {
          E.deleteSave(n); toast('已删除档案 ' + n); layer.remove(); openSettings(); return;
        }
      };
    });
    layer.querySelector('#set-wipe').onclick = function () {
      var btn = this;
      if (btn.getAttribute('data-armed') !== '1') {
        btn.setAttribute('data-armed', '1'); btn.textContent = '再点一次，全部清空';
        return;
      }
      try {
        localStorage.clear();
      } catch (e) {}
      toast('已清空。下一局是新的档案。');
      layer.remove();
      if (window.GrailAudio) { try { window.GrailAudio.stop(); } catch (e) {} }
      screen('screen-title'); initTitle(); audio('title');
    };
    refresh();
  }
  /* ---------- 档案馆（通关后解锁） ---------- */
  var AR_KEY = 'grail_archive_v1';
  function readArchive() {
    try { return JSON.parse(localStorage.getItem(AR_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeArchive(a) {
    try { localStorage.setItem(AR_KEY, JSON.stringify(a)); } catch (e) {}
  }
  /* 成就：一次性解锁，存在档案馆里 */
  var ACHIEVEMENTS = [
    { id: 'clear', name: '结案', tip: '第一次走到结局。', fn: function () { return true; } },
    { id: 'bond3', name: '有人站在你身后', tip: '把一位从者的羁绊走到 LV.3。', fn: function (st) { return (st.s.bond || 0) >= 3; } },
    { id: 'beastDown', name: '砸了那块屏', tip: '在决战里打赢兽 · Ⅳ。', fn: function (st) { return !!st.s.flags.beastDown; } },
    { id: 'names', name: '七个名字', tip: '一场下来掌握 5 个以上真名。', fn: function (st) { return Object.keys(st.s.clues).filter(function (k) { return st.s.clues[k] >= 3; }).length >= 5; } },
    { id: 'noCommand', name: '一划没烧', tip: '令咒一次没用，走完全程。', fn: function (st) { return (st.s.command || 0) >= 3; } },
    { id: 'nightOwl', name: '没有睡的几个晚上', tip: '至少五个晚上没有早睡。', fn: function (st) {
      var n = 0; Object.keys(st.s.nights || {}).forEach(function (k) { if (st.s.nights[k] !== 'sleep') n++; }); return n >= 5;
    } },
    { id: 'ally5', name: '把话说通了', tip: '盟友到 4 人以上。', fn: function (st) { return (st.s.allies || 0) >= 4; } },
    { id: 'examA', name: '贴出来的卷子', tip: '月考拿 A。', fn: function (st) { return !!st.s.flags.examA; } }
  ];
  function archiveRecord(endingId, st) {
    var a = readArchive();
    a.endings = a.endings || {};
    a.servants = a.servants || {};
    a.best = a.best || {};
    a.ach = a.ach || {};
    a.runs = a.runs || [];
    a.endings[endingId] = (a.endings[endingId] || 0) + 1;
    if (st && st.servantId) a.servants[st.servantId] = (a.servants[st.servantId] || 0) + 1;
    if (st) {
      var sid = st.servantId || 'unknown';
      a.best[sid] = Math.max(a.best[sid] || 0, st.s.bond || 0);
      ACHIEVEMENTS.forEach(function (ac) {
        try { if (!a.ach[ac.id] && ac.fn(st)) a.ach[ac.id] = Date.now(); } catch (e) {}
      });
      a.runs.push({ e: endingId, sid: sid, bond: st.s.bond || 0, day: st.s.day, san: st.s.san, t: Date.now() });
      if (a.runs.length > 30) a.runs = a.runs.slice(-30);
    }
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
      var b = (a.best || {})[id] || 0;
      return (s ? s.cls + ' · ' + s.name : id) + (b ? '（羁绊 LV.' + b + '）' : '');
    }).join('　｜　') : '还没有带走任何一位。';
    var achLine = ACHIEVEMENTS.map(function (ac) {
      var got = !!((a.ach || {})[ac.id]);
      return '<div class="ac-ach' + (got ? ' on' : '') + '"><b>' + (got ? '✓ ' : '· ') + esc(ac.name) + '</b><span>' + esc(ac.tip) + '</span></div>';
    }).join('');

    var layer = document.createElement('div');
    layer.id = 'archive-layer';
    layer.className = 'modal-layer';
    layer.innerHTML = '<div class="modal wide">' +
      '<div class="mk">档 案 馆</div>' +
      '<div class="ac-stat">通关 ' + (a.cleared || 0) + ' 次　·　已见结局 ' + Object.keys(seen).length + ' / ' + ids.length + '　·　同行从者 ' + svIds.length + ' / 9' +
      '　·　成就 ' + Object.keys(a.ach || {}).length + ' / ' + ACHIEVEMENTS.length + '</div>' +
      '<h5>结局图鉴</h5><div class="ac-grid">' + endingCards + '</div>' +
      '<h5>同行过的从者（最高羁绊）</h5><p>' + svLine + '</p>' +
      '<h5>成就</h5><div class="ac-achs">' + achLine + '</div>' +
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
      resetSession();
      audio(sceneTheme());
      screen('screen-game'); renderSlot();
    };
    $('btn-about').onclick = function () { showAbout(); };
    var ba = $('btn-archive'); if (ba) ba.onclick = function () { openArchive(); };
    var bs2 = $('btn-settings'); if (bs2) bs2.onclick = function () { openSettings(); };
  }

  function showAbout() {
    var old = document.getElementById('about-layer');
    if (old) old.remove();
    var layer = document.createElement('div');
    layer.id = 'about-layer';
    layer.className = 'modal-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(9,11,10,.72);display:flex;align-items:center;justify-content:center;padding:20px';
    layer.innerHTML = '<div style="background:#f4ecda;color:#1c1a16;max-width:720px;width:100%;max-height:84vh;overflow:auto;padding:32px 34px;font-family:var(--serif);line-height:2;box-shadow:0 20px 60px rgba(0,0,0,.5)">' +
      '<div style="font-family:var(--hei);font-size:11px;letter-spacing:.3em;color:#8c2b22;margin-bottom:10px">档案说明</div>' +
      '<h2 style="margin:0 0 12px;font-size:24px">这份东西怎么玩</h2>' +
      '<p>改编自《圣杯战争·衡水：凌晨四点的圣杯》（COC 7th 非官方同人模组），单人化处理：七组御主中，其余六组由系统扮演。</p>' +
      '<p>九道登记题决定你的从者、御主卡与职介线。相性分 A+ / A / C / E 四档，取决于答案命中了从者几个关键词。</p>' +
      '<p>序章加七天。每天三段主线、一次自由行动，入夜之后还有一段「熄灯以后」——四选一，选完才翻篇。选项卡上只告诉你这一手要动什么本事，不给成功率，也不写后果。</p>' +
      '<p>SAN 是唯一的血条，曝光度满 10 会终止战争；兽的进度条每过一夜涨一格，当天你踩过刹车就不涨——夜里早睡是少数能按住它的办法。</p>' +
      '<p>战斗五手：交手 / 架住 / 读招 / 宝具 / 撤。敌方每回合先露一句预兆，读招能把它翻成明确意图，同时叠一层破绽；破绽满三层，下一手必中。</p>' +
      '<p>从者羁绊 LV.1–3：三段主线加一段加演。等级进战斗（伤害 / 减伤 / 判定 / 一次替身），也进结局。</p>' +
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
    resetSession();
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
      audio(sceneTheme());
      screen('screen-game');
      renderSlot();
      toast('左手背上的印记开始发烫');
    };
    $('btn-redo').onclick = function () { ui.q = 0; ui.answers = {}; screen('screen-quiz'); renderQuiz(); };
  }

  /* ---------- HUD ---------- */
  function renderHud() {
    var s = E.state().s;
    var tier = E.sanTierNow ? E.sanTierNow() : 0;
    var SF = (E.SAN_FX && E.SAN_FX[tier]) || { name: '', pen: 0 };
    try {
      for (var t = 0; t <= 4; t++) document.body.classList.remove('san-' + t);
      document.body.classList.add('san-' + tier);
      document.body.classList.toggle('low-san', tier >= 2);
      document.body.classList.toggle('beast-near', s.beast >= 5);
      document.body.classList.toggle('exp-hot', s.exposure >= 7);
    } catch (e) {}
    var beastPips = '';
    for (var i = 0; i < 7; i++) beastPips += '<i class="' + (i < s.beast ? 'on' : '') + '"></i>';
    var expPips = '';
    for (var j = 0; j < 10; j++) expPips += '<i class="' + (j < s.exposure ? 'on ink' : '') + '"></i>';
    $('hud').innerHTML =
      '<div class="cell san-cell t' + tier + '"><span class="lab">SAN' + (SF.name ? ' · ' + SF.name : '') + '</span>' +
      '<span class="val ' + (tier >= 3 ? 'danger' : '') + '">' + s.san + '<small>/' + s.sanMax + '</small></span>' +
      (SF.pen ? '<span class="san-pen">判定 −' + SF.pen + '</span>' : '') + '</div>' +
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

  function recapLine(st) {
    var logs = (st.log || []).filter(function (l) { return l.indexOf('情报') < 0; });
    return logs.length ? logs[logs.length - 1] : '';
  }

  function slotImage(slot, day) {
    return (slot && SLOT_IMG[slot.id]) || (day && day.scene) || '';
  }

  /* ---------- 关键节点演出 ---------- */
  var STINGER = {
    p2: { kind: 'broadcast', data: { lines: ['圣杯战争，第七次，开始。', '参赛者七名。', '……孙笑川。'] } },
    p3: { kind: 'summon', data: {} },
    d3d: { kind: 'roll', data: {} },
    d5c: { kind: 'impact', data: { title: '施工事故', sub: '无人员伤亡 · 校门东侧 · 正在调查' } },
    /* 走廊正在变成一张表——用镜像来写，比故障闪更像「东西被抄了一遍」 */
    d6b: { kind: 'mirror', data: { title: '你是第几？', dur: 2600 } },
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

  /* 选项卡片上不再提前写清后果。
     以前 sub 里直接写着「曝光 · 高危」「赢 · 圣杯 · E1 / E10」，还带「目标 45」这种成功率，
     等于把结局和赔率摊在桌面上选。现在只留「这一手要动什么本事」，不给概率、不给结果暗示；
     真正的后果要落笔之后才知道。 */
  function choiceMeta(o) {
    var parts = [];
    if (o.check && o.check.skill) parts.push('判定 · ' + o.check.skill);
    if (o.battle) parts.push('交手');
    if (o.exam) parts.push('答题');
    return parts.join('　');
  }
  /* 选择后的反馈也收一收：数值还在（不然玩不下去），但不再逐条列出「为什么」。 */
  function effectChips(notes) {
    if (!notes || !notes.length) return '';
    return '<div class="effects">' + notes.map(function (n) {
      var down = /−|-[0-9]/.test(n) || /扣|失|沉/.test(n);
      return '<span class="' + (down ? 'down' : 'up') + '">' + esc(n) + '</span>';
    }).join('') + '</div>';
  }

  /* ---------- 羁绊 ---------- */
  var BOND_BOOK = function () { return window.GRAIL_BONDS || {}; };
  function bondNodes(st) {
    var book = BOND_BOOK()[st.servantId];
    if (!book || !book.nodes) return [];
    return Object.keys(book.nodes).map(function (k) { return book.nodes[k]; });
  }
  function bondSeen(st) { return st.s.bondSeen || (st.s.bondSeen = {}); }
  /* 只在这些节拍里自动出现（d2c / d5c / d6c），否则留给夜里的「找从者」 */
  function nextBondNode(st, slotId) {
    var list = bondNodes(st);
    if (!list.length) return null;
    if (slotId && !(BOND_BOOK()[st.servantId].nodes || {})[slotId]) return null;
    var seen = bondSeen(st);
    for (var i = 0; i < list.length; i++) {
      if (!seen[list[i].id]) return { node: list[i], idx: i };
    }
    return null;
  }
  function bondLevel(st) { return E.clamp(st.s.bond || 0, 0, 3); }
  /* 加演：主线三段走完之后，夜里去找他还能撞上的段落。
     现在有两组（加演一 / 加演二），按顺序给没看过的那一段。 */
  function extraBondQueue(st) {
    var out = [];
    var a = (window.GRAIL_BONDS_EXTRA || {})[st.servantId];
    if (a) out.push(a);
    var b = (window.GRAIL_BONDS_MORE || {})[st.servantId];
    if (b) out.push({ id: (st.servantId + '_more'), label: '加演二', sub: '羁绊 · 加演二', text: b.text, fx: b.fx || { san: 1 } });
    return out;
  }
  function extraBondNode(st) {
    var q = extraBondQueue(st), seen = bondSeen(st);
    for (var i = 0; i < q.length; i++) if (q[i] && !seen[q[i].id]) return q[i];
    return null;
  }
  var BOND_FX = [
    '',
    '架住时多挡一点；「意志 / 闪避 / 交手」+5。',
    '宝具伤害 +2，判定 +8，宝具消耗 −4。',
    '每场战斗一次「替身」：倒下的那一刻有人按住你的肩。判定 +12。'
  ];

  function currentDay() { var st = E.state(); return G.STORY[st.s.day]; }
  function currentSlot() { var st = E.state(), D = currentDay(); return D && D.slots[st.s.slot]; }

  var __slotWrapped = true;
  /* ---------- 扩写包 ----------
     段落的「加厚」不写进 story_a/b：那两份文件已经很大，改起来容易碰坏判定。
     统一放在 js/data/expand.js，按 slot id 取：
       introMore —— 接在引言后面的两句（所有玩家都读到）
       outro     —— 选完之后的一段收束（不指向具体选项，只收场景）
     另有三段插叙（interludes），按天取，醒了才播。 */
  function expandOf(slotId) {
    var EX = window.GRAIL_EXPAND || {};
    return (EX.slots || {})[slotId] || {};
  }

  /* ---------- 共通线：每日点名 ----------
     每天第一次进到时段之前，先播一段教务处的点名。
     这是这个故事里唯一「不管你选什么都一样」的东西——也正因为一样，
     它才能当参照系：在场几个人、谁没答到、兽走到第几格。 */
  function goneNames(st) {
    return Object.keys(st.s.flags || {}).filter(function (k) { return k.indexOf('gone_') === 0; })
      .map(function (k) { return k.slice(5); });
  }
  function renderRollcall() {
    var st = E.state(), day = st.s.day;
    var C = window.GRAIL_COMMON || {};
    var R = C.rollcall || {};
    var gone = goneNames(st);
    var rows = [];
    rows.push('应到 6012 人，实到 6012 人。');
    if (R.alive) rows.push(R.alive(st.s.alive));
    if (gone.length && R.gone) rows.push(gone.map(R.gone).join('　'));
    if (R.beast && R.beast[Math.min(7, st.s.beast || 0)]) rows.push(R.beast[Math.min(7, st.s.beast || 0)]);
    var ex = R.exposure ? R.exposure(st.s.exposure) : '';
    if (ex) rows.push(ex);

    var beat = ((C.beats || {})[day] || []);
    var root = $('story-root');
    $('game-day').textContent = 'DAY ' + day + ' / 7';
    $('game-clock').textContent = '06:40 · 点名';
    renderHud();
    root.innerHTML =
      '<div class="doc-head" style="margin-bottom:18px"><span>' + esc(R.head || '每日点名') + '</span>' +
      '<span class="mid">冀州第一中学 · 教务处</span><span class="no">第 ' + day + ' 天</span></div>' +
      '<div class="prose">' + paras(rows, false) + '</div>' +
      (beat.length ? '<div class="rule-thin"></div><div class="prose" style="margin-top:18px">' + paras(beat, false) + '</div>' : '') +
      '<div class="btn-row"><button class="btn btn--solid" id="roll-done">记下了</button></div>' +
      '<div class="doc-foot"><span>教务处 · 每日一点</span><span>第 ' + (8 + day) + ' 页 / 共 81 页</span></div>';
    $('roll-done').onclick = function () {
      st.s.flags['rollcall_' + day] = true;
      E.save();
      renderSlot();
    };
    var gf = $('game-foot');
    if (gf) gf.textContent = '第 ' + (8 + day) + ' 页 / 共 81 页';
    renderDossier();
    setTimeout(settle, 700);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- 中段插叙 ----------
     Day2 / Day4 / Day6 各一段，没有选项，讲一件和你的选择无关、但全校都经历的事。
     作用是让「这一天」有自己的时间，而不是几个时段拼起来的。 */
  function renderInterlude(day) {
    var st = E.state();
    var IN = (window.GRAIL_EXPAND || {}).interludes || {};
    var item = IN[day];
    if (!item) { st.s.flags['inter_' + day] = true; renderSlot(); return; }
    var root = $('story-root');
    $('game-clock').textContent = item.time || '同一天';
    root.innerHTML =
      '<div class="scene-head"><h2>' + esc(item.title || '') + '</h2><span class="meta">' + esc(item.time || '') + '</span></div>' +
      (item.place ? '<div class="scene-place">' + esc(item.place) + '</div>' : '') +
      '<div class="prose">' + paras(item.text || [], true) + '</div>' +
      '<div class="btn-row"><button class="btn" id="inter-done">继续</button></div>';
    $('inter-done').onclick = function () {
      st.s.flags['inter_' + day] = true;
      E.save();
      renderSlot();
    };
    renderHud();
    renderDossier();
    setTimeout(settle, 700);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- 决战前的那几分钟 ----------
     用你实际做过的 flag 拼一段回顾。没有对应 flag 的人读到的是「你没有」。
     这一段的价值不在于句子本身，在于它是唯一一次把七天串成一条线的地方。 */
  function renderRecall() {
    var st = E.state();
    var C = window.GRAIL_COMMON || {};
    var RC = C.recall || { lines: {} };
    var lines = [RC.head || '你把这一周在脑子里过了一遍。'];
    var keys = Object.keys(RC.lines || {});
    var hit = 0;
    keys.forEach(function (k) {
      if (k === 'world') return;
      if (st.s.flags[k]) { lines.push(RC.lines[k]); hit++; }
    });
    if (hit === 0 && RC.lines.world) lines.push(RC.lines.world);
    var bl = bondLevel(st);
    if (RC.bond && RC.bond[bl]) lines.push(RC.bond[bl]);
    /* 夜里的事 */
    var n = st.s.nights || {}, nightCount = 0, sleepCount = 0;
    Object.keys(n).forEach(function (d) { if (n[d] === 'sleep') sleepCount++; else nightCount++; });
    if (nightCount >= 3) lines.push('有 ' + nightCount + ' 个晚上你没有睡。走廊里的声控灯亮一盏灭一盏。');
    if (sleepCount >= 3) lines.push('有 ' + sleepCount + ' 个晚上你早睡了。什么都不做，让那一天结束。');
    if (RC.tail) lines.push(RC.tail);
    var root = $('story-root');
    $('game-day').textContent = 'DAY ' + st.s.day + ' / 7';
    $('game-clock').textContent = '03:40';
    document.body.classList.toggle('final-day', true);
    root.innerHTML =
      '<div class="scene-head"><h2>行政楼 · 楼梯</h2><span class="meta">04:00 之前</span></div>' +
      '<div class="scene-place">你一层一层往上走。楼道里的灯是感应的，亮一格，灭一格。</div>' +
      '<div class="prose">' + paras(lines, true) + '</div>' +
      '<div class="btn-row"><button class="btn btn--solid" id="recall-done">上去</button></div>';
    $('recall-done').onclick = function () {
      st.s.flags.recallDone = true;
      E.save();
      renderSlot();
    };
    renderHud();
    renderDossier();
    setTimeout(settle, 700);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderSlotInner() {
    var st = E.state(), D = currentDay();
    if (!D) { finish(); return; }
    var slot = currentSlot();
    if (!slot) { advanceDay(); return; }
    /* 共通线：每天第一次进来，先点名 */
    if (st.s.day >= 1 && st.s.slot === 0 && !st.s.flags['rollcall_' + st.s.day]) {
      renderRollcall(); return;
    }
    /* 点名之后、自由行动之前，插一段自走剧情 */
    if (st.s.day >= 1 && !st.s.flags['inter_' + st.s.day]) {
      var IN = (window.GRAIL_EXPAND || {}).interludes || {};
      if (IN[st.s.day]) { renderInterlude(st.s.day); return; }
    }
    /* 决战：04:00 之前先把你这一周过一遍 */
    if (slot.id === 'd7c' && !st.s.flags.recallDone) {
      renderRecall(); return;
    }
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
      (st.s.slot === 0 ? '<div class="card" style="margin-bottom:20px"><h3>今日校务日志</h3><p style="margin:0;font-size:13px;line-height:1.95;color:var(--ink-2)">' + esc(log) + '</p>' +
        (recapLine(st) ? '<p style="margin:10px 0 0;font-family:var(--hei);font-size:11.5px;line-height:1.9;color:var(--ink-3)">上次记到这里：' + esc(recapLine(st)) + '</p>' : '') + '</div>' : '') +
      (slotImage(slot, D) ? '<div class="scene-img"><img loading="lazy" decoding="async" src="' + slotImage(slot, D) + '" alt="" onerror="this.parentNode.style.display=\'none\'"></div>' : '') +
      '<div class="prose" id="prose-box"></div>' +
      '<div class="choices" id="opts" style="margin-top:26px"></div>';

    var opts = $('opts');
    var allOpts = slot.options.slice();
    /* 羁绊片段按「已看到第几段」顺序推进，而不是把某一段钉死在某个 slot 上：
       原来 d2c 那段错过了就永远错过，后面两段也跟着错位。现在只要这一节拍属于
       羁绊时段（d2c / d5c / d6c），就给「下一段还没看过的」；夜里主动找从者也能补。 */
    var bondNode = nextBondNode(st, slot.id);
    if (bondNode) {
      var bo = JSON.parse(JSON.stringify(bondNode.node));
      bo.__bond = true;
      bo.__bondIdx = bondNode.idx;
      allOpts.push(bo);
    }
    /* 精神掉到「发飘」以下，选项里会混进一条不存在的东西。
       外观和别的选项完全一样——认不出来才是重点。 */
    var sanT = E.sanTierNow ? E.sanTierNow() : 0;
    if (sanT >= 2 && (ui.forceHall || Math.random() < 0.22 + sanT * 0.09)) {
      var HAL = (window.GRAIL_COMMON || {}).hallucinations || [];
      var poolH = HAL.filter(function (h, i) { return !st.s.flags['hall_' + i]; });
      var pickH = poolH.length ? poolH : HAL;
      if (pickH.length) {
        var hi = Math.floor(Math.random() * pickH.length);
        var h = pickH[hi];
        /* 插在中间、并且把总数压回 4 个：第 5 条会露馅（字母排到「·」），
           而「选项少了一个」在低 SAN 下反而更像那么回事。 */
        var pos = Math.floor(Math.random() * Math.max(1, allOpts.length));
        allOpts.splice(pos, 0, { __hall: true, __hallIdx: HAL.indexOf(h), label: h.label, text: h.text, fx: { san: -2 } });
        if (allOpts.length > 4) allOpts.length = 4;
      }
    }
    allOpts.forEach(function (o, idx) {
      var b = el('button', 'choice');
      var letter = 'ABCD'[idx] || '·';
      var chk = reqOk(o.req);
      var meta = o.__bond ? '羁绊 · 第 ' + (o.__bondIdx + 1) + ' 夜' : (o.__hall ? '判定 · 意志' : choiceMeta(o));
      b.innerHTML = '<span class="k">' + letter + '</span><span>' + esc(o.label) +
        (meta ? '<span class="sub">' + esc(meta) + '</span>' : '') +
        (!chk.ok ? '<span class="sub" style="color:var(--red)">未解锁：' + esc(chk.why) + '</span>' : '') + '</span>';
      if (!chk.ok) b.disabled = true;
      if (o.__bond) b.classList.add('bond');
      b.onclick = function () { choose(o); };
      opts.appendChild(b);
    });

    var probe = stingerFor(slot, st);
    var ex = expandOf(slot.id);
    var introTexts = slot.intro.concat(ex.introMore || []).map(rich);
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
      AVG.stinger(probe.cfg.kind, probe.data, function () {
        // Day 0 召唤：契约成立、正文出场的那一刻，从者的主题才响
        if (probe.cfg.kind === 'summon') audio(G.servant(st.servantId).theme);
        startType();
      });
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
    if (o.id === 'd7c1') { backToScene(); renderWish(); return; }
    if (o.battle) { startBattle(o); return; }
    if (o.exam) { backToScene(); startExam(o); return; }
    backToScene();
    var st = E.state();
    var before = { exp: st.s.exposure, beast: st.s.beast, san: st.s.san };
    ui.snapshot = clone(st);
    var out = resolve(o);
    if (o.__bond) {
      bondSeen(st)[o.id] = true;
      var bn = E.apply({ bond: 1 });
      out.notes = bn.concat(out.notes || []);
      out.bond = true;
    }
    if (o.__hall) {
      st.s.flags['hall_' + o.__hallIdx] = true;
      out.notes = ['你在原地站了一会儿，确认那里没有人'].concat(out.notes || []);
      try { if (window.GrailAVG && window.GrailAVG.stinger) window.GrailAVG.stinger('static', { dur: 900 }); } catch (e) {}
    }
    ui.beat = out;
    renderBeat(out);
    try {
      var after = E.state().s;
      moodFx(before, after);
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
      b.innerHTML = '<span class="k">愿</span><span>' + esc(w.label) + '</span>';
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
      if (id === st.servantId) return false;
      if (st.s.flags['ally_' + id]) return false;
      if (st.s.flags['beat_' + id]) return false;
      return true;
    });
    if (!pool.length) pool = ids.filter(function (id) { return id !== st.servantId; });
    // 偏一点：没解明的更容易撞上
    var unknown = pool.filter(function (id) { return (st.s.clues[id] || 0) < 3; });
    var from = unknown.length && Math.random() < 0.65 ? unknown : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  function startBattle(o) {
    var cfg = clone(o.battle || {});       // 不直接改剧情数据：'auto' 解析完就写回了原对象
    var st = E.state();
    if (!cfg.foe) cfg.foe = 'auto';
    /* 自己打自己：数据里仍可能写死某个职阶，而玩家契约的正是那一位。
       以前 Day1 夜的教学战写死 berserker，契约到 berserker 的人会在楼下遇见自己。 */
    if (cfg.foe === 'auto' || cfg.foe === st.servantId) cfg.foe = randomFoeId();
    var B;
    try {
      B = window.GRAIL_BATTLE.create({
        foeId: cfg.foe,
        reveal: (st.s.clues[cfg.foe] || 0) >= 3 || !!cfg.reveal,
        clueLv: cfg.clueLv || 3,
        scale: cfg.scale || 1,
        allies: cfg.allies || 0,
        night: !!cfg.night,
        onEvent: function (kind, info) {
          if (kind === 'myNoble') nobleCut(info.me, info.name);
          // 敌方开宝具（包括兽「借用」别人的宝具）：同样要出宝具画面 + 对应曲，
          // 并且一直响到下一次宝具或这场战斗结束。
          if (kind === 'foeNoble') nobleCut(info.foe, info.name);
        }
      });
    } catch (e) { fatal(e); return; }
    B_ACTIVE = B;
    ui.beat = { o: o, paras: cfg.intro || ['你先动了手。'], notes: [], roll: null, ok: true, battle: true };
    // 遭遇战：切到战斗曲；开宝具时会被对应从者的主题顶掉，结算时再交还场景曲
    audio('battle');
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

  function floatDmg(layer, n, who) {
    if (n <= 0) return;
    var d = document.createElement('div');
    d.className = 'dmgfloat ' + who;
    d.textContent = '−' + n;
    var stage = layer.querySelector('.bstage');
    if (!stage) return;
    stage.appendChild(d);
    try { if (window.GrailSFX) window.GrailSFX.stamp(); } catch (e) {}
    var side = layer.querySelector(who === 'foe' ? '.bside.foe' : '.bside.me');
    if (side) {
      side.classList.add('hit');
      setTimeout(function () { side.classList.remove('hit'); }, 300);
    }
    setTimeout(function () { d.remove(); }, 900);
  }

  /* 宝具：音乐和画面同一刻起。
     以前 play() 走 0.8s 渐入，演出卡一上来是静的，听着像「画面放完了才有歌」。
     这里先点着曲子（quick 渐入），再把演出卡压上去；avg.js 里也会兜一次，
     免得哪条调用路径漏了。 */
  function nobleCut(sv, name) {
    try {
      var theme = sv && sv.theme;
      if (window.GrailAudio) {
        window.GrailAudio.init && window.GrailAudio.init();
        if (theme) window.GrailAudio.play(theme, { quick: true });
      }
      if (window.GrailAVG && window.GrailAVG.stinger) {
        window.GrailAVG.stinger('noble', {
          cls: sv.cls, title: name, sub: sv.one || '', color: sv.tint || '#b23a2e', theme: theme
        });
      }
    } catch (e) {}
  }

  /* ---------- 战斗特效 ----------
     交手 / 架住 / 读招 / 宝具 / 撤，每一手都该有自己的画面：
     刀光、护体环、扫视线、全屏真名解放、退场烟雾。全部是临时节点，
     播完自己摘掉，不会污染下一次重绘。 */
  function fxNode(layer, cls, html, life) {
    var stage = layer.querySelector('.bstage');
    if (!stage) return null;
    var d = document.createElement('div');
    d.className = 'bfx ' + cls;
    if (html) d.innerHTML = html;
    stage.appendChild(d);
    setTimeout(function () { d.remove(); }, life || 1500);
    return d;
  }
  function shakeStage(layer, hard) {
    if (fxLite()) return;                    // 设置里选「减弱」就不抖屏
    var stage = layer.querySelector('.bstage');
    if (!stage) return;
    var cls = hard ? 'shake-hard' : 'shake';
    stage.classList.add(cls);
    setTimeout(function () { stage.classList.remove(cls); }, hard ? 520 : 300);
  }
  function combatFx(layer, f, delay) {
    if (!f) return;
    setTimeout(function () {
      var side = layer.querySelector(f.who === 'me' ? '.bside.me' : '.bside.foe');
      if (f.t === 'attack') {
        fxNode(layer, 'slash' + (f.crit ? ' crit' : ''), '<i></i><i></i>');
        shakeStage(layer, !!f.crit);
        floatDmg(layer, f.dmg, 'foe');
        if (f.crit) fxNode(layer, 'critword', '破 绽', 900);
        try { if (window.GrailSFX) window.GrailSFX.stamp(); } catch (e) {}
      } else if (f.t === 'guard') {
        fxNode(layer, 'guardring', '<i></i>');
        if (side) side.classList.add('braced');
        setTimeout(function () { if (side) side.classList.remove('braced'); }, 700);
        try { if (window.GrailSFX) window.GrailSFX.page(); } catch (e) {}
      } else if (f.t === 'observe') {
        fxNode(layer, 'scanline', '<i></i>');
        try { if (window.GrailSFX) window.GrailSFX.glitch(); } catch (e) {}
      } else if (f.t === 'hurt') {
        fxNode(layer, 'hurthit' + (f.heavy ? ' heavy' : ''));
        shakeStage(layer, !!f.heavy);
        floatDmg(layer, f.dmg, 'me');
        try { if (window.GrailSFX) window.GrailSFX.heartbeat(); } catch (e) {}
      } else if (f.t === 'allyBlock') {
        fxNode(layer, 'allyflash');
      } else if (f.t === 'allyHit') {
        fxNode(layer, 'slash soft', '<i></i>');
        floatDmg(layer, f.dmg, 'foe');
      } else if (f.t === 'miss') {
        fxNode(layer, 'missword', f.who === 'foe' ? '落 空' : '没 中', 800);
      } else if (f.t === 'fumble') {
        fxNode(layer, 'missword', '绊 了 一 下', 900);
        shakeStage(layer, false);
      } else if (f.t === 'flee') {
        if (f.ok) fxNode(layer, 'smoke', '<i></i><i></i><i></i>', 1400);
        else fxNode(layer, 'blocked', '退 路 封 死', 1100);
      } else if (f.t === 'charge') {
        if (side) side.classList.add('charging');
        fxNode(layer, 'chargeglow');
      } else if (f.t === 'stand') {
        fxNode(layer, 'standflash', '替 身');
        shakeStage(layer, true);
      } else if (f.t === 'phase') {
        fxNode(layer, 'phaseword', f.n === 2 ? '翻 页' : '点 名', 1500);
        shakeStage(layer, true);
        try { if (window.GrailAVG && window.GrailAVG.glitchBurst) window.GrailAVG.glitchBurst('scene_beast', { dur: 520, hard: true }); } catch (e) {}
      }
    }, delay || 0);
  }
  function playBattleFx(layer, list, done) {
    if (!list || !list.length) { if (done) done(); return; }
    var at = 0;
    list.forEach(function (f) { combatFx(layer, f, at); at += 420; });
    setTimeout(function () { if (done) done(); }, at + 120);
  }

  function renderBattleScreen(o, B, fxList) {
    var st = B.state();
    var prevFoeHp = (B._prevFoe == null) ? st.foeHp : B._prevFoe;
    var prevMyHp = (B._prevMe == null) ? st.myHp : B._prevMe;
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
    var slot = currentSlot();
    var bg = slotImage(slot, currentDay()) || 'assets/img/scene_arena.jpg';
    var lines = st.log.slice(-4).map(function (l) {
      return '<div class="bline ' + (l.tone || '') + '">' + esc(l.t) + '</div>';
    }).join('');
    var stg = '';
    for (var i = 0; i < st.staggerMax; i++) stg += '<i class="' + (i < st.stagger ? 'on' : '') + '"></i>';
    var bondBadge = st.bond ? '<span class="bbond">羁绊 LV.' + st.bond + '</span>' : '';

    layer.innerHTML =
      '<div class="bstage">' +
      '<div class="bscene" style="background-image:url(\'' + bg + '\')"></div>' +
      '<div class="bfog"></div>' +
      '<div class="bveil"></div>' +
      '<div class="btop"><span>' + esc((o.battle && o.battle.title) || '遭遇战') + '</span><span>回合 ' + st.turn + '</span></div>' +
      '<div class="bside foe">' +
      '<div class="bname">' + esc(st.foeName) + '</div>' +
      '<div class="bsub">' + (B.reveal ? esc(foe.alias || '') + ' ／ ' + esc(foe.risk || '') : '档案未解明') + '</div>' +
      '<div class="bhp"><i style="width:' + hpPct + '%"></i></div>' +
      '<div class="bnum">' + st.foeHp + ' / ' + st.foeHpMax + '</div>' +
      '<div class="bstagger" title="破绽">' + stg + '</div>' +
      '<img loading="lazy" decoding="async" class="fsprite ' + iv.cls + '" src="' + iv.src + '" alt="" onerror="this.style.display=\'none\'">' +
      '<div class="bintent' + (st.intentKnown ? ' known' : '') + '">' + esc(st.tell || '') + '</div>' +
      '</div>' +
      '<div class="bside me">' +
      '<img loading="lazy" decoding="async" class="msprite" src="' + mine.portrait + '" alt="" onerror="this.style.display=\'none\'">' +
      '<div class="mname">' + esc(mine.cls) + ' · ' + esc(mine.name) + ' ' + bondBadge + '</div>' +
      '<div class="bhp mine"><i style="width:' + myPct + '%"></i></div>' +
      '<div class="bnum">HP ' + st.myHp + '/' + st.myHpMax + '　MP ' + st.mp + '/' + st.mpMax + '　SAN ' + st.san + '</div>' +
      (st.allyCount ? '<div class="bnum">盟友 ' + st.allyCount + ' 在场</div>' : '') +
      '</div>' +
      '<div class="bbox">' +
      '<div class="btext">' + lines + '</div>' +
      (st.over ? '<div class="bover">' + (st.over === 'win' ? '它散了。' : st.over === 'flee' ? '你退了出来。' : '你倒下了。') + '</div>'
        : '<div class="bmenu five">' +
        '<button class="btn btn--solid" data-a="attack">交手</button>' +
        '<button class="btn" data-a="guard">架住</button>' +
        '<button class="btn" data-a="observe">读招</button>' +
        '<button class="btn' + (st.canNoble ? ' btn--red' : '') + '" data-a="noble"' + (st.canNoble ? '' : ' disabled') + '>宝具<small>' + st.nobleCost + 'MP</small></button>' +
        '<button class="btn btn--ghost" data-a="flee">撤</button>' +
        '</div>') +
      '</div>' +
      '</div>';

    B._prevFoe = st.foeHp; B._prevMe = st.myHp;

    if (fxList && fxList.length) playBattleFx(layer, fxList);
    else {
      if (prevFoeHp > st.foeHp) floatDmg(layer, prevFoeHp - st.foeHp, 'foe');
      if (prevMyHp > st.myHp) floatDmg(layer, prevMyHp - st.myHp, 'me');
    }

    if (!st.over) {
      layer.querySelectorAll('.bmenu .btn').forEach(function (btn) {
        btn.onclick = function () {
          if (btn.disabled) return;
          var kind = btn.getAttribute('data-a');
          var menu = layer.querySelector('.bmenu');
          if (menu) menu.classList.add('busy');
          B.act(kind);
          var fx = B.state().fx;
          renderBattleScreen(o, B, fx);
        };
      });
      return;
    }

    var out = B.settle();
    // 战斗结束：宝具曲到此为止，画面回到场景的底噪
    try { if (window.GrailAudio) window.GrailAudio.play(sceneTheme()); } catch (e) {}
    var isBeast = foe.id === 'beast';
    var res = st.over === 'win'
      ? (isBeast
        ? '<p>那块屏碎了。碎之前它还在跳，跳到 0 的时候，整栋楼的灯一起亮了。' +
          '你听见楼下有人在喊名字，喊的是活的那些。<br>兽 · Ⅳ 进度清零。</p>'
        : '<p>你赢了。' + esc(foe.cls) + ' 的轮廓散了，散之前你记住了它的脸——情报等级升到 ' + E.roman(out.clue || 3) + '。SAN −' + out.sanLoss + '。</p>')
      : st.over === 'flee'
        ? '<p>你退开了。' + esc(foe.cls) + ' 没有追。情报一点没带出来，SAN −' + out.sanLoss + '，MP −' + (out.mp || 0) + '。</p>'
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
      var from = EXAM.from || {};
      EXAM.from = null;                 // 不清理的话，读档重进会带着上一次的入口
      var beat = {
        o: from,
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
    // 自身冲突：你已经拿到的这张人物卡会在地图上和你自己对话（李嘉豪在车棚遇见李嘉豪）。
    // 事件的 who 是御主名，玩家自己的御主卡就是 masterId 对应的那位。
    if (e.who) {
      var meMaster = G.master(st.masterId);
      if (meMaster && meMaster.name === e.who) return false;
      // 已经退场的人不会再出现在地图上
      if (st.s.flags['gone_' + e.who]) return false;
    }
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
      var meta = choiceMeta(o);
      b.innerHTML = '<span class="k">' + ('ABCD'[idx] || '·') + '</span><span>' + esc(o.label) +
        (meta ? '<span class="sub">' + esc(meta) + '</span>' : '') +
        (!chk.ok ? '<span class="sub" style="color:var(--red)">未解锁：' + esc(chk.why) + '</span>' : '') + '</span>';
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
    sightingBgm(clue);
    var _po = ((window.GRAIL_MAP || {}).places || []).filter(function (x) { return x.id === pid; })[0] || { name: '' };
    var html = '<div class="scene-head"><h2>' + esc(_po.name) + '</h2><span class="meta">自由行动</span></div>' +
      '<div class="prose">' + paras(out.paras.map(rich), true) + '</div>' +
      (out.roll ? '<div class="dice"><span>检定 · ' + esc(out.roll.skill) + '</span><span>1D100 = <b>' + out.roll.die + '</b></span>' +
        '<span class="' + (out.roll.ok ? 'ok' : 'no') + ' lv">' + esc(out.roll.level) + '</span></div>' : '') +
      effectChips(out.notes) +
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

  /* ---------- 夜间行动：把「七天」撑成能装下东西的长度 ----------
     原来的时间表是一天三格，走完 7 天只有二十来个节拍：支线、羁绊、地图事件
     根本轮不到。每天入夜之后加一段「熄灯以后」，四选一，走完才进第二天。
     文案与数值都在 js/data/night.js 里，这里只负责画和分派。 */
  function nightIntro(st) {
    var N = window.GRAIL_NIGHT || {};
    var lines = (N.intro || {})[st.s.day] || (N.intro || {})[1] || [];
    lines = lines.slice();
    /* 状态覆盖：SAN 见底、曝光过高、兽压到门口时，换掉第一句 */
    var ov = (N.override || []).filter(function (o) { try { return o.when(st.s); } catch (e) { return false; } })[0];
    if (ov && lines.length) lines[0] = ov.line;
    return lines;
  }
  function nightAction(k) {
    var N = window.GRAIL_NIGHT || {};
    return (N.actions || []).filter(function (a) { return a.k === k; })[0] || null;
  }
  function renderNight() {
    var st = E.state(), day = st.s.day, D = currentDay();
    if (!D) { advanceDay(); return; }
    var root = $('story-root');
    var bondOpen = !!nextBondNode(st, null) || !!extraBondNode(st);
    $('game-day').textContent = 'DAY ' + day + ' / 7';
    $('game-clock').textContent = '夜 · 熄灯后';
    document.body.classList.toggle('final-day', day === 7);
    renderHud();
    var sv = G.servant(st.servantId);
    var bl = bondLevel(st);
    var N = window.GRAIL_NIGHT || { actions: [] };
    root.innerHTML =
      '<div class="scene-head"><h2>熄灯以后</h2><span class="meta">第 ' + day + ' 天 · 23:40</span></div>' +
      '<div class="scene-place">宿舍 · 明德楼 · 走廊尽头还亮着安全出口的绿灯</div>' +
      (hasNightAP(st) && !st.s.flags['night_' + day] ? '<div class="night-extra">刺客线 · 今晚还能再做一件事</div>' : '') +
      '<div class="prose">' + paras(nightIntro(st), true) + '</div>' +
      '<div class="choices" id="night-opts"></div>' +
      '<p class="night-tip">今天还能做一件事。做完就天亮。</p>';
    var box = $('night-opts');
    (N.actions || []).forEach(function (a, i) {
      var label = a.label, meta = a.meta, hint = a.hint;
      if (a.k === 'bond') {
        label = bondOpen ? '去找' + sv.cls + '。' : '去找' + sv.cls + '，站一会儿。';
        meta = '羁绊 · LV.' + bl;
      }
      var b = el('button', 'choice');
      b.innerHTML = '<span class="k">' + 'ABCD'[i] + '</span><span>' + esc(label) +
        '<span class="sub">' + esc(meta) + (hint ? '　' + esc(hint) : '') + '</span></span>';
      b.onclick = function () { nightPick(a.k); };
      box.appendChild(b);
    });
    renderDossier();
    setTimeout(settle, 700);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nightPick(kind) {
    var st = E.state(), day = st.s.day;
    /* 刺客线的「夜间行动 +1」：同一晚可以再来一次。
     * 第一次写 night_<day>，第二次写 night2_<day>。
     * 这里不能用「有没有 night_」判断该走哪个键就完事——第二次进来时 night_ 已经在了，
     * 正是靠它区分第几次。 */
    var first = !st.s.flags['night_' + day];
    var key = first ? 'night_' : 'night2_';
    if (!first && st.s.flags['night2_' + day]) { advanceDay(); return; }
    st.s.flags[key + day] = true;
    st.s.nights = st.s.nights || {};
    st.s.nights[day] = kind;
    var act = nightAction(kind) || {};

    if (kind === 'rest' || kind === 'sleep') {
      var notes = E.apply(act.fx || {});
      if (act.cut) st.s.beastCutDay = day;      // 早睡 = 今天没去比，兽不推进
      E.addLog(act.log || '');
      renderBeat({
        o: {}, paras: (act.text || []).concat([]),
        roll: null, notes: (act.cut ? ['兽进度：今晚没有推进'] : []).concat(notes), ok: true
      });
      return;
    }
    if (kind === 'bond') {
      var bn = nextBondNode(st, null);
      if (bn) {
        var o = JSON.parse(JSON.stringify(bn.node));
        o.__bond = true; o.__bondIdx = bn.idx;
        choose(o);
        return;
      }
      var ex = extraBondNode(st);
      if (ex) {
        var o3 = JSON.parse(JSON.stringify(ex));
        o3.__bond = true; o3.__bondIdx = 3;
        choose(o3);
        return;
      }
      var n3 = E.apply({ san: 1, bond: bondLevel(st) < 3 ? 1 : 0 });
      E.addLog('你在走廊尽头陪 ' + G.servant(st.s.servantId).cls + ' 站了一会儿。');
      renderBeat({
        o: {}, paras: [
          '你在走廊尽头站着。他没说话，也没让你回去。',
          '声控灯灭了。黑暗里能听见他呼吸——不是活人的呼吸，是那种很慢、很稳、像在数拍子的声音。',
          '过了很久，他说：「回去吧。明天还有一天。」'
        ], roll: null, notes: n3, ok: true
      });
      return;
    }
    /* 巡夜：先抽地点，再看是撞人还是撞上不该看的东西 */
    var M = window.GRAIL_MAP || { places: [] };
    var pool = (M.places || []).filter(function (p) { return p.id !== 'gate' || st.s.day >= 4; });
    var place = pool[Math.floor(Math.random() * pool.length)] || { id: 'track', name: '操场' };
    var ev = pickMapEvent(place.id);
    st.s.flags['visit_' + place.id] = true;
    if (ev && Math.random() < 0.62) { renderMapEvent(ev, place.id); return; }
    if (Math.random() < 0.55) {
      startBattle({
        battle: { foe: 'auto', night: true, title: '夜里 · ' + place.name, clueLv: 3, scale: 0.92 },
        label: '巡夜：在' + place.name + '撞上了人',
        sub: ''
      });
      return;
    }
    var n4 = E.apply({ san: -1, clueAll: 1 });
    E.addLog('你在' + place.name + '转了一圈，什么也没有。');
    renderBeat({
      o: {}, paras: [
        '你穿好外套下楼。声控灯亮一盏，灭一盏。',
        '你走到' + place.name + '。没有人。风把一张纸吹到你脚边，你捡起来看了一眼——是空的排名表，名字那一栏什么都没印。',
        '你把它放回去，压在一块砖下面。'
      ], roll: null, notes: n4, ok: true
    });
  }

  function renderBeat(b) {
    var slot = currentSlot();
    var root = $('story-root');
    var head = slot ? { place: slot.place, time: slot.time } : { place: '', time: '' };
    var html = '<div class="scene-head"><h2>' + esc(head.place || '') + '</h2><span class="meta">' + esc(head.time || '') + '</span></div>' +
      '<div class="prose">' + paras(b.paras.map(rich), true) + '</div>';

    if (b.roll) {
      html += '<div class="dice"><span>检定 · ' + esc(b.roll.skill) + '</span>' +
        '<span>1D100 = <b class="rollnum">' + b.roll.die + '</b></span>' +
        '<span class="' + (b.roll.ok ? 'ok' : 'no') + ' lv">' + esc(b.roll.level) + '</span></div>';
    }
    if (b.clue) {
      sightingBgm(b.clue);
      var sv2 = G.servant(b.clue.id);
      var lv2 = Math.min(b.clue.lv, 5);
      var iv = intelView(b.clue.id, lv2);
      html += '<div class="sighting just-revealed"><div class="thumb"><img class="' + iv.cls + '" src="' + iv.src + '" alt="" onerror="this.parentNode.style.display=\'none\'"></div>' +
        '<div class="txt">目击记录 · ' + sv2.cls + '<b>' + (b.clue.lv >= 3 ? esc(sv2.name) : '未解明') + '</b>' +
        '情报等级 <em>' + E.roman(b.clue.lv) + '</em>　' + (b.clue.lv >= 3 ? '真名推定完成' : '轮廓仍在雾里') + '</div></div>';
    }
    if (b.notes && b.notes.length) html += effectChips(b.notes);
    /* 收束段：这一段不随选项变化，作用是让场景落下来，不要在结果之后就切走。 */
    (function () {
      var slot2 = currentSlot();
      var ex2 = slot2 ? expandOf(slot2.id) : {};
      if (ex2.outro && !b.noOutro) {
        html += '<p class="outro reveal" style="animation-delay:120ms">' + markup(esc(ex2.outro)) + '</p>';
      }
    })();
    html += '<div class="btn-row" id="beat-actions"></div>';
    root.innerHTML = html;

    var acts = $('beat-actions');
    var st = E.state();
    if (b.roll && !b.roll.ok && !b.rerolled && st.s.command > 0) {
      var rb = el('button', 'btn btn--red', '用一划令咒重掷');
      rb.onclick = function () { reroll(b); };
      acts.appendChild(rb);
    }
    var nb = el('button', 'btn btn--solid', '继续');
    nb.onclick = function () { advance(); };
    acts.appendChild(nb);
    if (b.roll) rollAnim(root, b.roll);
    maybeBark(root, E.state());
    renderHud();
    renderDossier();
    setTimeout(settle, 700);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* 遭遇某位从者时的专属曲：只在他被解明到三阶段（真名推定）后响五秒
     —— 免得一进图就有一堆人抢着放歌。 */
  function sightingBgm(clue) {
    if (!clue || !clue.id) return;
    if ((clue.lv || clue.level || 0) < 3) return;
    try {
      if (window.GrailAudio && window.GrailAudio.playTemp) window.GrailAudio.playTemp(clue.id, 5000, sceneTheme());
    } catch (e) {}
  }

  /* 从者插话：按状态挑一句，一场最多一次 */
  var barkShown = {};
  /* 这些是模块级状态：重开一局必须清掉，否则第二轮开始从者一句都不说
     （barkShown 里全是上一局说过的句子）。 */
  function resetSession() {
    barkShown = {};
    ui.beat = null;
    ui.snapshot = null;
    ui.mapOpen = false;
  }
  function barkFor(st) {
    var all = (window.GRAIL_BARKS || {})[st.servantId];
    if (!all || !all.length) return null;
    var tags = ['any'];
    if (st.s.san <= 35) tags.unshift('lowSan');
    if (st.s.exposure >= 6) tags.unshift('highExp');
    if (st.s.beast >= 4) unshiftSafe(tags, 'beast');
    if (st.s.slot >= 2 || st.s.day >= 6) tags.push('night');
    function unshiftSafe(a, v) { if (a.indexOf(v) < 0) a.unshift(v); }
    var cand = all.filter(function (b) { return tags.indexOf(b.tag) >= 0 && !barkShown[b.t]; });
    if (!cand.length) return null;
    return cand[Math.floor(Math.random() * cand.length)];
  }
  function maybeBark(root, st) {
    try {
      /* 精神越差，从者越常说话——不是关心，是它在提醒你别掉出去 */
      var tier = E.sanTierNow ? E.sanTierNow() : 0;
      var p = 0.42 + tier * 0.13;
      if (Math.random() > p) return;
      var b = barkFor(st);
      if (!b) return;
      barkShown[b.t] = true;
      var sv = G.servant(st.servantId);
      var box = document.createElement('div');
      box.className = 'bark';
      box.innerHTML = '<span class="bhead">' + esc(sv.cls) + '</span>' +
        '<span class="btalk">' + esc(b.t) + '</span>';
      var anchor = root.querySelector('.prose') || root;
      anchor.parentNode.insertBefore(box, anchor.nextSibling);
      setTimeout(function () { box.classList.add('on'); }, 900);
      try { if (window.GrailSFX) window.GrailSFX.page(); } catch (e) {}
    } catch (e) {}
  }

  /* 骰子：先滚，再定格，成功/失败各给一声 */
  function rollAnim(root, roll) {
    var el = root.querySelector('.dice .rollnum');
    if (!el) return;
    var target = roll.die, k = 0;
    try { if (window.GrailSFX) window.GrailSFX.dice(); } catch (e) {}
    var t = setInterval(function () {
      k++;
      el.textContent = Math.floor(Math.random() * 100) + 1;
      if (k >= 11) {
        clearInterval(t);
        el.textContent = target;
        el.classList.add(roll.ok ? 'ok' : 'no');
        try {
          if (window.GrailSFX) window.GrailSFX[roll.ok ? 'success' : 'fail']();
        } catch (e) {}
      }
    }, 60);
  }

  /* 情绪特效：血量、曝光、兽的变化给画面一点反馈 */
  function moodFx(before, after) {
    var body = document.body;
    var hit = [];
    if (before.san - after.san >= 4) hit.push('fx-san-hit');
    if (after.exposure - before.exposure >= 2) hit.push('fx-exp-hit');
    if (after.beast > before.beast) hit.push('fx-beast-hit');
    if (!hit.length) return;
    hit.forEach(function (c) { body.classList.add(c); });
    try {
      if (window.GrailSFX) {
        if (before.san - after.san >= 4) window.GrailSFX.heartbeat();
        if (after.beast > before.beast) window.GrailSFX.glitch();
      }
    } catch (e) {}
    setTimeout(function () { hit.forEach(function (c) { body.classList.remove(c); }); }, 920);
  }

    /* 令咒重掷：只给失败的那一手。
       以前三个坑叠在一起：① 结算文本可能是函数，重掷时没解，直接抛错卡死；
       ② 重掷成功后没有重掷按钮，代码却无条件删掉按钮区的第一个孩子，把「继续」删了；
       ③ 快照为空时 setState(null)，整个存档瞬间没了。 */
  function reroll(b) {
    var o = b && b.o;
    if (!o || !o.check || !ui.snapshot) return;
    var live = E.state();
    if (!live || live.s.command <= 0) { toast('没有令咒可以烧了'); return; }
    E.setState(clone(ui.snapshot));
    var st = E.state();
    st.s.command = Math.max(0, st.s.command - 1);
    var loss = 1 + Math.floor(Math.random() * 3);
    st.s.san = Math.max(0, st.s.san - loss);
    E.addLog('你用掉一划令咒重掷（SAN −' + loss + '）');
    var roll = E.roll(o.check.skill, (o.check.bonus || 0) + 30);
    var br = roll.ok ? o.ok : o.fail;
    var paras_ = typeof br.text === 'function' ? br.text(E.state()) : br.text;
    var notes = E.apply(br.fx);
    notes = ['令咒 −1', 'SAN −' + loss].concat(notes || []);
    var clue = null;
    if (br.fx && br.fx.clue) {
      var cid = typeof br.fx.clue === 'string' ? br.fx.clue : Object.keys(br.fx.clue)[0];
      var clv = typeof br.fx.clue === 'string' ? 3 : br.fx.clue[cid];
      if (cid !== E.state().servantId) clue = { id: cid, lv: clv };
    }
    ui.snapshot = clone(E.state());
    if (br.battle) { var o2 = clone(o); o2.battle = br.battle; startBattle(o2); return; }
    if (br.exam) { startExam(o); return; }
    var nb = { o: o, paras: paras_, roll: roll, notes: notes, cue: clue, clue: clue, ok: roll.ok, rerolled: true };
    ui.beat = nb;
    renderBeat(nb);
    E.save();
  }

  function dayCard(n, title) {
    try {
      var l = document.createElement('div');
      l.className = 'day-card';
      l.innerHTML = '<div class="dn">DAY ' + n + '</div><div class="dt">' + esc(title || '') + '</div>' +
        '<div class="dl">距高考还有 ' + Math.max(0, 178 - n - 1) + ' 天</div>';
      document.body.appendChild(l);
      setTimeout(function () { l.classList.add('out'); }, 1150);
      setTimeout(function () { l.remove(); }, 1750);
      try { if (window.GrailSFX) window.GrailSFX.page(); } catch (e) {}
    } catch (e) {}
  }

  /* 刺客线的额外一次夜间行动（roster 里写了 nightAP:1，以前没人实现） */
  function hasNightAP(st) {
    if (st.routeId !== 'assassin') return false;
    var day = st.s.day;
    return day >= 1 && day < 7 && !st.s.flags['night2_' + day];
  }

  function advance() {
    var st = E.state();
    st.s.slot++;
    var D = currentDay();
    if (!D || st.s.slot >= D.slots.length) {
      // 先过夜里那一段，再翻篇
      if (D && st.s.day >= 1 && st.s.day < 7 && !st.s.flags['night_' + st.s.day]) {
        st.s.slot = D.slots.length;
        E.save(); screen('screen-game'); renderNight(); return;
      }
      if (D && hasNightAP(st)) {
        // 第二次夜行：不在这里设 night2_，那一键由 nightPick 落笔（否则第二次进来直接判成「已选过」）
        st.s.slot = D.slots.length;
        E.save(); screen('screen-game'); renderNight(); return;
      }
      advanceDay(); return;
    }
    E.save(); screen('screen-game'); renderSlot();
  }

  function advanceDay() {
    var st = E.state();
    var D = currentDay();
    // 还没过夜就先过夜（Day 7 的决战之后直接结算，不再插夜）
    if (st.s.day >= 1 && st.s.day < 7 && !st.s.flags['night_' + st.s.day]) {
      E.save(); screen('screen-game'); renderNight(); return;
    }
    if (st.s.day >= 1 && st.s.day < 7 && hasNightAP(st)) {
      E.save(); screen('screen-game'); renderNight(); return;
    }
    // 结算夜晚：兽 +1
    if (st.s.slot >= (D ? D.slots.length : 0)) {
      var prevDay = st.s.day;
      st.s.day++;
      st.s.slot = 0;
      // 睡一觉：跨天把 HP 与 MP 补满。
      // 之前完全没有恢复手段，前一天的惨胜会一路带到决战，等于必死。
      var goneList = Object.keys(st.s.flags).filter(function (k) { return k.indexOf('gone_') === 0; });
      var goneNow = goneList.length;
      if (goneNow > (st.s.goneSeen || 0)) {
        var newest = goneList[goneList.length - 1].replace('gone_', '');
        E.addLog('点名：' + newest + ' 没有答到。在场御主 ' + st.s.alive + ' / 7。');
        st.s.flags.pointMissingName = newest;
      }
      st.s.goneSeen = goneNow;
      var hpBack = st.s.hpMax - st.s.hp, mpBack = st.s.mpMax - st.s.mp;
      st.s.hp = st.s.hpMax;
      st.s.mp = st.s.mpMax;
      if (hpBack > 0 || mpBack > 0) {
        E.addLog('你睡了一觉。HP +' + hpBack + '，MP +' + mpBack + '。');
      }
      // 夜晚填格：这一天如果你什么都没踩住，就 +1（序章之夜不计）
      if (prevDay >= 1 && st.s.beastCutDay !== prevDay) {
        st.s.beast = Math.min(7, st.s.beast + 1);
        E.addLog('Day ' + prevDay + ' 结束：兽进度 +1（当前 ' + st.s.beast + '/7）');
      } else if (prevDay >= 1) {
        E.addLog('Day ' + prevDay + ' 结束：你踩住了刹车，兽没有动。');
      }
      if (st.s.day > 7) { finish(); return; }
      var _nd = G.STORY[st.s.day];
      dayCard(st.s.day, _nd ? _nd.title : '');
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
    var s = settings(false);
    s.speed = i;
    saveSettings(s);            // 设置页与这里共用一份，别各写各的
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
      ['servant:从者', 'bond:羁绊', 'relation:关系', 'intel:情报', 'decision:决定', 'codex:词条', 'audio:音源', 'log:记录'].map(function (t) {
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

    // 关系：谁还在、谁走了、谁的真名你已经知道了、谁欠你一次
    (function () {
      var fl = st.s.flags || {};
      function metMaster(name) {
        var list = (window.GRAIL_NPC_EVENTS || []).concat(((window.GRAIL_MAP || {}).events) || []);
        return list.some(function (e) { return e.who === name && fl['ev_' + e.id]; });
      }
      function stateOf(m) {
        if (m.id === st.masterId) return { k: 'me', t: '你自己' };
        if (fl['gone_' + m.name]) return { k: 'gone', t: '已退场' };
        if (m.servant && fl['beat_' + m.servant]) return { k: 'beat', t: '你打赢过他的从者' };
        if (m.servant && fl['ally_' + m.servant]) return { k: 'ally', t: '合作中' };
        var svx = m.servant ? G.servant(m.servant) : null;
        var lv = m.servant ? (st.s.clues[m.servant] || 0) : 0;
        if (metMaster(m.name)) return { k: 'met', t: lv >= 3 ? '接触过 · 真名已知' : '接触过' };
        return { k: 'unknown', t: '未接触' };
      }
      var cards = (G.MASTERS || []).map(function (m) {
        var s2 = stateOf(m), svx = m.servant ? G.servant(m.servant) : null;
        var lv = m.id === st.masterId ? 5 : (m.servant ? (st.s.clues[m.servant] || 0) : 0);
        var nameTxt = m.id === st.masterId || lv >= 3 ? esc(m.name) : '？？？';
        var svTxt = svx ? (lv >= 3 || m.id === st.masterId ? svx.cls + ' · ' + esc(svx.name) : svx.cls + ' · 未解明') : '—';
        if (fl['gone_' + m.name]) { nameTxt = esc(m.name); svTxt = svx ? svx.cls + ' · 已退场' : '已退场'; }
        return '<div class="rel-card ' + s2.k + '">' +
          '<b>' + nameTxt + '</b>' +
          '<span class="rel-st">' + esc(s2.t) + '</span>' +
          '<i>' + esc(svTxt) + '</i>' +
          '</div>';
      }).join('');
      /* 结下的人情：不是御主，是学校里真正管事的那些人 */
      var fav = [];
      if (fl.allyChen) fav.push('陈墨（情报商）答应替你查一次');
      if (fl.allyWang) fav.push('王秀英（食堂）把你的账记上了');
      if (fl.allyBai) fav.push('白露和你换过一次');
      if (fl.rulerOffer) fav.push('Ruler 给了你一个承诺');
      if (fl.parentMeetingNow) fav.push('家长会已经开过');
      html += '<div class="tab-panel ' + (ui.tab === 'relation' ? 'on' : '') + '" data-panel="relation">' +
        '<h5>在场御主</h5><p>' + st.s.alive + ' / 7　盟友 ' + st.s.allies + ' 人</p>' +
        '<h5>档案里的人</h5><div class="rel-grid">' + cards + '</div>' +
        '<h5>结下的人情</h5>' +
        (fav.length ? fav.map(function (t) { return '<div class="dec-item">' + esc(t) + '</div>'; }).join('')
          : '<p style="color:var(--ink-3)">还没有人欠你什么，你也没欠谁的。</p>') +
        '<p class="codex-tip">退场的人不会再来；被你打赢过的从者，名字你已经记住了。</p>' +
        '</div>';
    })();

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

    // 羁绊
    (function () {
      var book = BOND_BOOK()[st.servantId] || {};
      var bl = bondLevel(st), seen = bondSeen(st), list = bondNodes(st);
      var bar = '';
      for (var bi = 0; bi < 3; bi++) bar += '<i class="' + (bi < bl ? 'on' : '') + '"></i>';
      var rows = list.map(function (n, i) {
        return '<div class="dec-item' + (seen[n.id] ? ' done' : '') + '">' +
          (seen[n.id] ? '已记录' : '未发生') + ' · 第 ' + (i + 1) + ' 段　' + esc(seen[n.id] ? (n.sub || '') : '——') + '</div>';
      }).join('');
      var ex = extraBondNode(st), exData = (window.GRAIL_BONDS_EXTRA || {})[st.servantId];
      if (exData) {
        rows += '<div class="dec-item' + (ex ? '' : ' done') + '">' +
          (ex ? '未发生' : '已记录') + ' · 加演　' + esc(ex ? '还有一段' : (exData.sub || '')) + '</div>';
      }
      var next = nextBondNode(st, null);
      html += '<div class="tab-panel ' + (ui.tab === 'bond' ? 'on' : '') + '" data-panel="bond">' +
        '<h5>' + esc(book.name || '还没有名字') + '</h5>' +
        '<p>' + esc(book.line || '你们还没说过几句话。') + '</p>' +
        '<div class="bondbar">' + bar + '</div>' +
        '<p><b>LV.' + bl + '</b>　' + esc(BOND_FX[bl] || '') + '</p>' +
        '<h5>片段</h5>' + (rows || '<p style="color:var(--ink-3)">这条线还没写。</p>') +
        '<p class="codex-tip">' + (next ? '夜里「去找从者」，或者等他来找你。' : (bl >= 3 ? '三段都走完了。他说的话你都记得。' : '还有话没说完，只是时机不到。')) + '</p>' +
        '</div>';
    })();

    // 决定
    var dec = '';
    (function () {
      var fl = st.s.flags || {};
      var known = [], unknown = 0;
      Object.keys(fl).forEach(function (k) {
        if (!fl[k]) return;
        if (/^(seen_|ev_|visit_|free_|fx_|intelSeen_|bonddone_|beat_|exam)/.test(k)) return;
        /* 只给中文。词库里对不上名的（内部标记、后来加的）不往玩家脸上甩英文键。 */
        var lab = E.flagLabel(k);
        if (lab) known.push(lab); else unknown++;
      });
      dec += '<h5>被记下来的</h5>';
      dec += known.length
        ? known.map(function (t) { return '<div class="dec-item">' + esc(t) + '</div>'; }).join('')
        : '<p style="color:var(--ink-3)">还没有什么被写进档案。你做的每一件事，教务处都在看。</p>';
      if (unknown) {
        dec += '<p style="color:var(--ink-3);font-size:11.5px;margin-top:6px">另有 ' + unknown + ' 条记录，还没写上名字。</p>';
      }
      dec += '<h5>最近的动作</h5>' + ((st.log || []).slice(-8).reverse().map(function (l) {
        return '<div class="log-line">' + esc(l) + '</div>';
      }).join('') || '<p>暂无记录。</p>');
      dec += '<p class="codex-tip">这些标记决定了结局判定：谁在场、门开没开、兽吃到了第几格。</p>';
    })();
    html += '<div class="tab-panel ' + (ui.tab === 'decision' ? 'on' : '') + '" data-panel="decision">' + dec + '</div>';

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
      '御主 ' + esc(m.name) + '　｜　' + esc(r.name) + '线　｜　在场 ' + st.s.alive + '/7<br>' +
      '<button id="btn-save" style="all:unset;cursor:pointer;border-bottom:1px solid var(--line);margin-top:8px;display:inline-block">手动存档</button>　' +
      '<button id="btn-speed" style="all:unset;cursor:pointer;border-bottom:1px solid var(--line);margin-left:10px">文字：' + speedLabel() + '</button>　' +
      '<button id="btn-set" style="all:unset;cursor:pointer;border-bottom:1px solid var(--line);margin-left:10px">设置</button>　' +
      '<button id="btn-quit" style="all:unset;cursor:pointer;border-bottom:1px solid var(--line)">回到封面</button>' +
      '</div></div>';

    $('dossier').innerHTML = html;
    $('dossier').querySelectorAll('.tabs button').forEach(function (b) {
      b.onclick = function () { ui.tab = b.getAttribute('data-tab'); renderDossier(); };
    });
    var bs = $('btn-save'); if (bs) bs.onclick = function () { openSlots('save'); };
    var bsp = $('btn-speed');
    if (bsp) bsp.onclick = function () { cycleSpeed(); renderDossier(); };
    var bset = $('btn-set'); if (bset) bset.onclick = function () { openSettings(); };
    var bq = $('btn-quit'); if (bq) bq.onclick = function () { E.save(); screen('screen-title'); initTitle(); audio('title'); };
  }

  /* ---------- 结局 ---------- */
  /* 结局页：E7（门开）与 E9（满分）各给一段专门的东西 */
  function endingStinger(id) {
    if (!window.GrailAVG) return;
    try {
      if (id === 'E7') window.GrailAVG.stinger('bleed', { msg: '它 看 了 你 一 眼', dur: 2000 }, function () {});
      else if (id === 'E9') window.GrailAVG.stinger('beast', { title: '满分', sub: '你是第几？' }, function () {});
      else if (id === 'E2' || id === 'E3') window.GrailAVG.stinger('static', { msg: '—', dur: 1300 }, function () {});
    } catch (e) {}
  }
  function finish() {
    var st = E.state();
    // 决战线：若最后选项是许愿，则进入许愿分支
    var id = G.judgeEnding(st);
    var e = G.ENDINGS[id];
    var world = G.WORLD[Math.floor(Math.random() * G.WORLD.length)];
    var epi = '';
    if (CODEX.epilogues && CODEX.epilogues[id]) epi = CODEX.epilogues[id];
    var sv = G.servant(st.servantId), m = G.master(st.masterId);
    // 结局加厚：数据在 endings_extra.js 的 GRAIL_ENDING_EXTRA，这里取值（原来直接引用裸变量会 ReferenceError）
    var EX = window.GRAIL_ENDING_EXTRA || { after: {}, byServant: {} };
    var extraAfter = (EX.after && EX.after[id]) || [];
    var extraServant = (EX.byServant && EX.byServant[st.servantId]) || '';

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
      (function () {
        var a2 = (EX.after2 || {})[id];
        return a2 ? '<div class="ending-body" style="margin-top:26px"><p class="reveal">' + esc(a2) + '</p></div>' : '';
      })() +
      (function () {
        var more = (window.GRAIL_ENDING_MORE || {})[id];
        return more && more.length
          ? '<div class="ending-body" style="margin-top:26px">' + more.map(function (p) { return '<p class="reveal">' + esc(p) + '</p>'; }).join('') + '</div>'
          : '';
      })() +
      (extraServant ? '<div class="ending-body" style="margin-top:26px"><div style="font-family:var(--mono);font-size:10px;letter-spacing:.3em;color:var(--red);margin-bottom:8px">从者 · ' + esc(sv.cls) + '</div><p>' + esc(extraServant) + '</p></div>' : '') +
      (function () {
        var bl = bondLevel(st);
        if (bl <= 0) return '';
        var codas = [
          '',
          '你们其实只说过几句话。但那几句话，你记得比这一个星期里的任何一节课都清楚。',
          '你后来才想明白：那天在走廊上他多站的那半步，是给你留的。你没走过去，他也没有催。',
          '最后一天他没有告别。你只在楼梯拐角看见一个背影，走得很慢——慢到足够你叫住他。你没有叫。他也没有回头。'
        ];
        return '<div class="ending-body" style="margin-top:26px"><div style="font-family:var(--mono);font-size:10px;letter-spacing:.3em;color:var(--red);margin-bottom:8px">羁绊 · LV.' + bl + '</div><p>' + esc(codas[bl] || '') + '</p></div>';
      })() +
      '<div class="ending-tail">' + esc(e.tail) + '</div>' +
      '<div class="world-card"><div class="hd">世界状态 · 1D10</div>' + esc(world) + '</div>' +
      (G.judgeReason ? '<p style="margin:14px 0 0;font-family:var(--hei);font-size:11.5px;line-height:1.9;letter-spacing:.04em;color:var(--ink-3)">判定依据：' + esc(G.judgeReason(id, st)) + '</p>' : '') +
      '<table class="score-table">' +
      '<tr><td>最终 SAN</td><td>' + st.s.san + ' / ' + st.s.sanMax + '</td></tr>' +
      '<tr><td>曝光度</td><td>' + st.s.exposure + ' / 10</td></tr>' +
      '<tr><td>兽 · Ⅳ 进度</td><td>' + st.s.beast + ' / 7</td></tr>' +
      '<tr><td>令咒剩余</td><td>' + st.s.command + ' / 3</td></tr>' +
      '<tr><td>在场御主</td><td>' + st.s.alive + ' / 7' + (function () {
        var gone = Object.keys(st.s.flags).filter(function (k) { return k.indexOf('gone_') === 0; })
          .map(function (k) { return k.replace('gone_', ''); });
        return gone.length ? '（退场：' + gone.join('、') + '）' : '';
      })() + '</td></tr>' +
      '<tr><td>掌握的真名</td><td>' + Object.keys(st.s.clues).filter(function (k) { return st.s.clues[k] >= 3; }).length + ' / 8</td></tr>' +
      '<tr><td>与从者的羁绊</td><td>LV.' + bondLevel(st) + ' / 3' + (bondLevel(st) >= 3 ? '（他把话都说完了）' : '') + '</td></tr>' +
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
    endingStinger(id);
    setTimeout(settle, 700);
    E.clearSave();
    $('btn-again').onclick = function () { ui.q = 0; ui.answers = {}; screen('screen-quiz'); audio('quiz'); renderQuiz(); };
    $('btn-backtitle').onclick = function () { screen('screen-title'); initTitle(); audio('title'); };
  }

  /* ---------- 音量 ----------
     顶部那条小滑杆和设置页写同一份设置，静音也同时管住音效。 */
  function initAudioBar() {
    var mute = $('btn-mute'), vol = $('vol'), now = $('audio-now');
    function paint() {
      if (!window.GrailAudio) return;
      var s = settings(false);
      mute.textContent = s.muted ? '×' : '♪';
      vol.value = Math.round(s.vol == null ? 55 : s.vol);
      var cur = window.GrailAudio.current();
      var t = (window.GrailAudio.themes && window.GrailAudio.themes[cur]) || null;
      now.textContent = t && t.title ? t.title : (cur || '—');
    }
    mute.onclick = function () {
      var s = settings(false);
      s.muted = !s.muted;
      saveSettings(s);
      paint();
    };
    vol.oninput = function () {
      var s = settings(false);
      s.vol = +vol.value;
      saveSettings(s);
      paint();
    };
    if (window.GrailAudio) window.GrailAudio.onStateChange(paint);
    applySettings(settings(false));
    paint();
    var first = function () {
      if (window.GrailAudio) { window.GrailAudio.init(); applySettings(settings(false)); }
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

  /* ---------- 键盘 ----------
     这游戏的核心动作就三个：选一项、点继续、关弹层。全靠鼠标会很累。
     数字键 / A–D 选选项，回车或空格继续，Esc 关弹层或跳过打字机。 */
  function keyChoices() {
    var groups = ['#opts .choice', '#night-opts .choice', '#wish-list .choice', '.bmenu .btn'];
    for (var i = 0; i < groups.length; i++) {
      var arr = Array.prototype.slice.call(document.querySelectorAll(groups[i]))
        .filter(function (b) { return !b.disabled; });
      if (arr.length) return arr;
    }
    return [];
  }
  function keyNext() {
    var sels = ['#beat-actions .btn--solid', '#bt-done', '#map-done', '#exam-done', '#map-back'];
    for (var i = 0; i < sels.length; i++) {
      var n = document.querySelector(sels[i]);
      if (n && !n.disabled) return n;
    }
    return null;
  }
  function initKeys() {
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      var k = e.key || '';
      if (k === 'Escape') {
        var modal = document.querySelector('.modal-layer');
        if (modal) { modal.remove(); e.preventDefault(); return; }
        var bl = document.getElementById('battle-layer');
        if (bl && bl.classList.contains('on')) return;      // 战斗中不响应 Esc
        try { if (window.GrailAVG) window.GrailAVG.skip(); } catch (err) {}
        return;
      }
      // 有弹层时，别让数字键点到背后的东西
      if (document.querySelector('.modal-layer')) {
        if (k === 'Enter' || k === ' ') {
          var foot = document.querySelector('.modal-layer .modal-foot .btn');
          if (foot) { e.preventDefault(); foot.click(); }
        }
        return;
      }
      var typing = !!document.querySelector('.caret');
      if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        if (typing) { try { if (window.GrailAVG) window.GrailAVG.skip(); } catch (err) {} return; }
        var n = keyNext();
        if (n) n.click();
        return;
      }
      var idx = -1;
      if (/^[1-9]$/.test(k)) idx = +k - 1;
      else if (/^[a-dA-D]$/.test(k)) idx = 'abcd'.indexOf(k.toLowerCase());
      if (idx >= 0) {
        var cs = keyChoices();
        if (cs[idx]) { e.preventDefault(); cs[idx].click(); }
      }
    });
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
      st0.s.bond = 2;
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
    } else if (m[1] === 'night') {
      E.create(preset); screen('screen-game');
      var sn = E.state(); sn.s.day = 2; sn.s.slot = 3; sn.s.bond = 1; renderSlot();
    } else if (m[1] === 'battle2') {
      E.create(preset); screen('screen-game'); renderSlot();
      setTimeout(function () {
        var sb2 = E.state(); sb2.s.bond = 2; sb2.s.allies = 1;
        startBattle({ battle: { foe: 'archer', title: '车棚里的遭遇', clueLv: 3 }, label: '对上 ARCHER' });
      }, 300);
    } else if (m[1] === 'reroll') {
      /* 令咒重掷回归测试：直接造一个失败的检定，点重掷，再点继续 */
      E.create(preset); screen('screen-game');
      var sr2 = E.state(); sr2.s.day = 2; sr2.s.slot = 1; renderSlot();
      setTimeout(function () {
        var slot = currentSlot();
        var o = null;
        ((slot && slot.options) || []).forEach(function (x) { if (!o && x.check) o = x; });
        if (!o) { toast('这个时段没有检定选项'); return; }
        ui.snapshot = clone(E.state());
        var roll = { die: 97, target: 30, ok: false, level: '大失败', skill: o.check.skill };
        var notes = E.apply(o.fail.fx);
        var beat = {
          o: o, paras: (typeof o.fail.text === 'function' ? o.fail.text(E.state()) : o.fail.text),
          roll: roll, notes: notes, ok: false
        };
        ui.beat = beat;
        renderBeat(beat);
      }, 450);
    } else if (m[1] === 'low') {
      /* 精神掉档的样子：幻觉选项、正文重影、HUD 档位 */
      E.create(preset); screen('screen-game');
      var sl = E.state();
      sl.s.day = 3; sl.s.slot = 1;
      sl.s.san = Math.round(sl.s.sanMax * 0.16);
      renderSlot();
    } else if (m[1] === 'rollcall') {
      E.create(preset); screen('screen-game');
      var sr4 = E.state(); sr4.s.day = 3; sr4.s.beast = 4; sr4.s.exposure = 6;
      sr4.s.flags['gone_王大力'] = true; sr4.s.alive = 6;
      renderSlot();
    } else if (m[1] === 'recall') {
      E.create(preset); screen('screen-game');
      var sr5 = E.state();
      sr5.s.day = 7; sr5.s.slot = 2; sr5.s.bond = 2;
      sr5.s.flags.savedRunner = true; sr5.s.flags.stayed = true;
      sr5.s.flags.know1994 = true; sr5.s.nights = { 2: 'rest', 3: 'patrol', 4: 'bond' };
      renderSlot();
    } else if (m[1] === 'hall') {
      E.create(preset); screen('screen-game');
      var sh = E.state();
      sh.s.day = 3; sh.s.slot = 1; sh.s.san = Math.round(sh.s.sanMax * 0.14);
      ui.forceHall = true;
      renderSlot();
    } else if (m[1] === 'fx') {
      /* 演出预览：dev=fx&k=mirror / dissolve / static / bleed */
      E.create(preset); screen('screen-game'); renderSlot();
      var hs = (location.hash || '').match(/k=(\w+)/);
      var kk = hs ? hs[1] : 'mirror';
      setTimeout(function () {
        window.GrailAVG.stinger(kk, {
          title: '你是第几？',
          msg: '走廊正在变成一张表',
          lines: ['四点之前的那几分钟，你把这一周在脑子里过了一遍。', '四点了。'],
          dur: 6000
        }, function () {});
      }, 500);
    } else if (m[1] === 'settings') {
      E.create(preset); screen('screen-game'); renderSlot();
      setTimeout(openSettings, 320);
    } else if (m[1] === 'relation') {
      E.create(preset); screen('screen-game');
      var sr3 = E.state();
      sr3.s.day = 3; sr3.s.slot = 1; sr3.s.bond = 1; sr3.s.allies = 2;
      sr3.s.flags.allyChen = true; sr3.s.flags.rulerOffer = true;
      sr3.s.flags['gone_王大力'] = true; sr3.s.clues.lancer = 3;
      ui.tab = 'relation'; renderSlot();
    } else if (m[1] === 'bond2') {
      E.create(preset); screen('screen-game');
      var sb3 = E.state(); sb3.s.day = 2; sb3.s.slot = 2; ui.tab = 'bond'; renderSlot();
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
    try { initKeys(); } catch (e) { fatal(e); }
    try { screen('screen-title'); audio('title'); } catch (e) { fatal(e); }
    try { devHook(); } catch (e) { fatal(e); }
    window.addEventListener('beforeunload', function () { try { if (E.state()) E.save(); } catch (e) {} });
  }

  /* 调试出口：本地排查 / 自动化验证用，正常流程不依赖它。
     只暴露既有函数引用，不改变任何行为。 */
  window.GRAIL_DEBUG = {
    screen: screen, renderSlot: renderSlot, renderMapScreen: renderMapScreen,
    enterPlace: enterPlace, pickMapEvent: pickMapEvent, evOk: evOk,
    finish: finish, nobleCut: nobleCut, audio: audio, rich: rich, paras: paras,
    startBattle: startBattle, renderDossier: renderDossier,
    advance: advance, advanceDay: advanceDay, apply: function (fx) { return E.apply(fx); },
    state: function () { return E.state(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
