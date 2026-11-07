# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\data\quiz.js'
s = io.open(p, encoding='utf-8').read()
pairs = [
 ("servant: { lancer: 2, foreigner: 2, berserker: 1 }, route: { flow: 2 }", "servant: { lancer: 3, foreigner: 1 }, route: { flow: 2 }"),
 ("servant: { berserker: 2, foreigner: 1, saber: 1 }, route: { coop: 3 }", "servant: { saber: 2, berserker: 1 }, route: { coop: 3 }"),
 ("servant: { foreigner: 2, berserker: 2, caster: 1 }, route: { coop: 3 }", "servant: { foreigner: 1, berserker: 2, caster: 1 }, route: { coop: 3 }"),
 ("servant: { foreigner: 3, ruler: 1 }, route: { flow: 3 }", "servant: { foreigner: 2, ruler: 1 }, route: { flow: 3 }"),
 ("servant: { archer: 2, rider: 2 }, route: { coop: 1 }", "servant: { archer: 1, rider: 2, saber: 1 }, route: { coop: 1 }"),
 ("servant: { assassin: 2, berserker: 2 }, route: { assassin: 2 }", "servant: { assassin: 2, rider: 1, berserker: 1 }, route: { assassin: 2 }"),
 ("servant: { archer: 2, ruler: 2, caster: 1 }, route: { intel: 2, coop: 1 }", "servant: { ruler: 2, caster: 1, archer: 1 }, route: { intel: 2, coop: 1 }"),
 ("servant: { foreigner: 3, lancer: 1 }, route: { flow: 3 }", "servant: { foreigner: 2, lancer: 1 }, route: { flow: 3 }"),
 ("servant: { ruler: 3, archer: 1 }, route: { rule: 3, intel: 1 }", "servant: { ruler: 2, archer: 1 }, route: { rule: 3, intel: 1 }"),
 ("servant: { caster: 3, lancer: 1 }, route: { rule: 1 }", "servant: { caster: 3, lancer: 1 }, route: { rule: 1 }"),
]
for a, b in pairs:
    if a in s:
        s = s.replace(a, b)
    else:
        print('MISS', a[:40])
io.open(p, 'w', encoding='utf-8').write(s)

p2 = r'E:\dsh-workspace\grail-war\js\engine.js'
e = io.open(p2, encoding='utf-8').read()
e = e.replace("return (map[keyword] || []).some(function (t) { return pe[t]; });",
              "return (map[keyword] || []).some(function (t) { return (pe[t] || 0) >= 2; });")
io.open(p2, 'w', encoding='utf-8').write(e)
print('done')
