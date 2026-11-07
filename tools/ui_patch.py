# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\assets\css\archive.css'
s = io.open(p, encoding='utf-8').read()
s = s.replace(".portrait {\n  position: relative; border: 1px solid var(--ink);",
              ".portrait {\n  position: relative; border: 1px solid var(--ink); min-height: 300px;")
s = s.replace(".side-portrait { border-bottom: 1px solid var(--line); }",
              ".side-portrait { border-bottom: 1px solid var(--line); position: relative; min-height: 220px; background: #15130f; }\n.side-portrait::before { content: \"NO PHOTO\"; position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--mono); font-size: 9px; letter-spacing: .3em; color: rgba(232,224,204,.3); }")
io.open(p,'w',encoding='utf-8').write(s)

p2 = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p2, encoding='utf-8').read()
# 御主档案补充说明
u = u.replace("""'<dt>秘密</dt><dd>' + esc(m.secret) + '</dd>' +
      '</dl></div>' +""",
"""'<dt>秘密</dt><dd>' + esc(m.secret) + '</dd>' +
      '</dl><p style="margin:12px 0 0;font-family:var(--hei);font-size:11px;letter-spacing:.06em;color:var(--ink-3)">（本卡由登记表生成：模板取自最接近的预设卡，四问内容以你填写的为准。）</p></div>' +""")
# 属性格补满 8 格
u = u.replace("""['str', 'con', 'dex', 'app', 'int', 'pow', 'edu'].map(function (k) {
        return '<div><b>' + st.s[k] + '</b><span>' + k.toUpperCase() + '</span></div>';
      }).join('') + '</div>' +""",
"""['str', 'con', 'dex', 'app', 'int', 'pow', 'edu'].map(function (k) {
        return '<div><b>' + st.s[k] + '</b><span>' + k.toUpperCase() + '</span></div>';
      }).join('') + '<div><b>' + st.s.luck + '</b><span>LUCK</span></div></div>' +""")
# 选项编号改为字母，并显示检定目标
u = u.replace("""      b.innerHTML = '<span class="k">' + (o.check ? '骰' : '·') + '</span><span>' + esc(o.label) +
        (o.sub ? '<span class="sub">' + esc(o.sub) + '</span>' : '') +
        (!chk.ok ? '<span class="sub" style="color:var(--red)">未解锁：' + esc(chk.why) + '</span>' : '') + '</span>';""",
"""      var letter = 'ABCD'[idx] || '·';
      var target = o.check ? '　目标 ' + E.clamp(E.skillValue(o.check.skill) + (o.check.bonus || 0), 1, 99) : '';
      b.innerHTML = '<span class="k">' + letter + '</span><span>' + esc(o.label) +
        (o.sub ? '<span class="sub">' + esc(o.sub) + target + '</span>' : '') +
        (!chk.ok ? '<span class="sub" style="color:var(--red)">未解锁：' + esc(chk.why) + '</span>' : '') + '</span>';""")
u = u.replace("    slot.options.forEach(function (o) {", "    slot.options.forEach(function (o, idx) {")
io.open(p2,'w',encoding='utf-8').write(u)
print('ok')
