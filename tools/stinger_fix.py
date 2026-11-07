# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\ui.js'
u = io.open(p, encoding='utf-8').read()
if 'var STINGER' not in u:
    block = """  /* ---------- 关键节点演出 ---------- */
  var STINGER = {
    p2: { kind: 'broadcast', data: { lines: ['圣杯战争，第七次，开始。', '参赛者七名。', '……孙笑川。'] } },
    p3: { kind: 'summon', data: {} },
    d3d: { kind: 'roll', data: {} },
    d5c: { kind: 'impact', data: { title: '施工事故', sub: '无人员伤亡 · 校门东侧 · 正在调查' } },
    d6b: { kind: 'glitch', data: { msg: '走 廊 正 在 变 成 一 张 表' } },
    d7c: { kind: 'beast', data: { title: '攀比', sub: '你是第几？' } }
  };
  function stingerFor(slot, st) {
    var cfg = STINGER[slot.id];
    if (!cfg) return null;
    var key = 'fx_' + slot.id;
    if (st.s.flags[key]) return null;
    var data = {};
    Object.keys(cfg.data || {}).forEach(function (k) { data[k] = cfg.data[k]; });
    if (cfg.kind === 'summon') {
      var sv = G.servant(st.servantId);
      data.cls = sv.cls; data.name = sv.name;
    }
    if (cfg.kind === 'roll') {
      var pool = ['王梓', '李昊', '陈子豪', '刘思远', '赵一鸣', '周佳琪', '孙梦洁', '吴倩', '郑小北', '冯天乐', '蒋雨欣', '韩子墨', '曹宇', '谢欣然'];
      var arr = [];
      for (var i = 0; i < 12; i++) arr.push((i + 1) + '　' + pool[(i * 3 + 2) % pool.length]);
      data.names = arr;
    }
    return { cfg: cfg, data: data, key: key, st: st };
  }

  function reqOk(req) {"""
    u = u.replace("  function reqOk(req) {", block, 1)
io.open(p,'w',encoding='utf-8').write(u)
print('inserted', 'function stingerFor' in u)
