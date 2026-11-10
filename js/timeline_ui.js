/* 时间线阅读器
   —— 档案馆第二个标签。左边 11 条线，右边阅读区。

   演出怎么接：正文里带 fx 的那一项会渲染成一块「演出条」，
   滚到它进入视口，就自己炸开（宝具对轰 / 全校广播 / 排名公布 / 契约成立）。
   放完变灰，点一下可以再看。不放也没关系，文字本身是完整的。

   进度：读到的章记在 localStorage['grail_archive_v1'].read[eid]，
   读完记在 .readDone[eid]。刷新、重开都还在。
*/
(function () {
  'use strict';

  var AR_KEY = 'grail_archive_v1';
  var NEED = 6;                       /* 已见结局 ≥ 6 才解锁（11 的一半，向上取整） */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }
  /* 与正文同一套关键词高亮：让长段落有落点，不至于糊成一片 */
  var KW = ['倒数牌', '圣杯战争', '圣杯', '令咒', '灵体化', '真名', '宝具', '曝光', '扣分', '职阶', '御主', '从者'];
  function markup(t) {
    var s = esc(t);
    KW.forEach(function (k) { s = s.split(k).join('<em class="kw">' + k + '</em>'); });
    return s;
  }

  function readArchive() {
    try { return JSON.parse(localStorage.getItem(AR_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeArchive(a) {
    try { localStorage.setItem(AR_KEY, JSON.stringify(a)); } catch (e) {}
  }
  /* 设置里那个「解锁全部」的后门：只改看得见什么，不写结局 */
  function unlockAll() {
    try { return localStorage.getItem('grail_unlock_all') === '1'; } catch (e) { return false; }
  }
  function lib() { return window.GRAIL_TIMELINE || {}; }
  function endings() { return (window.GRAIL && window.GRAIL.ENDINGS) || {}; }
  function order() {
    var ids = Object.keys(endings()).filter(function (id) { return !!lib()[id]; });
    /* IF 线不进 11 条结局，单独挂在最后 */
    if (lib().MX) ids.push('MX');
    return ids;
  }
  function seenCount() { var a = readArchive(); return Object.keys(a.endings || {}).length; }
  function unlocked() { return unlockAll() || seenCount() >= NEED; }
  function seenEnding(id) {
    if (id === 'MX') return true;          /* IF 线不需要解锁 */
    if (unlockAll()) return true;
    var a = readArchive(); return !!((a.endings || {})[id]);
  }

  function plainLen(line) {
    var n = 0;
    (line.chapters || []).forEach(function (c) {
      (c.text || []).forEach(function (it) {
        if (typeof it === 'string') n += it.replace(/\s/g, '').length;
        else if (it.doc) n += String(it.doc).replace(/\s/g, '').length;
      });
    });
    return n;
  }
  function kfmt(n) { return n >= 1000 ? (Math.round(n / 100) / 10).toFixed(1) + ' 千字' : n + ' 字'; }

  /* 演出条上写什么 */
  function cueLabel(it) {
    var k = it.fx;
    if (k === 'clash') return '真名解放 · 对轰';
    if (k === 'noble') return '真名解放';
    if (k === 'summon') return '契约成立';
    if (k === 'broadcast') return '全校广播';
    if (k === 'roll') return '排名公布';
    if (k === 'impact') return it.title || '撞击';
    if (k === 'glitch') return '信号不稳';
    if (k === 'beast') return '兽 · 显现';
    if (k === 'static') return '雪花';
    if (k === 'mirror') return '镜像';
    if (k === 'bleed') return '渗色';
    if (k === 'dissolve') return '溶解';
    return '演出';
  }

  /* ============================================================
     列表
     ============================================================ */
  function panelHTML() {
    if (!unlocked()) {
      return '<div class="tl-locked">' +
        '<div class="tl-lock-mark">时 间 线</div>' +
        '<p class="tl-locked-line">再走几条路，这里才会打开。</p>' +
        '</div>';
    }
    var a = readArchive(), read = a.read || {}, done = a.readDone || {};
    var items = order().map(function (id) {
      var L = lib()[id];
      var got = seenEnding(id);
      var cur = read[id] || 0;
      var fin = done[id];
      var name = got ? L.title : '？？？';
      return '<button class="tl-item" data-id="' + id + '">' +
        '<span class="tl-no">' + id + '</span>' +
        '<span class="tl-name">' + esc(name) + '</span>' +
        '<span class="tl-sub">' + (got ? esc(L.sub || '') : '这条线对应的结局你还没走到') + '</span>' +
        '<span class="tl-meta">' + (L.chapters || []).length + ' 章 · ' + kfmt(plainLen(L)) +
        (fin ? '　·　读完' : (cur > 0 ? '　·　读到第 ' + (cur + 1) + ' 章' : '')) + '</span>' +
        (fin ? '<span class="tl-done">✓</span>' : '') +
        '</button>';
    }).join('');
    return '<div class="tl-wrap">' +
      '<div class="tl-side"><div class="tl-side-t">路 线（' + order().length + '）</div>' +
      '<div class="tl-list" id="tl-list">' + items + '</div></div>' +
      '<div class="tl-reader" id="tl-reader"><div class="tl-empty">' +
      '<span class="tl-empty-k">档 案 室</span>' +
      '<p>同一个世界，七组人，十一种走法。</p>' +
      '<p class="tl-empty-s">左边选一条。读到哪儿，会记住。</p>' +
      '</div></div></div>';
  }

  /* ============================================================
     阅读器
     ============================================================ */
  var state = { eid: null, ch: 0, busy: false };

  function libOf(eid) { return lib()[eid]; }

  function savePos(eid, ch) {
    var a = readArchive();
    a.read = a.read || {};
    a.read[eid] = ch;
    writeArchive(a);
  }
  function markDone(eid) {
    var a = readArchive();
    a.readDone = a.readDone || {};
    a.readDone[eid] = Date.now();
    writeArchive(a);
  }

  function chapterHTML(eid, ch) {
    var L = libOf(eid);
    if (!L) return '';
    var C = L.chapters[ch];
    var got = seenEnding(eid);
    /* 这条线上有戏的从者：小头像一排，灰的，鼠标放上去才亮 */
    var castHtml = (L.cast || []).map(function (sid) {
      var sv = (window.GRAIL && window.GRAIL.servant) ? window.GRAIL.servant(sid) : null;
      if (!sv) return '';
      return '<i class="tl-sv" title="' + esc(sv.cls + ' · ' + sv.name) + '" ' +
        'style="background-image:url(assets/img/servant_' + sid + '.jpg)"></i>';
    }).join('');
    return '<div class="tl-head">' +
      '<div class="tl-hl"><b>' + esc(C.title) + '</b><span class="tl-idx">' + (ch + 1) + ' / ' + L.chapters.length + '</span></div>' +
      '<div class="tl-hsub">' + (got ? esc(L.title + '　·　' + (L.sub || '')) : (L.no || eid) + '　·　未解锁的结局线') + '</div>' +
      (castHtml ? '<div class="tl-cast">' + castHtml + '</div>' : '') +
      '</div>' +
      '<div class="tl-body" id="tl-body"></div>' +
      '<div class="tl-foot">' +
      '<button class="mini" id="tl-prev"' + (ch === 0 ? ' disabled' : '') + '>上一章</button>' +
      '<button class="mini" id="tl-toc">目录</button>' +
      ((ch === L.chapters.length - 1)
        ? '<button class="mini tone" id="tl-next">读完 · 归档</button>'
        : '<button class="mini tone" id="tl-next">下一章</button>') +
      '</div>';
  }

  function renderChapter(root, eid, ch, opts) {
    opts = opts || {};
    var L = libOf(eid);
    if (!L) return;
    state.eid = eid; state.ch = ch;
    savePos(eid, ch);

    var reader = root.querySelector('#tl-reader') || root;
    /* 换章时把上一章的滚动监听摘掉，否则旧节点还在观察、还会触发表演 */
    if (reader._io) { try { reader._io.disconnect(); } catch (e) {} reader._io = null; }
    if (reader._onScroll) { reader.removeEventListener('scroll', reader._onScroll); reader._onScroll = null; }
    reader.innerHTML = chapterHTML(eid, ch);
    reader.classList.add('on');

    var body = reader.querySelector('#tl-body');
    var items = L.chapters[ch].text || [];
    var cues = [];

    items.forEach(function (it, i) {
      if (typeof it === 'string') {
        var p = document.createElement('p');
        p.className = 'tl-p' + (/^「[^「」]{1,60}」$/.test(it.trim()) ? ' dialogue' : '');
        p.innerHTML = markup(it);
        p.style.animationDelay = Math.min(i * 26, 700) + 'ms';
        body.appendChild(p);
        return;
      }
      if (it.doc) {
        var d = document.createElement('div');
        d.className = 'tl-doc';
        d.innerHTML = '<span class="tl-doc-k">档案摘录</span>' + markup(it.doc).replace(/\n/g, '<br>');
        body.appendChild(d);
        return;
      }
      if (it.fx) {
        /* 注意：演出项自己也可能带 bgm（对轰要换战斗曲），
           所以 fx 必须先判断，不能先被 bgm 分支吃掉。 */
        var n = document.createElement('button');
        n.className = 'tl-cue';
        n.type = 'button';
        n.innerHTML = '<span class="cue-k">演 出</span><b>' + esc(cueLabel(it)) + '</b><span class="cue-a">▶ 点这里重放</span>';
        body.appendChild(n);
        cues.push({ node: n, item: it, kind: 'fx' });
        return;
      }
      if (it.bgm) {
        var b = document.createElement('div');
        b.className = 'tl-bgm';
        body.appendChild(b);
        cues.push({ node: b, item: it, kind: 'bgm' });
        return;
      }
    });

    /* 绑定：滚进视口自动放一次；点一下也能放 */
    var played = {};
    function fire(c, idx) {
      if (c.kind === 'bgm') {
        try { if (window.GrailAudio) window.GrailAudio.play(c.item.bgm); } catch (e) {}
        return;
      }
      if (c.node.classList.contains('played') || c.node.dataset.playing) return;
      if (state.busy) return;
      state.busy = true;
      /* 每种演出都要有自己的声音：对轰与兽换曲，其余至少给一下音效 */
      try {
        var A = window.GrailAudio, S = window.GrailSFX, it = c.item;
        if (it.fx === 'clash') { if (A) A.play(it.bgm || 'battle', { quick: true }); }
        else if (it.fx === 'beast') { if (A) A.play('beast'); }
        else if (it.fx === 'summon' && it.id) { if (A) A.play(it.id, { quick: true }); }
        else if (it.fx === 'noble') { if (A) A.play(it.theme || 'battle', { quick: true }); }
        if (it.fx === 'roll' && S) S.dice();
        if (it.fx === 'impact' && S) S.stamp();
        if (it.fx === 'broadcast' && S) S.glitch();
        if (it.fx === 'glitch' && S) S.glitch();
      } catch (e) {}
      c.node.dataset.playing = '1';
      c.node.classList.add('playing');
      var done = function () {
        state.busy = false;
        c.node.classList.remove('playing');
        c.node.classList.add('played');
        delete c.node.dataset.playing;
      };
      try {
        window.GrailAVG.stinger(c.item.fx, c.item, done);
      } catch (e) { state.busy = false; done(); }
    }
    function tryFire(c, idx) {
      if (played[idx]) return;
      played[idx] = 1;
      /* 滚进视口后缓半秒再放：刚翻页就炸会把人吓一跳 */
      setTimeout(function () { fire(c, idx); }, 420);
    }

    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var idx = cues.indexOf(cues.filter(function (c) { return c.node === en.target; })[0]);
          if (idx >= 0) tryFire(cues[idx], idx);
        });
      }, { root: reader, threshold: 0.6 });
      cues.forEach(function (c) { io.observe(c.node); });
      reader._io = io;
    }
    cues.forEach(function (c, idx) {
      if (c.kind !== 'fx') return;
      c.node.onclick = function () {
        c.node.classList.remove('played');
        played[idx] = 0;
        fire(c, idx);
      };
    });

    /* 翻页 */
    var prev = reader.querySelector('#tl-prev');
    var next = reader.querySelector('#tl-next');
    var toc = reader.querySelector('#tl-toc');
    if (prev) prev.onclick = function () { if (ch > 0) renderChapter(root, eid, ch - 1); };
    if (next) next.onclick = function () {
      if (ch < L.chapters.length - 1) { renderChapter(root, eid, ch + 1); return; }
      markDone(eid);
      if (window.GrailToast) window.GrailToast('这条线读完了，档案室记下了');
      refreshList(root);
      next.textContent = '已归档 ✓';
      next.disabled = true;
      var dEl = reader.querySelector('.tl-done-flag');
      if (!dEl) {
        dEl = document.createElement('div');
        dEl.className = 'tl-done-flag';
        dEl.textContent = '读完 · ' + L.title;
        reader.querySelector('#tl-body').appendChild(dEl);
      }
    };
    if (toc) toc.onclick = function () { toggleToc(root, eid, ch, reader); };

    /* 滚到底就自动记「读完了」——不用非得点那个按钮 */
    function nearBottom() {
      return reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 48;
    }
    var autoDone = false;
    reader._onScroll = function () {
      if (autoDone || ch !== L.chapters.length - 1) return;
      if (!nearBottom()) return;
      autoDone = true;
      markDone(eid);
      refreshList(root);
      var b = reader.querySelector('#tl-next');
      if (b) { b.textContent = '已归档 ✓'; b.disabled = true; }
      var body2 = reader.querySelector('#tl-body');
      if (body2 && !reader.querySelector('.tl-done-flag')) {
        var f = document.createElement('div');
        f.className = 'tl-done-flag';
        f.textContent = '读完 · ' + L.title;
        body2.appendChild(f);
      }
    };
    reader.addEventListener('scroll', reader._onScroll, { passive: true });
    /* 短章一屏就能看完：进章 1.2 秒后如果本来就在底部，也算读完 */
    if (ch === L.chapters.length - 1) setTimeout(function () { if (reader._onScroll) reader._onScroll(); }, 1200);
    refreshList(root);

    if (opts.resume) {
      /* 回到上次读到的那一段：不做精确段落定位（数据会改），只回到章节开头 */
      setTimeout(function () { reader.scrollTop = 0; }, 30);
    }
  }

  function toggleToc(root, eid, ch, reader) {
    var old = reader.querySelector('.tl-toc-pop');
    if (old) { old.remove(); return; }
    var L = libOf(eid);
    var pop = document.createElement('div');
    pop.className = 'tl-toc-pop';
    pop.innerHTML = '<div class="tl-toc-t">目 录</div>' +
      L.chapters.map(function (c, i) {
        return '<button class="tl-toc-row' + (i === ch ? ' on' : '') + '" data-i="' + i + '">' +
          '<span>' + (i + 1) + '</span>' + esc(c.title) + '</button>';
      }).join('');
    reader.appendChild(pop);
    pop.onclick = function (e) {
      var row = e.target.closest ? e.target.closest('.tl-toc-row') : null;
      if (!row) return;
      renderChapter(root, eid, +row.getAttribute('data-i'));
    };
  }

  function refreshList(root) {
    var list = root.querySelector('#tl-list');
    if (!list) return;
    var a = readArchive(), read = a.read || {}, done = a.readDone || {};
    Array.prototype.forEach.call(list.querySelectorAll('.tl-item'), function (b) {
      var id = b.getAttribute('data-id');
      var L = lib()[id];
      if (!L) return;
      var got = seenEnding(id);
      var meta = b.querySelector('.tl-meta');
      var cur = read[id] || 0;
      if (meta) meta.textContent = (L.chapters || []).length + ' 章 · ' + kfmt(plainLen(L)) +
        (done[id] ? '　·　读完' : (cur > 0 ? '　·　读到第 ' + (cur + 1) + ' 章' : ''));
      var dn = b.querySelector('.tl-done');
      if (done[id] && !dn) {
        var s = document.createElement('span');
        s.className = 'tl-done';
        s.textContent = '✓';
        b.appendChild(s);
      }
      b.classList.toggle('seen', got);
    });
  }

  function mount(root) {
    if (!root) return;
    var list = root.querySelector('#tl-list');
    if (list) {
      list.onclick = function (e) {
        var b = e.target.closest ? e.target.closest('.tl-item') : null;
        if (!b) return;
        Array.prototype.forEach.call(list.querySelectorAll('.tl-item'), function (x) { x.classList.toggle('on', x === b); });
        var eid = b.getAttribute('data-id');
        var a = readArchive();
        var start = (a.read || {})[eid] || 0;
        var L = lib()[eid];
        if (start >= (L.chapters || []).length) start = 0;
        renderChapter(root, eid, start, { resume: true });
        if (window.innerWidth <= 960) root.classList.add('reading');
      };
    }
  }

  function open(eid) {
    var layer = document.createElement('div');
    layer.className = 'modal-layer tl-layer';
    layer.innerHTML = '<div class="modal wide tl-modal">' +
      '<div class="mk">时 间 线 · 档 案 室</div>' +
      '<div id="tl-standalone">' + panelHTML() + '</div>' +
      '<div class="modal-foot"><button class="btn" id="tl-x">关上</button></div></div>';
    document.body.appendChild(layer);
    /* 读小说的时候换成走廊底噪，关掉再回到标题曲 */
    try { if (window.GrailAudio) window.GrailAudio.play('daily'); } catch (e) {}
    function shut() {
      try { if (window.GrailAudio) window.GrailAudio.play('title'); } catch (e) {}
      layer.remove();
    }
    layer.onclick = function (e) { if (e.target === layer) shut(); };
    layer.querySelector('#tl-x').onclick = shut;
    var root = layer.querySelector('#tl-standalone');
    mount(root);
    if (eid && lib()[eid]) {
      renderChapter(root, eid, 0);
      var hit = root.querySelector('.tl-item[data-id="' + eid + '"]');
      if (hit) hit.classList.add('on');
    }
    return layer;
  }

  window.GrailTimeline = {
    panelHTML: panelHTML,
    mount: mount,
    open: open,
    unlocked: unlocked,
    seenCount: seenCount,
    need: NEED,
    order: order,
    plainLen: plainLen
  };
})();
