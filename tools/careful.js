global.window = global;
global.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
require('../js/data/roster.js');
require('../js/data/quiz.js');
require('../js/data/story_prologue.js');
require('../js/data/story_a.js');
require('../js/data/story_b.js');
require('../js/data/endings.js');
require('../js/engine.js');
var G = window.GRAIL, E = G.Engine;

function available(st, slot) {
  return slot.options.filter(function (o) {
    var r = o.req || {};
    if (r.route && st.routeId !== r.route) return false;
    if (r.flag && !st.s.flags[r.flag]) return false;
    if (r.command && st.s.command < r.command) return false;
    if (r.allies && st.s.allies < r.allies) return false;
    if (r.clueCount) {
      var n = 0; Object.keys(st.s.clues).forEach(function (k) { if (st.s.clues[k] >= 3) n++; });
      if (n < r.clueCount) return false;
    }
    return true;
  });
}
function beastOf(o) {
  var f = o.check ? (o.ok.fx || {}) : (o.fx || {});
  var f2 = o.check ? (o.fail.fx || {}) : {};
  return ((f.beast || 0) + (f2.beast || 0)) * 2 + ((f.exposure || 0) + (f2.exposure || 0));
}
function balOf(o) {
  var f = o.check ? (o.ok.fx || {}) : (o.fx || {});
  var f2 = o.check ? (o.fail.fx || {}) : {};
  var b = (f.beast || 0) + (f2.beast || 0);
  var e = (f.exposure || 0) + (f2.exposure || 0);
  var clue = 0;
  if (f.clue) clue += 1; if (f2.clue) clue += 0.5;
  if (f.clueAll) clue += 0.6;
  var fl = 0;
  if (f.flag) fl += 0.3;
  return b * 3 + e - clue - fl;
}
function run(picks, mode) {
  var answers = {};
  G.QUIZ.forEach(function (q, i) { answers[q.id] = picks[i % picks.length]; });
  var res = E.score(answers), st = E.create(answers), guard = 0;
  while (st.s.day <= 7 && guard++ < 80) {
    var D = G.STORY[st.s.day]; if (!D) break;
    var slot = D.slots[st.s.slot];
    if (!slot) { var p0 = st.s.day; st.s.day++; st.s.slot = 0; if (st.s.beastCutDay !== p0) st.s.beast = Math.min(7, st.s.beast + 1); continue; }
    var opts = available(st, slot);
    if (!opts.length) { console.log('STUCK', slot.id); break; }
    var o;
    if (mode === 'balanced') {
      var sb = opts.slice().sort(function (a, b) { return balOf(a) - balOf(b); }); o = sb[0];
    } else if (mode === 'careful') { var s = opts.slice().sort(function (a, b) { return beastOf(a) - beastOf(b); }); o = s[0]; }
    else if (mode === 'reckless') { var s2 = opts.slice().sort(function (a, b) { return beastOf(b) - beastOf(a); }); o = s2[0]; }
    else o = opts[Math.floor(Math.random() * opts.length)];
    var fx = o.check ? ((E.roll(o.check.skill, o.check.bonus || 0).ok ? o.ok : o.fail).fx) : o.fx;
    E.apply(fx);
    st.s.slot++;
    if (st.s.slot >= D.slots.length) {
      var pd = st.s.day; st.s.day++; st.s.slot = 0;
      if (st.s.beastCutDay !== pd) st.s.beast = Math.min(7, st.s.beast + 1);
    }
    if (st.s.beast >= 7 || st.s.exposure >= 10) break;
  }
  var ending = G.judgeEnding(st);
  return { servant: res.servantId, route: res.routeId, beast: st.s.beast, exp: st.s.exposure, san: st.s.san, day: st.s.day, end: ending, flags: Object.keys(st.s.flags) };
}

['A', 'B', 'C', 'D'].forEach(function (k) {
  var r = run([k, k, k, k, k, k], 'balanced');
  console.log('balanced', k, JSON.stringify(r));
});
var agg = {};
for (var i = 0; i < 40; i++) {
  var keys = ['A', 'B', 'C', 'D'];
  var pick = keys.map(function () { return keys[Math.floor(Math.random() * 4)]; });
  var r = run(pick, 'random');
  agg[r.end] = (agg[r.end] || 0) + 1;
}
console.log('random endings over 40:', JSON.stringify(agg));
var rec = {};
for (var j = 0; j < 20; j++) {
  var r2 = run(['A', 'B', 'C', 'D'], 'reckless');
  rec[r2.end] = (rec[r2.end] || 0) + 1;
}
console.log('reckless endings over 20:', JSON.stringify(rec));

