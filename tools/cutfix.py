# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\data\story_a.js'
s = io.open(p, encoding='utf-8').read()

# d3a2 写别人：失败不加兽，成功也不加（这一格留给“不喂养”）
s = s.replace("fx: { san: -1, flag: 'inventedStudent', beast: 1, log: '你写了一个不存在的同学，写得比谁都真。' }",
              "fx: { san: -1, flag: 'inventedStudent', log: '你写了一个不存在的同学，写得比谁都真。' }")
# d3b3 画屏：失败也踩住刹车
s = s.replace("""            fail: {
              text: [
                '你画得很差。监考老师路过，停下来看了一眼，说：「画得挺像。」',
                '「像什么？」',
                '他没有回答，走开了。'
              ],
              fx: { san: -1 }
            }""",
"""            fail: {
              text: [
                '你画得很差。监考老师路过，停下来看了一眼，说：「画得挺像。」',
                '「像什么？」',
                '他没有回答，走开了。',
                '你把那张纸折起来塞进口袋。走出考场的时候，口袋那边有点硌。'
              ],
              fx: { san: -1, beast: -2, flag: 'counterBackwards' }
            }""")
# d4c1 直面名次兽：失败也成功拒绝
s = s.replace("""              fx: { san: -6, beast: 1, demerit: -1, flag: 'registered', log: '你回答了它。你被登记了一次。' }""",
"""              fx: { san: -6, demerit: -1, flag: 'registered', beast: -2, log: '你回答了它，但你把它记下来了。' }""")
io.open(p,'w',encoding='utf-8').write(s)

p2 = r'E:\dsh-workspace\grail-war\js\data\story_b.js'
t = io.open(p2, encoding='utf-8').read()
# d6b1 走廊擦字：失败也擦掉
t = t.replace("""              fx: { san: -6, beast: 1, demerit: -1, flag: 'registeredTwice', log: '走廊尽头有个穿同样校服的人，问你「你是第几」。' }""",
"""              fx: { san: -6, demerit: -1, beast: -2, flag: 'registeredTwice', log: '走廊尽头有个穿同样校服的人，问你「你是第几」，你没有回答。' }""")
# d6b3 拔广播线：失败也算碰到线
t = t.replace("""              fx: { demerit: -2, exposure: 1, san: -2, flag: 'metZhao' }""",
"""              fx: { demerit: -1, san: -2, flag: 'metZhao', beast: -1 }""")
io.open(p2,'w',encoding='utf-8').write(t)
print('ok')
