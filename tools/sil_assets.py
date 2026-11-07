# -*- coding: utf-8 -*-
"""未解明从者：剪影 / 扭曲中间态素材生成（v2）。

为 9 张 servant_*.jpg 生成两套衍生图（900x1200，PNG）：
  assets/img/sil/<id>_sil.png    剪影：暗部实影 + 轮廓墨线 + 中心雾底
  assets/img/sil/<id>_warp.png   扭曲中间态：位移重影 + glitch 条带 + 显影不足
原图保留为「凝实」态（lv4/5 直接显示）。

不依赖人物分割：用「亮度暗部 × 中心椭圆雾底 × 高频轮廓」合成 alpha，
对亮背景/暗背景的大头照都稳定。
"""
import os
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = r'E:\dsh-workspace\grail-war'
SRC = os.path.join(ROOT, 'assets', 'img')
DST = os.path.join(SRC, 'sil')
os.makedirs(DST, exist_ok=True)

IDS = ['saber', 'archer', 'lancer', 'rider', 'caster',
       'assassin', 'berserker', 'ruler', 'foreigner']

W, H = 900, 1200
INK = (16, 13, 8)


def _gblur(arr, r):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8))
    im = im.filter(ImageFilter.GaussianBlur(r))
    return np.asarray(im, dtype=np.float32) / 255.0


def _ellipse_vignette(soft=1.0, cy=0.44, ry=0.50, rx=0.47):
    yy, xx = np.mgrid[0:H, 0:W]
    cx = W * 0.5
    d = np.sqrt(((xx - cx) / (W * rx)) ** 2 + ((yy - H * cy) / (H * ry)) ** 2)
    return np.clip((1.32 - d * 1.05) * soft, 0, 1)


def _luminance(gray):
    small = gray.resize((240, 320), Image.LANCZOS).filter(ImageFilter.GaussianBlur(4))
    a = np.asarray(small, dtype=np.float32) / 255.0
    lo, hi = np.percentile(a, 4), np.percentile(a, 96)
    a = np.clip((a - lo) / (hi - lo + 1e-6), 0, 1)
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC),
                   dtype=np.float32) / 255.0
    return a


def make_sil(gray):
    """剪影：先把亮度暗部糊成一团，再压成硬边黑形——五官会被糊掉，只剩人形。"""
    lum = _luminance(gray)
    vign = _ellipse_vignette()

    med = float(np.median(lum))
    spread = float(lum.std()) + 0.12
    dev = np.clip((med - lum) / (spread * 2.0) + 0.42, 0, 1)   # 比画面整体暗 → 实影

    fog = vign * 0.58                       # 人形底，保证任何图都有轮廓
    raw = np.clip(dev * 0.95 + fog * 0.62, 0, 1)
    raw = _gblur(raw, 14)                   # 糊掉五官与衣纹
    a = np.clip((raw - 0.34) / 0.24, 0, 1)  # 压成形状
    a = _gblur(a, 5)                        # 回一点柔边
    a = a * (vign ** 0.5) * 0.98

    rng = np.random.default_rng(7)
    a = np.clip(a + rng.normal(0, 0.022, (H, W)), 0, 1)

    base = np.zeros((H, W, 3), dtype=np.float32)
    for i, c in enumerate(INK):
        base[..., i] = c
    img = base + ((a ** 3.0) * 12.0)[..., None]   # 内部只留极轻层次

    out = np.dstack([np.clip(img, 0, 255).astype(np.uint8),
                     (a * 255).astype(np.uint8)])
    return Image.fromarray(out, 'RGBA')


def make_warp(rgb, gray):
    """扭曲中间态：正在「凝实」的那一下——还认不出是谁。"""
    src = rgb.resize((W, H), Image.LANCZOS)
    arr = np.asarray(src, dtype=np.float32)
    rng = np.random.default_rng(11)

    # 先压暗，保证「看不清」
    arr = arr * 0.58

    # --- 低频位移场（幅度更大）---
    def field(scale):
        s = rng.normal(0, 1, (24, 18)).astype(np.float32)
        im = Image.fromarray(((s - s.min()) / (np.ptp(s) + 1e-6) * 255).astype(np.uint8))
        im = im.resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(11))
        return (np.asarray(im, dtype=np.float32) / 255.0 - 0.5) * scale

    dx = field(34.0)
    dy = field(18.0)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx = np.clip(xx + dx, 0, W - 1).astype(np.int32)
    sy = np.clip(yy + dy, 0, H - 1).astype(np.int32)
    warped = arr[sy, sx]

    ghost = arr[np.clip(sy + 6, 0, H - 1), np.clip(sx - 11, 0, W - 1)]
    warped = warped * 0.62 + ghost * 0.38

    # --- glitch 水平条带 ---
    for _ in range(9):
        y0 = int(rng.integers(0, H - 40))
        hgt = int(rng.integers(8, 42))
        shift = int(rng.integers(-52, 52))
        warped[y0:y0 + hgt, :, :] = np.roll(warped[y0:y0 + hgt, :, :].copy(), shift, axis=1)

    # --- 局部马赛克：脸所在的中上部被打成块 ---
    im0 = Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGB')
    block = 25
    small = im0.resize((W // block, H // block), Image.BILINEAR).resize((W, H), Image.NEAREST)
    m = np.zeros((H, W), dtype=np.float32)
    for _ in range(5):
        bx = int(rng.integers(int(W * 0.06), int(W * 0.62)))
        by = int(rng.integers(int(H * 0.04), int(H * 0.62)))
        bw = int(rng.integers(int(W * 0.18), int(W * 0.42)))
        bh = int(rng.integers(int(H * 0.06), int(H * 0.16)))
        m[by:by + bh, bx:bx + bw] = 1.0
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(6)), dtype=np.float32) / 255.0
    a_big = np.asarray(im0, dtype=np.float32)
    a_small = np.asarray(small, dtype=np.float32)
    warped = a_big * (1 - m[..., None]) + a_small * m[..., None]

    # --- 显影不足：压暗、去色、提对比 ---
    g = warped.mean(axis=2, keepdims=True)
    warped = g * 0.82 + warped * 0.18
    warped = (warped - 128.0) * 1.50 + 128.0 - 62.0
    warped = np.clip(warped, 0, 255)

    im = Image.fromarray(warped.astype(np.uint8), 'RGB').filter(ImageFilter.GaussianBlur(1.6))

    # --- 与剪影按中心雾底混合：中间清楚、边缘还在影里 ---
    vou = _ellipse_vignette(soft=1.15, ry=0.46, rx=0.42)
    vou = np.asarray(Image.fromarray((vou * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(18)), dtype=np.float32) / 255.0
    mix = np.clip(0.30 + vou * 0.62, 0, 1)
    arr2 = np.asarray(im, dtype=np.float32)
    arr2 = arr2 * mix[..., None] + np.array(INK, dtype=np.float32) * (1 - mix[..., None])
    arr2 = np.clip(arr2, 0, 255)

    # 叠一层极轻的纸纹噪点
    noise = rng.normal(0, 4.0, (H, W, 1))
    arr2 = np.clip(arr2 + noise, 0, 255)

    img3 = Image.fromarray(arr2.astype(np.uint8), 'RGB')
    # 边缘淡出：扭曲态在纸面上是「正在凝出来的影子」，不是一块黑照片
    av = np.clip(vou * 1.55, 0, 1) ** 1.15
    out = np.dstack([np.asarray(img3, dtype=np.uint8),
                     (av * 255).astype(np.uint8)])
    return Image.fromarray(out, 'RGBA')


def main():
    n = 0
    for sid in IDS:
        f = os.path.join(SRC, 'servant_%s.jpg' % sid)
        if not os.path.exists(f):
            print('MISS', sid)
            continue
        rgb = Image.open(f).convert('RGB')
        gray = ImageOps.grayscale(rgb)
        make_sil(gray).save(os.path.join(DST, '%s_sil.png' % sid), optimize=True)
        make_warp(rgb, gray).save(os.path.join(DST, '%s_warp.png' % sid), optimize=True)
        n += 1
        print('ok', sid)
    print('files', n)

    # --- 对比预览：按情报卡实际尺寸（120x160）贴在纸色底上看 ---
    tw, th = 120, 160
    pad = 6
    canvas = Image.new('RGB', (pad + 3 * (tw + pad), pad + 9 * (th + pad)), (207, 199, 180))
    for row, sid in enumerate(IDS):
        orig = Image.open(os.path.join(SRC, 'servant_%s.jpg' % sid)).convert('RGB').resize((tw, th), Image.LANCZOS)
        sil = Image.open(os.path.join(DST, '%s_sil.png' % sid)).convert('RGBA').resize((tw, th), Image.LANCZOS)
        warp = Image.open(os.path.join(DST, '%s_warp.png' % sid)).convert('RGBA').resize((tw, th), Image.LANCZOS)
        for col, im in enumerate((sil, warp, orig)):
            cell = Image.new('RGB', (tw, th), (207, 199, 180))
            if im.mode == 'RGBA':
                cell.paste(im, (0, 0), im)
            else:
                cell.paste(im, (0, 0))
            canvas.paste(cell, (pad + col * (tw + pad), pad + row * (th + pad)))
    canvas = canvas.resize((canvas.width * 2, canvas.height * 2), Image.NEAREST)
    out = os.path.join(ROOT, 'tools', 'sil_preview.png')
    canvas.save(out)
    print('preview', out, canvas.size)


if __name__ == '__main__':
    main()
