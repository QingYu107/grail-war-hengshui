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
require('../js/data/night.js');
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

/* 夜行：和 ui 走同一份数据（js/data/night.js），在 node 里也能跑一遍。
   以前新增的夜间流程只有 cdp 在测，node 侧的回归等于漏掉一半。 */
function runNight(st, day, pick) {
  var N = GRAIL_NIGHT || { actions: [] };
  var a = (N.actions || []).filter(function (x) { return x.k === pick; })[0] || (N.actions || [])[0];
  if (!a) return;
  st.s.flags['night_' + day] = true;
  st.s.nights = st.s.nights || {};
  st.s.nights[day] = a.k;
  if (a.fx) E.apply(a.fx);
  if (a.cut) st.s.beastCutDay = day;
  if (a.k === 'bond') E.apply({ bond: 1 });
}

function playthrough(picks, mode) {
  var answers = {};
  G.QUIZ.forEach(function (q, i) { answers[q.id] = picks[i % picks.length]; });
  var res = E.score(answers);
  var st = E.create(answers);
  var guard = 0;
  while (st.s.day <= 7 && guard++ < 80) {
    var D = G.STORY[st.s.day];
    if (!D) { problems.push('missing day ' + st.s.day); break; }
    var slot = D.slots[st.s.slot];
    if (!slot) {
      var p = st.s.day;
      // 夜里那一段：Day 1–6 各一次，刺客线两次
      if (p >= 1 && p < 7 && !st.s.flags['night_' + p]) {
        runNight(st, p, mode === 'careful' ? 'sleep' : ['rest', 'patrol', 'bond'][p % 3]);
        continue;
      }
      if (p >= 1 && p < 7 && st.routeId === 'assassin' && !st.s.flags['night2_' + p]) {
        st.s.flags['night2_' + p] = true;
        runNight(st, p, 'rest');
        continue;
      }
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
  ['E11', mk({ s: { beast: 2 }, flags: { wishWin: true, assassinAlive: true }, servantId: 'assassin' })],
  // 夜行与羁绊参与判定：只靠夜里做的事，也该被算成「人味」
  ['E4', mk({ s: { beast: 7, nights: { 1: 'rest', 2: 'patrol', 3: 'bond', 4: 'rest' } }, flags: { summoned: true } })],
  ['E9', mk({ s: { beast: 7, nights: { 1: 'sleep' } }, flags: { summoned: true } })],
  ['E4', mk({ s: { beast: 6, bond: 2 }, flags: { summoned: true } })]
];
cases.forEach(function (c) {
  var got = G.judgeEnding(c[1]);
  if (got !== c[0]) problems.push('judge ' + c[0] + ' got ' + got);
});
console.log('judge cases:', cases.length - problems.filter(function (p) { return p.indexOf('judge') === 0; }).length, '/', cases.length);

/* ---------- 时间线：每个结局一条线的小说 ----------
   验收口径见 docs/TIMELINE.md + docs/CANON.md：
   5–7 章、4000 字以上、至少 4 组御主、至少 1 处演出、不许出现 6012、
   不许把孙笑川写成「第七位从者」。 */
['timeline', 'timeline_e2e9', 'timeline_e3e8', 'timeline_e4e11', 'timeline_e5e10', 'timeline_e6e7'].forEach(function (f) {
  try { require('../js/data/' + f + '.js'); } catch (e) { /* 还没交的那几条先跳过 */ }
});
var TL = window.GRAIL_TIMELINE || {};
var TL_FX = ['clash', 'noble', 'summon', 'broadcast', 'roll', 'impact', 'glitch', 'beast', 'static', 'mirror', 'bleed', 'dissolve'];
var TL_MASTERS = ['江野', '张远', '吴迪', '王大力', '邹丽君', '李嘉豪', '高鹏', '赵铁柱', '林小满'];
var tlStats = [];
Object.keys(TL).forEach(function (id) {
  var L = TL[id] || {};
  var chs = L.chapters || [];
  var n = 0, fxs = 0, names = {};
  if (!L.title) problems.push('tl ' + id + ' no title');
  if (chs.length < 5 || chs.length > 7) problems.push('tl ' + id + ' chapters=' + chs.length);
  chs.forEach(function (c, i) {
    if (!c.title) problems.push('tl ' + id + ' ch' + (i + 1) + ' no title');
    if (!c.text || !c.text.length) problems.push('tl ' + id + ' ch' + (i + 1) + ' empty');
    (c.text || []).forEach(function (it) {
      if (typeof it === 'string') {
        n += it.replace(/\s/g, '').length;
        TL_MASTERS.forEach(function (m) { if (it.indexOf(m) >= 0) names[m] = 1; });
      } else if (it && it.fx) {
        fxs++;
        if (TL_FX.indexOf(it.fx) < 0) problems.push('tl ' + id + ' bad fx ' + it.fx);
      }
    });
  });
  if (n < 4000) problems.push('tl ' + id + ' only ' + n + ' chars');
  if (!fxs) problems.push('tl ' + id + ' no fx');
  if (Object.keys(names).length < 4) problems.push('tl ' + id + ' cast=' + Object.keys(names).length);
  var all = chs.map(function (c) { return (c.text || []).filter(function (x) { return typeof x === 'string'; }).join(''); }).join('');
  if (all.indexOf('6012') >= 0) problems.push('tl ' + id + ' has 6012');
  if (all.indexOf('第七位从者') >= 0) problems.push('tl ' + id + ' calls ruler 第七位从者');
  tlStats.push(id + ' ' + chs.length + '章/' + n + '字/' + fxs + '演出/' + Object.keys(names).length + '组');
});
console.log('timeline:', tlStats.join('　') || 'none');

console.log('ending keys ok:', Object.keys(G.ENDINGS).length === 11);
process.exit(problems.length ? 1 : 0);
