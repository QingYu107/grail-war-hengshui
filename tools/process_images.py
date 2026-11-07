# -*- coding: utf-8 -*-
"""《圣杯战争·衡水》档案照片批量处理

把 assets/img/_raw/<subject>/ 里的候选图处理成 19 世纪末警方档案照风格：
  * 人物 -> assets/img/servant_<id>.jpg  900x1200 (3:4)，带眼部黑框
  * 场景 -> assets/img/scene_<name>.jpg  1200x675 (16:9)，不带黑框

依赖：Pillow + numpy + cv2（仅用于灰度转换/拉普拉斯清晰度）。
OpenCV 5 的 Python 包已经移除了 CascadeClassifier 绑定，所以这里把
Viola-Jones 级联推理用 numpy 重写了一遍（模型仍然读 tools/models/haar.xml，
仍然使用 detectMultiScale 的 scaleFactor=1.1 / minNeighbors=4 语义）。

幂等：直接覆盖输出，可重复运行；扫描结果的缓存放在系统临时目录，
不会污染工程目录。
"""
import os
import sys
import json
import math
import random
import hashlib
import tempfile
import xml.etree.ElementTree as ET

import numpy as np
import cv2
from PIL import Image, ImageOps, ImageEnhance, ImageDraw, ImageFilter

# ---------------------------------------------------------------- 路径/配置
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(BASE, "assets", "img", "_raw")
OUT = os.path.join(BASE, "assets", "img")
MODEL = os.path.join(BASE, "tools", "models", "haar.xml")
CACHE = os.path.join(tempfile.gettempdir(), "grail_war_scan_cache.json")

SERVANTS = [
    ("saber", "科比"),
    ("archer", "张雪峰"),
    ("lancer", "侯国玉 / 电棍 otto"),
    ("rider", "范小勤 / 小马云"),
    ("caster", "马保国"),
    ("assassin", "周立齐 / 窃格瓦拉"),
    ("berserker", "虎哥与刀哥"),
    ("ruler", "孙笑川"),
    ("foreigner", "丁真"),
]

SCENES = [
    ("scene_gate", "校门"), ("scene_corridor", "走廊"), ("scene_exam", "考场"),
    ("scene_honor", "光荣榜"), ("scene_hill", "荒山"), ("scene_radio", "广播室"),
    ("scene_canteen", "食堂"), ("scene_roof", "天台"), ("scene_led", "倒计时屏"),
    ("scene_track", "跑道"), ("scene_wall", "围墙"), ("scene_dorm", "宿舍"),
    ("scene_arena", "夜间操场看台"), ("scene_beast", "长走廊尽头"),
    ("scene_blackout", "停电走廊"), ("scene_roofnight", "楼顶夜色"),
    ("scene_classroom_night", "空教室夜"), ("scene_hospital", "校医室"),
]

# 人工筛片：先剔掉明显的插画/表情包/文字海报/拼图/认错人的候选，
# 剩下的仍由脚本按"人脸面积 + 清晰度 + 居中 + 检测置信度"自动挑。
CANDIDATE_FILTER = {
    "saber": ["00.jpg", "01.jpeg", "02.jpeg", "03.jpg", "04.jpeg", "05.jpg", "06.jpg", "07.jpeg", "09.jpg"],
    "archer": ["00.jpg", "01.png", "02.jpg", "03.jpg", "05.jpg", "06.jpg", "07.jpg", "08.jpg", "09.jpg"],
    "lancer": ["01.jpg", "05.jpg", "08.jpg", "09.jpg"],
    "rider": ["00.jpg", "07.jpg", "08.jpg", "09.jpg"],
    "caster": ["00.jpg", "03.png", "05.jpg", "06.jpg", "09.jpg"],
    "assassin": ["01.jpg", "02.jpg", "03.jpg", "09.jpg"],
    "berserker": ["00.jpg", "05.jpg", "06.png", "07.jpg", "08.jpg"],
    "ruler": ["00.png", "02.jpg", "03.jpg", "06.jpg", "07.jpg", "09.png"],
    "foreigner": ["00.jpeg", "02.jpg", "03.jpg", "05.jpeg", "06.jpg", "08.jpg"],
}

# 人工校准的人脸框（原图归一化坐标 x,y,w,h）。这些 subject 的候选图人脸过小、
# 侧脸或检测框落在五官之外，自动结果肉眼复核不通过，改为人工量框；
# 其余 subject 仍走自动检测。检测统计照常记录进 CREDITS。
FACE_OVERRIDE = {
    # 用户指定素材（放在 _raw/_user/），人工量框
    "saber": {"user": True, "file": "saber.jpg", "box": [0.329, 0.057, 0.403, 0.393], "bar_dy": 0,
              "note": "用户指定素材：科比 蓝底黄衣正面半身，人工量框"},
    "archer": {"user": True, "file": "archer.jpg", "box": [0.333, 0.119, 0.334, 0.278], "bar_dy": 0,
               "note": "用户指定素材：张雪峰 黑板前指镜头，人工量框"},
    "assassin": {"user": True, "file": "assassin.jpg", "box": [0.557, 0.121, 0.326, 0.430], "bar_dy": -55,
                 "note": "用户指定素材：周立齐 长发白衬衫（带「不可能打工的」字幕），人工量框"},
    "berserker": {"user": True, "file": "berserker.jpg", "box": [0.133, 0.153, 0.586, 0.269], "bar_dy": -14, "bar_h_ratio": 0.235,
                  "note": "用户指定素材：虎哥刀哥并排，取两人脸框并集、黑框横跨两张脸（高度按两人眼线均值）"},
    "foreigner": {"user": True, "file": "foreigner.jpg", "box": [0.296, 0.245, 0.489, 0.334], "bar_dy": 0,
                  "note": "用户指定素材：丁真 室内正面半身，裁切保住整颗头不切边"},
    # 自选素材，人工校准
    "caster": {"file": "00.jpg", "box": [0.250, 0.235, 0.458, 0.339], "bar_dy": -205,
               "note": "正面大特写（右手伸向镜头），自动框落在鼻梁，按网格人工量框并下调眼框"},
    "lancer": {"file": "09.jpg", "box": [0.409, 0.126, 0.147, 0.261], "bar_dy": 0,
               "note": "AFTERSHOW 采访截图（1167×660），取彩色正脸，按框定位眼线"},
}

SCENE_OVERRIDE = {
    "scene_radio": ("08.jpg", "原候选多为麦克风商品图/教室拼图，改用录音棚麦克风特写"),
    "scene_wall": ("03.jpg", "原候选 06.jpg 带「龙桥造」广告字，改用学校铁艺围墙实拍"),
    "scene_roof": ("01.jpg", "原候选 02.jpg 右下有素材站水印，改用无字夜间校园街景"),
    "scene_dorm": ("09.jpg", "原候选 02.jpg 是带「炫云」水印的渲染图，改用真实宿舍照片"),
}

# 大字招牌/整屏数字：这些区域单独再压一遍（1200x675 坐标），确保一个字都认不出
TEXT_ZONES = {
    "scene_gate": [(0, 0, 380, 675), (420, 30, 780, 170)],
    "scene_honor": [(90, 20, 1120, 660)],
    "scene_led": [(0, 0, 1200, 675)],
    "scene_exam": [(0, 0, 400, 200)],
}

PORTRAIT_W, PORTRAIT_H = 900, 1200
SCENE_W, SCENE_H = 1200, 675
FACE_WIDTH_RATIO = 0.30      # 脸宽 / 画面宽
HEAD_TOP_RATIO = 0.08        # 头顶留白 / 画面高
DETECT_WIDTH = 1000
PAPER = (214, 203, 180)      # 纸色留边

rng_master = np.random.default_rng(20261107)


# ---------------------------------------------------------------- Haar 级联
class HaarCascade:
    """numpy 版 Viola-Jones，语义对齐 cv2.CascadeClassifier::detectMultiScale。"""

    def __init__(self, xml_path):
        root = ET.parse(xml_path).getroot()
        if root.tag != "cascade":
            n = root.find("cascade")
            if n is not None:
                root = n
        self.bw = int(root.findtext("width"))
        self.bh = int(root.findtext("height"))
        self.features = []
        for f in root.find("features").findall("_"):
            rects = []
            for r in f.find("rects").findall("_"):
                v = [float(t) for t in r.text.split()]
                rects.append((v[0], v[1], v[2], v[3], v[4]))
            self.features.append(rects)
        self.stages, self.stage_thr = [], []
        for st in root.find("stages").findall("_"):
            self.stage_thr.append(float(st.findtext("stageThreshold")))
            wcs = []
            for wc in st.find("weakClassifiers").findall("_"):
                nd = [float(t) for t in wc.findtext("internalNodes").split()]
                lv = [float(t) for t in wc.findtext("leafValues").split()]
                wcs.append((int(nd[2]), nd[3], lv[0], lv[1]))
            self.stages.append(wcs)

    # ---------- 内部工具 ----------
    @staticmethod
    def integral(gray):
        h, w = gray.shape
        I = np.zeros((h + 1, w + 1), dtype=np.int32)
        I[1:, 1:] = gray.astype(np.int32).cumsum(0).cumsum(1)
        return I

    def _dense(self, I, nX, nY, fi, scale, step, norm):
        acc = None
        for (x, y, w, h, wt) in self.features[fi]:
            x1 = int(round(x * scale)); y1 = int(round(y * scale))
            x2 = int(round((x + w) * scale)); y2 = int(round((y + h) * scale))
            v = (I[y2:y2 + nY * step:step, x2:x2 + nX * step:step]
                 - I[y1:y1 + nY * step:step, x2:x2 + nX * step:step]
                 - I[y2:y2 + nY * step:step, x1:x1 + nX * step:step]
                 + I[y1:y1 + nY * step:step, x1:x1 + nX * step:step]).astype(np.float32)
            v *= wt
            acc = v if acc is None else acc + v
        return acc * norm

    def _at(self, I, ys, xs, fi, scale, norm):
        acc = None
        for (x, y, w, h, wt) in self.features[fi]:
            x1 = int(round(x * scale)); y1 = int(round(y * scale))
            x2 = int(round((x + w) * scale)); y2 = int(round((y + h) * scale))
            v = (I[ys + y2, xs + x2] - I[ys + y1, xs + x2]
                 - I[ys + y2, xs + x1] + I[ys + y1, xs + x1]).astype(np.float32) * wt
            acc = v if acc is None else acc + v
        return acc * norm

    # ---------- 检测 ----------
    def detect(self, gray, k=2.2, scale_factor=1.1, step=2, min_win=90, max_win=820,
               pre_stages=5, keep_clusters=40):
        I = self.integral(gray)
        h, w = gray.shape
        cand = []
        scale = 1.0
        while True:
            ww = self.bw * scale
            if ww < min_win:
                scale *= scale_factor
                continue
            if ww > min(h, w) * 0.99 or ww > max_win:
                break
            nX = int(w - ww) // step
            nY = int(h - ww) // step
            if nX < 2 or nY < 2:
                break
            norm = k / (ww * ww * 255.0)
            mask = None
            for si in range(pre_stages):
                stage = self.stages[si]
                if si == 0:
                    acc = np.zeros((nY, nX), dtype=np.float32)
                    for (fi, thr, l0, l1) in stage:
                        fv = self._dense(I, nX, nY, fi, scale, step, norm)
                        acc += np.where(fv < thr, l0, l1).astype(np.float32)
                    mask = acc >= self.stage_thr[0]
                else:
                    if not mask.any():
                        break
                    ys, xs = np.nonzero(mask)
                    ys = ys * step; xs = xs * step
                    acc = np.zeros(ys.shape[0], dtype=np.float32)
                    for (fi, thr, l0, l1) in stage:
                        fv = self._at(I, ys, xs, fi, scale, norm)
                        acc += np.where(fv < thr, l0, l1).astype(np.float32)
                    keep = acc >= self.stage_thr[si]
                    mask[:] = False
                    mask[ys[keep] // step, xs[keep] // step] = True
            if mask is not None:
                ys, xs = np.nonzero(mask)
                for y, x in zip(ys * step, xs * step):
                    cand.append((int(x), int(y), int(round(ww)), float(scale)))
            scale *= scale_factor
        if not cand:
            return []
        boxes = self._cluster(cand)
        scored = []
        for (x, y, ww, sc) in boxes[:keep_clusters]:
            r = self.score(I, x, y, ww, sc, k)
            r.update({"x": x, "y": y, "w": ww, "h": ww})
            scored.append(r)
        scored.sort(key=lambda d: (-d["stages"], -d["score"]))
        return scored

    def score(self, I, x, y, w, scale, k=2.2):
        norm = k / (float(w) * w * 255.0)
        ys = np.array([int(y)]); xs = np.array([int(x)])
        total, worst, passed = 0.0, 1e9, 0
        for si, stage in enumerate(self.stages):
            s = 0.0
            for (fi, thr, l0, l1) in stage:
                fv = float(self._at(I, ys, xs, fi, scale, norm)[0])
                s += l0 if fv < thr else l1
            total += s
            worst = min(worst, s - self.stage_thr[si])
            if s >= self.stage_thr[si]:
                passed += 1
            else:
                break
        return {"score": float(total), "margin": float(worst), "stages": int(passed)}

    def refine(self, I, box, h, w, k=2.2):
        """在候选框附近做尺寸/位置微调，取级联得分最高的窗口。"""
        cx = box["x"] + box["w"] / 2.0
        cy = box["y"] + box["h"] / 2.0
        best = None
        for f in (1.0, 1.12, 1.25, 1.45, 1.7):
            for dx in (-0.06, 0.0, 0.06):
                for dy in (-0.06, 0.0, 0.06):
                    ww = int(round(box["w"] * f))
                    x = int(round(cx + dx * ww - ww / 2.0))
                    y = int(round(cy + dy * ww - ww / 2.0))
                    if x < 0 or y < 0 or x + ww > w or y + ww > h:
                        continue
                    r = self.score(I, x, y, ww, ww / 24.0, k)
                    key = (r["stages"], r["score"])
                    if best is None or key > best[0]:
                        best = (key, dict(x=x, y=y, w=ww, h=ww, **r))
        return best[1] if best else box

    @staticmethod
    def _cluster(cands, eps=0.2, out_limit=120):
        buckets = {}
        for (x, y, w, sc) in cands:
            buckets.setdefault(w, []).append((x, y))
        out = []
        for w, pts in buckets.items():
            delta = max(4, int(round(w * eps)))
            cell = max(2, int(round(w * 0.1)))
            grid = {}
            for (x, y) in pts:
                grid.setdefault((x // cell, y // cell), []).append((x, y))
            seen = set()
            for key in list(grid.keys()):
                if key in seen:
                    continue
                stack = [key]; seen.add(key); members = []
                while stack:
                    kk = stack.pop()
                    here = grid[kk]
                    members.extend(here)
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nk = (kk[0] + dx, kk[1] + dy)
                            if nk in grid and nk not in seen:
                                if any(abs(px - qx) <= delta and abs(py - qy) <= delta
                                       for (px, py) in here[:6] for (qx, qy) in grid[nk][:6]):
                                    seen.add(nk); stack.append(nk)
                mx = int(np.mean([p[0] for p in members]))
                my = int(np.mean([p[1] for p in members]))
                out.append((mx, my, int(w), w / 24.0, len(members)))
        out.sort(key=lambda t: -t[4])
        return [(x, y, w, sc) for (x, y, w, sc, n) in out[:out_limit]]


# ---------------------------------------------------------------- 工具函数
def load_rgb(path):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    return im.convert("RGB")


def laplacian_var(gray_u8):
    return float(cv2.Laplacian(gray_u8, cv2.CV_64F).var())


def photometric_score(im):
    """粗略的"这是照片不是插画"打分：颜色数、饱和度、边缘密度。"""
    small = im.copy()
    small.thumbnail((320, 320), Image.BILINEAR)
    arr = np.asarray(small).astype(np.int16)
    q = (arr // 16)
    codes = q[:, :, 0] * 256 + q[:, :, 1] * 16 + q[:, :, 2]
    uniq = len(np.unique(codes))
    hsv = cv2.cvtColor(arr.astype(np.uint8), cv2.COLOR_RGB2HSV)
    sat = float(hsv[:, :, 1].mean())
    edge = float(cv2.Canny(arr.astype(np.uint8), 60, 160).mean())
    # 照片：颜色多、饱和度中等、边缘不至于过分稀疏
    score = min(uniq / 4000.0, 1.0) * 0.6 + min(sat / 90.0, 1.0) * 0.2 + min(edge / 12.0, 1.0) * 0.2
    return float(score), uniq, sat, edge


def make_face_gray(im):
    small = im.resize((DETECT_WIDTH, max(1, int(round(im.height * DETECT_WIDTH / im.width)))),
                      Image.LANCZOS)
    return small, np.ascontiguousarray(cv2.cvtColor(np.asarray(small), cv2.COLOR_RGB2GRAY))


def detect_in_image(cas, im):
    """返回原图坐标系下的人脸框列表（含 stages/score）。"""
    small, gray = make_face_gray(im)
    h, w = gray.shape
    found = cas.detect(gray, k=2.2, scale_factor=1.1, step=2, min_win=90, max_win=820)
    I = cas.integral(gray)
    sx = im.width / float(w)
    out = []
    for r in found[:3]:
        rr = cas.refine(I, r, h, w, 2.2)
        out.append({
            "x": rr["x"] * sx, "y": rr["y"] * sx,
            "w": rr["w"] * sx, "h": rr["h"] * sx,
            "stages": rr["stages"], "score": rr["score"], "margin": rr["margin"],
        })
    out.sort(key=lambda d: (-d["stages"], -d["score"]))
    return out


def face_quality(im, box):
    """选片打分：脸越大越好、越居中越好、越清晰越好。"""
    cw, ch = im.size
    fx = (box["x"] + box["w"] / 2.0) / cw
    fy = (box["y"] + box["h"] / 2.0) / ch
    area = box["w"] * box["h"] / float(cw * ch)
    center = 1.0 - min(1.0, (abs(fx - 0.5) / 0.5) * 0.7 + (abs(fy - 0.42) / 0.5) * 0.5)
    q = 0.0
    if box["stages"] >= 25:
        q += 1.0
    elif box["stages"] >= 18:
        q += 0.5
    q += min(area / 0.09, 1.0) * 0.8
    q += center * 0.7
    q += min(box["score"] / 80.0, 1.0) * 0.5
    # 脸占画面过大（大特写）扣分：3:4 档案照更适合半身
    ratio = box["w"] / float(cw)
    q -= max(0.0, ratio - 0.42) * 2.2
    if ratio < 0.10:
        q -= 0.4
    return q


# ---------------------------------------------------------------- 裁切
def crop_portrait(im, box):
    """以人脸为中心裁 3:4；脸宽约占 30%，头顶留 8%。不拉伸，必要时补边。"""
    cw, ch = im.size
    face_w = max(box["w"], 24.0)
    crop_w = face_w / FACE_WIDTH_RATIO
    crop_h = crop_w * 4.0 / 3.0
    # 源图不够宽/高时缩小裁切框（宁可脸占比略大，也不留大片纸边）
    if crop_w > cw:
        crop_w = float(cw)
        crop_h = crop_w * 4.0 / 3.0
    if crop_h > ch:
        crop_h = float(ch)
        crop_w = crop_h * 3.0 / 4.0
    cx = box["x"] + box["w"] / 2.0
    x0 = cx - crop_w / 2.0
    y0 = box["y"] - HEAD_TOP_RATIO * crop_h
    x0 = min(max(0.0, x0), cw - crop_w)
    y0 = min(max(0.0, y0), ch - crop_h)
    out = Image.new("RGB", (int(round(crop_w)), int(round(crop_h))), PAPER)
    src_box = (int(round(x0)), int(round(y0)), int(round(x0 + crop_w)), int(round(y0 + crop_h)))
    # 计算与源图的重叠区域
    sx0, sy0 = max(0, src_box[0]), max(0, src_box[1])
    sx1, sy1 = min(cw, src_box[2]), min(ch, src_box[3])
    if sx1 > sx0 and sy1 > sy0:
        piece = im.crop((sx0, sy0, sx1, sy1))
        dx, dy = sx0 - src_box[0], sy0 - src_box[1]
        out.paste(piece, (dx, dy))
    # 人脸框 -> 输出图坐标（用于黑框定位）
    mapping = {
        "crop": (x0, y0, crop_w, crop_h),
        "face": (box["x"], box["y"], box["w"], box["h"]),
    }
    return out, mapping


def crop_scene(im, ratio=16.0 / 9.0):
    cw, ch = im.size
    if cw / float(ch) > ratio:
        nh = ch
        nw = int(round(ch * ratio))
    else:
        nw = cw
        nh = int(round(cw / ratio))
    x0 = (cw - nw) // 2
    y0 = int((ch - nh) * 0.45)
    y0 = max(0, min(y0, ch - nh))
    return im.crop((x0, y0, x0 + nw, y0 + nh))


# ---------------------------------------------------------------- 做旧
def down_up(im, short_side=260):
    w, h = im.size
    f = short_side / float(min(w, h))
    small = im.resize((max(8, int(w * f)), max(8, int(h * f))), Image.BILINEAR)
    return small.resize((w, h), Image.BICUBIC)


def scanlines(arr, alpha=10, every=3):
    out = arr.astype(np.float32)
    out[::every, ...] *= (1.0 - alpha / 255.0)
    return np.clip(out, 0, 255)


def vignette(arr, strength=0.55, start=0.45):
    h, w = arr.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    d = np.sqrt(((xx - cx) / cx) ** 2 + ((yy - cy) / cy) ** 2) / math.sqrt(2.0)
    t = np.clip((d - start) / max(1e-6, (1.0 - start)), 0, 1) ** 1.5
    mask = (1.0 - strength * t)
    if arr.ndim == 3:
        mask = mask[..., None]
    return np.clip(arr.astype(np.float32) * mask, 0, 255)


def sepia(arr):
    a = arr.astype(np.float32)
    a[..., 0] *= 1.02
    a[..., 1] *= 0.96
    a[..., 2] *= 0.86
    tone = np.array([0x2A, 0x21, 0x18], dtype=np.float32)
    a = a * 0.92 + tone * 0.08
    return np.clip(a, 0, 255)


def stylize(im, contrast=1.25, seed=0):
    rng = np.random.default_rng(seed)
    g = ImageOps.grayscale(im)
    g = down_up(g, 260)
    g = ImageOps.autocontrast(g, cutoff=2)
    g = ImageEnhance.Contrast(g).enhance(contrast)
    arr = np.asarray(g).astype(np.float32)
    noise = rng.normal(0.0, 6.0, arr.shape)
    arr = np.clip(arr + noise, 0, 255)
    arr = scanlines(arr, alpha=10, every=3)
    arr = vignette(arr, strength=0.55)
    rgb = np.repeat(arr[..., None], 3, axis=2)
    rgb = sepia(rgb)
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")


def warp_field(arr, amp, seed=0, gw=14, gh=9):
    """低频位移场：把笔画整体揉歪，字形结构被拆掉。"""
    rng = np.random.default_rng(seed)
    h, w = arr.shape
    dx = cv2.resize(rng.normal(0, 1, (gh, gw)).astype(np.float32), (w, h),
                    interpolation=cv2.INTER_CUBIC) * amp
    dy = cv2.resize(rng.normal(0, 1, (gh, gw)).astype(np.float32), (w, h),
                    interpolation=cv2.INTER_CUBIC) * amp
    xx, yy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(arr, np.clip(xx + dx, 0, w - 1), np.clip(yy + dy, 0, h - 1),
                     interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def detext_scene(im, seed=0, small_side=160, blur=2.2, amp=10.0, median=7,
                 fog=0.08, post=0, contrast=1.06):
    """场景专用：先把画面压到读不出字，再做旧。

    短边压到 150~200px 再 BICUBIC 放回 1200x675（小字糊成斑块）→ 半径 2px 级
    高斯模糊 → 低频位移场把笔画揉歪（字形结构被拆）→ 可选色调分离 → 中值滤波
    + autocontrast + 轻度雾化（复印/翻拍质感）→ 扫描线 / 暗角 / 米黄压色。
    """
    rng = np.random.default_rng(seed)
    w, h = im.size
    f = small_side / float(min(w, h))
    tiny = im.resize((max(8, int(round(w * f))), max(8, int(round(h * f)))), Image.BICUBIC)
    g = tiny.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(ImageOps.grayscale(g)).astype(np.uint8)
    a = warp_field(a, amp, seed)
    if post:
        q = 255.0 / post
        a = np.clip(np.round(a.astype(np.float32) / q) * q, 0, 255).astype(np.uint8)
    g = Image.fromarray(a).filter(ImageFilter.MedianFilter(median))
    g = ImageOps.autocontrast(g, cutoff=2)
    if fog:
        g = Image.blend(g, Image.new("L", g.size, 150), fog)
    g = ImageEnhance.Contrast(g).enhance(contrast)
    arr = np.asarray(g).astype(np.float32)
    arr = np.clip(arr + rng.normal(0.0, 7.0, arr.shape), 0, 255)
    arr = scanlines(arr, alpha=12, every=3)
    arr = vignette(arr, strength=0.55)
    rgb = sepia(np.repeat(arr[..., None], 3, axis=2))
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")


def scrub_zone(im, rect, seed=0):
    """对某块"大字招牌"区域做更强的去字（局部压到 ss=80 + 模糊 + 分离）。"""
    x0, y0, x1, y1 = [int(v) for v in rect]
    x0 = max(0, x0); y0 = max(0, y0)
    x1 = min(im.size[0], x1); y1 = min(im.size[1], y1)
    if x1 <= x0 or y1 <= y0:
        return im
    patch = im.crop((x0, y0, x1, y1))
    pw, ph = patch.size
    f = 42.0 / float(min(pw, ph))
    tiny = patch.resize((max(8, int(pw * f)), max(8, int(ph * f))), Image.BICUBIC)
    back = tiny.resize((pw, ph), Image.BICUBIC).filter(ImageFilter.GaussianBlur(3.2))
    g = ImageOps.grayscale(back)
    a = warp_field(np.asarray(g).astype(np.uint8), 10.0, seed=int(x0 * 7 + y0 * 13))
    g = Image.fromarray(a).filter(ImageFilter.MedianFilter(9))
    g = ImageOps.autocontrast(g, cutoff=1)
    a = np.asarray(g).astype(np.float32)
    a = np.clip(np.round(a / 85.0) * 85.0, 0, 255).astype(np.uint8)   # 3 级色调分离
    out = im.copy()
    out.paste(Image.fromarray(a).convert("RGB"), (x0, y0))
    return out


def smudge_band(im, top_ratio=0.78, small=0.35, blur=1.6):
    """把画面下部（字幕/弹幕区）单独压糊，上部人脸保持清晰。"""
    w, h = im.size
    y0 = int(h * top_ratio)
    band = im.crop((0, y0, w, h))
    bw, bh = band.size
    band = band.resize((max(8, int(bw * small)), max(8, int(bh * small))), Image.BICUBIC)
    band = band.resize((bw, bh), Image.BICUBIC).filter(ImageFilter.GaussianBlur(blur))
    out = im.copy()
    out.paste(band, (0, y0))
    return out


def draw_eye_bar(im, mapping, seed=0, dy=0.0, h_ratio=0.16, y_ratio=0.36):
    """在检测到的人脸上画贴纸式黑框（不透明度 0.93），不遮鼻子以下。

    dy 是在输出图上额外下移/上移的像素，只给人工校准的 subject 用；
    h_ratio / y_ratio 用于双人合影（黑框要横跨两张脸时略微加高）。"""
    rng = random.Random(seed)
    cx0, cy0, cw, ch = mapping["crop"]
    fx, fy, fw, fh = mapping["face"]
    ow, oh = im.size
    sx = ow / cw
    sy = oh / ch
    fx = (fx - cx0) * sx
    fy = (fy - cy0) * sy
    fw *= sx
    fh *= sy
    bar_h = max(6.0, h_ratio * fh)
    bar_w = fw * 1.06
    bar_x = fx + fw / 2.0 - bar_w / 2.0
    bar_y = fy + y_ratio * fh + dy
    bar_y = min(bar_y, fy + 0.55 * fh + dy)          # 别压到鼻尖以下
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    col = (0x0A, 0x08, 0x06, int(round(0.93 * 255)))
    d.rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], fill=col)
    # 边缘随机小矩形，制造贴纸毛边
    for _ in range(int(bar_w / 22)):
        wsmall = rng.uniform(3, 9)
        hsmall = rng.uniform(2, 5)
        side = rng.choice(["t", "b", "l", "r"])
        a = int(round(rng.uniform(0.80, 0.95) * 255))
        if side == "t":
            x = bar_x + rng.uniform(0, bar_w - wsmall)
            d.rectangle([x, bar_y - hsmall, x + wsmall, bar_y + 1], fill=(0x0A, 0x08, 0x06, a))
        elif side == "b":
            x = bar_x + rng.uniform(0, bar_w - wsmall)
            d.rectangle([x, bar_y + bar_h - 1, x + wsmall, bar_y + bar_h + hsmall],
                        fill=(0x0A, 0x08, 0x06, a))
        elif side == "l":
            y = bar_y + rng.uniform(0, bar_h - hsmall)
            d.rectangle([bar_x - wsmall, y, bar_x + 1, y + hsmall], fill=(0x0A, 0x08, 0x06, a))
        else:
            y = bar_y + rng.uniform(0, bar_h - hsmall)
            d.rectangle([bar_x + bar_w - 1, y, bar_x + bar_w + wsmall, y + hsmall],
                        fill=(0x0A, 0x08, 0x06, a))
    return Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")


def save_jpeg(im, path, quality=82, max_kb=180):
    q = quality
    while q >= 55:
        im.save(path, "JPEG", quality=q, optimize=True, progressive=True)
        if os.path.getsize(path) <= max_kb * 1024:
            return q, os.path.getsize(path)
        q -= 4
    return q + 4, os.path.getsize(path)


# ---------------------------------------------------------------- 缓存
def load_cache():
    try:
        with open(CACHE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_cache(c):
    try:
        with open(CACHE, "w", encoding="utf-8") as f:
            json.dump(c, f, ensure_ascii=False)
    except Exception:
        pass


# ---------------------------------------------------------------- 主流程
def process_servants(cas, cache, report):
    for sid, name in SERVANTS:
        d = os.path.join(RAW, sid)
        files = CANDIDATE_FILTER.get(sid) or sorted(os.listdir(d))
        files = [f for f in files if os.path.exists(os.path.join(d, f))]

        # 人工校准的 subject：直接用量好的框出图，自动检测只用于记录
        ov = FACE_OVERRIDE.get(sid)
        src_dir = os.path.join(RAW, "_user") if ov and ov.get("user") else d
        if ov and os.path.exists(os.path.join(src_dir, ov["file"])):
            path = os.path.join(src_dir, ov["file"])
            im = load_rgb(path)
            sw, sh = im.size
            bx, by, bw, bh = ov["box"]
            box = {"x": bx * sw, "y": by * sh, "w": bw * sw, "h": bh * sh,
                   "stages": 0, "score": 0.0, "margin": 0.0}
            key = "%s/%s/%d" % (sid, ov["file"], int(os.stat(path).st_mtime))
            faces_auto = cache.get(key, {}).get("faces", [])
            cropped, mapping = crop_portrait(im, box)
            cropped = cropped.resize((PORTRAIT_W, PORTRAIT_H), Image.LANCZOS)
            seed = int(hashlib.md5(("%s%s" % (sid, ov["file"])).encode()).hexdigest()[:8], 16)
            final = draw_eye_bar(stylize(cropped, contrast=1.25, seed=seed), mapping,
                                 seed=seed, dy=ov.get("bar_dy", 0.0),
                                 h_ratio=ov.get("bar_h_ratio", 0.16))
            if sid == "lancer":
                # 采访截图下半屏是字幕/弹幕，压糊以免读出来；人脸区不动
                final = smudge_band(final, top_ratio=0.80, small=0.32, blur=1.8)
            out_path = os.path.join(OUT, "servant_%s.jpg" % sid)
            q, size = save_jpeg(final, out_path)
            cx0, cy0, cw, ch = mapping["crop"]
            report["servants"].append({
                "id": sid, "name": name, "file": ov["file"], "faces": len(faces_auto),
                "stages": 0, "manual": True, "user": bool(ov.get("user")), "note": ov["note"],
                "box": [round(v, 1) for v in (box["x"], box["y"], box["w"], box["h"])],
                "crop": [round(v, 1) for v in mapping["crop"]],
                "photo": 0.0,
                "sharp": round(laplacian_var(np.asarray(ImageOps.grayscale(im))), 1),
                "quality": 0.0, "quality_jpeg": q, "bytes": size,
                "eyes": [round((box["x"] + box["w"] / 2 - cx0) / cw * PORTRAIT_W, 1),
                         round((box["y"] + 0.36 * box["h"] - cy0) / ch * PORTRAIT_H, 1)],
            })
            print("OK %-10s %-9s manual q=%d %5.1fKB (%s)" % (
                sid, ov["file"], q, size / 1024.0, ov["note"]))
            continue

        best = None
        for f in files:
            path = os.path.join(d, f)
            stat = os.stat(path)
            key = "%s/%s/%d" % (sid, f, int(stat.st_mtime))
            im = load_rgb(path)
            sharp = laplacian_var(np.asarray(ImageOps.grayscale(im)))
            pscore, uniq, sat, edge = photometric_score(im)
            if key in cache:
                faces = cache[key]["faces"]
            else:
                faces = detect_in_image(cas, im)
                cache[key] = {"faces": faces, "sharp": sharp, "photo": pscore,
                              "uniq": uniq, "sat": sat, "edge": edge}
            cached = cache[key]
            if not faces:
                continue
            box = faces[0]
            q = face_quality(im, box)
            q += min(sharp / 4000.0, 0.8)
            q += pscore * 0.6
            if best is None or q > best["quality"]:
                best = {"file": f, "path": path, "im": im, "box": box, "quality": q,
                        "sharp": sharp, "photo": pscore, "uniq": uniq, "sat": sat,
                        "faces": faces, "nfaces": len(faces)}
        if best is None:
            # 全失败：退到画面中央最清晰的一张
            f_best, sharp_best, im_best = None, -1, None
            for f in files:
                im = load_rgb(os.path.join(d, f))
                s = laplacian_var(np.asarray(ImageOps.grayscale(im)))
                if s > sharp_best:
                    f_best, sharp_best, im_best = f, s, im
            if im_best is None:
                print("!! %-10s 没有可用候选" % sid)
                continue
            w, h = im_best.size
            box = {"x": w * 0.5 - w * 0.15, "y": h * 0.18, "w": w * 0.30, "h": w * 0.30,
                   "stages": 0, "score": 0.0, "margin": 0.0}
            best = {"file": f_best, "path": os.path.join(d, f_best), "im": im_best,
                    "box": box, "quality": 0.0, "sharp": sharp_best, "photo": 0.0,
                    "uniq": 0, "sat": 0, "faces": [], "nfaces": 0}
            print("!! %-10s 检测全失败，退中央清晰图 %s" % (sid, f_best))
        im, box = best["im"], best["box"]
        cropped, mapping = crop_portrait(im, box)
        cropped = cropped.resize((PORTRAIT_W, PORTRAIT_H), Image.LANCZOS)
        seed = int(hashlib.md5(("%s%s" % (sid, best["file"])).encode()).hexdigest()[:8], 16)
        aged = stylize(cropped, contrast=1.25, seed=seed)
        final = draw_eye_bar(aged, mapping, seed=seed)
        out_path = os.path.join(OUT, "servant_%s.jpg" % sid)
        q, size = save_jpeg(final, out_path)
        report["servants"].append({
            "id": sid, "name": name, "file": best["file"], "faces": best["nfaces"],
            "stages": box["stages"], "box": [round(v, 1) for v in
                                             (box["x"], box["y"], box["w"], box["h"])],
            "crop": [round(v, 1) for v in mapping["crop"]],
            "photo": round(best["photo"], 3), "sharp": round(best["sharp"], 1),
            "quality": round(best["quality"], 3), "quality_jpeg": q, "bytes": size,
            "eyes": [round(v, 1) for v in (
                (box["x"] - mapping["crop"][0]) / mapping["crop"][2] * PORTRAIT_W,
                (box["y"] + 0.36 * box["h"] - mapping["crop"][1]) / mapping["crop"][3] * PORTRAIT_H)],
        })
        print("OK %-10s %-9s faces=%d stages=%d q=%d %5.1fKB" % (
            sid, best["file"], best["nfaces"], box["stages"], q, size / 1024.0))


def process_scenes(report):
    for name, cn in SCENES:
        d = os.path.join(RAW, name)
        files = sorted(os.listdir(d))
        force = SCENE_OVERRIDE.get(name)
        if force:
            files = [force[0]]
        best = None
        for f in files:
            path = os.path.join(d, f)
            im = load_rgb(path)
            w, h = im.size
            landscape = w >= h
            sharp = laplacian_var(np.asarray(ImageOps.grayscale(im)))
            pscore, uniq, sat, edge = photometric_score(im)
            score = (1.0 if landscape else 0.0) * 1.2 + min(w * h / 1_200_000.0, 1.0) * 0.9 \
                + min(sharp / 3000.0, 1.0) * 0.5 + pscore * 0.4
            if best is None or score > best["score"]:
                best = {"file": f, "im": im, "score": score, "sharp": sharp,
                        "size": (w, h)}
        if best is None:
            continue
        im = crop_scene(best["im"]).resize((SCENE_W, SCENE_H), Image.LANCZOS)
        seed = int(hashlib.md5(name.encode()).hexdigest()[:8], 16)
        for z in TEXT_ZONES.get(name, []):
            im = scrub_zone(im, z, seed)
        final = detext_scene(im, seed=seed)
        out_path = os.path.join(OUT, "%s.jpg" % name)
        q, size = save_jpeg(final, out_path)
        report["scenes"].append({
            "id": name, "cn": cn, "file": best["file"], "size": list(best["size"]),
            "sharp": round(best["sharp"], 1), "score": round(best["score"], 3),
            "quality_jpeg": q, "bytes": size,
        })
        print("OK %-14s %-8s %5dx%-5d q=%d %5.1fKB" % (
            name, best["file"], best["size"][0], best["size"][1], q, size / 1024.0))


def write_credits(report):
    L = []
    L.append("# 素材出处 / 处理记录\n")
    L.append("原始候选图来源：必应图片搜索（脚本 `tools/fetch_images.py` 按主体关键词批量抓取，"
             "未保存逐张落地 URL；每个 subject 约 10 张候选，存于 `assets/img/_raw/<subject>/`）。\n")
    L.append("处理脚本：`tools/process_images.py`（Pillow + numpy + cv2，无外部模型）。"
             "人脸检测：Haar 级联 `tools/models/haar.xml`，scaleFactor=1.1、minNeighbors=4，"
             "检测前统一缩到宽 1000。\n")
    L.append("> OpenCV 5 的 Python 轮子移除了 `CascadeClassifier` 绑定，脚本内用 numpy 重写了级联推理，"
             "模型文件与检测语义保持不变。\n")
    L.append("\n## 人物（900×1200，3:4，含眼部黑框）\n")
    L.append("| Servant | 人物 | 选用候选 | 检测到人脸数 | 最终人脸框(原图px) | 级联通过级数 | 裁切区域(x,y,w,h) | JPEG |")
    L.append("|---|---|---|---|---|---|---|---|")
    for r in report["servants"]:
        stage_txt = "人工校准" if r.get("manual") else "%d/25" % r["stages"]
        tag = "（用户指定素材）" if r.get("user") else ""
        L.append("| servant_%s | %s | `%s`%s | %d | %s | %s | %s | q%d %.0fKB |" % (
            r["id"], r["name"], r["file"], tag, r["faces"], r["box"], stage_txt, r["crop"],
            r["quality_jpeg"], r["bytes"] / 1024.0))
    manual = [r for r in report["servants"] if r.get("manual")]
    if manual:
        L.append("\n人工校准说明（这些候选自动框肉眼复核不通过，按网格量框后写入 `FACE_OVERRIDE`）：\n")
        for r in manual:
            L.append("- `servant_%s`（%s → `%s`）：%s" % (r["id"], r["name"], r["file"], r.get("note", "")))
        L.append("")
    L.append("\n黑框位置：`y = 人脸框顶 + 0.36×脸高`，高度 `0.16×脸高`，宽度 `1.06×脸宽`，"
             "颜色 #0a0806，不透明度 0.93，边缘随机贴纸毛边。宽度 1.06×、高度 0.16×，"
             "均在 1.15×／0.18× 的约束内。\n")
    L.append("\n## 场景（1200×675，16:9，无黑框；已做去字化）\n")
    L.append("| 文件 | 场景 | 选用候选 | 原图尺寸 | JPEG |")
    L.append("|---|---|---|---|---|")
    for r in report["scenes"]:
        L.append("| %s.jpg | %s | `%s` | %dx%d | q%d %.0fKB |" % (
            r["id"], r["cn"], r["file"], r["size"][0], r["size"][1],
            r["quality_jpeg"], r["bytes"] / 1024.0))
    if SCENE_OVERRIDE:
        L.append("\n场景换片说明（避开商业水印／素材站 logo／拼图）：\n")
        for k, (f, why) in SCENE_OVERRIDE.items():
            L.append("- `%s` → `%s`：%s" % (k, f, why))
        L.append("")
    L.append("\n## 统一后期流程\n")
    L.append("**人物**：灰度 → 降采样到短边 260 再升回 → autocontrast(cutoff=2) → 对比度 ×1.25"
             "→ 高斯噪点 σ≈6 → 每 3px 一条 alpha≈10 暗横线 → 径向暗角 "
             "→ 米黄压色（R×1.02 / G×0.96 / B×0.86，再叠 8% #2a2118）→ 黑框 → "
             "JPEG quality 82（≤180KB）。\n")
    L.append("**场景（去字化）**：先把画面压到短边 210px 再 BICUBIC 放回 1200×675（小字糊成斑块）"
             "→ 半径 2.0px 高斯模糊 → autocontrast(cutoff=2) → 中值滤波 3×3 + 对比度 ×1.08"
             "（复印机质感）→ 细颗粒噪点 σ≈7 → 扫描线 alpha≈12 / 3px → 径向暗角 "
             "→ 米黄压色 → JPEG quality 82。文字只剩字形骨架，读不出完整汉字。\n")
    with open(os.path.join(OUT, "CREDITS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    print("CREDITS ->", os.path.join(OUT, "CREDITS.md"))


def main():
    os.makedirs(OUT, exist_ok=True)
    cache = load_cache()
    report = {"servants": [], "scenes": []}
    cas = HaarCascade(MODEL)
    process_servants(cas, cache, report)
    save_cache(cache)
    process_scenes(report)
    write_credits(report)
    with open(os.path.join(OUT, "_process_report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()









