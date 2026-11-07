# -*- coding: utf-8 -*-
import io, re

pa = r'E:\dsh-workspace\grail-war\js\data\story_a.js'
pb = r'E:\dsh-workspace\grail-war\js\data\story_b.js'

A = [
    "fx: { san: -1, exposure: 1, clueAll: 1, log: '公告栏底下钉着七张证件照，眼睛那一栏是黑的。' }",
    "fx: { san: -2, exposure: 1, flag: 'noticedByChen' }",
    "fx: { san: -3, exposure: 1 }",
    "fx: { demerit: -2, san: -2, exposure: 1 }",
    "fx: { san: -3, exposure: 1, flag: 'borrowedParent' }",
]
B = [
    "fx: { demerit: -3, exposure: 1, san: -1 }",
    "fx: { demerit: -2, exposure: 1, san: -2, flag: 'metZheng' }",
    "fx: { san: -2, exposure: 1, beast: 1 }",
    "fx: { demerit: -2, exposure: 1, san: -2, flag: 'metZhao' }",
    "fx: { san: -3, allies: 0, exposure: 1 }",
]


def strip(path, needles):
    s = io.open(path, encoding='utf-8').read()
    for n in needles:
        repl = re.sub(r'exposure: \d+, ', '', n)
        if n in s:
            s = s.replace(n, repl)
            print('OK  ', n[:48])
        else:
            print('MISS', n[:48])
    io.open(path, 'w', encoding='utf-8').write(s)


strip(pa, A)
strip(pb, B)
print('done')
