# -*- coding: utf-8 -*-
"""故障艺术素材：给场景图做 glitch 变体 + 几张纯故障纹理。

输出：
  assets/img/glitch/<scene>_glitch.jpg   场景的故障版（通道错位 + 撕裂 + 块状马赛克）
  assets/img/glitch/tex_noise_a.png      透明故障纹理，可叠在任何层上
  assets/img/glitch/tex_noise_b.png
"""
import os
import glob
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = r'E:\dsh-workspace\grail-war'
SRC = os.path.join(ROOT, 'assets', 'img')
DST = os.path.join(SRC, 'glitch')
os.makedirs(DST, exist_ok=True)


def channel_shift(arr, rdx, bdx, dy=0):
    out = arr.copy()
    out[..., 0] = np.roll(arr[..., 0], (dy, rdx), axis=(0, 1))
    out[..., 2] = np.roll(arr[..., 2], (dy, bdx), axis=(0, 1))
    return out


def tear(arr, rng, n=9):
    h, w = arr.shape[:2]
    for _ in range(n):
        y0 = int(rng.integers(0, h - 12))
        hh = int(rng.integers(4, max(6, h // 18)))
        shift = int(rng.integers(-w // 14, w // 14))
        arr[y0:y0 + hh] = np.roll(arr[y0:y0 + hh], shift, axis=1)
    return arr


def blocky(arr, rng, n=4, block=28):
    h, w = arr.shape[:2]
    im = Image.fromarray(arr.astype(np.uint8))
    small = im.resize((max(1, w // block), max(1, h // block)), Image.BILINEAR).resize((w, h), Image.NEAREST)
    a = np.asarray(small, dtype=np.float32)
    m = np.zeros((h, w), dtype=np.float32)
    for _ in range(n):
        bx = int(rng.integers(0, int(w * 0.7)))
        by = int(rng.integers(0, int(h * 0.7)))
        bw = int(rng.integers(int(w * 0.08), int(w * 0.3)))
        bh = int(rng.integers(int(h * 0.05), int(h * 0.2)))
        m[by:by + bh, bx:bx + bw] = 1
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)),
                   dtype=np.float32)[..., None] / 255.0
    return arr * (1 - m) + a * m


def scanlines(arr, gap=3, strength=0.18):
    h = arr.shape[0]
    mask = (np.arange(h) % gap == 0).astype(np.float32)[:, None, None]
    return arr * (1 - strength * mask) + 8 * strength * mask


def glitch_scene(path, rng):
    im = Image.open(path).convert('RGB')
    im = ImageOps.autocontrast(im, cutoff=1)
    arr = np.asarray(im, dtype=np.float32)
    arr = channel_shift(arr, rng.integers(3, 11), -rng.integers(3, 11), rng.integers(-2, 3))
    arr = tear(arr, rng, n=int(rng.integers(6, 12)))
    arr = blocky(arr, rng, n=int(rng.integers(2, 5)))
    arr = scanlines(arr, gap=int(rng.integers(3, 5)), strength=0.16)
    # 一条高亮横线 + 一点色偏
    h, w = arr.shape[:2]
    y = int(rng.integers(0, h - 2))
    arr[y:y + 2] = np.clip(arr[y:y + 2] + 46, 0, 255)
    arr = np.clip(arr * 1.04, 0, 255)
    out = Image.fromarray(arr.astype(np.uint8))
    out = out.filter(ImageFilter.GaussianBlur(0.4))
    return out


def tex_noise(seed, w=900, h=600):
    rng = np.random.default_rng(seed)
    a = np.zeros((h, w, 4), dtype=np.float32)
    # 竖条 + 横条 + 点噪声，全部是浅色、半透明
    for _ in range(90):
        x = int(rng.integers(0, w))
        ww = int(rng.integers(1, 4))
        hh = int(rng.integers(h // 12, h))
        y = int(rng.integers(0, h - hh))
        a[y:y + hh, x:x + ww, :3] = rng.integers(210, 250)
        a[y:y + hh, x:x + ww, 3] = rng.integers(10, 40)
    for _ in range(50):
        y = int(rng.integers(0, h))
        hh = int(rng.integers(1, 3))
        x = int(rng.integers(0, w // 2))
        ww = int(rng.integers(w // 8, w))
        a[y:y + hh, x:x + ww, :3] = rng.integers(220, 255)
        a[y:y + hh, x:x + ww, 3] = rng.integers(20, 60)
    n = rng.integers(0, 255, (h, w, 1))
    a[..., 3] = np.clip(a[..., 3] + (n[..., 0] > 250) * 60, 0, 255)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def main():
    rng = np.random.default_rng(23)
    files = sorted(glob.glob(os.path.join(SRC, 'scene_*.jpg')))
    n = 0
    for f in files:
        name = os.path.splitext(os.path.basename(f))[0]
        out = os.path.join(DST, name + '_glitch.jpg')
        glitch_scene(f, rng).save(out, quality=86)
        n += 1
    print('glitch scenes', n)
    tex_noise(3).save(os.path.join(DST, 'tex_noise_a.png'))
    tex_noise(9).save(os.path.join(DST, 'tex_noise_b.png'))
    print('textures ok')

    # 预览：4 张故障图拼一版
    picks = files[:4]
    if picks:
        tiles = []
        for f in picks:
            name = os.path.splitext(os.path.basename(f))[0]
            a = Image.open(f).convert('RGB').resize((360, 203), Image.LANCZOS)
            b = Image.open(os.path.join(DST, name + '_glitch.jpg')).convert('RGB').resize((360, 203), Image.LANCZOS)
            row = Image.new('RGB', (730, 203), (20, 20, 18))
            row.paste(a, (0, 0)); row.paste(b, (370, 0))
            tiles.append(row)
        canvas = Image.new('RGB', (730, len(tiles) * 213), (20, 20, 18))
        for i, t in enumerate(tiles):
            canvas.paste(t, (0, i * 213))
        canvas.save(os.path.join(ROOT, 'tools', 'glitch_preview.png'))
        print('preview ok', canvas.size)


if __name__ == '__main__':
    main()
