# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
s = io.open(p, encoding='utf-8').read()
start = s.find('  function boot() {')
end = s.find('  if (document.readyState', start)
assert start > 0 and end > start
new_boot = """  function fatal(e) {
    var d = document.getElementById('errbox') || (function () {
      var x = document.createElement('div'); x.id = 'errbox';
      x.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#8c2b22;color:#f4ecda;font:12px/1.7 monospace;padding:10px 14px;max-height:46vh;overflow:auto;white-space:pre-wrap';
      document.body.appendChild(x); return x;
    })();
    d.textContent += '[BOOT] ' + (e && e.message ? e.message : e) + '\\n' + ((e && e.stack) || '') + '\\n';
  }

  function devHook() {
    var qs = (location.hash || '') + (location.search || '');
    var m = qs.match(/dev=(\\w+)/);
    if (!m) return;
    var preset = { q1: 'A', q2: 'B', q3: 'A', q4: 'B', q5: 'A', q6: 'A' };
    ui.answers = preset;
    if (m[1] === 'quiz') { screen('screen-quiz'); renderQuiz(); }
    else if (m[1] === 'assign') { assign(); screen('screen-assign'); }
    else if (m[1] === 'ending') {
      E.create(preset);
      var st0 = E.state();
      st0.s.beast = 2; st0.s.exposure = 4; st0.s.flags.wishWin = true;
      st0.log = ['你许愿：让我赢。'];
      finish();
    } else if (m[1] === 'beat') {
      E.create(preset); screen('screen-game'); renderSlot();
      setTimeout(function () {
        var c = document.querySelector('#opts .choice');
        if (c) c.click();
      }, 200);
    } else if (m[1] === 'beast') {
      E.create(preset); screen('screen-game'); renderSlot();
      setTimeout(function () { window.GrailAVG.stinger('beast', { title: '攀比', sub: '你是第几？' }, function () {}); }, 400);
    } else if (m[1] === 'bond') {
      E.create(preset); screen('screen-game');
      E.state().s.slot = 2; renderSlot();
    } else { E.create(preset); screen('screen-game'); renderSlot(); }
  }

  function boot() {
    try { initTitle(); } catch (e) { fatal(e); }
    try { initAudioBar(); } catch (e) { fatal(e); }
    try { initDrawer(); } catch (e) { fatal(e); }
    try { screen('screen-title'); audio('title'); } catch (e) { fatal(e); }
    try { devHook(); } catch (e) { fatal(e); }
    window.addEventListener('beforeunload', function () { try { if (E.state()) E.save(); } catch (e) {} });
  }

"""
s = s[:start] + new_boot + s[end:]
io.open(p,'w',encoding='utf-8').write(s)
print('boot rewritten')
