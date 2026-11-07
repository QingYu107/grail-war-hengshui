# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\index.html'
s = io.open(p, encoding='utf-8').read()
if 'ERRBANNER' not in s:
    s = s.replace('<div id="app">', '''<script>
/* ERRBANNER: 运行期错误可视化（正式环境也保留，出问题时能看见原因） */
window.addEventListener('error', function (e) {
  var d = document.getElementById('errbox') || (function () {
    var x = document.createElement('div'); x.id = 'errbox';
    x.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#8c2b22;color:#f4ecda;font:12px/1.7 monospace;padding:8px 12px;max-height:40vh;overflow:auto;white-space:pre-wrap';
    document.body.appendChild(x); return x;
  })();
  d.textContent += '[JS] ' + (e.message || e.type) + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno + '\\n';
}, true);
</script>
<div id="app">''')
    io.open(p,'w',encoding='utf-8').write(s)
print('ok')
