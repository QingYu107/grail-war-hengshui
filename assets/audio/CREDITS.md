# assets/audio · 真 BGM 素材来源

九骑主题曲的真人音源。全部从 B 站原投稿取**音频轨**，统一转成 60 秒 mp3 放在本目录根下，
文件名与 `window.GrailAudio.tracks[i].id` 一一对应，`js/audio.js` 探测到同名文件就优先播放，
探测不到则静默回落到程序化合成音。

## 一、处理规格

| 项 | 取值 |
| --- | --- |
| 音源 | yt-dlp `bestaudio`（B 站 `m4a` 音频轨，无视频流） |
| 截取 | **从头开始**：00:00 → 01:00；仅 `lancer` 去掉源文件开头 3.18s 纯数字静音，从 00:03.10 起 |
| 淡入 / 淡出 | 0.8s / 1.5s（`afade`，淡出 58.5s→60s） |
| 编码 | `libmp3lame` 128 kbps CBR，44.1 kHz，立体声 |
| 时长 | 每首 60.00s（ffprobe 复测 58–62s 区间内） |
| 体积 | 每首约 0.92 MB（≤ 1.2 MB 上限） |
| 下载方式 | 全部 `yt-dlp` 直连，未触发 403/412，未使用 cookies / playurl API 兜底 |

## 二、九首清单

| id | 角色 | BV 号 | 视频标题（UP 主） | 截取区间 | 文件大小 | 下载方式 |
| --- | --- | --- | --- | --- | --- | --- |
| `saber` | 科比 | BV1ib421E7L5 | See you again，但是不墨迹直接二倍速（南局福段の喜鹊） | 00:00–01:00 | 961,094 B | yt-dlp bestaudio m4a（133 kbps） |
| `archer` | 张雪峰 | BV1PSV86bEcj | “张雪峰老师 我还记得你.”｜《念张师》2.0x 氦气版（一支yuuu） | 00:00–01:00 | 961,090 B | yt-dlp bestaudio m4a（137 kbps） |
| `lancer` | Otto / 侯国玉 | BV1Ta411T7E8 | 说的道理.wav（平胸的伊莉雅）※替源 | 00:03.10–01:03.10 | 961,092 B | yt-dlp bestaudio m4a（165 kbps） |
| `rider` | 范小勤 | BV1Cm4y1g78g | 【范小勤】以父之名（小奇异风） | 00:00–01:00 | 961,092 B | yt-dlp bestaudio m4a（139 kbps） |
| `caster` | 马保国 | BV1584y1N7cR | 马保国原版视频（定投印象） | 00:00–01:00 | 961,092 B | yt-dlp bestaudio m4a（97 kbps） |
| `assassin` | 周立齐 | BV1Ds411Y72E | 【周某】我的看守所（OELoop） | 00:00–01:00 | 961,092 B | yt-dlp bestaudio m4a（191 kbps） |
| `berserker` | 虎哥 & 刀哥 | BV1q34y187Vy | 《夏日漱石》东百MV（冷封同学）※替源 | 00:00–01:00 | 961,092 B | yt-dlp bestaudio m4a（130 kbps） |
| `ruler` | 孙笑川 | BV1Ck4y197i1 | 孙笑川都干了哪些坏事？（肥宅界持刀人） | 00:00–01:00 | 961,092 B | yt-dlp bestaudio m4a（319 kbps） |
| `foreigner` | 丁真 | BV1P94y167HS | 【补档2】《大家一起吸氧氧》《我现在肺痒痒》《吸羊羊之烟气冲天》（夜吟月寒丶） | 00:00–01:00 | 961,092 B | yt-dlp bestaudio m4a（216 kbps） |

## 三、两处替源说明

指定 BV 里有两条投稿本身不足 60 秒，从头截满 60 秒取不出来，按「换同角色其他投稿」处理：

| 角色 | 原指定 BV | 原片长 | 问题 | 实际采用 |
| --- | --- | --- | --- | --- |
| lancer（Otto） | BV1XdgzzCEHt | 45.21s | 片长不足 60s，无法截满 | BV1Ta411T7E8（397.87s，同曲《说的道理》音源） |
| berserker（虎哥 & 刀哥） | BV1hT4y1v7Vg | 35.09s | 片长不足 60s，无法截满 | BV1q34y187Vy（152.19s，《夏日漱石》东百MV） |

两首均已在 `js/audio.js` 的 `tracks` 里把 `bv` 字段写成**实际使用的那条**，避免清单与音源对不上。

另：`lancer` 替源是 `.wav` 直传的梗曲原音，开头 3.18s 是纯数字静音（不是音乐前奏），
从 0 截会在每次循环开头吃 3 秒空白，所以只把这段静音剪掉，仍属「从头开始」，没有跳过任何内容。

## 四、校验记录

- `ffprobe`：九首全部 60.000s、1 条 audio stream、mp3 / 2ch / 44100 Hz。
- `ffmpeg volumedetect`：mean_volume 在 −20.9 ~ −9.6 dB 之间，无一首接近 −91 dB 静音。
- 6 kHz 高通后再测：mean_volume 在 −44.6 ~ −24.8 dB，确认不是低频噪声冒充内容。
- `node --check js/audio.js`：通过。
- `node tools/audio_smoke.js`：PASS（9 个主题全构建、调度、断开，无非法参数）。
- 真文件冒烟（假 Audio 命中本地文件）：9 条 `tracks` 全部探测到 `assets/audio/<id>.mp3`，
  `play()` 无抛错。

## 五、使用边界

本地单机同人游戏自用，音频文件只存在于本机项目目录，不上传、不分发、不随游戏对外发布。
原曲版权归各视频投稿人与原始权利人所有；若将来要对外分发，请自行清空本目录——清空后
程序化合成音仍然完整可用。
