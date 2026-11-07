# -*- coding: utf-8 -*-
import io

p = r'E:\dsh-workspace\grail-war\js\ui.js'
s = io.open(p, encoding='utf-8').read()

if 'SLOT_IMG' not in s:
    block = """  /* 每个时段配一张场景图（找不到就退回当日默认图） */
  var SLOT_IMG = {
    p1: 'assets/img/scene_honor.jpg', p2: 'assets/img/scene_corridor.jpg', p3: 'assets/img/scene_dorm.jpg',
    d1a: 'assets/img/scene_track.jpg', d1b: 'assets/img/scene_canteen.jpg', d1c: 'assets/img/scene_roofnight.jpg',
    d2a: 'assets/img/scene_classroom_night.jpg', d2b: 'assets/img/scene_canteen.jpg', d2c: 'assets/img/scene_dorm.jpg',
    d3a: 'assets/img/scene_exam.jpg', d3b: 'assets/img/scene_exam.jpg', d3c: 'assets/img/scene_exam.jpg', d3d: 'assets/img/scene_honor.jpg',
    d4a: 'assets/img/scene_gate.jpg', d4b: 'assets/img/scene_classroom_night.jpg', d4c: 'assets/img/scene_honor.jpg',
    d5a: 'assets/img/scene_dorm.jpg', d5b: 'assets/img/scene_track.jpg', d5c: 'assets/img/scene_gate.jpg',
    d6a: 'assets/img/scene_radio.jpg', d6b: 'assets/img/scene_beast.jpg', d6c: 'assets/img/scene_arena.jpg',
    d7a: 'assets/img/scene_gate.jpg', d7b: 'assets/img/scene_arena.jpg', d7c: 'assets/img/scene_led.jpg'
  };

  function slotImage(slot, day) {
    return (slot && SLOT_IMG[slot.id]) || (day && day.scene) || '';
  }

"""
    s = s.replace("  /* ---------- 关键节点演出 ---------- */", block + "  /* ---------- 关键节点演出 ---------- */", 1)

s = s.replace("""      ((slot.img || D.scene) ? '<div class="scene-img"><img src="' + (slot.img || D.scene) + '" alt="" onerror="this.parentNode.style.display=\\'none\\'"></div>' : '') +""",
"""      (slotImage(slot, D) ? '<div class="scene-img"><img src="' + slotImage(slot, D) + '" alt="" onerror="this.parentNode.style.display=\\'none\\'"></div>' : '') +""")

io.open(p, 'w', encoding='utf-8').write(s)
print('ok', 'slotImage' in s)
