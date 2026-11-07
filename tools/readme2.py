# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\README.md'
s = io.open(p, encoding='utf-8').read()
s = s.replace("| 演出 | 打字机、场景推镜、闪白、抖动、故障字、**「人类恶 · 显现」全屏卡** |",
"""| 演出 | 打字机、场景推镜、闪白、抖动、故障字、**「人类恶 · 显现」全屏卡** |
| 情报演出 | 未解明的从者是**纯黑剪影**；情报 Ⅰ→Ⅴ 逐级去噪变实，Ⅲ 出真名、Ⅳ 出弱点、Ⅴ 出宝具 |""")
io.open(p,'w',encoding='utf-8').write(s)
print('readme ok')
