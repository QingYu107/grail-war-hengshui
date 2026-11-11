/* AVG 演出：打字机 + 关键节点特效卡 */
(function () {
  'use strict';

  var skipping = false;
  var typingTimer = null;

  function d(n) { return Math.floor(Math.random() * n); }

  /* ---------- 打字机 ---------- */
  function typeParagraphs(container, texts, opts, done) {
    if (!container || !container.isConnected) { if (done) done(); return; }
    opts = opts || {};
    var mult = 1;
    try {
      var sv = localStorage.getItem('grail_speed');
      var timings = [1.9, 1, 0.55, 0];
      if (sv != null && timings[+sv] != null) mult = timings[+sv];
    } catch (e) {}
    function flushAll() {
      container.innerHTML = texts.map(function (t) { return '<p>' + t + '</p>'; }).join('');
    }
    if (mult === 0) {
      flushAll();
      if (done) done();
      return { skip: function () {} };
    }
    var speed = Math.max(1, Math.round((opts.speed || 16) * mult));
    var onDone = done || function () {};
    container.innerHTML = '';
    skipping = false;
    var idx = 0;

    /* 正文里可能有 <span class="dialog"> 这类行内标记：
       先把结构一次建好，再按字符往各个文本节点里回填，
       这样逐字效果不会把标签从中间截断（截断后浏览器会把半截标签当文字显示）。 */
    function collect(p) {
      var walker = document.createTreeWalker(p, 4 /* SHOW_TEXT */, null, false);
      var parts = [], total = '', n;
      while ((n = walker.nextNode())) {
        parts.push({ node: n, full: n.nodeValue || '' });
        total += (n.nodeValue || '');
      }
      for (var k = 0; k < parts.length; k++) parts[k].node.nodeValue = '';
      return { parts: parts, total: total };
    }
    function fill(parts, n) {
      var left = n;
      for (var k = 0; k < parts.length; k++) {
        var it = parts[k], take = Math.max(0, Math.min(it.full.length, left));
        left -= take;
        if (it.node.nodeValue.length !== take) it.node.nodeValue = it.full.slice(0, take);
      }
    }

    function nextPara() {
      if (skipping) { flushAll(); onDone(); return; }
      if (idx >= texts.length) { onDone(); return; }
      var p = document.createElement('p');
      p.className = 'typed';
      container.appendChild(p);
      var raw = texts[idx];
      p.innerHTML = raw;
      var job = collect(p);
      var parts = job.parts, total = job.total;
      var caret = document.createElement('span');
      caret.className = 'caret';
      caret.style.opacity = '.35';
      caret.textContent = '▌';
      p.appendChild(caret);
      var i = 0;
      typingTimer = setInterval(function () {
        if (!p.isConnected) { clearInterval(typingTimer); return; }
        if (skipping) {
          clearInterval(typingTimer);
          if (caret.parentNode) caret.parentNode.removeChild(caret);
          flushAll();
          onDone(); return;
        }
        i += 2;
        try { if (window.GrailSFX) window.GrailSFX.tick(); } catch (e) {}
        fill(parts, i);
        if (i >= total.length) {
          clearInterval(typingTimer);
          fill(parts, total.length);
          if (caret.parentNode) caret.parentNode.removeChild(caret);
          idx++;
          setTimeout(nextPara, 90);
        }
      }, speed);
    }
    nextPara();
    return { skip: skip };
  }

  function skip() {
    skipping = true;
    if (typingTimer) clearInterval(typingTimer);
  }

  /* ---------- 特效卡 ---------- */
  var layer = null;

  function ensureLayer(cls) {
    removeLayer(true);
    layer = document.createElement('div');
    layer.className = 'fx-layer ' + cls;
    // 兜底内联样式：即使 CSS 没加载，演出层也必须是全屏黑底
    layer.style.cssText = 'position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;' +
      'background:' + (cls === 'fx-summon' ? '#f4ecda' : '#0b0c0a') + ';opacity:1 !important;animation:none !important;' + 'transition:opacity .45s ease;';
    document.body.appendChild(layer);
    layer.addEventListener('pointerdown', function () { dismiss(); });
    /* 有些自动化 / 键盘路径只发 click，不发 pointerdown；两个都收 */
    layer.addEventListener('click', function () { dismiss(); });
    return layer;
  }

  function removeLayer(instant) {
    if (!layer) return;
    if (instant) { layer.remove(); layer = null; return; }
    layer.classList.add('leaving');
    var l = layer; layer = null;
    setTimeout(function () { l.remove(); }, 460);
  }

  var dismissTimer = null;
  function dismiss() {
    if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
    removeLayer(false);
    if (layerDone) { var f = layerDone; layerDone = null; f(); }
  }
  var layerDone = null;

  function schedule(ms, done) {
    layerDone = done;
    dismissTimer = setTimeout(function () {
      removeLayer(false);
      layerDone = null;
      if (done) done();
    }, ms);
  }

  function settleFx() {
    var els = document.querySelectorAll('.fx-layer .t1, .fx-layer .t2, .fx-layer .t3, .fx-layer .msg, .fx-layer .line, .fx-layer .col span, .fx-layer .card');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var op = window.getComputedStyle ? parseFloat(window.getComputedStyle(el).opacity) : 1;
      if (!op) { el.style.animation = 'none'; el.style.opacity = '1'; el.style.transform = 'none'; }
    }
  }

  function stinger(kind, data, done) {
    data = data || {};
    var el;
    if (kind === 'broadcast') {
      el = ensureLayer('fx-broadcast');
      try { if (window.GrailSFX && window.GrailSFX.glitch) window.GrailSFX.glitch(); } catch (e) {}
      var lines = (data.lines || []).map(function (t, i) {
        return '<div class="line' + (i === 0 ? ' big' : '') + '" style="animation-delay:' + (300 + i * 520) + 'ms">' + t + '</div>';
      }).join('');
      el.innerHTML = '<div class="scan"></div><div class="inner">' + lines + '</div>' +
        '<div class="hint">点击任意处继续</div>';
      schedule(700 + (data.lines || []).length * 520, done);
    } else if (kind === 'summon') {
      el = ensureLayer('fx-summon');
      var S = (window.GRAIL_SUMMON || {})[data.id] || {};
      var lines = S.lines || ['「你就是我的御主？」'];
      var col = S.color || '#b23a2e';
      var glyph = S.glyph || '';
      el.style.background = '#08090a';
      el.style.setProperty('--sig', col);
      var lineHtml = lines.map(function (t, i) {
        return '<div class="sline" style="animation-delay:' + (900 + i * 760) + 'ms">' + t + '</div>';
      }).join('');
      el.innerHTML =
        '<div class="sigil"><i></i><i></i><i></i><b>' + glyph + '</b></div>' +
        '<div class="flash"></div>' +
        '<div class="inner">' +
        '<div class="skicker">CONTRACT ／ 契约成立</div>' +
        '<div class="name"><span class="cls">' + (data.cls || '') + '</span>' +
        '<span class="n">' + (data.name || '') + '</span></div>' +
        '<div class="stitle">' + (S.title || '') + '</div>' +
        '<div class="slines">' + lineHtml + '</div>' +
        '</div>' +
        '<div class="hint">点击任意处继续</div>';
      schedule(1200 + lines.length * 760, done);
    } else if (kind === 'roll') {
      el = ensureLayer('fx-roll');
      try { if (window.GrailSFX && window.GrailSFX.dice) window.GrailSFX.dice(); } catch (e) {}
      var names = data.names || [];
      var spans = names.map(function (n, i) {
        return '<span style="animation-delay:' + (i * 90) + 'ms">' + n + '</span>';
      }).join('');
      el.innerHTML = '<div class="scan"></div><div><div class="col">' + spans + '</div>' +
        '<div class="stop" style="animation-delay:' + (names.length * 90 + 400) + 'ms">本次月考，全校无一人异常</div></div>' +
        '<div class="hint" style="position:absolute;bottom:6vh;left:0;right:0;text-align:center;font-family:var(--hei);font-size:11px;letter-spacing:.3em;color:rgba(232,224,204,.4)">点击继续</div>';
      schedule(names.length * 90 + 2400, done);
    } else if (kind === 'impact') {
      el = ensureLayer('fx-impact');
      try { if (window.GrailSFX && window.GrailSFX.stamp) window.GrailSFX.stamp(); } catch (e) {}
      el.classList.add('shake');
      el.innerHTML = '<div class="boom">' + (data.title || '撞击') + '</div><div class="sub">' + (data.sub || '') + '</div>';
      schedule(1700, done);
    } else if (kind === 'glitch') {
      el = ensureLayer('fx-glitch');
      el.innerHTML = '<div class="grid"></div><div class="scan"></div><div class="msg">' + (data.msg || '') + '</div>' +
        '<div class="hint" style="position:absolute;bottom:6vh;left:0;right:0;text-align:center;font-family:var(--hei);font-size:11px;letter-spacing:.3em;color:rgba(232,224,204,.4)">点击继续</div>';
      schedule(data.dur || 3200, done);
    } else if (kind === 'missummon') {
      /* 错位召唤：先给你看一张正常的契约卡，一秒钟以后从中间撕开。
         不提前说、不预告，撕裂那一刻才换人。 */
      /* 一开始响的是「本该召到的那一骑」的主题——玩家会以为契约成立。
         撕开之后才换成真的那一个。音乐先骗人，画面再拆穿。 */
      try {
        if (window.GrailAudio) {
          window.GrailAudio.init && window.GrailAudio.init();
          if (data.fromTheme) window.GrailAudio.play(data.fromTheme, { quick: true });
        }
      } catch (e) {}
      el = ensureLayer('fx-missummon');
      var A = data.from || {}, B = data.to || {};
      /* 名字逐字「扎」出来：每个字从随机方向、带旋转插进来 */
      var spans = String(B.name || '').split('').map(function (ch, i) {
        var dx = (Math.random() * 2 - 1) * 20;
        var dy = -16 - Math.random() * 22;
        var rot = (Math.random() * 2 - 1) * 22;
        return '<span style="--i:' + i + ';--dx:' + dx.toFixed(0) + 'px;--dy:' + dy.toFixed(0) +
          'px;--rot:' + rot.toFixed(0) + 'deg">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
      }).join('');
      el.innerHTML =
        '<div class="mx">' +
        '<div class="mx-ring"></div>' +
        '<div class="mx-a">' +
        '<div class="mx-k">CONTRACT ／ 契约成立</div>' +
        '<div class="mx-c">' + (A.cls || '') + '</div>' +
        '<div class="mx-n">' + (A.name || '') + '</div>' +
        '<div class="mx-s">' + (A.sub || '') + '</div>' +
        '</div>' +
        '<div class="mx-tear"><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
        '<div class="mx-spk"></div>' +
        '<div class="mx-sig"><b></b><b></b><b></b></div>' +
        '<div class="mx-b">' +
        '<div class="mx-k">召唤错误 ／ ERROR</div>' +
        '<div class="mx-c">' + (B.cls || '') + '</div>' +
        '<div class="mx-n">' + spans + '</div>' +
        '<div class="mx-s">' + (B.sub || '') + '</div>' +
        '</div>' +
        '<div class="mx-line">' + (data.line || '「你叫错了。」') + '</div>' +
        '<div class="hint">点击继续</div>' +
        '</div>';
      setTimeout(function () {
        if (!el || !el.isConnected) return;
        el.classList.add('ripped');
        if (!fxLite()) el.classList.add('quake');
        try { if (window.GrailSFX && window.GrailSFX.boom) window.GrailSFX.boom(); } catch (e) {}
        try { if (window.GrailSFX && window.GrailSFX.clang) window.GrailSFX.clang(); } catch (e) {}
        setTimeout(function () {
          try { if (window.GrailAudio && data.theme) window.GrailAudio.play(data.theme, { quick: true }); } catch (e) {}
        }, 900);
      }, data.hit || 2600);
      setTimeout(function () {
        try { if (window.GrailSFX && window.GrailSFX.glitch) window.GrailSFX.glitch(); } catch (e) {}
      }, (data.hit || 1150) + 260);
      setTimeout(function () {
        try { if (window.GrailSFX && window.GrailSFX.heartbeat) window.GrailSFX.heartbeat(); } catch (e) {}
      }, (data.hit || 1150) + 1500);
      schedule(data.dur || 7600, done);
    } else if (kind === 'clash') {
      /* 三段式对轰。每一段只渲染一张卡，用替换而不是叠加——
         这样永远不会出现两层字挤在同一个位置。 */
      var L = data.left || {}, R = data.right || {};
      function cardHTML(o, side) {
        o = o || {};
        var tint = o.color || (side === 'a' ? '#b23a2e' : '#8a6a2a');
        return '<div class="dl dl-' + side + '" style="--sig:' + tint + '">' +
          '<b class="dlmark">' + String(o.cls || '').slice(0, 1) + '</b>' +
          '<div class="dlk">真名解放 ／ TRUE NAME</div>' +
          '<div class="dlc">' + (o.cls || '—') + '</div>' +
          '<div class="dln">' + (o.name || '—') + '</div>' +
          '<div class="dls">' + (o.who || '') + '</div>' +
          '<div class="dlbar"><i></i></div>' +
          '</div>';
      }
      function pairHTML() {
        return '<div class="dl-pair">' +
          '<div class="chalf l" style="--sig:' + (L.color || '#b23a2e') + '">' +
          '<div class="ck">真名解放</div><div class="cc">' + (L.cls || '') + '</div>' +
          '<div class="cn">' + (L.name || '') + '</div><div class="cw">' + (L.who || '') + '</div></div>' +
          '<div class="chalf r" style="--sig:' + (R.color || '#8a6a2a') + '">' +
          '<div class="ck">真名解放</div><div class="cc">' + (R.cls || '') + '</div>' +
          '<div class="cn">' + (R.name || '') + '</div><div class="cw">' + (R.who || '') + '</div></div>' +
          '<div class="cseam"></div><div class="ccore"></div><div class="cfuse"></div>' +
          '<div class="cwave"><i></i><i></i><i></i></div><div class="crack"></div><div class="cflash"></div>' +
          '</div>';
      }
      try {
        if (window.GrailAudio) {
          window.GrailAudio.init && window.GrailAudio.init();
          if (data.fromTheme) window.GrailAudio.play(data.fromTheme, { quick: true });
          else if (data.bgm) window.GrailAudio.play(data.bgm, { quick: true });
        }
      } catch (e) {}
      el = ensureLayer('fx-clash');
      el.innerHTML =
        '<div class="duel">' +
        '<div class="stage" id="duel-stage">' + cardHTML(L, 'a') + '</div>' +
        '<div class="cverdict">' + (data.verdict || '') + '</div>' +
        '<div class="hint">点击任意处继续</div>' +
        '</div>';
      el.classList.add('st-a');
      var stage = el.querySelector('#duel-stage');
      var t1 = data.t1 || 2400;
      var t2 = data.t2 || 2400;
      setTimeout(function () {
        if (!el || !el.isConnected || !stage) return;
        stage.innerHTML = cardHTML(R, 'b');
        el.classList.remove('st-a'); el.classList.add('st-b');
        try {
          if (window.GrailAudio) {
            if (data.foeTheme) window.GrailAudio.play(data.foeTheme, { quick: true });
            else if (data.bgm) window.GrailAudio.play(data.bgm, { quick: true });
          }
        } catch (e) {}
      }, t1);
      setTimeout(function () {
        if (!el || !el.isConnected || !stage) return;
        stage.innerHTML = pairHTML();
        el.classList.remove('st-b'); el.classList.add('st-c');
        try {
          if (window.GrailAudio && data.bgm) {
            (window.GrailAudio.replay || window.GrailAudio.play)(data.bgm, { quick: true });
          }
        } catch (e) {}
      }, t1 + t2);
      setTimeout(function () {
        if (!el || !el.isConnected) return;
        el.classList.add('st-d');
        if (!fxLite()) el.classList.add('shake');
        try { if (window.GrailSFX && window.GrailSFX.boom) window.GrailSFX.boom(); } catch (e) {}
        try { if (window.GrailSFX && window.GrailSFX.clang) window.GrailSFX.clang(); } catch (e) {}
      }, t1 + t2 + 900);
      setTimeout(function () { if (el && el.isConnected) el.classList.add('st-e'); }, t1 + t2 + 1900);
      schedule(data.dur || (t1 + t2 + 4600), done);
    } else if (kind === 'noble') {
      /* 真名解放：曲子必须在卡出现的同一帧起，不能等演出结束再由调用方接上。 */
      try {
        if (window.GrailAudio) {
          window.GrailAudio.init && window.GrailAudio.init();
          if (data.theme) window.GrailAudio.play(data.theme, { quick: true });
        }
      } catch (e) {}
      el = ensureLayer('fx-noble');
      setTimeout(function () { try { if (window.GrailSFX && window.GrailSFX.clang) window.GrailSFX.clang(); } catch (e) {} }, 160);
      setTimeout(function () { try { if (window.GrailSFX && window.GrailSFX.boom) window.GrailSFX.boom(); } catch (e) {} }, 900);
      el.style.setProperty('--sig', data.color || '#b23a2e');
      var ttl = data.title || '宝具';
      var chars = '';
      for (var ci = 0; ci < 30; ci++) chars += '<span style="animation-delay:' + (ci * 0.16).toFixed(2) + 's">' + ttl.charAt(ci % ttl.length) + '</span>';
      el.innerHTML =
        '<svg class="warpdef" width="0" height="0" aria-hidden="true"><defs>' +
        '<filter id="nobleWarp"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="5">' +
        '<animate attributeName="baseFrequency" dur="9s" values="0.012 0.02;0.026 0.034;0.012 0.02" repeatCount="indefinite"/>' +
        '</feTurbulence><feDisplacementMap in="SourceGraphic" scale="26" xChannelSelector="R" yChannelSelector="G"/></filter>' +
        '</defs></svg>' +
        '<div class="slash"></div><div class="ray"></div><div class="chars">' + chars + '</div>' +
        '<div class="inner"><div class="k">真名解放 ／ TRUE NAME</div>' +
        '<div class="c">' + (data.cls || '') + '</div>' +
        '<div class="n"><span class="ghost" style="filter:url(#nobleWarp)">' + ttl + '</span>' +
        '<span class="solid">' + ttl + '</span></div>' +
        '<div class="s">' + (data.sub || '') + '</div></div>' +
        '<div class="hint">点击继续</div>';
      schedule(data.dur || 3400, done);
    } else if (kind === 'beast') {
      el = ensureLayer('fx-beast');
      var title = data.title || '攀比';
      // 一片一直在往下滚的名次，用来做「所有人都在排队」的底噪
      var ranks = '';
      for (var ri = 0; ri < 26; ri++) {
        var n = 1 + ((ri * 7) % 97);
        ranks += '<span style="animation-delay:' + (ri * 0.28).toFixed(2) + 's">' + n + '</span>';
      }
      el.innerHTML =
        '<svg class="warpdef" width="0" height="0" aria-hidden="true"><defs>' +
        '<filter id="beastWarp"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.016" numOctaves="3" seed="11">' +
        '<animate attributeName="baseFrequency" dur="11s" values="0.008 0.014;0.02 0.03;0.012 0.02;0.008 0.014" repeatCount="indefinite"/>' +
        '</feTurbulence><feDisplacementMap in="SourceGraphic" scale="22" xChannelSelector="R" yChannelSelector="G"/></filter>' +
        '<filter id="beastWarp2"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="2" seed="3">' +
        '<animate attributeName="baseFrequency" dur="7s" values="0.02 0.03;0.035 0.05;0.02 0.03" repeatCount="indefinite"/>' +
        '</feTurbulence><feDisplacementMap in="SourceGraphic" scale="42" xChannelSelector="R" yChannelSelector="G"/></filter>' +
        '</defs></svg>' +
        '<div class="rings"></div>' +
        '<div class="vignette"></div>' +
        '<div class="grain"></div>' +
        '<div class="rankfall">' + ranks + '</div>' +
        '<div class="bigword"><span class="ghost" style="filter:url(#beastWarp2)">' + title + '</span>' +
        '<span class="solid" style="filter:url(#beastWarp)">' + title + '</span></div>' +
        '<div class="meta"><div class="kick">BEAST Ⅳ ／ 人类恶</div>' +
        '<div class="line">显 现</div>' +
        '<div class="q">' + (data.sub || '你是第几？') + '</div></div>';
      schedule(data.dur || 5600, done);
    } else if (kind === 'dissolve') {
      /* 文字溶解：一段话逐字显形，然后整体往下沉、发虚。
         用在「回顾」「结案」这种要把一段叙述按下去的地方。 */
      el = ensureLayer('fx-dissolve');
      var dlines = data.lines || [];
      el.innerHTML = '<div class="grain"></div><div class="diss">' +
        dlines.map(function (t, i) {
          var chars = String(t).split('').map(function (c, k) {
            return '<span style="animation-delay:' + (i * 260 + k * 26) + 'ms">' + (c === ' ' ? '&nbsp;' : c) + '</span>';
          }).join('');
          return '<p class="dl">' + chars + '</p>';
        }).join('') + '</div><div class="hint">点击任意处继续</div>';
      schedule(data.dur || (900 + dlines.length * 900), done);
    } else if (kind === 'static') {
      /* 雪花 + 扫描线 + 边缘渗色：认不出画面的时候用 */
      el = ensureLayer('fx-static');
      el.innerHTML =
        '<svg width="0" height="0" aria-hidden="true"><defs>' +
        '<filter id="noiseF"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7">' +
        '<animate attributeName="seed" dur="0.9s" values="7;19;3;11" repeatCount="indefinite"/></feTurbulence>' +
        '<feColorMatrix type="saturate" values="0"/></filter></defs></svg>' +
        '<div class="noise"></div><div class="scan"></div><div class="bleed"></div>' +
        '<div class="msg">' + (data.msg || '信 号 不 稳') + '</div>' +
        '<div class="hint">点击任意处继续</div>';
      schedule(data.dur || 1400, done);
    } else if (kind === 'mirror') {
      /* 镜像撕裂：同一句话左右两份，一份是反的，中间一条缝 */
      el = ensureLayer('fx-mirror');
      var mt = data.title || '你是第几？';
      el.innerHTML =
        '<div class="half l"><span>' + mt + '</span></div>' +
        '<div class="half r"><span>' + mt + '</span></div>' +
        '<div class="seam"></div>' +
        '<div class="hint">点击任意处继续</div>';
      schedule(data.dur || 2200, done);
    } else if (kind === 'bleed') {
      /* 渗色：红从四边往里渗，中间什么也没有 */
      el = ensureLayer('fx-bleed');
      el.innerHTML = '<div class="edge e1"></div><div class="edge e2"></div>' +
        '<div class="edge e3"></div><div class="edge e4"></div>' +
        '<div class="msg">' + (data.msg || '') + '</div><div class="hint">点击任意处继续</div>';
      schedule(data.dur || 1800, done);
    } else {
      if (done) done();
    }
    setTimeout(settleFx, 700);
    setTimeout(settleFx, 1600);
    /* 演出卡的配乐：只接管「异物」类的两种。
       宝具卡不能动音乐 —— 它刚由调用方播了对应从者的主题；
       召唤卡的曲子在演出结束、正文出场时才由 ui 接上；
       广播 / 点名 / 撞击这些只是画面，沿用当前场景曲。 */
    try {
      if (window.GrailAudio && (kind === 'beast' || kind === 'glitch')) {
        window.GrailAudio.play('beast');
      }
    } catch (e) {}
  }

  /* ---------- 故障闪：一次 0.3–0.9s 的画面撕裂，不挡操作 ---------- */
  /* 设置里的「减弱」不关演出，只把抖动与时长压下来——晕动症的人真的受不了 */
  function fxLite() {
    try { return localStorage.getItem('grail_fx') === 'lite'; } catch (e) { return false; }
  }
  var burstCount = 0;
  function glitchBurst(sceneKey, opts) {
    opts = opts || {};
    if (burstCount > 2) return;                     // 防止叠太多层
    var lite = fxLite();
    var dur = Math.round((opts.dur || 520) * (lite ? 0.55 : 1));
    var l = document.createElement('div');
    l.className = 'fx-burst' + (opts.hard && !lite ? ' hard' : '');
    if (sceneKey) {
      l.style.backgroundImage = 'url("assets/img/glitch/' + sceneKey + '_glitch.jpg")';
      l.classList.add('with-img');
    }
    var t = document.createElement('i');
    t.className = 'tex';
    l.appendChild(t);
    var bars = document.createElement('i');
    bars.className = 'bars';
    l.appendChild(bars);
    l.style.setProperty('--dur', dur + 'ms');
    document.body.appendChild(l);
    burstCount++;
    setTimeout(function () { l.remove(); burstCount--; }, dur + 140);
    // 抖动页面正文，强化"信号不稳"
    if (opts.shake !== false && !lite && document.body) {
      document.body.classList.add('sig-shake');
      setTimeout(function () { document.body.classList.remove('sig-shake'); }, Math.min(460, dur));
    }
  }

  window.GrailAVG = {
    typeParagraphs: typeParagraphs,
    skip: skip,
    stinger: stinger,
    dismiss: dismiss,
    glitchBurst: glitchBurst
  };
})();
