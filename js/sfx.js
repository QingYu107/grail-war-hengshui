/* 合成音效层：打字、骰子、心跳、盖章、故障、成败。不依赖音频文件。 */
(function () {
  'use strict';
  var ctx = null, master = null, muted = false;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  function tone(freq, dur, type, vol, slideTo) {
    if (!init() || muted) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, now());
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now() + dur);
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(vol || 0.12, now() + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(now() + dur + 0.02);
  }

  function noise(dur, vol, filterFreq, slideTo) {
    if (!init() || muted) return;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(filterFreq || 1200, now());
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, now() + dur);
    f.Q.value = 0.9;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.12, now());
    g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  var tickAcc = 0;
  function tick() {                      // 打字机：每 3 个字符一声，别太吵
    tickAcc++;
    if (tickAcc % 3) return;
    noise(0.03, 0.03, 2600, 1800);
  }

  function dice() {                      // 骰子滚动
    for (var i = 0; i < 6; i++) {
      setTimeout(function () { noise(0.045, 0.06, 900 + Math.random() * 900, 600); }, i * 55);
    }
  }

  function success() {
    tone(660, 0.18, 'triangle', 0.10);
    setTimeout(function () { tone(990, 0.22, 'triangle', 0.09); }, 90);
  }

  function fail() {
    tone(220, 0.28, 'sawtooth', 0.08, 110);
  }

  function heartbeat() {
    tone(58, 0.16, 'sine', 0.18);
    setTimeout(function () { tone(52, 0.20, 'sine', 0.14); }, 210);
  }

  function stamp() {
    noise(0.10, 0.20, 420, 180);
    tone(120, 0.12, 'square', 0.06, 70);
  }

  function glitch() {
    noise(0.09, 0.09, 3400, 700);
  }

  function page() {
    noise(0.16, 0.05, 2200, 900);
  }

  /* 宝具对轰：低频砸下来 + 一层金属余响。两件宝具撞在一起该有的两个声音。 */
  function boom() {
    tone(70, 0.55, 'sine', 0.26, 34);
    noise(0.42, 0.20, 700, 120);
    setTimeout(function () { noise(0.22, 0.12, 2600, 900); }, 40);
    setTimeout(function () { tone(196, 0.9, 'triangle', 0.05, 174); }, 120);
  }

  function clang() {
    tone(1240, 0.18, 'square', 0.05, 620);
    noise(0.12, 0.10, 4200, 1600);
  }

  window.GrailSFX = {
    init: init,
    tick: tick, dice: dice, success: success, fail: fail,
    heartbeat: heartbeat, stamp: stamp, glitch: glitch, page: page,
    boom: boom, clang: clang,
    setMuted: function (v) { muted = !!v; },
    isMuted: function () { return muted; }
  };
})();
