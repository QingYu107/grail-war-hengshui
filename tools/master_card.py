# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
old = """      '<dt>欲望</dt><dd>' + esc(st.four.desire || m.desire) + '</dd>' +
      '<dt>恐惧</dt><dd>' + esc(st.four.fear || m.fear) + '</dd>' +
      '<dt>口头禅</dt><dd>' + esc(st.four.catch || m.catch) + '</dd>' +
      '<dt>作息</dt><dd>' + esc(st.four.schedule || m.schedule) + '</dd>' +
      '<dt>秘密</dt><dd>' + esc(m.secret) + '</dd>' +
      '</dl><p style="margin:12px 0 0;font-family:var(--hei);font-size:11px;letter-spacing:.06em;color:var(--ink-3)">（本卡由登记表生成：模板取自最接近的预设卡，四问内容以你填写的为准。）</p></div>' +"""
new = """      '<dt>欲望</dt><dd>' + esc(m.desire) + '</dd>' +
      '<dt>恐惧</dt><dd>' + esc(m.fear) + '</dd>' +
      '<dt>口头禅</dt><dd>' + esc(m.catch) + '</dd>' +
      '<dt>作息</dt><dd>' + esc(m.schedule) + '</dd>' +
      '<dt>秘密</dt><dd>' + esc(m.secret) + '</dd>' +
      '</dl>' +
      '<div style="margin-top:14px;border-top:1px dashed var(--line);padding-top:10px">' +
      '<div style="font-family:var(--hei);font-size:10.5px;letter-spacing:.22em;color:var(--red);margin-bottom:6px">登记表自述（你写的）</div>' +
      '<dl class="kv">' +
      (st.four.desire ? '<dt>想要</dt><dd>' + esc(st.four.desire) + '</dd>' : '') +
      (st.four.fear ? '<dt>怕</dt><dd>' + esc(st.four.fear) + '</dd>' : '') +
      (st.four.catch ? '<dt>口头禅</dt><dd>' + esc(st.four.catch) + '</dd>' : '') +
      (st.four.schedule ? '<dt>作息</dt><dd>' + esc(st.four.schedule) + '</dd>' : '') +
      '</dl></div>' +
      '<p style="margin:12px 0 0;font-family:var(--hei);font-size:11px;letter-spacing:.06em;color:var(--ink-3)">（御主卡模板取自最接近的预设卡；相性判定只取你的答案。）</p></div>' +"""
if old in u:
    u = u.replace(old, new)
else:
    print('MISS')
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
