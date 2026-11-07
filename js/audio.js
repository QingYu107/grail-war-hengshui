/* ============================================================================
 * 《圣杯战争·衡水：凌晨四点的圣杯》—— 音频引擎 js/audio.js
 * 前提：游戏可能被双击打开，跑在 file:// 下，外链音乐 / JSON / CDN 都不可靠，
 * 所以主体是 WebAudio 程序化合成；assets/audio/ 下若有同名真实音频则优先播放。
 * 四层：THEMES（主题定义）/ makeRig（音色积木）/ Layer（播放层）/ pump（调度器）。
 * 挂载 window.GrailAudio，经典 script，无 module、无依赖、无外部请求。
 * ==========================================================================*/
(function (global) {
  'use strict';

  /* ---- 0. 常量与基础工具 ------------------------------------------------ */
  var AUDIO_DIR = 'assets/audio/';        // 真实音频目录（相对 index.html）
  var XFADE = 0.8;                        // 交叉淡化时长（秒）
  var LOOKAHEAD = 0.35;                   // 调度提前量（秒）
  var TICK_MS = 60;                       // 调度器心跳（毫秒）
  var PROBE_FILES = true;                 // 是否探测真实音频
  var EXT_ORDER = ['mp3', 'm4a', 'ogg'];  // 候选扩展名，manifest 由此生成
  var SERVANT_IDS = ['saber', 'archer', 'lancer', 'rider', 'caster',
    'assassin', 'berserker', 'ruler', 'foreigner'];
  var SCALE = {                           // 音阶：相对主音的半音偏移
    minor: [0, 2, 3, 5, 7, 8, 10],        // 自然小调
    penta: [0, 2, 4, 7, 9],               // 五声音阶
    major: [0, 2, 4, 5, 7, 9, 11]         // 自然大调
  };
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }   // MIDI → 频率
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function pick(a, i) { return a[((i % a.length) + a.length) % a.length]; }
  // 取音阶第 n 度（自动跨八度），返回 MIDI 号
  function deg(root, scale, n) {
    var s = SCALE[scale] || SCALE.minor;
    return root + Math.floor(n / s.length) * 12 + s[((n % s.length) + s.length) % s.length];
  }

  /* ---- 1. 曲目映射 ------------------------------------------------------
   * 只给搜索 URL，不编造具体歌曲 id：站点改版 / 下架 / 换翻唱都不会失效。
   * --------------------------------------------------------------------- */
  function L(title) {
    var q = encodeURIComponent(title);
    return {
      netease: 'https://music.163.com/#/search/m/?s=' + q,
      qq: 'https://y.qq.com/n/ryqq/search?w=' + q,
      bilibili: 'https://search.bilibili.com/all?keyword=' + q
    };
  }
  // manifest：某主题的候选文件名，例如 ['saber.mp3','saber.m4a','saber.ogg']
  function fileNames(id) {
    return EXT_ORDER.map(function (ext) { return id + '.' + ext; });
  }
  var tracks = [
    { id: 'archer', title: '念张师', artist: 'luna', status: 'ok', files: fileNames('archer'), links: L('念张师'),
      note: '念白式旋律，句读短促，像他讲课时的语速与停顿。', bv: 'BV1PSV86bEcj', source: 'bilibili' },
    { id: 'saber', title: 'See You Again', artist: 'Wiz Khalifa ft. Charlie Puth', status: 'ok', files: fileNames('saber'),
      links: L('See You Again Wiz Khalifa'), note: '告别曲的克制哀悼，对应凌晨四点仍亮着的球馆灯。', bv: 'BV1ib421E7L5', source: 'bilibili' },
    { id: 'lancer', title: '说的道理', artist: '倒放 / 电棍梗曲', status: 'ok', files: fileNames('lancer'), links: L('说的道理 电棍'),
      note: '倒放与电音的错位感，和他半真半假的口播同频。', bv: 'BV1Ta411T7E8', source: 'bilibili' },
    { id: 'rider', title: '小马云', artist: '网络梗曲（版本待补）', status: 'pending', files: fileNames('rider'), links: L('小马云'),
      note: '网络梗曲的机械循环，映照被反复播放的一张脸。', bv: 'BV1Cm4y1g78g', source: 'bilibili' },
    { id: 'caster', title: '大意了', artist: 'LiangFred', alt: '我大意了啊没有闪 / 倒悬的橘子', status: 'ok',
      files: fileNames('caster'), links: L('大意了 LiangFred'), note: '五声音阶配滑稽滑音，正好是他那套自成一派的招式。', bv: 'BV1584y1N7cR', source: 'bilibili' },
    { id: 'assassin', title: '【窃格瓦拉】领袖不打工', artist: '白勺啊达', status: 'ok', files: fileNames('assassin'),
      links: L('窃格瓦拉 领袖不打工'), note: '慵懒低音与不肯加速的鼓点，就是不打工的姿势。', bv: 'BV1Ds411Y72E', source: 'bilibili' },
    { id: 'berserker', title: '夏日漱石', artist: '原曲版本以 B 站视频为准', status: 'ok', files: fileNames('berserker'),
      links: L('夏日漱石'), note: '失真 riff 与粗粝鼓组，把兄弟俩的横冲直撞压成动机。', bv: 'BV1q34y187Vy', source: 'bilibili' },
    { id: 'ruler', title: '天皇玉音之孙笑川', artist: '太悟', status: 'ok', files: fileNames('ruler'), links: L('天皇玉音之孙笑川'),
      note: '广播底噪托着川味语调，像一段被反复转录的录音。', bv: 'BV1Ck4y197i1', source: 'bilibili' },
    { id: 'foreigner', title: 'zood', artist: '丁真梗曲', alt: '大家一起肺痒痒', status: 'ok', files: fileNames('foreigner'),
      links: L('zood 丁真'), note: '空灵长音与风声，留白比旋律更像高原的呼吸。', bv: 'BV1P94y167HS', source: 'bilibili' }
  ];

  /* ---- 2. 引擎状态 ------------------------------------------------------ */
  var ctx = null, master = null, limiter = null;
  var noiseCache = {}, driveCurves = {}, fileCache = {};
  var layers = [], listeners = [], schedulerId = null;
  var state = {
    inited: false, theme: null, pending: null, volume: 0.7,
    muted: false, hidden: false, lastServant: null   // battle 的调性跟着它走
  };
  function snapshot() { return { theme: state.theme, volume: state.volume, muted: state.muted, available: state.inited }; }
  function emit() {
    var snap = snapshot();
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](snap); } catch (e) { /* 回调自身出错不影响引擎 */ }
    }
  }

  /* ---- 3. 合成夹具：所有音色积木都绑在某一层的总线上 -------------------- */
  function noiseBuffer(sec) {
    if (noiseCache[sec]) return noiseCache[sec];
    var len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseCache[sec] = buf;
    return buf;
  }
  function driveCurve(amount) {                    // tanh 软削波曲线
    if (driveCurves[amount]) return driveCurves[amount];
    var n = 1024, curve = new Float32Array(n), k = amount * 12;
    for (var i = 0; i < n; i++) curve[i] = Math.tanh(k * ((i * 2) / n - 1)) / Math.tanh(k);
    driveCurves[amount] = curve;
    return curve;
  }
  function makeRig(layer) {
    var bus = layer.bus;
    function reg(node) {                           // 登记节点，stop 时统一断开
      layer.nodes.add(node);
      if (node && typeof node.stop === 'function' && 'onended' in node) {
        node.onended = function () { layer.nodes.delete(node); };
      }
      return node;
    }

    // osc → 增益 → [低通] → 总线，负责起停
    function wire(osc, g, o, t, dur) {
      var tail = g;
      if (o.lp) {
        var f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.Q.value = o.q || 0.8;
        f.frequency.setValueAtTime(o.lp, t);
        if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur);
        g.connect(f); tail = f;
      }
      osc.connect(g); tail.connect(bus);
      osc.start(t); osc.stop(t + dur + 0.05);
      return reg(osc);
    }

    // 包络：起音 + 指数衰减（不能真到 0，取 0.0001）
    function env(g, t, peak, atk, dur) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }

    // 单音：可选滑音、失谐、低通
    function tone(o) {
      var t = o.t, dur = o.dur || 0.4, osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(Math.max(20, o.freq), t);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t + (o.slideDur || dur) * 0.92);
      if (o.detune) osc.detune.setValueAtTime(o.detune, t);
      env(g, t, o.gain == null ? 0.12 : o.gain, o.attack == null ? 0.01 : o.attack, dur);
      return wire(osc, g, o, t, dur);
    }

    // 噪声：纸张、风声、底噪、军鼓都靠它
    function noise(o) {
      var t = o.t, dur = o.dur || 0.2;
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuffer(o.len || 2);
      src.loop = true; src.playbackRate.value = o.rate || 1;
      f.type = o.filter || 'bandpass';
      f.frequency.setValueAtTime(o.freq || 1200, t);
      if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + dur);
      f.Q.value = o.q == null ? 1 : o.q;
      var peak = o.gain == null ? 0.06 : o.gain, atk = o.attack == null ? 0.006 : o.attack;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + atk);
      if (o.hold) g.gain.setValueAtTime(peak, t + Math.min(o.hold, Math.max(atk, dur - 0.02)));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(bus);
      src.start(t); src.stop(t + dur + 0.05);
      return reg(src);
    }

    // 底鼓 / 心跳：正弦下滑的短冲击
    function kick(t, gain, f0, f1) {
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(f0 || 130, t);
      osc.frequency.exponentialRampToValueAtTime(f1 || 44, t + 0.16);
      env(g, t, gain == null ? 0.4 : gain, 0.006, 0.32);
      osc.connect(g); g.connect(bus);
      osc.start(t); osc.stop(t + 0.36);
      return reg(osc);
    }

    // 钟：金属感来自 2.01 / 2.98 / 4.1 这几个不成整数关系的分音
    function bell(t, freq, gain, dur) {
      var ratios = [1, 2.01, 2.98, 4.1], amps = [1, 0.42, 0.22, 0.11], total = dur || 3.2;
      for (var i = 0; i < ratios.length; i++) {
        tone({ t: t, freq: freq * ratios[i], type: 'sine', attack: 0.004,
          dur: total / (1 + i * 0.55), gain: (gain || 0.1) * amps[i] });
      }
    }

    // 失真锯齿：粗粝 riff 用
    function drive(t, freq, dur, gain, shape) {
      var osc = ctx.createOscillator(), ws = ctx.createWaveShaper();
      var lp = ctx.createBiquadFilter(), g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      ws.curve = driveCurve(shape || 0.6);
      ws.oversample = '2x';
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(2200, t); lp.Q.value = 4;
      env(g, t, gain || 0.1, 0.012, dur);
      osc.connect(ws); ws.connect(lp); lp.connect(g); g.connect(bus);
      osc.start(t); osc.stop(t + dur + 0.05);
      return reg(osc);
    }

    // 人声共振峰：锯齿过三个并联带通，出"嗡/啊"的喉音感，不用任何采样
    function formant(t, freq, dur, gain, vowel) {
      var table = { a: [730, 1090, 2440], o: [400, 800, 2600], e: [530, 1840, 2480] };
      var fs = table[vowel || 'o'] || table.o;
      var osc = ctx.createOscillator(), out = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      env(out, t, gain || 0.05, Math.min(0.5, dur * 0.3), dur);
      for (var i = 0; i < fs.length; i++) {
        var bp = ctx.createBiquadFilter(), p = ctx.createGain();
        bp.type = 'bandpass'; bp.frequency.setValueAtTime(fs[i], t); bp.Q.value = 12 - i * 3;
        p.gain.value = 1 / (i + 1.4);
        osc.connect(bp); bp.connect(p); p.connect(out);
      }
      out.connect(bus);
      osc.start(t); osc.stop(t + dur + 0.05);
      return reg(osc);
    }

    // 铺底 pad：几个微失谐锯齿 + 慢起音低通
    function pad(t, freqs, dur, gain, lp) {
      for (var i = 0; i < freqs.length; i++) {
        var osc = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(freqs[i], t);
        osc.detune.setValueAtTime((i % 2 === 0 ? 1 : -1) * (4 + i * 3), t);
        f.type = 'lowpass'; f.frequency.setValueAtTime(lp || 900, t); f.Q.value = 0.6;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime((gain || 0.05) / freqs.length, t + dur * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(f); f.connect(g); g.connect(bus);
        osc.start(t); osc.stop(t + dur + 0.05);
        reg(osc);
      }
    }
    return { tone: tone, noise: noise, kick: kick, bell: bell, drive: drive, formant: formant, pad: pad };
  }

  /* ---- 4. 主题定义 ------------------------------------------------------
   * step 每步秒数 / loop 循环步数（从者主题落在 8~16 秒）
   * start(rig, t) 一次性铺底；each(rig, i, t) 每格做什么，i 为循环内序号
   * --------------------------------------------------------------------- */
  var THEMES = {};
  function def(o) { THEMES[o.id] = o; return o; }
  // 标题：极低沉 drone + 稀疏钟声（A 小调，60bpm）
  def({ id: 'title', kind: 'scene', label: '标题 · 凌晨四点', step: 1.0, loop: 24,
    start: function (r, t) { r.pad(t, [mtof(33), mtof(45), mtof(52)], 16, 0.16, 420); },
    each: function (r, i, t) {
      if (i === 0 || i === 12) r.pad(t, [mtof(33), mtof(45), mtof(52)], 15, 0.14, 420);
      if (i === 6 || i === 18) r.bell(t, mtof(69), 0.075, 4.5);
      if (i === 3 || i === 15) r.tone({ t: t, freq: mtof(57), dur: 2.4, gain: 0.035, attack: 0.6 });
    } });
  // 测验：纸张摩擦噪声 + 打字机点击 + 单音钢琴
  def({ id: 'quiz', kind: 'scene', label: '测验 · 卷面', step: 0.25, loop: 48,
    start: function (r, t) {
      r.noise({ t: t, dur: 12.5, filter: 'bandpass', freq: 2600, freqTo: 1800, q: 0.7, gain: 0.022, attack: 1.2, hold: 10 });
    },
    each: function (r, i, t) {
      if (i % 4 === 0) {
        r.noise({ t: t, dur: 0.05, filter: 'highpass', freq: 2400, q: 0.9, gain: 0.09 });
        r.tone({ t: t, freq: 180 + (i % 3) * 40, type: 'square', dur: 0.03, gain: 0.02 });
      }
      if (i === 0 || i === 24) {
        var n = deg(69, 'minor', (i / 24) * 5);
        r.tone({ t: t, freq: mtof(n), type: 'triangle', dur: 2.6, gain: 0.075 });
        r.tone({ t: t, freq: mtof(n) * 2, dur: 1.2, gain: 0.022 });
      }
      if (i === 36) r.noise({ t: t, dur: 0.5, freq: 1200, q: 0.5, gain: 0.03, attack: 0.15 });
    } });
  // 日常：克制的中频 pad + 每 4 拍一次的广播"嘀"
  def({ id: 'daily', kind: 'scene', label: '日常 · 走廊', step: 1.0, loop: 32,
    start: function (r, t) { r.pad(t, [mtof(48), mtof(55), mtof(60)], 9, 0.11, 1100); },
    each: function (r, i, t) {
      if (i % 8 === 4) r.pad(t, [mtof(48), mtof(55), mtof(60)], 8, 0.1, 1100);
      if (i % 4 === 0) {
        r.tone({ t: t, freq: 1046, dur: 0.14, gain: 0.06, attack: 0.004 });
        r.tone({ t: t, freq: 2093, dur: 0.08, gain: 0.018 });
      }
      if (i === 16) r.noise({ t: t, dur: 1.6, freq: 900, q: 0.6, gain: 0.025, attack: 0.4 });
    } });
  // 考试：秒针 / 心跳 + 高频耳鸣
  def({ id: 'exam', kind: 'scene', label: '考试 · 第四十考场', step: 1.0, loop: 60,
    start: function (r, t) { r.tone({ t: t, freq: 6800, dur: 59, gain: 0.012, attack: 6 }); },
    each: function (r, i, t) {
      r.noise({ t: t, dur: 0.035, filter: 'highpass', freq: 3000, q: 1, gain: 0.055 });
      if (i % 2 === 0) { r.kick(t, 0.22, 78, 38); r.kick(t + 0.22, 0.15, 70, 34); }
      if (i === 30) r.noise({ t: t, dur: 2.4, freq: 3400, q: 2, gain: 0.018, attack: 0.8 });
    } });
  // 战斗：低频鼓点 + 失真锯齿（调性跟随最近的从者）
  def({ id: 'battle', kind: 'scene', label: '战斗 · 深夜操场', step: 0.125, loop: 96,
    start: function (r, t) { var k = kitRoot(); r.pad(t, [mtof(k), mtof(k + 7), mtof(k + 12)], 12, 0.09, 700); },
    each: function (r, i, t) {
      var k = kitRoot(), bar = i % 24;
      if (bar === 0 || bar === 10 || bar === 14) r.kick(t, 0.42, 120, 40);
      if (bar === 6 || bar === 18) r.noise({ t: t, dur: 0.16, freq: 1900, q: 1.6, gain: 0.1 });
      if (i % 4 === 0) { var s = i % 8; r.drive(t, mtof(deg(k + 24, 'minor', s < 4 ? s : 7 - s)), 0.22, 0.055, 0.8); }
      if (i === 0 || i === 48) r.pad(t, [mtof(k), mtof(k + 7), mtof(k + 12)], 11, 0.08, 700);
    } });
  // 异物：反向 swell + 人声共振峰式的"嗡"（纯合成，不采样）
  def({ id: 'beast', kind: 'scene', label: '异物 · 别回头', step: 0.5, loop: 40,
    start: function (r, t) { r.formant(t, mtof(38), 19, 0.12, 'o'); },
    each: function (r, i, t) {
      if (i % 8 === 0) r.noise({ t: t, dur: 3.4, filter: 'lowpass', freq: 200, freqTo: 5200, q: 1.2, gain: 0.11, attack: 3.2 });
      if (i === 0) r.formant(t, mtof(38), 19, 0.12, 'o');
      if (i === 18) r.formant(t + 0.6, mtof(39), 5, 0.05, 'a');
      if (i === 30) r.tone({ t: t, freq: mtof(74), dur: 4, gain: 0.02, attack: 1.4 });
    } });
  // 暗线结局：单音、失谐、逐渐下沉
  def({ id: 'ending_dark', kind: 'scene', label: '结局 · 无人监考', step: 2.0, loop: 8,
    start: function (r, t) { r.pad(t, [mtof(45), mtof(57)], 15, 0.1, 600); },
    each: function (r, i, t) {
      if (i % 2 === 0) {
        var f = mtof(57);
        r.tone({ t: t, freq: f, dur: 3.8, gain: 0.09, attack: 0.5, slideTo: f * 0.86, slideDur: 3.8 });
        r.tone({ t: t, freq: f, dur: 3.8, gain: 0.06, attack: 0.5, detune: -14, slideTo: f * 0.86, slideDur: 3.8 });
      }
      if (i === 4) r.pad(t, [mtof(45), mtof(57)], 7, 0.07, 600);
    } });
  // 暖结局：大调、简易三和弦分解
  def({ id: 'ending_warm', kind: 'scene', label: '结局 · 天亮之前', step: 0.5, loop: 32,
    start: function (r, t) { r.pad(t, [mtof(48), mtof(55), mtof(64)], 8, 0.1, 1400); },
    each: function (r, i, t) {
      var seq = [0, 2, 4, 2, 4, 7, 4, 2];
      r.tone({ t: t, freq: mtof(deg(60, 'major', pick(seq, i))), type: 'triangle', dur: 0.9, gain: 0.06 });
      if (i % 8 === 0) r.pad(t, [mtof(48), mtof(55), mtof(64)], 8, 0.09, 1400);
      if (i % 16 === 8) r.bell(t, mtof(84), 0.03, 2.6);
    } });
  // 科比（Saber）：极简节拍器 + 单音
  def({ id: 'saber', kind: 'servant', label: 'Saber · 科比', key: 45, step: 60 / 72 / 2, loop: 24,
    start: function (r, t) { r.pad(t, [mtof(45), mtof(52)], 10, 0.07, 700); },
    each: function (r, i, t) {
      r.noise({ t: t, dur: 0.03, filter: 'highpass', freq: 3500, q: 1.2, gain: i % 4 === 0 ? 0.09 : 0.04 });
      if (i % 12 === 0) { r.tone({ t: t, freq: mtof(69), dur: 3.2, gain: 0.08, attack: 0.02 }); r.pad(t, [mtof(45), mtof(52)], 9, 0.065, 700); }
      if (i % 12 === 4) r.tone({ t: t, freq: mtof(72), dur: 1.8, gain: 0.05, attack: 0.02 });
      if (i % 12 === 8) r.tone({ t: t, freq: mtof(67), dur: 2.2, gain: 0.042, attack: 0.02 });
    } });
  // 张雪峰（Archer）：快速密集的音符像说话
  def({ id: 'archer', kind: 'servant', label: 'Archer · 张雪峰', key: 38, step: 60 / 132 / 4, loop: 96,
    start: function (r, t) { r.pad(t, [mtof(50), mtof(57)], 11, 0.05, 800); },
    each: function (r, i, t) {
      var phrase = Math.floor(i / 12) % 8, pos = i % 12;
      if (phrase % 3 !== 2 && pos < 8 && pos % 4 !== 3) {          // 换气前的连续音节
        var n = mtof(deg(62, 'penta', (pos * 2 + phrase * 3) % 11));
        r.tone({ t: t, freq: n, type: 'triangle', dur: 0.09 + (pos % 3) * 0.02, gain: 0.055, lp: 3200 });
        if (pos % 4 === 0) r.tone({ t: t, freq: n / 2, type: 'square', dur: 0.07, gain: 0.02, lp: 1400 });
      }
      if (phrase % 3 === 2 && pos === 0) r.noise({ t: t, dur: 0.35, freq: 1500, q: 1.4, gain: 0.025, attack: 0.08 });
      if (i === 0) r.pad(t, [mtof(50), mtof(57)], 11, 0.045, 800);
    } });
  // Otto（Lancer）：8-bit 方波
  def({ id: 'lancer', kind: 'servant', label: 'Lancer · Otto', key: 40, step: 60 / 140 / 4, loop: 112,
    each: function (r, i, t) {
      var mel = [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 11, 7, 4, 2, 0];
      var slot = i % 16, bar = Math.floor(i / 16) % 7;
      if (slot % 2 === 0) r.tone({ t: t, freq: mtof(deg(64, 'minor', pick(mel, slot + bar * 3))), type: 'square', dur: 0.085, gain: 0.045, attack: 0.004, lp: 5200 });
      if (slot % 8 === 0) r.tone({ t: t, freq: mtof(deg(40, 'minor', bar % 5)), type: 'square', dur: 0.5, gain: 0.055, attack: 0.004, lp: 1200 });
      if (slot === 4 || slot === 12) r.noise({ t: t, dur: 0.09, filter: 'highpass', freq: 2600, q: 0.8, gain: 0.045 });
    } });
  // 范小勤（Rider）：机械低频
  def({ id: 'rider', kind: 'servant', label: 'Rider · 范小勤', key: 41, step: 60 / 90 / 2, loop: 30,
    start: function (r, t) { r.pad(t, [mtof(29), mtof(41)], 10, 0.08, 320); },
    each: function (r, i, t) {
      if (i % 3 === 0) r.tone({ t: t, freq: mtof(29), type: 'square', dur: 0.16, gain: 0.1, attack: 0.004, lp: 260 });
      if (i % 6 === 2) {
        r.noise({ t: t, dur: 0.06, freq: 2100, q: 6, gain: 0.06 });
        r.noise({ t: t + 0.09, dur: 0.05, freq: 1500, q: 6, gain: 0.04 });
      }
      if (i === 12) r.tone({ t: t, freq: 220, type: 'sawtooth', dur: 1.1, gain: 0.035, slideTo: 90, lp: 900 });
      if (i === 0) r.pad(t, [mtof(29), mtof(41)], 9, 0.07, 320);
    } });
  // 马保国（Caster）：五声音阶 + 滑稽滑音
  def({ id: 'caster', kind: 'servant', label: 'Caster · 马保国', key: 36, step: 60 / 108 / 2, loop: 40,
    start: function (r, t) { r.pad(t, [mtof(48), mtof(55)], 11, 0.05, 900); },
    each: function (r, i, t) {
      var pat = [0, 2, 3, 5, 3, 2, 0, 1], n = mtof(deg(60, 'penta', pick(pat, i)));
      if (i % 8 !== 7) r.tone({ t: t, freq: n, type: 'triangle', dur: 0.32, gain: 0.06, slideDur: 0.3,
        slideTo: i % 16 === 14 ? n * 0.62 : (i % 2 ? n * 1.02 : null) });
      if (i % 8 === 4) r.tone({ t: t, freq: 180, dur: 0.45, gain: 0.05, slideTo: 900, slideDur: 0.4 });
      if (i === 0) r.pad(t, [mtof(48), mtof(55)], 11, 0.045, 900);
    } });
  // 周立齐（Assassin）：慵懒低音 + 稀疏鼓
  def({ id: 'assassin', kind: 'servant', label: 'Assassin · 周立齐', key: 34, step: 60 / 68 / 2, loop: 24,
    start: function (r, t) { r.pad(t, [mtof(46), mtof(53)], 11, 0.045, 600); },
    each: function (r, i, t) {
      var walk = [0, 0, 3, 5, 5, 3, 7, 5];
      if (i % 2 === 0) r.tone({ t: t, freq: mtof(deg(41, 'minor', pick(walk, i / 2))), dur: 0.85, gain: 0.09, attack: 0.03, lp: 500 });
      if (i === 4 || i === 12 || i === 20) r.kick(t, 0.16, 90, 42);
      if (i === 8 || i === 16) r.noise({ t: t, dur: 0.22, freq: 1200, q: 2, gain: 0.05, attack: 0.02 });
      if (i === 0) r.pad(t, [mtof(46), mtof(53)], 10, 0.04, 600);
    } });
  // 虎哥 & 刀哥（Berserker）：粗糙失真 riff
  def({ id: 'berserker', kind: 'servant', label: 'Berserker · 虎哥 & 刀哥', key: 31, step: 60 / 120 / 4, loop: 96,
    each: function (r, i, t) {
      var riff = [0, 0, 3, 0, 5, 3, 0, 0], slot = i % 8, bar = Math.floor(i / 24) % 4;
      if (slot % 2 === 0) r.drive(t, mtof(deg(31, 'minor', pick(riff, slot) + bar)), 0.11, 0.075, 0.9);
      if (i % 12 === 0) r.kick(t, 0.34, 110, 40);
      if (i % 12 === 6) r.noise({ t: t, dur: 0.18, freq: 1700, q: 1.2, gain: 0.08 });
    } });
  // 孙笑川（Ruler）：广播底噪 + 川味语调式滑音
  def({ id: 'ruler', kind: 'servant', label: 'Ruler · 孙笑川', key: 43, step: 60 / 84 / 2, loop: 28,
    start: function (r, t) { r.noise({ t: t, dur: 10.5, freq: 1400, q: 0.8, gain: 0.028, attack: 1, hold: 8 }); },
    each: function (r, i, t) {
      if (i % 8 === 0) r.noise({ t: t, dur: 9, freq: 1400, q: 0.8, gain: 0.024, attack: 1, hold: 6 });
      if (i % 4 === 0) {
        var f = mtof(deg(55, 'penta', Math.floor(i / 4) % 7));
        r.tone({ t: t, freq: f, type: 'sawtooth', dur: 0.55, gain: 0.055, attack: 0.02, lp: 1600, q: 3,
          slideTo: f * (Math.floor(i / 4) % 2 ? 0.78 : 1.18), slideDur: 0.5 });
      }
      if (i === 14) r.formant(t, mtof(48), 1.2, 0.05, 'a');       // 拖长的那一声
    } });
  // 丁真（Foreigner）：空灵长音 + 风声
  def({ id: 'foreigner', kind: 'servant', label: 'Foreigner · 丁真', key: 47, step: 60 / 50, loop: 9,
    start: function (r, t) { r.noise({ t: t, dur: 11, freq: 600, freqTo: 220, q: 0.5, gain: 0.05, attack: 2.5, hold: 7 }); },
    each: function (r, i, t) {
      if (i % 3 === 0) {
        var n = mtof(deg(64, 'penta', i % 5));
        r.tone({ t: t, freq: n, dur: 4.4, gain: 0.05, attack: 1.1 });
        r.tone({ t: t + 0.02, freq: n * 1.5, dur: 3.6, gain: 0.025, attack: 1.4 });
      }
      if (i === 0 || i === 6) r.noise({ t: t, dur: 5, freq: 500, freqTo: 260, q: 0.5, gain: 0.04, attack: 1.8, hold: 2.5 });
      if (i === 8) r.bell(t, mtof(88), 0.02, 3);
    } });
  // battle 的调性：跟着最近出场的从者走，没出场过就用 A 小调
  function kitRoot() {
    var t = state.lastServant && THEMES[state.lastServant];
    return (t && t.key ? t.key : 45) - 12;
  }

  /* ---- 5. 层：一条总线 + 一个计数器，切换时整条淡出丢弃 ----------------- */
  function createLayer(themeId) {
    var d = THEMES[themeId]; if (!d) return null;
    var bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, ctx.currentTime); bus.connect(master);
    var layer = { id: themeId, def: d, bus: bus, nodes: new Set(), step: 0,
      next: ctx.currentTime + 0.08, dead: false, el: null, elFade: 0, elTimer: null };
    layer.rig = makeRig(layer);
    try {
      if (d.start) d.start(layer.rig, ctx.currentTime + 0.12);   // 铺底只跑一次
    } catch (e) { /* 单主题出错不影响引擎 */ }
    return layer;
  }
  function advance(layer, horizon) {              // 把 horizon 之前的所有格子排出来
    if (layer.dead || !layer.def.step || !layer.def.each) return;
    var guard = 0;
    while (layer.next < horizon && guard++ < 96) {
      try { layer.def.each(layer.rig, layer.step % layer.def.loop, layer.next); }
      catch (e) { /* 单步出错跳过 */ }
      layer.step++;
      layer.next += layer.def.step;
    }
  }
  function layerFadeIn(layer) {
    var t = ctx.currentTime, g = layer.bus.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.exponentialRampToValueAtTime(1, t + XFADE);
  }
  function killLayer(layer, immediate) {
    if (layer.dead) return;
    layer.dead = true;
    var t = ctx.currentTime, g = layer.bus.gain;
    try {
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(g.value, 0.0001), t);
      g.exponentialRampToValueAtTime(0.0001, t + (immediate ? 0.12 : XFADE));
    } catch (e) { /* 忽略 */ }
    if (layer.el) fadeElement(layer, 0, immediate ? 120 : XFADE * 1000);
    setTimeout(function () {                       // 到点统一断开所有节点
      layer.nodes.forEach(function (n) {
        try { n.stop(0); n.disconnect(); } catch (e1) { /* 已结束 */ }
      });
      layer.nodes.clear();
      if (layer.el) {
        if (layer.elTimer) { clearInterval(layer.elTimer); layer.elTimer = null; }
        try { layer.el.pause(); layer.el.removeAttribute('src'); layer.el.load(); } catch (e3) { /* 忽略 */ }
        layer.el = null;
      }
      try { layer.bus.disconnect(); } catch (e4) { /* 忽略 */ }
      var i = layers.indexOf(layer);
      if (i >= 0) layers.splice(i, 1);
    }, (immediate ? 0.16 : XFADE + 0.1) * 1000);
  }

  /* ---- 6. 真实音频：探测 → 命中则用 <audio>，否则程序化音 ---------------
   * file:// 下请求不存在的文件只会在网络面板留一条记录，不产生 JS 报错；
   * 所有失败路径都静默，探测结果永久缓存，不会反复请求。
   * --------------------------------------------------------------------- */
  function probeFile(id, done) {
    var cached = fileCache[id];
    if (cached && cached.state !== 'probing') { done(cached.url || null); return; }
    if (cached) return;                            // 正在探测，等它自己回调
    fileCache[id] = { state: 'probing', url: null };
    var names = fileNames(id), idx = 0;
    function finish(url) {
      fileCache[id] = url ? { state: 'ok', url: url } : { state: 'none', url: null };
      done(url || null);
    }
    function tryNext() {
      if (idx >= names.length || !PROBE_FILES) { finish(null); return; }
      var url = AUDIO_DIR + names[idx++], el, settled = false, timer;
      try { el = new Audio(); } catch (e) { finish(null); return; }
      function cleanup() {
        el.onerror = el.oncanplaythrough = null;
        clearTimeout(timer);
        try { el.src = ''; } catch (e2) { /* 忽略 */ }
      }
      timer = setTimeout(function () { if (!settled) { settled = true; cleanup(); finish(null); } }, 4000);
      el.oncanplaythrough = function () { if (!settled) { settled = true; cleanup(); finish(url); } };
      el.onerror = function () { if (!settled) { settled = true; cleanup(); tryNext(); } };
      try { el.preload = 'auto'; el.src = url; el.load(); }
      catch (e) { if (!settled) { settled = true; cleanup(); tryNext(); } }
    }
    tryNext();
  }
  function elementVolume(layer) {
    if (layer.el) layer.el.volume = clamp((state.muted ? 0 : state.volume) * layer.elFade, 0, 1);
  }
  function fadeElement(layer, to, ms) {            // <audio> 没有 GainNode，用定时器补
    if (!layer.el) return;
    if (layer.elTimer) clearInterval(layer.elTimer);
    var from = layer.elFade, t0 = Date.now();
    layer.elTimer = setInterval(function () {
      var k = clamp((Date.now() - t0) / ms, 0, 1);
      layer.elFade = from + (to - from) * k;
      elementVolume(layer);
      if (k >= 1) { clearInterval(layer.elTimer); layer.elTimer = null; }
    }, 30);
  }
  function attachElement(layer, url) {
    var el;
    try { el = new Audio(url); } catch (e) { return false; }
    el.loop = true; el.preload = 'auto'; el.volume = 0;
    layer.el = el;
    layer.elFade = 0;
    try {
      var p = el.play();
      if (p && typeof p.then === 'function') p.then(null, function () { /* 需手势，静默 */ });
    } catch (e) { return false; }
    fadeElement(layer, 1, XFADE * 1000);
    return true;
  }

  /* ---- 7. 调度器 -------------------------------------------------------- */
  function pump() {
    if (!ctx || ctx.state !== 'running') return;
    var horizon = ctx.currentTime + LOOKAHEAD;
    for (var i = 0; i < layers.length; i++) advance(layers[i], horizon);
  }
  function startScheduler() { if (!schedulerId) schedulerId = setInterval(pump, TICK_MS); }
  function stopScheduler() { if (schedulerId) { clearInterval(schedulerId); schedulerId = null; } }
  // 恢复可见后重排，避免积压的事件一次性炸出来
  function realign() {
    var t = ctx.currentTime + 0.12;
    for (var i = 0; i < layers.length; i++) layers[i].next = t;
  }

  /* ---- 8. 公共 API ------------------------------------------------------ */
  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(function () { startScheduler(); realign(); pump(); }, function () { /* 忽略 */ });
      }
      return true;
    }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain();
    master.gain.value = state.muted ? 0 : state.volume;
    limiter = ctx.createDynamicsCompressor();      // 防多路叠加削波
    limiter.threshold.value = -14; limiter.knee.value = 12; limiter.ratio.value = 8;
    limiter.attack.value = 0.004; limiter.release.value = 0.22;
    master.connect(limiter); limiter.connect(ctx.destination);
    state.inited = true;
    startScheduler();
    var want = state.pending;
    state.pending = null;
    if (want) play(want); else emit();
    return true;
  }
  function play(themeId) {
    if (!themeId || !THEMES[themeId]) return false;
    if (SERVANT_IDS.indexOf(themeId) >= 0) state.lastServant = themeId;
    if (!ctx) {                                   // 手势前调用：先记下，init 后播放
      state.pending = themeId;
      state.theme = themeId;
      emit();
      return true;
    }
    if (ctx.state === 'suspended') ctx.resume().then(null, function () { /* 忽略 */ });
    if (state.theme === themeId && layers.length) return true;
    for (var i = layers.length - 1; i >= 0; i--) killLayer(layers[i], false);   // 旧层淡出
    layers = [];
    state.theme = themeId;
    var layer = createLayer(themeId);
    if (!layer) return false;
    layers.push(layer);
    layerFadeIn(layer);
    // 命中真实音频则覆盖程序化主角，程序化层退成极轻的空间感
    probeFile(themeId, function (url) {
      if (!url || layer.dead || state.theme !== themeId) return;
      if (!attachElement(layer, url)) return;
      try {
        var g = layer.bus.gain;
        g.cancelScheduledValues(ctx.currentTime);
        g.setValueAtTime(Math.max(g.value, 0.0001), ctx.currentTime);
        g.exponentialRampToValueAtTime(0.12, ctx.currentTime + XFADE);
      } catch (e) { /* 忽略 */ }
    });
    startScheduler();
    pump();
    emit();
    return true;
  }
  function stop() {
    for (var i = layers.length - 1; i >= 0; i--) killLayer(layers[i], false);
    layers = []; state.theme = null; state.pending = null;
    emit();
  }
  function setVolume(v) {
    var nv = clamp(typeof v === 'number' && isFinite(v) ? v : 0, 0, 1);
    state.volume = nv;
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(state.muted ? 0 : nv, ctx.currentTime, 0.03);
    }
    for (var i = 0; i < layers.length; i++) elementVolume(layers[i]);
    emit();
    return nv;
  }
  function toggleMute() {
    state.muted = !state.muted;
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(state.muted ? 0 : state.volume, ctx.currentTime, 0.03);
    }
    for (var i = 0; i < layers.length; i++) elementVolume(layers[i]);
    emit();
    return state.muted;
  }
  function getVolume() { return state.volume; }
  function isMuted() { return state.muted; }
  function current() { return state.theme; }
  function available() { return state.inited; }
  function servantTheme(id) { return THEMES[id] && THEMES[id].kind === 'servant' ? id : null; }
  function onStateChange(cb) {
    if (typeof cb !== 'function') return function () {};
    listeners.push(cb);
    try { cb(snapshot()); } catch (e) { /* 忽略 */ }
    return function () {                           // 退订
      var i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  /* ---- 9. 页面可见性：切走暂停，回来续上 -------------------------------- */
  function handleVisibility() {
    if (!ctx) return;
    var i;
    if (document.hidden) {
      state.hidden = true;
      stopScheduler();
      for (i = 0; i < layers.length; i++) {
        if (layers[i].el) { try { layers[i].el.pause(); } catch (e) { /* 忽略 */ } }
      }
      if (ctx.state === 'running') ctx.suspend().then(null, function () { /* 忽略 */ });
      return;
    }
    state.hidden = false;
    ctx.resume().then(function () {
      realign();
      startScheduler();
      for (var j = 0; j < layers.length; j++) {
        var el = layers[j].el;
        if (!el) continue;
        try {
          var p = el.play();
          if (p && typeof p.then === 'function') p.then(null, function () { /* 忽略 */ });
        } catch (e) { /* 忽略 */ }
      }
      pump();
    }, function () { /* 忽略 */ });
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', handleVisibility, false);
  }

  /* ---- 10. 导出 --------------------------------------------------------- */
  global.GrailAudio = {
    init: init, play: play, stop: stop,
    setVolume: setVolume, getVolume: getVolume,
    toggleMute: toggleMute, isMuted: isMuted, current: current,
    tracks: tracks, servantTheme: servantTheme,
    available: available, onStateChange: onStateChange,
    // 辅助接口，游戏不必须，调试 / 真机排查用
    themes: THEMES,
    fileNames: fileNames,
    fileUrl: function (id) { return fileCache[id] && fileCache[id].state === 'ok' ? fileCache[id].url : null; }
  };
})(typeof window !== 'undefined' ? window : this);