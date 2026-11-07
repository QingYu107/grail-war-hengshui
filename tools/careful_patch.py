# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\tools\careful.js'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""function beastOf(o) {
  var f = o.check ? (o.ok.fx || {}) : (o.fx || {});
  var f2 = o.check ? (o.fail.fx || {}) : {};
  return (f.beast || 0) + (f2.beast || 0);
}""",
"""function beastOf(o) {
  var f = o.check ? (o.ok.fx || {}) : (o.fx || {});
  var f2 = o.check ? (o.fail.fx || {}) : {};
  return ((f.beast || 0) + (f2.beast || 0)) * 2 + ((f.exposure || 0) + (f2.exposure || 0));
}""")
io.open(p,'w',encoding='utf-8').write(s)
print('ok')
