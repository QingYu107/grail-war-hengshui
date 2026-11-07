# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()

old = """    $('btn-start').onclick = function () {
      if (has && !window.confirm('开始新的档案会覆盖上一次的记录。确定？')) return;
      E.clearSave(); ui.q = 0; ui.answers = {};
      audio('quiz'); screen('screen-quiz'); renderQuiz();
    };"""
new = """    var confirmTick = 0;
    $('btn-start').onclick = function () {
      // 不用原生 confirm（部分内置浏览器会静默拦截），改成按钮二次确认
      if (has && confirmTick === 0) {
        confirmTick = 1;
        $('btn-start').textContent = '再点一次 · 覆盖旧档案';
        $('btn-start').classList.add('btn--red');
        setTimeout(function () {
          confirmTick = 0;
          $('btn-start').textContent = '拆封档案';
          $('btn-start').classList.remove('btn--red');
        }, 4000);
        return;
      }
      E.clearSave(); ui.q = 0; ui.answers = {};
      audio('quiz'); screen('screen-quiz'); renderQuiz();
    };"""
assert old in u
u = u.replace(old, new)

# 关于页：改成页内浮层，不用 window.open
old2 = """  function showAbout() {
    var w = window.open('', '_blank');
    if (!w) { toast('浏览器拦截了弹窗'); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>档案说明</title>' +
      '<body style="background:#e8e0cc;color:#1c1a16;font-family:Songti SC,SimSun,serif;padding:40px;max-width:720px;margin:0 auto;line-height:2">' +
      '<h1 style="letter-spacing:.06em">档案说明</h1><hr>' +
      '<p>本作改编自《圣杯战争·衡水：凌晨四点的圣杯》（COC 7th 非官方同人模组），单人化处理：七组御主中，其余六组由系统扮演。</p>' +
      '<p>六道登记题决定你的从者与职介线。相性分为 A+ / A / C / E 四档，取决于你的答案命中了从者几个关键词。</p>' +
      '<p>七天内，你只有每个时段一次行动。SAN 是唯一的血条，曝光度满 10 会终止战争，兽的进度条每过一夜涨一格。</p>' +
      '<p>结局共 11 个。判定顺序：兽满 → 曝光满 → 门开 → 归因 → 全灭 → 断电 → 兽饿死 → 七人齐 → 许愿。</p>' +
      '<p style="color:#6b6355;font-size:13px">本作为架空谐仿创作。文中所有人物、机构、事件均为虚构处理，与现实中的任何个人、团体、学校无关。</p>' +
      '</body>');
  }"""
new2 = """  function showAbout() {
    var old = document.getElementById('about-layer');
    if (old) old.remove();
    var layer = document.createElement('div');
    layer.id = 'about-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(9,11,10,.72);display:flex;align-items:center;justify-content:center;padding:20px';
    layer.innerHTML = '<div style="background:#f4ecda;color:#1c1a16;max-width:720px;width:100%;max-height:84vh;overflow:auto;padding:32px 34px;font-family:var(--serif);line-height:2;box-shadow:0 20px 60px rgba(0,0,0,.5)">' +
      '<div style="font-family:var(--hei);font-size:11px;letter-spacing:.3em;color:#8c2b22;margin-bottom:10px">档案说明</div>' +
      '<h2 style="margin:0 0 12px;font-size:24px">这份东西怎么玩</h2>' +
      '<p>改编自《圣杯战争·衡水：凌晨四点的圣杯》（COC 7th 非官方同人模组），单人化处理：七组御主中，其余六组由系统扮演。</p>' +
      '<p>六道登记题决定你的从者、御主卡与职介线。相性分 A+ / A / C / E 四档，取决于答案命中了从者几个关键词。</p>' +
      '<p>序章加七天，每个时段一次行动。SAN 是唯一的血条，曝光度满 10 会终止战争，兽的进度条每过一夜涨一格——当天你踩过刹车就不涨。</p>' +
      '<p>结局 11 个，判定顺序：兽满 → 曝光满 → 门开 → 归因 → 全灭 → 断电 → 兽饿死 → 七人齐 → 许愿。</p>' +
      '<p style="color:#6b6355;font-size:13px">架空谐仿创作，人物与机构均为虚构处理，与现实中的任何个人、团体、学校无关。</p>' +
      '<button class="btn btn--solid" id="about-close" style="margin-top:10px">知道了</button></div>';
    document.body.appendChild(layer);
    layer.onclick = function (e) { if (e.target === layer) layer.remove(); };
    document.getElementById('about-close').onclick = function () { layer.remove(); };
  }"""
assert old2 in u
u = u.replace(old2, new2)
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
