# -*- coding: utf-8 -*-
"""Download candidate images from Bing image search for each archive subject."""
import os, re, sys, json, time, urllib.parse, urllib.request, mimetypes

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(BASE, "assets", "img", "_raw")
os.makedirs(RAW, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

SUBJECTS = {
    "saber": ["科比 正脸 照片", "科比 采访 高清", "Kobe Bryant portrait"],
    "archer": ["张雪峰 正面 照片", "张雪峰 演讲 高清", "张雪峰 考研 照片"],
    "lancer": ["电棍 otto 侯国玉", "Otto 电棍 主播 照片", "侯国玉 直播"],
    "rider": ["小马云 范小勤 照片", "范小勤 近照", "小马云 采访"],
    "caster": ["马保国 照片", "马保国 太极 正面", "马保国 采访 高清"],
    "assassin": ["周立齐 照片", "窃格瓦拉 周立齐 采访", "周立齐 出狱"],
    "berserker": ["虎哥 刀哥 东北 照片", "虎哥 刀哥 整活", "沈阳 大街 虎哥"],
    "ruler": ["孙笑川 照片", "孙笑川 主播 正面", "孙笑川 直播"],
    "foreigner": ["丁真 照片", "丁真珍珠 正面", "丁真 理塘"],
    "scene_gate": ["县城 中学 校门 清晨", "寄宿制 高中 大门"],
    "scene_corridor": ["中学 教学楼 走廊 空", "学校 走廊 夜晚 灯"],
    "scene_exam": ["高考 考场 教室 桌子", "中学 教室 考试"],
    "scene_honor": ["学校 光荣榜 照片墙", "中学 走廊 光荣榜"],
    "scene_hill": ["北方 荒山 夜 坟", "乱葬岗 荒坡 枯树"],
    "scene_radio": ["学校 广播室 麦克风", "广播站 话筒 老式"],
    "scene_canteen": ["学校 食堂 后厨", "中学 食堂 打饭"],
    "scene_roof": ["学校 天台 夜 城市", "教学楼 天台 栏杆"],
    "scene_led": ["LED 电子屏 数字 夜", "倒计时 显示屏 红字"],
    "scene_track": ["中学 操场 跑道 清晨", "塑胶跑道 晨跑"],
    "scene_wall": ["学校 围墙 铁网", "高墙 铁丝网 校园"],
    "scene_dorm": ["学生 宿舍 上下铺", "寄宿 宿舍 夜"],
}

def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://cn.bing.com/"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def search(query, count=24):
    u = "https://cn.bing.com/images/async?q=%s&first=1&count=%d&mmasync=1" % (urllib.parse.quote(query), count)
    try:
        html = fetch(u).decode("utf-8", "ignore")
    except Exception as e:
        print("  search fail", query, e)
        return []
    urls = re.findall(r'murl&quot;:&quot;(.*?)&quot;', html)
    return [x.replace("\\/", "/") for x in urls]

def main():
    manifest = {}
    for key, queries in SUBJECTS.items():
        d = os.path.join(RAW, key)
        os.makedirs(d, exist_ok=True)
        have = len([f for f in os.listdir(d) if os.path.getsize(os.path.join(d, f)) > 20000])
        if have >= 6:
            print(key, "skip, have", have)
            manifest[key] = sorted(os.listdir(d))
            continue
        seen = set()
        idx = have
        for q in queries:
            if idx >= 10:
                break
            for url in search(q):
                if idx >= 10:
                    break
                base = url.split("?")[0]
                if base in seen:
                    continue
                seen.add(base)
                ext = os.path.splitext(base)[1].lower()
                if ext not in (".jpg", ".jpeg", ".png", ".webp"):
                    ext = ".jpg"
                p = os.path.join(d, "%02d%s" % (idx, ext))
                try:
                    data = fetch(url, 20)
                    if len(data) < 25000:
                        continue
                    with open(p, "wb") as f:
                        f.write(data)
                    idx += 1
                    print("  ok", key, idx, len(data), base[:90])
                except Exception as e:
                    pass
                time.sleep(0.15)
        manifest[key] = sorted(os.listdir(d))
        print(key, "->", len(manifest[key]))
    with open(os.path.join(RAW, "_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
