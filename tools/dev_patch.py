# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\index.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('<h1 class="title">圣杯战争 · 衡水</h1>', '<h1 class="title">圣杯战争·衡水</h1>')
io.open(p, 'w', encoding='utf-8').write(s)

p2 = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p2, encoding='utf-8').read()
u = u.replace("""  function boot() {
    initTitle(); initAudioBar(); initDrawer();
    screen('screen-title');
    audio('title');""",
"""  function boot() {
    initTitle(); initAudioBar(); initDrawer();
    screen('screen-title');
    audio('title');
    // 预览钩子（用于开发截图，不影响正常流程）
    var qs = location.search || '';
    var m = qs.match(/dev=(\\w+)/);
    if (m) {
      var preset = { q1: 'A', q2: 'B', q3: 'A', q4: 'B', q5: 'A', q6: 'A' };
      ui.answers = preset;
      if (m[1] === 'quiz') { screen('screen-quiz'); renderQuiz(); }
      else if (m[1] === 'assign') { assign(); screen('screen-assign'); }
      else { E.create(preset); screen('screen-game'); renderSlot(); }
    }""")
io.open(p2, 'w', encoding='utf-8').write(u)
print('ok')
