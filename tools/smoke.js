/* 无头冒烟：验证数据完整性 + 走完七天 */
global.window = global;
global.localStorage = {
  _d: {},
  getItem: function (k) { return this._d[k] || null; },
  setItem: function (k, v) { this._d[k] = String(v); },
  removeItem: function (k) { delete this._d[k]; }
};

require('../js/data/roster.js');
require('../js/data/quiz.js');
require('../js/data/story_prologue.js');
require('../js/data/story_a.js');
require('../js/data/story_b.js');
require('../js/data/endings.js');
require('../js/engine.js');

var G = window.GRAIL;
var E = G.Engine;
var problems = [];

function checkStory() {
  var ids = Object.keys(G.STORY).filter(function (k) { return /^[0-7]$/.test(k); }).map(Number).sort(function (a, b) { return a - b; });
  if (ids.join(',') !== '0,1,2,3,4,5,6,7') problems.push('story days: ' + ids.join(','));
  ids.forEach(function (d) {
    var day = G.STORY[d];
    if (!day.title) problems.push('day ' + d + ' no title');
    if (!day.slots || !day.slots.length) problems.push('day ' + d + ' no slots');
    day.slots.forEach(function (s, i) {
      if (!s.id) problems.push('day ' + d + ' slot ' + i + ' no id');
      if (!s.intro || !s.intro.length) problems.push('day ' + d + ' ' + s.id + ' no intro');
      if (!s.options || s.options.length < 2) problems.push('day ' + d + ' ' + s.id + ' too few options');
      s.options.forEach(function (o) {
        if (!o.id) problems.push('day ' + d + ' ' + s.id + ' option no id');
        if (!o.check) {
          if (!o.text || !o.text.length) problems.push('opt ' + o.id + ' no text');
          if (!o.fx) problems.push('opt ' + o.id + ' no fx');
        } else {
          if (!o.ok || !o.ok.text) problems.push('opt ' + o.id + ' no ok text');
          if (!o.fail || !o.fail.text) problems.push('opt ' + o.id + ' no fail text');
          if (!o.check.skill) problems.push('opt ' + o.id + ' no skill');
        }
      });
    });
  });
}

function playthrough(picks, mode) {
  var answers = {};
  G.QUIZ.forEach(function (q, i) { answers[q.id] = picks[i % picks.length]; });
  var res = E.score(answers);
  var st = E.create(answers);
  var guard = 0;
  while (st.s.day <= 7 && guard++ < 60) {
    var D = G.STORY[st.s.day];
    if (!D) { problems.push('missing day ' + st.s.day); break; }
    var slot = D.slots[st.s.slot];
    if (!slot) {
      var p = st.s.day;
      st.s.day++; st.s.slot = 0;
      if (st.s.beastCutDay !== p) st.s.beast = Math.min(7, st.s.beast + 1);
      continue;
    }
    var opts = slot.options.filter(function (o) {
      var req = o.req || {};
      if (req.route && st.routeId !== req.route) return false;
      if (req.flag && !st.s.flags[req.flag]) return false;
      if (req.command && st.s.command < req.command) return false;
      if (req.allies && st.s.allies < req.allies) return false;
      if (req.clueCount) {
        var n = 0; Object.keys(st.s.clues).forEach(function (k) { if (st.s.clues[k] >= 3) n++; });
        if (n < req.clueCount) return false;
      }
      return true;
    });
    if (!opts.length) { problems.push('no available option at ' + slot.id); break; }
    var o;
    if (mode === 'careful') {
      var scored = opts.map(function (x) {
        var f = (x.check ? (x.ok.fx || {}) : (x.fx || {}));
        var f2 = (x.check ? (x.fail.fx || {}) : {});
        var b = (f.beast || 0) + (f2.beast || 0);
        return { o: x, b: b };
      });
      scored.sort(function (a, b) { return a.b - b.b; });
      o = scored[0].o;
    } else {
      o = opts[Math.floor(Math.random() * opts.length)];
    }
    var fx;
    if (o.check) { var r = E.roll(o.check.skill, o.check.bonus || 0); fx = (r.ok ? o.ok : o.fail).fx; }
    else fx = o.fx;
    E.apply(fx);
    st.s.slot++;
    if (st.s.slot >= D.slots.length) {
      var pd = st.s.day;
      st.s.day++; st.s.slot = 0;
      if (st.s.beastCutDay !== pd) st.s.beast = Math.min(7, st.s.beast + 1);
    }
    if (st.s.beast >= 7 || st.s.exposure >= 10) break;
  }
  if (mode === 'careful' && st.s.day > 7) {
    // 决战：优先「我不参与」/「睡个好觉」
    var wish = (G.STORY.WISHES || []).filter(function (w) { return w.id === (st.s.allies >= 0 ? 'w5' : 'w6'); })[0];
    if (wish) E.apply(wish.fx);
    E.apply({ flag: 'allPresent' });
  }
  var id = G.judgeEnding(st);
  return { res: res, st: st, ending: id };
}


checkStory();

var runs = [];
// 六种答法各跑一次（用不同 option key 组合）
var combos = [
  ['A', 'A', 'A', 'A', 'A', 'A'],
  ['B', 'B', 'B', 'B', 'B', 'B'],
  ['C', 'C', 'C', 'C', 'C', 'C'],
  ['D', 'C', 'B', 'A', 'D', 'C'],
  ['B', 'D', 'C', 'C', 'A', 'D'],
  ['D', 'D', 'D', 'D', 'D', 'D']
];
combos.forEach(function (c, i) {
  for (var k = 0; k < 3; k++) {
    var r = playthrough(c);
    runs.push(r);
    if (i === 0 && k === 0) {
      console.log('sample:', r.res.servantId, r.res.masterId, r.res.routeId, r.res.affinity.level, '=>', r.ending);
    }
  }
});

var byServant = {}, byRoute = {}, byEnding = {};
runs.forEach(function (r) {
  byServant[r.res.servantId] = (byServant[r.res.servantId] || 0) + 1;
  byRoute[r.res.routeId] = (byRoute[r.res.routeId] || 0) + 1;
  byEnding[r.ending] = (byEnding[r.ending] || 0) + 1;
});

console.log('servants:', JSON.stringify(byServant));
console.log('routes:', JSON.stringify(byRoute));
console.log('endings:', JSON.stringify(byEnding));
console.log('problems:', problems.length ? problems.slice(0, 20) : 'none');

// endings 完整性
['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11'].forEach(function (k) {
  if (!G.ENDINGS[k]) problems.push('missing ending ' + k);
});

// 判定函数逐条验证
function mk(o) {
  var base = { s: { beast: 0, exposure: 1, alive: 7, kills: 0, flags: {} }, masterId: 'jiangye', servantId: 'saber' };
  o = o || {};
  if (o.s) { Object.keys(o.s).forEach(function (k) { base.s[k] = o.s[k]; }); }
  if (o.flags) base.s.flags = o.flags;
  if (o.masterId) base.masterId = o.masterId;
  if (o.servantId) base.servantId = o.servantId;
  return base;
}
var cases = [
  ['E9', mk({ s: { beast: 7 } })],
  ['E3', mk({ s: { exposure: 10 } })],
  ['E7', mk({ flags: { doorOpen: true } })],
  ['E6', mk({ flags: { attributed: true } })],
  ['E2', mk({ s: { alive: 0 } })],
  ['E4', mk({ flags: { blackout: true } })],
  ['E5', mk({ s: { beast: 0, alive: 4 }, flags: { gaveUp: true } })],
  ['E8', mk({ s: { beast: 3 }, flags: { allPresent: true } })],
  ['E1', mk({ s: { beast: 2 }, flags: { wishWin: true } })],
  ['E10', mk({ s: { beast: 2 }, flags: { wishWin: true, wishAll: true }, masterId: 'zoulijun' })],
  ['E11', mk({ s: { beast: 2 }, flags: { wishWin: true, assassinAlive: true }, servantId: 'assassin' })]
];
cases.forEach(function (c) {
  var got = G.judgeEnding(c[1]);
  if (got !== c[0]) problems.push('judge ' + c[0] + ' got ' + got);
});
console.log('judge cases:', cases.length - problems.filter(function (p) { return p.indexOf('judge') === 0; }).length, '/', cases.length);

console.log('ending keys ok:', Object.keys(G.ENDINGS).length === 11);
process.exit(problems.length ? 1 : 0);
