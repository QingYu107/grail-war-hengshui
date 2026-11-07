/* 无头冒烟测试：用假的 WebAudio 把 js/audio.js 跑一遍
 * 用法： node tools/audio_smoke.js
 * 目的：不出声的前提下验证 17 个主题都能构建、调度、断开，且没有非法参数。 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const violations = [];
function check(cond, msg) {
  if (!cond) violations.push(msg);
}

// ---- 假的 AudioParam ----------------------------------------------------
function Param(name, value) {
  this.name = name;
  this.value = value == null ? 0 : value;
}
Param.prototype.setValueAtTime = function (v, t) {
  check(isFinite(v), this.name + ' setValueAtTime 非有限值: ' + v);
  check(isFinite(t) && t >= 0, this.name + ' setValueAtTime 时间非法: ' + t);
  this.value = v;
};
Param.prototype.linearRampToValueAtTime = Param.prototype.setValueAtTime;
Param.prototype.exponentialRampToValueAtTime = function (v, t) {
  check(isFinite(v) && v > 0, this.name + ' exponentialRamp 目标非法(需 >0): ' + v);
  check(isFinite(t) && t >= 0, this.name + ' exponentialRamp 时间非法: ' + t);
  this.value = v;
};
Param.prototype.setTargetAtTime = function (v, t) {
  check(isFinite(v), this.name + ' setTargetAtTime 非有限值');
  this.value = v;
};
Param.prototype.cancelScheduledValues = function () {};

// ---- 假节点 -------------------------------------------------------------
let nodeSeq = 0;
function Node(kind) {
  this.kind = kind;
  this.id = ++nodeSeq;
}
Node.prototype.connect = function (dest) {
  check(!!dest, 'connect 目标为空');
  return dest;
};
Node.prototype.disconnect = function () {};

function Source(kind) {
  Node.call(this, kind);
  this.onended = null;
  this._started = false;
  this._stopped = false;
}
Source.prototype = Object.create(Node.prototype);
Source.prototype.start = function (t) {
  check(!this._started, this.kind + ' 被重复 start');
  this._started = true;
  check(isFinite(t) && t >= 0, this.kind + ' start 时间非法');
};
Source.prototype.stop = function (t) {
  check(this._started, this.kind + ' 在 start 前 stop');
  this._stopped = true;
  check(isFinite(t) && t >= 0, this.kind + ' stop 时间非法');
};

function AudioContextStub() {
  const self = this;
  this.sampleRate = 48000;
  this.state = 'running';
  this._t0 = Date.now() - 1000;
  Object.defineProperty(this, 'currentTime', {
    get: function () { return 1 + (Date.now() - self._t0) / 1000 * 30; } // 30 倍速推进
  });
  this.destination = new Node('destination');
  this.created = 0;
  this.started = 0;
}
AudioContextStub.prototype.createGain = function () {
  const n = new Node('gain'); n.gain = new Param('gain', 1); this.created++; return n;
};
AudioContextStub.prototype.createOscillator = function () {
  const n = new Source('osc'); n.frequency = new Param('frequency', 440);
  n.detune = new Param('detune', 0); n.type = 'sine'; this.created++; this.started++; return n;
};
AudioContextStub.prototype.createBiquadFilter = function () {
  const n = new Node('biquad'); n.frequency = new Param('filterFreq', 350);
  n.Q = new Param('Q', 1); n.gain = new Param('filterGain', 0); n.type = 'lowpass'; this.created++; return n;
};
AudioContextStub.prototype.createBufferSource = function () {
  const n = new Source('buffer'); n.playbackRate = new Param('rate', 1);
  n.buffer = null; n.loop = false; this.created++; this.started++; return n;
};
AudioContextStub.prototype.createWaveShaper = function () {
  const n = new Node('shaper'); n.curve = null; n.oversample = 'none'; this.created++; return n;
};
AudioContextStub.prototype.createDynamicsCompressor = function () {
  const n = new Node('comp');
  n.threshold = new Param('threshold', -24); n.knee = new Param('knee', 30);
  n.ratio = new Param('ratio', 12); n.attack = new Param('attack', 0.003);
  n.release = new Param('release', 0.25); this.created++; return n;
};
AudioContextStub.prototype.createBuffer = function (ch, len, rate) {
  check(len > 0, 'createBuffer 长度非法');
  const data = new Float32Array(Math.max(1, Math.floor(len)));
  return { numberOfChannels: ch, length: len, sampleRate: rate, getChannelData: function () { return data; } };
};
AudioContextStub.prototype.resume = function () { this.state = 'running'; return Promise.resolve(); };
AudioContextStub.prototype.suspend = function () { this.state = 'suspended'; return Promise.resolve(); };

// ---- 假的浏览器环境 ----------------------------------------------------
const docListeners = {};
const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Promise: Promise,
  Math: Math,
  Date: Date,
  Float32Array: Float32Array,
  isFinite: isFinite,
  AudioContext: AudioContextStub,
  Audio: function (url) {
    this.src = url; this.loop = false; this.volume = 1; this.preload = '';
    this.onerror = null; this.oncanplaythrough = null;
    // 模拟文件不存在：异步触发 error
    setTimeout(() => { if (this.onerror) this.onerror(); }, 5);
  },
  document: {
    hidden: false,
    addEventListener: function (type, fn) { docListeners[type] = fn; }
  }
};
sandbox.window = sandbox;
sandbox.Audio.prototype.play = function () { return Promise.resolve(); };
sandbox.Audio.prototype.pause = function () {};
sandbox.Audio.prototype.load = function () {};
sandbox.Audio.prototype.removeAttribute = function () {};

vm.createContext(sandbox);
const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'audio.js'), 'utf8');
vm.runInContext(code, sandbox, { filename: 'js/audio.js' });

const A = sandbox.window.GrailAudio;
check(!!A, 'window.GrailAudio 未挂载');

// ---- API 形状检查 -------------------------------------------------------
const api = ['init', 'play', 'stop', 'setVolume', 'getVolume', 'toggleMute', 'isMuted',
  'current', 'tracks', 'servantTheme', 'available', 'onStateChange'];
api.forEach(function (k) { check(k in A, '缺少 API: ' + k); });
check(A.tracks.length === 9, 'tracks 应为 9 条，实际 ' + A.tracks.length);

const servants = ['saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker', 'ruler', 'foreigner'];
const scenes = ['title', 'quiz', 'daily', 'exam', 'battle', 'beast', 'ending_dark', 'ending_warm'];

// tracks 字段 + 链接
A.tracks.forEach(function (t) {
  ['id', 'title', 'artist', 'note', 'files', 'links'].forEach(function (k) {
    check(!!t[k], t.id + ' 缺少字段 ' + k);
  });
  check(t.note.length >= 16 && t.note.length <= 46, t.id + ' note 长度 ' + t.note.length);
  ['netease', 'qq', 'bilibili'].forEach(function (k) {
    check(/^https:\/\//.test(t.links[k]), t.id + ' 链接非法 ' + k);
    check(!/\d{6,}/.test(t.links[k]), t.id + ' 链接疑似含歌曲 id: ' + t.links[k]);
  });
  check(t.files[0] === t.id + '.mp3', t.id + ' manifest 首项应为 ' + t.id + '.mp3');
});

// 主题时长
servants.concat(scenes).forEach(function (id) {
  const d = A.themes[id];
  check(!!d, '缺少主题 ' + id);
  if (!d) return;
  const secs = d.step * d.loop;
  if (servants.indexOf(id) >= 0) {
    check(secs >= 8 && secs <= 16, id + ' 循环长度 ' + secs.toFixed(2) + 's 不在 8~16 秒');
  }
  check(typeof d.each === 'function', id + ' 缺少 each');
});
servants.forEach(function (id) {
  check(A.servantTheme(id) === id, 'servantTheme(' + id + ') 应返回自身');
  check(A.themes[id].key > 0, id + ' 缺少调性 key');
});

// ---- 运行检查 -----------------------------------------------------------
let runtimeErrors = [];
process.on('uncaughtException', function (e) { runtimeErrors.push(String(e && e.stack || e)); });

A.init();
check(A.available() === true, 'init 后 available() 应为 true');

const seen = [];
A.onStateChange(function (s) { seen.push(s.theme); });

A.setVolume(0.55);
check(Math.abs(A.getVolume() - 0.55) < 1e-6, 'getVolume 未回读');
A.toggleMute();
check(A.isMuted() === true, 'toggleMute 未生效');
A.toggleMute();
check(A.isMuted() === false, 'toggleMute 未复原');

servants.forEach(function (id) {
  A.play(id);
  check(A.current() === id, 'current() 应为 ' + id);
});
scenes.forEach(function (id) {
  A.play(id);
  check(A.current() === id, 'current() 应为 ' + id);
});

// 让调度器跑一会儿，把各主题的格子都排出来
setTimeout(function () {
  A.play('battle');
  setTimeout(function () {
    A.stop();
    check(A.current() === null, 'stop 后 current 应为 null');
    A.play('title');
    // 模拟页面隐藏 / 恢复
    sandbox.document.hidden = true;
    docListeners.visibilitychange();
    setTimeout(function () {
      sandbox.document.hidden = false;
      docListeners.visibilitychange();
      setTimeout(function () {
        A.stop();
        // ---- 报告 ----
        const ctx = sandbox.window.__ctx || null;
        console.log('--- 冒烟测试结果 ---');
        console.log('状态回调次数:', seen.length);
        console.log('运行时异常:', runtimeErrors.length ? runtimeErrors : '无');
        console.log('参数/结构违规:', violations.length ? violations : '无');
        if (violations.length || runtimeErrors.length) {
          console.log('RESULT: FAIL');
          process.exit(1);
        }
        console.log('RESULT: PASS');
        process.exit(0);
      }, 260);
    }, 120);
  }, 700);
}, 700);
