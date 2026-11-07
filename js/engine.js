/* 引擎：状态机 / 相性分配 / COC 检定 / 结算 / 存档 */
(function () {
  'use strict';
  var G = window.GRAIL = window.GRAIL || {};
  var SAVE_KEY = 'grail_hengshui_save_v1';
  var SLOTS = [1, 2, 3];
  function slotKey(n) { return SAVE_KEY + '_s' + (n || 1); }

  function d(n) { return Math.floor(Math.random() * n) + 1; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- 相性分配 ---------- */
  function score(answers) {
    var sv = {}, rt = {}, pe = {}, stat = {}, four = {};
    G.QUIZ.forEach(function (q) {
      var a = answers[q.id];
      var opt = q.options.filter(function (o) { return o.key === a; })[0];
      if (!opt) return;
      Object.keys(opt.servant || {}).forEach(function (k) { sv[k] = (sv[k] || 0) + opt.servant[k]; });
      Object.keys(opt.route || {}).forEach(function (k) { rt[k] = (rt[k] || 0) + opt.route[k]; });
      Object.keys(opt.persona || {}).forEach(function (k) { pe[k] = (pe[k] || 0) + opt.persona[k]; });
      Object.keys(opt.stat || {}).forEach(function (k) { stat[k] = (stat[k] || 0) + opt.stat[k]; });
      Object.keys(opt.four || {}).forEach(function (k) { four[k] = opt.four[k]; });
    });
    // 从者：分数最高者；平手时按职介线微调
    var order = ['saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker', 'foreigner'];
    var best = null, bestScore = -1;
    order.forEach(function (id) {
      var s = (sv[id] || 0) + 0.001 * order.indexOf(id);
      if (s > bestScore) { bestScore = s; best = id; }
    });
    // 御主：按 persona 命中数挑预设卡；相性等级按关键词命中数
    var master = null, mBest = -1;
    G.MASTERS.forEach(function (m) {
      var tags = masterTags(m);
      var hit = tags.filter(function (t) { return pe[t]; }).reduce(function (a, t) { return a + (pe[t] || 0); }, 0);
      if (m.servant === best) hit += 7.0;      // 本命优先：预设卡与从者的对应关系足够硬
      if (hit > mBest) { mBest = hit; master = m; }
    });
    var servant = G.servant(best);
    var hits = servant.keywords.filter(function (k) { return personaCovers(k, pe); });
    var level = hits.length >= 3 ? 'A+' : hits.length === 2 ? 'A' : hits.length === 1 ? 'C' : 'E';
    // 职介线
    var rid = 'intel', rBest = -1;
    G.ROUTES.forEach(function (r) { var v = rt[r.id] || 0; if (v > rBest) { rBest = v; rid = r.id; } });
    return {
      servantId: best, masterId: master.id, routeId: rid,
      affinity: { level: level, hits: hits, all: servant.keywords },
      persona: pe, statMod: stat, four: four, rawServant: sv, rawRoute: rt
    };
  }

  function masterTags(m) {
    var t = [];
    var map = {
      jiangye: ['body', 'night', 'alone', 'hard'], zhangyuan: ['study', 'stuck', 'anxious'],
      wudi: ['online', 'loud', 'night'], wangdali: ['body', 'quiet', 'avoid'],
      zoulijun: ['adult', 'proud', 'loud'], lijiahao: ['quiet', 'night', 'avoid'],
      gaopeng: ['online', 'loyal', 'warm'], zhaotiezhu: ['adult', 'obey', 'clever'],
      linxiaoman: ['seen', 'online', 'record']
    };
    return map[m.id] || t;
  }
  function personaCovers(keyword, pe) {
    var map = {
      '偏执': ['hard', 'proud'], '凌晨': ['night'], '自我要求': ['hard', 'study', 'body'],
      '焦虑': ['anxious', 'study'], '出路': ['study', 'stuck'], '替别人做决定': ['adult', 'clever', 'group'],
      '被网暴': ['online', 'quiet'], '只会一个英雄': ['online', 'loud'], '键盘': ['online'],
      '被安排': ['avoid', 'obey'], '机械': ['body'], '被围观': ['seen', 'loud'],
      '自欺': ['proud', 'adult'], '玄学': ['proud'], '嘴硬': ['proud', 'loud'],
      '厌世': ['quiet', 'lazy'], '拒绝被安排': ['avoid'], '夜里活动': ['night'],
      '二人组': ['group', 'loyal'], '义气': ['loyal', 'warm'], '暴力整活': ['loud'],
      '纯真': ['warm'], '流量': ['seen', 'online'], '被看': ['seen'],
      '背锅': ['clever'], '舆论': ['online', 'loud'], '规则本身': ['obey', 'adult']
    };
    return (map[keyword] || []).some(function (t) { return (pe[t] || 0) >= 3; });
  }

  /* ---------- 状态 ---------- */
  var S = null;

  function newState(res) {
    var m = G.master(res.masterId), sv = G.servant(res.servantId), r = G.route(res.routeId);
    var st = {
      str: m.stats.STR, con: m.stats.CON, dex: m.stats.DEX, siz: m.stats.SIZ,
      app: m.stats.APP, int: m.stats.INT, pow: m.stats.POW, edu: m.stats.EDU
    };
    Object.keys(res.statMod || {}).forEach(function (k) {
      var map = { str: 'str', con: 'con', dex: 'dex', int: 'int', pow: 'pow', edu: 'edu', app: 'app' };
      if (map[k]) st[map[k]] = clamp(st[map[k]] + res.statMod[k], 20, 95);
    });
    var sanMax = st.pow;
    var s = {
      str: st.str, con: st.con, dex: st.dex, app: st.app, int: st.int, pow: st.pow, edu: st.edu,
      hp: Math.floor((st.con + m.stats.SIZ) / 10), hpMax: Math.floor((st.con + m.stats.SIZ) / 10),
      san: sanMax - (G.route(res.routeId).bonus.san < 0 ? Math.abs(G.route(res.routeId).bonus.san) : 0),
      sanMax: sanMax,
      mp: Math.floor(st.pow / 5), mpMax: Math.floor(st.pow / 5),
      luck: d(6) * 5, exposure: 1, demerit: 2, command: 3, beast: 0,
      clues: {}, flags: {}, allies: 0, kills: 0, alive: 7, ap: 6, day: 0, slot: 0,
      affinityLevel: res.affinity.level
    };
    // 职介线加成
    var b = G.route(res.routeId).bonus;
    if (b.exposure) s.exposure = clamp(s.exposure + b.exposure, 0, 10);
    if (b.beast) s.beast = clamp(s.beast + b.beast, 0, 7);
    if (b.san && b.san > 0) s.san = clamp(s.san + b.san, 0, s.sanMax);
    if (b.demerit) s.demerit = clamp(s.demerit + b.demerit, 0, 10);
    if (b.clueAll) {
      var ids = ['saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker'];
      ids.sort(function () { return Math.random() - 0.5; });
      ids.slice(0, 2).forEach(function (id) { s.clues[id] = 2; });
    }
    if (b.clueFlow) s.flags.sawVideo = true;
    if (res.affinity.level === 'A+') { s.command = 3; s.flags.perfectAffinity = true; }
    if (res.affinity.level === 'E') { s.flags.misfit = true; }
    if (res.servantId === 'assassin') s.flags.assassinAlive = true;

    return {
      v: 1, t: Date.now(),
      answers: res.answers, routeId: res.routeId, masterId: res.masterId, servantId: res.servantId,
      affinity: res.affinity, four: res.four, s: s,
      log: [], history: [], pending: null, ended: null
    };
  }

  /* ---------- 检定 ---------- */
  /* 校园技能底值：比 COC 原版宽容一档，让单机流程不至于连续空转 */
  var CAMPUS = {
    '侦查': 40, '聆听': 35, '潜行': 30, '图书馆使用': 35, '心理学': 25, '话术': 25,
    '说服': 25, '表演': 20, '幸运': 0, '意志': 0, '神秘学': 15, '电子学': 30,
    '机械维修': 30, '攀爬': 35, '闪避': 0, '格斗': 40, '跑操耐力': 45, '熬夜': 30,
    '察言观色': 30, '圆谎': 25, '翻墙': 25, '抄作业': 40, '短视频运营': 30, '做题': 35,
    '看人下菜': 25, '医学': 15, '会计': 20, '历史': 20, '威吓': 30, '战斗': 40
  };
  var ATTR_OF = {
    '潜行': 'dex', '闪避': 'dex', '翻墙': 'dex', '妙手': 'dex', '锁匠': 'dex',
    '攀爬': 'str', '格斗': 'str', '战斗': 'str', '跑操耐力': 'str', '游泳': 'str', '跳跃': 'str',
    '电子学': 'int', '机械维修': 'int', '计算机使用': 'int', '聆听': 'int', '侦查': 'int',
    '图书馆使用': 'edu', '历史': 'edu', '神秘学': 'edu', '医学': 'edu', '会计': 'edu', '做题': 'edu',
    '话术': 'app', '说服': 'app', '威吓': 'app', '表演': 'app', '圆谎': 'app', '察言观色': 'app',
    '看人下菜': 'app', '短视频运营': 'app', '心理学': 'int', '精神分析': 'int', '急救': 'edu'
  };
  function skillValue(name) {
    var m = G.master(S.masterId);
    var v = null;
    (m.skills || []).forEach(function (kv) { if (kv[0] === name) v = kv[1]; });
    if (v == null) v = CAMPUS[name];
    if (v == null) v = 20;
    // 无对应技能时，用属性的一半兜底（COC 的「用属性代替」变体）
    var a = ATTR_OF[name];
    if (a) v = Math.max(v, Math.floor(S.s[a] * 0.6));
    if (name === '意志') v = S.s.pow;
    if (name === '幸运') v = S.s.luck;
    if (name === '闪避') v = Math.floor(S.s.dex / 2);
    if (name === '母语') v = S.s.edu;
    // 路线与状态修正
    if (S.routeId === 'assassin' && (name === '潜行' || name === '翻墙')) v += 15;
    if (S.routeId === 'intel' && (name === '图书馆使用' || name === '察言观色')) v += 10;
    if (S.routeId === 'rule' && (name === '说服' || name === '话术')) v += 10;
    if (S.s.san <= 20) v -= 5;
    if (S.s.exposure >= 5) v -= 5;
    return clamp(Math.round(v), 1, 99);
  }

  function roll(name, bonus) {
    var target = clamp(skillValue(name) + (bonus || 0), 1, 99);
    var r = d(100);
    var level = '失败', ok = false;
    if (r <= target) { ok = true; level = '成功'; }
    if (r <= Math.floor(target / 2)) level = '困难成功';
    if (r <= Math.floor(target / 5)) level = '极限成功';
    if (r === 1) level = '大成功';
    if (!ok && r >= 96) level = '大失败';
    return { die: r, target: target, ok: ok, level: level, skill: name };
  }

  /* ---------- 效果 ---------- */
  function apply(fx, tag) {
    if (!fx) return [];
    var notes = [];
    var s = S.s;
    ['san', 'exposure', 'demerit', 'beast', 'mp', 'hp', 'luck'].forEach(function (k) {
      if (fx[k]) {
        // 兽进度：同一天最多因「选择」+1（夜晚的 +1 由日程推进负责）
        if (k === 'beast' && fx.beast > 0 && s.beastDay === s.day) {
          notes.push('兽进度已在今日推进');
          return;
        }
        var before = s[k];
        var max = { san: s.sanMax, exposure: 10, demerit: 10, beast: 7, mp: s.mpMax, hp: s.hpMax, luck: 99 }[k];
        s[k] = clamp(s[k] + fx[k], k === 'san' ? 0 : 0, max);
        if (k === 'beast' && fx.beast > 0 && s[k] !== before) s.beastDay = s.day;
        if (k === 'beast' && fx.beast < 0 && s[k] !== before) s.beastCutDay = s.day;
        if (s[k] !== before) notes.push(labelOf(k) + (s[k] > before ? ' +' : ' ') + (s[k] - before));
      }
    });
    if (fx.command) { s.command = clamp(s.command + fx.command, 0, 3); notes.push('令咒 ' + (fx.command > 0 ? '+' : '') + fx.command); }
    if (fx.clue) {
      var cid = typeof fx.clue === 'string' ? fx.clue : Object.keys(fx.clue)[0];
      var lv = typeof fx.clue === 'string' ? 3 : fx.clue[cid];
      s.clues[cid] = Math.max(s.clues[cid] || 0, lv);
      notes.push('情报：' + (G.servant(cid) ? G.servant(cid).cls : cid) + ' ' + roman(s.clues[cid]));
    }
    if (fx.clueAll) {
      var ids = ['saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker'];
      ids.forEach(function (id) { if (!s.clues[id]) s.clues[id] = 1; });
      notes.push('情报卡更新');
    }
    if (fx.flag) {
      var fname = typeof fx.flag === 'string' ? fx.flag : Object.keys(fx.flag)[0];
      var fval = typeof fx.flag === 'string' ? true : fx.flag[fname];
      s.flags[fname] = fval; notes.push('记录：' + flagLabel(fname));
    }
    if (fx.allies) { s.allies = clamp(s.allies + fx.allies, 0, 7); notes.push('盟友 ' + (fx.allies > 0 ? '+' : '') + fx.allies); }
    if (fx.kills) { s.kills += fx.kills; notes.push('你动手了'); }
    if (fx.alive) { s.alive = clamp(s.alive + fx.alive, 0, 7); notes.push('在场御主 ' + s.alive + ' / 7'); }
    if (fx.awake) { s.ap += fx.awake; }
    if (s.demerit >= 10 && !s.flags.parentMeetingNow) {
      s.flags.parentMeetingNow = true; s.demerit = 0; s.exposure = clamp(s.exposure + 2, 0, 10);
      notes.push('家长会：当日魔术中断，曝光 +2');
    }
    if (s.san <= 0 && !s.flags.sanBroken) {
      s.flags.sanBroken = true; notes.push('SAN 归零：你听见走廊里有人在数人数');
    }
    if (s.exposure >= 10) s.flags.exposureMax = true;
    if (fx.log) S.log.push(fx.log);
    return notes;
  }
  function labelOf(k) {
    return { san: 'SAN', exposure: '曝光度', demerit: '扣分', beast: '兽进度', mp: 'MP', hp: 'HP', luck: '幸运' }[k] || k;
  }
  function flagLabel(f) {
    var m = {
      firstBlood: '第一滴血', sawVideo: '看过 Day 0 的视频', metRuler: '与 Ruler 谈过',
      rulerDeal: '欠 Ruler 一个人情', beastNamed: '知道「兽」这个词', doorOpen: '门开了',
      attributed: 'Ruler 归因', blackout: '圣杯断电', accel: '学习加速', honorThird: '第三名的位置',
      allyChen: '陈墨的合作', allyBai: '白露的交换', allyWang: '王秀英的坏账',
      know1994: '1994 年的回声', examClue: '月考杂音里的中文', leftSchool: '月假出校',
      wishWin: '许愿：赢', wishAll: '许愿：全校上线', wishSleep: '许愿：睡个好觉',
      allPresent: '七人全到场', doorClosed: '断掉了一眼', accountDead: '账号停更',
      parentMeetingNow: '家长会', misfit: '错位召唤', perfectAffinity: '完美相性'
    };
    return m[f] || f;
  }
  function roman(n) { return ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][n] || ('Ⅴ'); }

  /* ---------- 存档 ---------- */
  function save(slot) {
    try {
      if (S) {
        S.t = Date.now();
        S.slotUsed = slot || S.slotUsed || 1;
        localStorage.setItem(slotKey(S.slotUsed), JSON.stringify(S));
        localStorage.setItem(SAVE_KEY, JSON.stringify(S));
      }
      return true;
    } catch (e) { return false; }
  }
  function load(slot) {
    try {
      var raw = localStorage.getItem(slotKey(slot || 1)) || (slot ? null : localStorage.getItem(SAVE_KEY));
      if (!raw) return false;
      var o = JSON.parse(raw);
      if (!o || !o.servantId) return false;
      S = o; return true;
    } catch (e) { return false; }
  }
  function listSaves() {
    var out = [];
    SLOTS.forEach(function (n) {
      try {
        var raw = localStorage.getItem(slotKey(n));
        if (!raw) { out.push({ slot: n, empty: true }); return; }
        var o = JSON.parse(raw);
        out.push({ slot: n, empty: false, t: o.t || 0, day: o.s ? o.s.day : 0,
          servant: o.servantId || '', master: o.masterId || '', san: o.s ? o.s.san : 0 });
      } catch (err) { out.push({ slot: n, empty: true }); }
    });
    return out;
  }
  function deleteSave(n) { try { localStorage.removeItem(slotKey(n)); } catch (e) {} }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  window.GRAIL.Engine = {
    d: d, pick: pick, clamp: clamp,
    score: score,
    create: function (answers) {
      var res = score(answers); res.answers = answers;
      S = newState(res);
      return S;
    },
    state: function () { return S; },
    setState: function (o) { S = o; },
    skillValue: skillValue, roll: roll, apply: apply,
    roman: roman, flagLabel: flagLabel,
    save: save, load: load, hasSave: hasSave, clearSave: clearSave,
    listSaves: listSaves, deleteSave: deleteSave, slotKey: slotKey,
    addLog: function (t) { if (S) S.log.push(t); }
  };
})();
