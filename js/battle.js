/* 回合制战斗：COC 底盘 + 预兆读招 + 破绽 + 羁绊 + 宝具演出 + 目击情报
   逻辑层，不碰 DOM；ui.js 负责画。

   一次交手 = 你的一个动作 + 它的一次回应。动作有五手：
     交手 / 架住 / 读招 / 宝具 / 撤
   面板上方会先露出它这一手的「预兆」（模糊的），读招能把预兆翻译成明确意图，
   并且当回合大幅减伤。破绽叠到 3 层，下一次交手必中且加伤。
   羁绊等级会进战斗：伤害、减伤、判定、以及一次「替身」。 */
(function () {
  'use strict';
  var G = window.GRAIL;

  function d(n) { return Math.floor(Math.random() * n) + 1; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd() { return Math.random(); }

  /* ---------- 数值配置：要拉长战斗 / 调深度，改这里就够 ---------- */
  var CFG = {
    playerHpMul: 2.8,        // 战斗内 HP 放大倍数（(CON+SIZ)/10 只有十来点，三拳就躺）
    foeHpMul: 1.75,          // 敌方 HP 放大：一场 6–9 回合
    beastHpMul: 1.42,        // 兽：三阶段，打满要八到十二回合（决战不给重来，别太狠）
    beastGuardMul: 3.2,      // 兽战玩家护体倍数（原来硬编码 3.5）
    attackBase: 18,          // 从者在旁边递手：交手判定底值加成
    mpRegen: { attack: 1, guard: 2, observe: 2 },
    nobleCost: 12,
    nobleCostBondCut: 2,     // 每级羁绊减 2 点宝具消耗
    bondDmg: [0, 1, 2, 4],            // 羁绊伤害加成
    bondGuard: [0.55, 0.48, 0.42, 0.36],   // 架住减伤系数（越低越硬）
    bondCheck: [0, 5, 8, 12],         // 羁绊判定加成
    staggerMax: 3,
    allyBlock: 0.2,          // 每个盟友的挡刀概率
    allyDmgEvery: 2          // 每几回合盟友补一次伤害
  };

  function skillOf(name) {
    var st = G.Engine.state();
    var m = G.master(st.masterId);
    var v = null;
    (m.skills || []).forEach(function (kv) { if (kv[0] === name) v = kv[1]; });
    if (v == null) v = name === '战斗' ? 45 : 35;
    var attr = name === '战斗' || name === '格斗' ? st.s.str : st.s.dex;
    var v2 = Math.max(v, attr * 0.7);
    if (st.s.bond) v2 += st.s.bond * 3;
    /* 精神掉档：手会抖。这条和 Engine.skillValue 走同一张表，两处不能各写一套。 */
    var tier = G.Engine.sanTierNow ? G.Engine.sanTierNow() : 0;
    var sf = (G.Engine.SAN_FX || [])[tier];
    if (sf) v2 -= sf.pen;
    return clamp(Math.round(v2), 5, 95);
  }

  var BEAST_FOE = {
    id: 'beast', cls: 'BEAST', cn: '兽', name: '攀比',
    alias: '人类恶 · Ⅳ', risk: '★★★★★', theme: 'beast',
    hp: 58, mp: 0, stats: { STR: 90, DEX: 60, CON: 90, POW: 95 },
    noble: [['「你是第几？」', '—', '—']],
    portrait: 'assets/img/scene_beast.jpg'
  };

  /* 预兆：只给模糊的一句话，读招之后才换成明确意图 */
  var TELL = {
    strike: '它在找一个能进来的角度。',
    heavy: '它把重心压低了——像是打算一次解决。',
    charge: '它退开半步，吸了一口气。',
    noble: '它抬起手。空气忽然变重了。',
    borrow: '那块屏里有人在按手印，一个接一个。',
    rank: '它开始数数。声音很平，一个接一个。'
  };
  var INTENT_NAME = { strike: '普通一击', heavy: '重手', charge: '蓄力', noble: '宝具', borrow: '借用宝具', rank: '点名' };

  function create(opts) {
    var st = G.Engine.state();
    var isBeast = opts.foeId === 'beast';
    var foe = opts.customFoe || (isBeast ? BEAST_FOE : G.servant(opts.foeId));
    var me = G.servant(st.servantId);
    var scale = opts.scale || 1;
    var bond = clamp(st.s.bond || 0, 0, 3);

    var hpMul = isBeast ? CFG.beastGuardMul : CFG.playerHpMul;
    var B = {
      foe: foe, me: me, isBeast: !!isBeast,
      reveal: !!opts.reveal,
      scale: scale,
      night: !!opts.night,        // 巡夜撞上的那一场：赢了多记一张脸
      bond: bond,
      foeHp: 0, foeHpMax: 0,
      myHp: Math.round(st.s.hp * hpMul),
      myHpMax: Math.round(st.s.hpMax * hpMul),
      mp: st.s.mp, mpMax: st.s.mpMax,
      san: st.s.san,
      turn: 1,
      log: [],
      fx: [],                     // 给 ui 播放动画的事件队列
      over: null,
      guard: false,               // 本回合架住
      guardHeld: false,           // 上一手是架住（减伤在敌方回合结算）
      evade: 0,                   // 读招带来的当回合闪避系数
      bonus: 0,                   // 下一次交手的判定加成
      stagger: 0,
      foeNobleDone: false,
      myNobleDone: 0,
      charged: false,
      standUsed: false,
      allyCount: opts.allies || 0,
      allyTurn: 0,
      phase: 1,
      intent: 'strike',
      intentKnown: false,
      lastAction: null,
      onEvent: opts.onEvent || function () {}
    };

    var foeBase = isBeast ? foe.hp * CFG.beastHpMul : foe.hp * CFG.foeHpMul;
    B.foeHp = Math.round(foeBase * scale);
    B.foeHpMax = B.foeHp;

    B.presentServants = isBeast ? (function () {
      var ids = ['saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker', 'ruler', 'foreigner'];
      return ids.filter(function (id) {
        if (id === st.servantId) return false;
        if (st.s.flags['beat_' + id]) return false;
        if (st.s.flags['ally_' + id]) return false;
        return true;
      });
    })() : [];

    function nameOf() { return B.reveal ? foe.cls + ' · ' + foe.name : foe.cls + ' · ？？？'; }
    function say(t, tone) { B.log.push({ t: t, tone: tone || '' }); }
    function pushFx(o) { B.fx.push(o); }
    function foePct() { return B.foeHp / B.foeHpMax; }

    function pickIntent() {
      var r = rnd();
      if (isBeast) {
        if (B.charged) return 'heavy';
        if (B.phase >= 2 && r < 0.26) return 'borrow';
        if (r < 0.46) return 'rank';
        if (r < 0.76) return 'strike';
        if (r < 0.9) return 'heavy';
        return 'charge';
      }
      if (B.charged) return 'heavy';
      if (foePct() < 0.5 && !B.foeNobleDone && r < 0.42) return 'noble';
      if (r < 0.16) return 'charge';
      if (r < 0.44) return 'heavy';
      return 'strike';
    }

    B.intent = pickIntent();
    say('你与 ' + nameOf() + ' 对上了。', 'head');
    if (bond) say('你身后的从者往前站了半步。（羁绊 LV.' + bond + '）', '');

    function checkOver() {
      if (B.foeHp <= 0 && !B.over) { B.foeHp = 0; B.over = 'win'; }
      if (B.myHp <= 0 && !B.over) {
        if (bond >= 3 && !B.standUsed) {
          B.standUsed = true;
          B.myHp = Math.max(1, Math.round(B.myHpMax * 0.25));
          pushFx({ t: 'stand' });
          say('那一击落下来的时候，有人替你把肩膀按住了。——羁绊 LV.3：替身（本场一次）', 'good');
        } else {
          B.myHp = 0; B.over = 'lose';
        }
      }
    }

    /* 伤害折减：架住 / 盟友 / 读招的当回合护体 */
    function mitigate(dm, extraMul) {
      var m = extraMul == null ? 1 : extraMul;
      if (B.guardHeld) m *= CFG.bondGuard[B.bond] || 0.5;
      if (B.evade) m *= B.evade;
      if (B.allyCount > 0 && rnd() < Math.min(0.55, CFG.allyBlock * B.allyCount)) {
        m *= 0.4;
        say('有人从侧面顶了一下，替你吃掉大半。', '');
        pushFx({ t: 'allyBlock' });
      }
      /* SAN 掉档 → 反应变慢，挨得更实 */
      var sf = (G.Engine.SAN_FX || [])[G.Engine.sanTierNow ? G.Engine.sanTierNow() : 0];
      var extra = sf ? sf.foeDmg : 0;
      return Math.max(1, Math.round(dm * m) + extra);
    }

    function beastPhaseCheck() {
      if (!isBeast || B.over) return;
      var pct = foePct();
      var want = pct <= 0.33 ? 3 : pct <= 0.66 ? 2 : 1;
      if (want > B.phase) {
        B.phase = want;
        pushFx({ t: 'phase', n: want });
        say(want === 2 ? '它把名次表翻了一页。整栋楼的灯一起闪了一下。'
          : '它开始念名字。念得很平，一个接一个。', 'bad');
      }
    }

    /* 敌方一手 */
    function foeTurn() {
      if (B.over) return;
      var intent = B.intent;
      var pct = 1;
      if (intent === 'strike') {
        if (rnd() < 0.62) {
          var dm = d(6) + 1 + Math.floor(scale * 1.5);
          dm = mitigate(dm);
          B.myHp -= dm;
          say(foe.cls + ' 打中了你，HP −' + dm + '。', 'dmg');
          pushFx({ t: 'hurt', dmg: dm, heavy: false });
        } else {
          say(foe.cls + ' 的攻击落空了。', '');
          pushFx({ t: 'miss', who: 'foe' });
        }
      } else if (intent === 'heavy') {
        var acc = B.charged ? 0.78 : 0.52;
        if (rnd() < acc) {
          var dm2 = d(6) + d(6) + 2 + Math.floor(scale * 2) + (B.charged ? 6 : 0);
          dm2 = mitigate(dm2);
          B.myHp -= dm2;
          say((B.charged ? '蓄满的一击砸下来' : '它用了一次很重的手') + '，HP −' + dm2 + '。', 'dmg');
          pushFx({ t: 'hurt', dmg: dm2, heavy: true });
        } else {
          say('重手擦着你过去，砸在墙上。', '');
          pushFx({ t: 'miss', who: 'foe' });
        }
        B.charged = false;
      } else if (intent === 'charge') {
        B.charged = true;
        say(foe.cls + ' 退回半步，把气吸满。（下一手会很重）', 'bad');
        pushFx({ t: 'charge' });
      } else if (intent === 'noble') {
        B.foeNobleDone = true;
        var np = (foe.noble && foe.noble[0]) || ['宝具', '—', '—'];
        say(nameOf() + ' 展开了宝具——' + np[0] + '。', 'bad');
        var dm3 = d(8) + d(8) + d(8);
        dm3 = mitigate(dm3, 0.8);
        B.myHp -= dm3;
        say('你被卷了进去，HP −' + dm3 + '。', 'dmg');
        pushFx({ t: 'hurt', dmg: dm3, heavy: true });
        B.onEvent('foeNoble', { foe: foe, name: np[0] });
      } else if (intent === 'borrow') {
        var bid = (B.presentServants && B.presentServants.length)
          ? B.presentServants[Math.floor(rnd() * B.presentServants.length)] : null;
        var bsv = bid ? G.servant(bid) : null;
        var bnp = (bsv && bsv.noble && bsv.noble[0]) || ['宝具', '—', '—'];
        say('那块屏里伸出一只手——' + (bsv ? bsv.cls : '别人') + ' 的宝具：' + bnp[0], 'bad');
        var bdm = d(8) + d(8) + 6;
        bdm = mitigate(bdm, 0.85);
        B.myHp -= bdm;
        say('你被卷进别人的宝具里，HP −' + bdm + '。', 'dmg');
        pushFx({ t: 'hurt', dmg: bdm, heavy: true });
        B.onEvent('foeNoble', { foe: bsv || foe, name: bnp[0] });
      } else if (intent === 'rank') {
        say('它在念名次。你听见自己的名字被念到，然后是一个数字。', 'bad');
        var rdm = d(4) + 2;
        rdm = mitigate(rdm, 0.9);
        B.myHp -= rdm;
        B.stagger = clamp(B.stagger + 1, 0, CFG.staggerMax);   // 被点名也会露出破绽（对它）
        say('HP −' + rdm + '，但你记住了它念数字时的停顿。', 'dmg');
        pushFx({ t: 'hurt', dmg: rdm, heavy: false });
      }
      B.turn++;
      B.guardHeld = false;
      B.evade = 0;
      B.allyTurn++;
      /* 盟友补刀 */
      if (B.allyCount > 0 && B.allyTurn % CFG.allyDmgEvery === 0 && !B.over) {
        var ad = d(6) + Math.floor(B.allyCount * 1.5);
        B.foeHp -= ad;
        say('盟友压了上去，' + foe.cls + ' HP −' + ad + '。', 'good');
        pushFx({ t: 'allyHit', dmg: ad });
      }
      beastPhaseCheck();
      B.intent = pickIntent();
      /* 读招读到的是「下一手」：当回合看到它这一手是什么，下一手的预兆也跟着解明。
         不这么做的话，面板上的预兆永远比玩家刚看清的那一手晚一步。 */
      B.intentKnown = !!B.peek;
      B.peek = false;
      checkOver();
    }

    /* ---------- 玩家动作 ---------- */
    B.act = function (kind) {
      if (B.over) return B;
      B.fx = [];
      var bonus = B.bonus;
      B.bonus = 0;
      B.lastAction = kind;

      if (kind === 'attack') {
        var target = skillOf('战斗') + CFG.attackBase + bonus + CFG.bondCheck[B.bond] + (B.stagger >= CFG.staggerMax ? 40 : 0);
        target = clamp(target, 1, 99);
        var r = d(100);
        if (r <= target) {
          var dmg = d(8) + Math.floor(G.Engine.state().s.str / 20) + CFG.bondDmg[B.bond];
          if (G.Engine.state().s.flags.perfectAffinity) dmg += 3;
          /* 精神掉档：手会抖，打不实 */
          var sfx2 = (G.Engine.SAN_FX || [])[G.Engine.sanTierNow ? G.Engine.sanTierNow() : 0];
          if (sfx2 && sfx2.dmg) dmg = Math.max(1, dmg - sfx2.dmg);
          var crit = r <= Math.floor(target / 5);
          if (B.stagger >= CFG.staggerMax) { crit = true; B.stagger = 0; }
          if (crit) {
            dmg += 6;
            say('破绽被抓住了——' + foe.cls + ' HP −' + dmg + '。', 'good');
            pushFx({ t: 'attack', dmg: dmg, crit: true });
          } else {
            say('命中，HP −' + dmg + '。', '');
            pushFx({ t: 'attack', dmg: dmg, crit: false });
          }
          B.foeHp -= dmg;
        } else if (r >= 96) {
          say('你扑空了，还把自己绊了一下（大失败）。', 'bad');
          B.myHp -= 2;
          pushFx({ t: 'fumble' });
        } else {
          say('没有打中。', '');
          pushFx({ t: 'miss', who: 'me' });
        }
        B.mp = Math.min(B.mpMax, B.mp + CFG.mpRegen.attack);
      } else if (kind === 'guard') {
        B.guard = true; B.guardHeld = true; B.bonus = 15;
        B.mp = Math.min(B.mpMax, B.mp + CFG.mpRegen.guard);
        say('你压低重心，架住了。（本回合减伤 ' + Math.round((1 - CFG.bondGuard[B.bond]) * 100) + '%，下次命中 +15）', '');
        pushFx({ t: 'guard' });
      } else if (kind === 'observe') {
        B.intentKnown = true;
        B.peek = true;                 // 下一手的预兆也解明
        B.bonus = 18;
        B.stagger = clamp(B.stagger + 1, 0, CFG.staggerMax);
        B.evade = 0.4;                 // 看清了就会躲：当回合吃到的伤害只剩四成
        B.mp = Math.min(B.mpMax, B.mp + CFG.mpRegen.observe);
        say('你不动，只看它。它这一手是：' + INTENT_NAME[B.intent] + '。（破绽 ' + B.stagger + '/3）', 'good');
        pushFx({ t: 'observe', intent: B.intent });
      } else if (kind === 'noble') {
        var cost = Math.max(6, CFG.nobleCost - B.bond * CFG.nobleCostBondCut);
        if (B.mp < cost) { say('MP 不够，宝具发不出来。', 'bad'); pushFx({ t: 'nomp' }); return B; }
        B.mp -= cost;
        B.myNobleDone++;
        var np2 = (me.noble && me.noble[B.myNobleDone - 1]) || (me.noble && me.noble[0]) || ['宝具', '—', '—'];
        say('真名解放——' + np2[0], 'noble');
        var nd = d(8) + d(8) + 6 + B.bond * 2;
        if (B.stagger >= CFG.staggerMax) { nd += 8; B.stagger = 0; }
        B.foeHp -= nd;
        say('光把走廊照白了。' + foe.cls + ' HP −' + nd + '。', 'good');
        pushFx({ t: 'noble', dmg: nd });
        B.onEvent('myNoble', { me: me, name: np2[0] });
      } else if (kind === 'flee') {
        var st0 = G.Engine.state();
        var chance = clamp(38 + st0.s.dex * 0.5 + (1 - foePct()) * 22 + B.bond * 4, 25, 92);
        if (d(100) <= chance) {
          B.over = 'flee';
          say('你退进了楼梯间，脚步声跟到第三层就停了。', '');
          pushFx({ t: 'flee', ok: true });
        } else {
          say('退路被堵住了。', 'bad');
          pushFx({ t: 'flee', ok: false });
          B.guardHeld = false;
        }
      }
      beastPhaseCheck();
      checkOver();
      if (!B.over) foeTurn();
      return B;
    };

    B.tell = function () {
      return { text: B.intentKnown ? ('下一手：' + INTENT_NAME[B.intent]) : (TELL[B.intent] || ''), known: B.intentKnown };
    };

    B.state = function () {
      var cost = Math.max(6, CFG.nobleCost - B.bond * CFG.nobleCostBondCut);
      return {
        foeName: nameOf(), foeHp: Math.max(0, B.foeHp), foeHpMax: B.foeHpMax,
        myHp: Math.max(0, B.myHp), myHpMax: B.myHpMax, mp: Math.max(0, B.mp), mpMax: B.mpMax,
        san: B.san, turn: B.turn, over: B.over, log: B.log,
        canNoble: B.mp >= cost, nobleCost: cost,
        stagger: B.stagger, staggerMax: CFG.staggerMax,
        bond: B.bond, phase: B.phase, intent: B.intent, intentKnown: B.intentKnown,
        tell: B.tell ? B.tell().text : '',
        guard: B.guardHeld, allyCount: B.allyCount,
        fx: B.fx.slice()
      };
    };

    /* 战后结算：写回存档 */
    B.settle = function () {
      var s = G.Engine.state();
      var out = { sanLoss: 0, clue: 0, died: false, night: B.night };
      var ratio = B.myHpMax > 0 ? Math.round(Math.max(0, B.myHp) / B.myHpMax * s.s.hpMax) : B.myHp;
      s.s.hp = Math.max(0, Math.min(s.s.hpMax, ratio));
      s.s.mp = Math.max(0, Math.min(s.s.mpMax, B.mp));
      if (B.over === 'win' && B.isBeast) {
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
        var cur = s.s.clues[opts.foeId] || 0;
        /* 夜巡那一场：赢了多记一张脸（+1 级，封顶 5），并且更容易并肩记住 */
        var gain = B.night ? 1 : 0;
        var nv = Math.min(5, Math.max(cur, (opts.clueLv || 3) + gain));
        s.s.clues[opts.foeId] = nv;
        out.clue = nv;
        out.sanLoss = B.night ? d(6) : d(4);
        s.s.san = Math.max(0, s.s.san - out.sanLoss);
        s.s.flags['beat_' + opts.foeId] = true;
        /* 战后喘息：赢下来的人也不该带着 1 点 HP 走回教室 */
        var hpGain = Math.ceil(s.s.hpMax * 0.35), mpGain = Math.ceil(s.s.mpMax * 0.45);
        var hpBefore = s.s.hp, mpBefore = s.s.mp;
        s.s.hp = Math.min(s.s.hpMax, s.s.hp + hpGain);
        s.s.mp = Math.min(s.s.mpMax, s.s.mp + mpGain);
        if (s.s.hp > hpBefore || s.s.mp > mpBefore) {
          G.Engine.addLog('你靠着墙喘了一会儿。HP +' + (s.s.hp - hpBefore) + '，MP +' + (s.s.mp - mpBefore) + '。');
        }
        G.Engine.addLog('你打赢了 ' + B.foe.cls + '，情报升到 ' + G.Engine.roman(nv) + '。');
        /* 打下来的经验值：一场硬仗换一点羁绊或一点属性 */
        if (B.bond < 3 && rnd() < (B.night ? 0.72 : 0.5)) {
          s.s.bond = B.bond + 1;
          G.Engine.addLog('你们并肩打完了这一场。羁绊 LV.' + s.s.bond + '。');
        }
      } else if (B.over === 'lose') {
        out.sanLoss = d(10) + 2;
        s.s.san = Math.max(0, s.s.san - out.sanLoss);
        s.s.command = Math.max(0, s.s.command - 1);
        G.Engine.addLog('你输了。令咒替你挡了一下（令咒 −1，SAN −' + out.sanLoss + '）。');
        if (s.s.san <= 0) { out.died = true; s.s.alive = 0; }
      } else if (B.over === 'flee') {
        /* 撤退不再免费：脱身要付魔力，情报一点都带不走。
           以前撤退只有 SAN −1D3，成功率又高，等于一个随时能按的逃生键。 */
        out.sanLoss = d(3);
        s.s.san = Math.max(0, s.s.san - out.sanLoss);
        var mpLost = Math.ceil(s.s.mp * 0.4);
        s.s.mp = Math.max(0, s.s.mp - mpLost);
        out.mp = mpLost;
        G.Engine.addLog('你从 ' + B.foe.cls + ' 手里脱身了。MP −' + mpLost + '。');
      }
      if (!out.died && s.s.hp <= 0) s.s.hp = 1;   // 没死就留一口气，不然下一场直接躺
      B.san = s.s.san;
      G.Engine.save();
      return out;
    };

    return B;
  }

  window.GRAIL_BATTLE = { create: create, skillOf: skillOf, CFG: CFG, INTENT_NAME: INTENT_NAME };
})();
