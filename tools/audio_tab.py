# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
u = u.replace("""      ['servant:从者', 'intel:情报', 'codex:词条', 'log:记录'].map(function (t) {""",
"""      ['servant:从者', 'intel:情报', 'codex:词条', 'audio:音源', 'log:记录'].map(function (t) {""")
anchor = """    // 记录
    var logs = (st.log || [])"""
audio_panel = """    // 音源
    var au = '';
    if (window.GrailAudio && window.GrailAudio.tracks) {
      au += '<h5>九骑 · 主题曲</h5>';
      window.GrailAudio.tracks.forEach(function (t) {
        var sv2 = G.servant(t.id);
        au += '<p><b>' + (sv2 ? sv2.cls + ' · ' + sv2.name : t.id) + '</b>　' + esc(t.title) +
          '　<span style="font-size:10.5px;color:var(--ink-3)">' + esc(t.artist || '') + '</span><br>' +
          '<span style="font-size:11.5px;color:var(--ink-3)">' + esc(t.note || '') + '</span><br>' +
          '<a href="' + t.links.netease + '" target="_blank" rel="noopener" style="color:var(--blue);font-size:11px">网易云</a>　' +
          '<a href="' + t.links.bilibili + '" target="_blank" rel="noopener" style="color:var(--blue);font-size:11px">B站</a></p>';
      });
      au += '<p style="font-size:11px;color:var(--ink-3);border-top:1px solid var(--line);padding-top:8px">' +
        '默认播放的是程序现场合成的环境音（离线可用）。把同名文件放进 assets/audio/，例如 saber.mp3、archer.m4a，' +
        '游戏会自动改用真实音源，失败则静默回落到合成音。</p>';
    } else {
      au = '<p>音频模块未加载。</p>';
    }
    html += '<div class="tab-panel ' + (ui.tab === 'audio' ? 'on' : '') + '" data-panel="audio">' + au + '</div>';

    // 记录
    var logs = (st.log || [])"""
if anchor in u:
    u = u.replace(anchor, audio_panel)
else:
    print('ANCHOR MISS')
io.open(p,'w',encoding='utf-8').write(u)
print('ok')
