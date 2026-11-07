# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\engine.js'
s = io.open(p, encoding='utf-8').read()
s = s.replace("luck: d(6) * 5, exposure: 1, demerit: 2, command: 3, beast: 0,",
              "luck: d(6) * 5, exposure: 1, demerit: 2, command: 3, beast: 0,")
s = s.replace("clues: {}, flags: {}, allies: 0, kills: 0, alive: 7, ap: 6, day: 1, slot: 0,",
              "clues: {}, flags: {}, allies: 0, kills: 0, alive: 7, ap: 6, day: 0, slot: 0,")
io.open(p,'w',encoding='utf-8').write(s)

p2 = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p2, encoding='utf-8').read()
u = u.replace("""      // 夜晚填格：这一天如果你什么都没踩住，就 +1
      if (st.s.beastCutDay !== prevDay) {""",
"""      // 夜晚填格：这一天如果你什么都没踩住，就 +1（序章之夜不计）
      if (prevDay >= 1 && st.s.beastCutDay !== prevDay) {""")
u = u.replace("""      } else {
        E.addLog('Day ' + prevDay + ' 结束：你踩住了刹车，兽没有动。');
      }""",
"""      } else if (prevDay >= 1) {
        E.addLog('Day ' + prevDay + ' 结束：你踩住了刹车，兽没有动。');
      }""")
io.open(p2,'w',encoding='utf-8').write(u)
print('ok')
