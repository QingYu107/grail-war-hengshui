# -*- coding: utf-8 -*-
import io

p = r'E:\dsh-workspace\grail-war\js\ui.js'
s = io.open(p, encoding='utf-8').read()

s = s.replace("' / 共六问</div>'", "' / 共 ' + G.QUIZ.length + ' 问</div>'")

# E9 结局前播一次「人类恶 显现」
old = """    audio(e.tone === 'warm' ? 'ending_warm' : 'ending_dark');
    screen('screen-ending');"""
new = """    audio(e.tone === 'warm' ? 'ending_warm' : 'ending_dark');
    screen('screen-ending');
    if (id === 'E9' && window.GrailAVG) {
      window.GrailAVG.stinger('beast', { title: '满分', sub: '你是第几？' }, function () {});
    }"""
if old in s and "id === 'E9'" not in s:
    s = s.replace(old, new)

io.open(p, 'w', encoding='utf-8').write(s)
print('ui ok', 'G.QUIZ.length' in s)
