# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\engine.js'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""  function skillValue(name) {
    var m = G.master(S.masterId);
    var v = null;""",
"""  var ATTR_OF = {
    '潜行': 'dex', '闪避': 'dex', '翻墙': 'dex', '妙手': 'dex', '锁匠': 'dex',
    '攀爬': 'str', '格斗': 'str', '战斗': 'str', '跑操耐力': 'str', '游泳': 'str', '跳跃': 'str',
    '电子学': 'int', '机械维修': 'int', '计算机使用': 'int', '聆听': 'int', '侦查': 'int',
    '图书馆使用': 'edu', '历史': 'edu', '神秘学': 'edu', '医学': 'edu', '会计': 'edu', '做题': 'edu',
    '话术': 'app', '说服': 'app', '威吓': 'app', '表演': 'app', '圆谎': 'app', '察言观色': 'app',
    '看人下菜': 'app', '短视频运营': 'app', '心理学': 'int', '精神分析': 'int', '急救': 'edu'
  };
  function skillValue(name) {
    var m = G.master(S.masterId);
    var v = null;""")
s = s.replace("""    if (v == null) v = 20;
    if (name === '意志') v = S.s.pow;""",
"""    if (v == null) v = 20;
    // 无对应技能时，用属性的一半兜底（COC 的「用属性代替」变体）
    var a = ATTR_OF[name];
    if (a) v = Math.max(v, Math.floor(S.s[a] / 2));
    if (name === '意志') v = S.s.pow;""")
io.open(p,'w',encoding='utf-8').write(s)
print('ok')
