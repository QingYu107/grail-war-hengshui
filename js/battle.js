/* 回合制战斗：COC 底盘 + 宝具演出 + 目击情报
   逻辑层，不碰 DOM；ui.js 负责画。 */
(function () {
  'use strict';
  var G = window.GRAIL;

  function d(n) { return Math.floor(Math.random() * n) + 1; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function skillOf(name) {
    var st = G.Engine.state();
    var m = G.master(st.masterId);
    var v = null;
    (m.skills || []).forEach(function (kv) { if (kv[0] === name) v = kv[1]; });
    if (v == null) v = name === '战斗' ? 45 : 35;
    var attr = name === '战斗' || name === '格斗' ? st.s.str : st.s.dex;
    return clamp(Math.round(Math.max(v, attr * 0.7)), 5, 95);
  }

  function create(opts) {
    var st = G.Engine.state();
    var foe = opts.customFoe || (opts.foeId === 'beast' ? {
      id: 'beast', cls: 'BEAST', cn: '兽', name: '攀比',
      alias: '人类恶 · Ⅳ', risk: '★★★★★', theme: 'beast',
      hp: 58, mp: 0, stats: { STR: 90, DEX: 60, CON: 90, POW: 95 },
      noble: [['「你是第几？」', '—', '—']],
      portrait: 'assets/img/scene_beast.jpg'
    } : G.servant(opts.foeId));
    var me = G.servant(st.servantId);
    var scale = opts.scale || 1;
    var B = {
      foe: foe, me: me,
      reveal: !!opts.reveal,
      foeHp: Math.round(foe.hp * 0.9 * scale),
      foeHpMax: Math.round(foe.hp * 0.9 * scale),
      myHp: opts.foeId === 'beast' ? Math.round(st.s.hp * 3.5) : st.s.hp,
      myHpMax: opts.foeId === 'beast' ? Math.round(st.s.hpMax * 3.5) : st.s.hpMax,
      mp: st.s.mp, mpMax: st.s.mpMax,
      san: st.s.san,
      turn: 1,
      log: [],
      over: null,
      guard: false,
      bonus: 0,
      foeNobleDone: false,
      myNobleDone: 0,
      allyCount: opts.allies || 0,
      presentServants: opts.foeId === 'beast' ? (function () {
        var ids = ['saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker', 'ruler', 'foreigner'];
        return ids.filter(function (id) {
          if (id === st.servantId) return false;
          if (st.s.flags['beat_' + id]) return false;
          if (st.s.flags['ally_' + id]) return false;
          return true;
        });
      })() : [],
      onEvent: opts.onEvent || function () {}
    };

    function nameOf() { return B.reveal ? foe.cls + ' · ' + foe.name : foe.cls + ' · ？？？'; }

    function say(t, tone) { B.log.push({ t: t, tone: tone || '' }); }

    say('你与 ' + nameOf() + ' 对上了。', 'head');

    function checkOver() {
      if (B.foeHp <= 0 && !B.over) { B.foeHp = 0; B.over = 'win'; }
      if (B.myHp <= 0 && !B.over) { B.myHp = 0; B.over = 'lose'; }
    }

    function foeTurn() {
      if (B.over) return;
      if (opts.foeId === 'beast' && B.presentServants && B.presentServants.length) {
        var bid = B.presentServants[Math.floor(Math.random() * B.presentServants.length)];
        var bsv = G.servant(bid);
        var bnp = (bsv && bsv.noble && bsv.noble[0]) || ['宝具', '—', '—'];
        say('那块屏里伸出一只手——' + bsv.cls + ' 的宝具：' + bnp[0], 'bad');
        var bdm = d(8) + d(8) + 6;
        if (B.guard) bdm = Math.round(bdm * 0.55);
        if (B.allyCount > 0) bdm = Math.max(2, Math.round(bdm * (1 - Math.min(0.6, B.allyCount * 0.16))));
        B.myHp -= bdm;
        say('你被卷进别人的宝具里，HP −' + bdm + '。', 'dmg');
        B.onEvent('foeNoble', { foe: bsv, name: bnp[0] });
        B.guard = false;
        B.turn++;
        checkOver();
        return;
      }
      if (B.allyCount > 0) say('有人替你挡了一下。', '');
      var lowHp = B.foeHp / B.foeHpMax < 0.45;
      var useNoble = lowHp && !B.foeNobleDone && Math.random() < 0.55;
      if (useNoble) {
        B.foeNobleDone = true;
        var np = (foe.noble && foe.noble[0]) || ['宝具', '—', '—'];
        say(nameOf() + ' 展开了宝具——' + np[0] + '。', 'bad');
        var dm = d(8) + d(8) + d(8);
        if (B.guard) dm = Math.round(dm * 0.55);
        B.myHp -= dm;
        say('你被卷了进去，HP −' + dm + '。', 'dmg');
        B.onEvent('foeNoble', { foe: foe, name: np[0] });
      } else {
        var hit = d(100) <= 55;
        if (hit) {
          var dm2 = d(6) + 1;
          if (B.guard) dm2 = Math.round(dm2 * 0.5);
          if (B.allyCount > 0) dm2 = Math.max(1, Math.round(dm2 * (1 - Math.min(0.6, B.allyCount * 0.16))));
          B.myHp -= dm2;
          say(foe.cls + ' 打中了你，HP −' + dm2 + '。', 'dmg');
        } else {
          say(foe.cls + ' 的攻击落空了。', '');
        }
      }
      B.guard = false;
      B.turn++;
      checkOver();
    }

    B.act = function (kind, arg) {
      if (B.over) return B;
      var bonus = B.bonus;
      B.bonus = 0;

      if (kind === 'attack') {
        var t = skillOf('战斗') + bonus;
        var r = d(100);
        if (r <= t) {
          var dmg = d(8) + Math.floor(G.Engine.state().s.str / 20) + (st.s.flags.perfectAffinity ? 3 : 0);
          B.foeHp -= dmg;
          if (r <= Math.floor(t / 5)) { dmg += 6; B.foeHp -= 6; say('极限命中！伤害 ×2（合计 ' + dmg + '）', 'good'); }
          else if (r <= Math.floor(t / 2)) say('命中要害，HP −' + dmg + '。', 'good');
          else say('命中，HP −' + dmg + '。', '');
        } else if (r >= 96) {
          say('你扑空了，还把自己绊了一下（大失败）。', 'bad');
          B.myHp -= 2;
        } else {
          say('没有打中。', '');
        }
        foeTurn();
      } else if (kind === 'guard') {
        B.guard = true;
        B.bonus = 15;
        say('你压低重心，盯住他的肩膀。（本回合减伤，下次命中 +15）', '');
        foeTurn();
      } else if (kind === 'noble') {
        var cost = 12;
        if (B.mp < cost) { say('MP 不够，宝具发不出来。', 'bad'); return B; }
        B.mp -= cost;
        B.myNobleDone++;
        var np2 = (me.noble && me.noble[B.myNobleDone - 1]) || (me.noble && me.noble[0]) || ['宝具', '—', '—'];
        say('真名解放——' + np2[0], 'noble');
        var nd = d(8) + d(8) + 6;
        B.foeHp -= nd;
        say('光把走廊照白了。' + foe.cls + ' HP −' + nd + '。', 'good');
        B.onEvent('myNoble', { me: me, name: np2[0] });
        foeTurn();
      } else if (kind === 'flee') {
        var ok = d(100) <= 55;
        if (ok) {
          B.over = 'flee';
          say('你退进了楼梯间，脚步声跟到第三层就停了。', '');
        } else {
          say('退路被堵住了。', 'bad');
          foeTurn();
        }
      }
      checkOver();
      return B;
    };

    B.state = function () {
      return {
        foeName: nameOf(), foeHp: Math.max(0, B.foeHp), foeHpMax: B.foeHpMax,
        myHp: Math.max(0, B.myHp), myHpMax: B.myHpMax, mp: Math.max(0, B.mp), mpMax: B.mpMax,
        san: B.san, turn: B.turn, over: B.over, log: B.log, canNoble: B.mp >= 12
      };
    };

    /* 战后结算：写回存档 */
    B.settle = function () {
      var s = G.Engine.state();
      var out = { sanLoss: 0, clue: 0, died: false };
      var ratio = B.myHpMax > 0 ? Math.round(B.myHp / B.myHpMax * s.s.hpMax) : B.myHp;
      s.s.hp = Math.max(0, Math.min(s.s.hpMax, ratio));
      s.s.mp = Math.max(0, B.mp);
      if (B.over === 'win' && opts.foeId === 'beast') {
        s.s.beast = 0;
        s.s.flags.beastDown = true;
        s.s.flags.allPresent = true;
        s.s.san = Math.max(1, s.s.san - 3);
        out.sanLoss = 3;
        G.Engine.addLog('你们把那块屏砸了。数字停在 0，没有再跳。');
        G.Engine.save();
        return out;
      }
      if (B.over === 'win') {
        var cl = d(4);
        var cur = s.s.clues[opts.foeId] || 0;
        var nv = Math.min(5, Math.max(cur, opts.clueLv || 3));
        s.s.clues[opts.foeId] = nv;
        out.clue = nv;
        out.sanLoss = d(4);
        s.s.san = Math.max(0, s.s.san - out.sanLoss);
        s.s.flags['beat_' + opts.foeId] = true;
        G.Engine.addLog('你打赢了 ' + foe.cls + '，情报升到 ' + G.Engine.roman(nv) + '。');
      } else if (B.over === 'lose') {
        out.sanLoss = d(10) + 2;
        s.s.san = Math.max(0, s.s.san - out.sanLoss);
        s.s.command = Math.max(0, s.s.command - 1);
        G.Engine.addLog('你输了。令咒替你挡了一下（令咒 −1，SAN −' + out.sanLoss + '）。');
        if (s.s.san <= 0) { out.died = true; s.s.alive = 0; }
      } else if (B.over === 'flee') {
        out.sanLoss = d(3);
        s.s.san = Math.max(0, s.s.san - out.sanLoss);
        G.Engine.addLog('你从 ' + foe.cls + ' 手里脱身了。');
      }
      if (!out.died && s.s.hp <= 0) s.s.hp = 1;   // 没死就留一口气，不然下一场直接躺
      B.san = s.s.san;
      G.Engine.save();
      return out;
    };

    return B;
  }

  window.GRAIL_BATTLE = { create: create, skillOf: skillOf };
})();
