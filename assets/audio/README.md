# assets/audio —— 真实曲目投放说明

游戏默认**没有任何音频文件**，全部声音由 `js/audio.js` 用 WebAudio 现场合成，
双击 `index.html`（`file://` 协议）也能出声。

这个目录只做一件事：**放同名文件，就把该主题换成原曲**。

---

## 一、文件名规则

```
assets/audio/<主题id>.mp3      ← 首选
assets/audio/<主题id>.m4a      ← 次选
assets/audio/<主题id>.ogg      ← 再次
```

三个扩展名按 `mp3 → m4a → ogg` 的顺序探测，命中第一个就用它；都不存在则用程序化环境音。
**不区分大小写由文件系统决定，请一律用小写。**

主题 id 共 17 个：

| 类别 | 主题 id | 说明 |
| --- | --- | --- |
| 场景 | `title` `quiz` `daily` `exam` `battle` `beast` `ending_dark` `ending_warm` | 8 个场景 |
| 从者 | `saber` `archer` `lancer` `rider` `caster` `assassin` `berserker` `ruler` `foreigner` | 9 个从者，id 即角色 id |

例：把《See You Again》放到 `assets/audio/saber.mp3`，科比出场时就会播它；
把《念张师》放到 `assets/audio/archer.m4a`，张雪峰就有了专题曲。

> 注意：路径是**相对 index.html 所在目录**解析的。`tools/audio_test.html` 在子目录里，
> 所以在那张测试页上永远听到程序化音，这是预期行为，请用根目录的 `index.html` 验证真实文件。

## 二、manifest 在哪里

`window.GrailAudio.tracks[i].files` 就是该主题的候选文件名数组，由 `EXT_ORDER` 生成：

```js
// js/audio.js
var EXT_ORDER = ['mp3', 'm4a', 'ogg'];
// → ['saber.mp3', 'saber.m4a', 'saber.ogg']
```

要加扩展名（比如 `wav`），只需在 `EXT_ORDER` 里加一项，探测逻辑和 manifest 会一起更新。

## 三、行为约定

1. **命中后**：原曲循环播放，程序化层不关掉，而是淡到 0.12 当作极轻的空间底噪——所以原曲里不要有刺耳的空白段落。
2. **加载失败**：完全静默。没有 `console.error`，没有提示条，直接回落到程序化音。
   唯一痕迹是开发者工具的网络面板里一条 `ERR_FILE_NOT_FOUND`，这是 `file://` 下探测不存在文件必然产生的记录。
3. **探测时机**：每个主题**第一次被播放时**才探测，结果永久缓存，不会反复请求。
4. **探测超时**：单个候选 4 秒没响应就换下一个。
5. **音量**：原曲与合成音共用同一套音量 / 静音状态（`setVolume` / `toggleMute`）。

## 四、离线注意

`file://` 下 `<audio src="assets/audio/x.mp3">` 是可以正常播放本地文件的，
但如果改用「用 fetch 拉二进制 + decodeAudioData」的方案就会因为 CORS 全盘失败——
所以本引擎刻意只走 `<audio>` 元素，绝不 `fetch`。

## 五、授权与收录

曲目映射只提供**搜索链接**（网易云 / QQ 音乐 / B 站），不内置任何音频、不写死歌曲 id。
真要随游戏分发原曲，请自行确认授权；否则保持目录为空，程序化音就是完整可用的默认方案。
