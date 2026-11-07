# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\avg.js'
s = io.open(p, encoding='utf-8').read()
s = s.replace("'#ff0000'", "(cls === 'fx-summon' ? '#f4ecda' : '#0b0c0a')")
# 兜底：文字颜色也写死，避免 CSS 未生效时看不清
s = s.replace("'<div class=\"kick\">BEAST Ⅳ ／ 人类恶</div>' +", "'<div class=\"kick\" style=\"color:#b23a2e\">BEAST Ⅳ ／ 人类恶</div>' +")
s = s.replace("'<div class=\"t1\">' + (data.title || '攀比') + '</div>' +", "'<div class=\"t1\" style=\"color:#e8e0cc\">' + (data.title || '攀比') + '</div>' +")
s = s.replace("'<div class=\"t2\">显 现</div>' +", "'<div class=\"t2\" style=\"color:#b23a2e\">显 现</div>' +")
s = s.replace("'<div class=\"t3\">' + (data.sub || 'ARE YOU THE FIRST?') + '</div></div>';", "'<div class=\"t3\" style=\"color:rgba(232,224,204,.6)\">' + (data.sub || 'ARE YOU THE FIRST?') + '</div></div>';")
io.open(p,'w',encoding='utf-8').write(s)
print('ok')
