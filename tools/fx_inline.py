# -*- coding: utf-8 -*-
import io

p = r'E:\dsh-workspace\grail-war\js\avg.js'
s = io.open(p, encoding='utf-8').read()

old = """    layer = document.createElement('div');
    layer.className = 'fx-layer ' + cls;
    document.body.appendChild(layer);"""
new = """    layer = document.createElement('div');
    layer.className = 'fx-layer ' + cls;
    // 兜底内联样式：即使 CSS 没加载，演出层也必须是全屏黑底
    layer.style.cssText = 'position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;' +
      'background:' + (cls === 'fx-summon' ? '#f4ecda' : '#0b0c0a') + ';';
    document.body.appendChild(layer);"""
assert old in s
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
