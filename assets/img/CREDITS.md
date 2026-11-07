# 素材出处 / 处理记录

原始候选图来源：必应图片搜索（脚本 `tools/fetch_images.py` 按主体关键词批量抓取，未保存逐张落地 URL；每个 subject 约 10 张候选，存于 `assets/img/_raw/<subject>/`）。

处理脚本：`tools/process_images.py`（Pillow + numpy + cv2，无外部模型）。人脸检测：Haar 级联 `tools/models/haar.xml`，scaleFactor=1.1、minNeighbors=4，检测前统一缩到宽 1000。

> OpenCV 5 的 Python 轮子移除了 `CascadeClassifier` 绑定，脚本内用 numpy 重写了级联推理，模型文件与检测语义保持不变。


## 人物（900×1200，3:4，含眼部黑框）

| Servant | 人物 | 选用候选 | 检测到人脸数 | 最终人脸框(原图px) | 级联通过级数 | 裁切区域(x,y,w,h) | JPEG |
|---|---|---|---|---|---|---|---|
| servant_saber | 科比 | `saber.jpg`（用户指定素材） | 0 | [224.7, 43.0, 275.2, 296.7] | 人工校准 | [79.2, 0.0, 566.2, 755.0] | q82 139KB |
| servant_archer | 张雪峰 | `archer.jpg`（用户指定素材） | 0 | [227.1, 113.9, 227.8, 266.0] | 人工校准 | [0.0, 41.1, 682.0, 909.3] | q82 131KB |
| servant_lancer | 侯国玉 / 电棍 otto | `09.jpg` | 3 | [477.3, 83.2, 171.5, 172.3] | 人工校准 | [315.6, 0.0, 495.0, 660.0] | q82 134KB |
| servant_rider | 范小勤 / 小马云 | `07.jpg` | 3 | [248.4, 62.9, 120.3, 120.3] | 25/25 | [170.2, 0.0, 276.8, 369.0] | q82 156KB |
| servant_caster | 马保国 | `00.jpg` | 3 | [144.8, 164.0, 265.2, 236.6] | 人工校准 | [15.6, 0.0, 523.5, 698.0] | q82 138KB |
| servant_assassin | 周立齐 / 窃格瓦拉 | `assassin.jpg`（用户指定素材） | 0 | [529.7, 125.1, 310.0, 444.6] | 人工校准 | [175.5, 0.0, 775.5, 1034.0] | q82 131KB |
| servant_berserker | 虎哥与刀哥 | `berserker.jpg`（用户指定素材） | 0 | [120.2, 161.9, 529.7, 284.6] | 人工校准 | [0.0, 0.0, 793.5, 1058.0] | q82 131KB |
| servant_ruler | 孙笑川 | `00.png` | 3 | [249.6, 58.2, 201.6, 201.6] | 23/25 | [74.0, 0.0, 552.8, 737.0] | q82 112KB |
| servant_foreigner | 丁真 | `foreigner.jpg`（用户指定素材） | 0 | [230.0, 275.1, 380.0, 375.1] | 人工校准 | [0.0, 87.0, 777.0, 1036.0] | q82 135KB |

人工校准说明（这些候选自动框肉眼复核不通过，按网格量框后写入 `FACE_OVERRIDE`）：

- `servant_saber`（科比 → `saber.jpg`）：用户指定素材：科比 蓝底黄衣正面半身，人工量框
- `servant_archer`（张雪峰 → `archer.jpg`）：用户指定素材：张雪峰 黑板前指镜头，人工量框
- `servant_lancer`（侯国玉 / 电棍 otto → `09.jpg`）：AFTERSHOW 采访截图（1167×660），取彩色正脸，按框定位眼线
- `servant_caster`（马保国 → `00.jpg`）：正面大特写（右手伸向镜头），自动框落在鼻梁，按网格人工量框并下调眼框
- `servant_assassin`（周立齐 / 窃格瓦拉 → `assassin.jpg`）：用户指定素材：周立齐 长发白衬衫（带「不可能打工的」字幕），人工量框
- `servant_berserker`（虎哥与刀哥 → `berserker.jpg`）：用户指定素材：虎哥刀哥并排，取两人脸框并集、黑框横跨两张脸（高度按两人眼线均值）
- `servant_foreigner`（丁真 → `foreigner.jpg`）：用户指定素材：丁真 室内正面半身，裁切保住整颗头不切边


黑框位置：`y = 人脸框顶 + 0.36×脸高`，高度 `0.16×脸高`，宽度 `1.06×脸宽`，颜色 #0a0806，不透明度 0.93，边缘随机贴纸毛边。宽度 1.06×、高度 0.16×，均在 1.15×／0.18× 的约束内。


## 场景（1200×675，16:9，无黑框；已做去字化）

| 文件 | 场景 | 选用候选 | 原图尺寸 | JPEG |
|---|---|---|---|---|
| scene_gate.jpg | 校门 | `00.jpg` | 1500x1000 | q82 125KB |
| scene_corridor.jpg | 走廊 | `01.jpg` | 1024x683 | q82 125KB |
| scene_exam.jpg | 考场 | `05.jpg` | 1600x1066 | q82 131KB |
| scene_honor.jpg | 光荣榜 | `09.jpg` | 1024x788 | q82 123KB |
| scene_hill.jpg | 荒山 | `04.jpeg` | 3000x1999 | q82 135KB |
| scene_radio.jpg | 广播室 | `08.jpg` | 860x573 | q82 131KB |
| scene_canteen.jpg | 食堂 | `02.jpg` | 2048x1536 | q82 137KB |
| scene_roof.jpg | 天台 | `01.jpg` | 860x573 | q82 124KB |
| scene_led.jpg | 倒计时屏 | `06.png` | 1318x779 | q82 126KB |
| scene_track.jpg | 跑道 | `02.jpg` | 1024x1024 | q82 127KB |
| scene_wall.jpg | 围墙 | `03.jpg` | 800x600 | q82 146KB |
| scene_dorm.jpg | 宿舍 | `09.jpg` | 1080x1920 | q82 129KB |
| scene_arena.jpg | 夜间操场看台 | `00.jpg` | 860x574 | q82 128KB |
| scene_beast.jpg | 长走廊尽头 | `01.jpg` | 1000x667 | q82 130KB |
| scene_blackout.jpg | 停电走廊 | `00.jpg` | 790x633 | q82 109KB |
| scene_roofnight.jpg | 楼顶夜色 | `05.jpg` | 2048x1536 | q82 127KB |
| scene_classroom_night.jpg | 空教室夜 | `06.jpg` | 860x573 | q82 136KB |
| scene_hospital.jpg | 校医室 | `03.jpg` | 1080x720 | q82 128KB |

场景换片说明（避开商业水印／素材站 logo／拼图）：

- `scene_radio` → `08.jpg`：原候选多为麦克风商品图/教室拼图，改用录音棚麦克风特写
- `scene_wall` → `03.jpg`：原候选 06.jpg 带「龙桥造」广告字，改用学校铁艺围墙实拍
- `scene_roof` → `01.jpg`：原候选 02.jpg 右下有素材站水印，改用无字夜间校园街景
- `scene_dorm` → `09.jpg`：原候选 02.jpg 是带「炫云」水印的渲染图，改用真实宿舍照片


## 统一后期流程

**人物**：灰度 → 降采样到短边 260 再升回 → autocontrast(cutoff=2) → 对比度 ×1.25→ 高斯噪点 σ≈6 → 每 3px 一条 alpha≈10 暗横线 → 径向暗角 → 米黄压色（R×1.02 / G×0.96 / B×0.86，再叠 8% #2a2118）→ 黑框 → JPEG quality 82（≤180KB）。

**场景（去字化）**：先把画面压到短边 210px 再 BICUBIC 放回 1200×675（小字糊成斑块）→ 半径 2.0px 高斯模糊 → autocontrast(cutoff=2) → 中值滤波 3×3 + 对比度 ×1.08（复印机质感）→ 细颗粒噪点 σ≈7 → 扫描线 alpha≈12 / 3px → 径向暗角 → 米黄压色 → JPEG quality 82。文字只剩字形骨架，读不出完整汉字。
