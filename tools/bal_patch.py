# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\tools\careful.js'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    if (mode === 'careful') { var s = opts.slice().sort(function (a, b) { return beastOf(a) - beastOf(b); }); o = s[0]; }""",
"""    if (mode === 'balanced') {
      var sb = opts.slice().sort(function (a, b) { return balOf(a) - balOf(b); }); o = sb[0];
    } else if (mode === 'careful') { var s = opts.slice().sort(function (a, b) { return beastOf(a) - beastOf(b); }); o = s[0]; }""")
s = s.replace("""function run(picks, mode) {""",
"""function balOf(o) {
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
function run(picks, mode) {""")
s = s.replace("""['A', 'B', 'C', 'D'].forEach(function (k) {
  var r = run([k, k, k, k, k, k], 'careful');
  console.log('careful', k, JSON.stringify(r));
});""",
"""['A', 'B', 'C', 'D'].forEach(function (k) {
  var r = run([k, k, k, k, k, k], 'balanced');
  console.log('balanced', k, JSON.stringify(r));
});""")
io.open(p,'w',encoding='utf-8').write(s)
print('ok')
