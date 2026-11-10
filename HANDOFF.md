# HANDOFF · 交接说明（给下一个会话）

> 最后更新：2026-11-10。项目：`E:\dsh-workspace\grail-war`
> 远端：<https://github.com/QingYu107/grail-war-hengshui> · 在线版：<https://qingyu107.github.io/grail-war-hengshui/>

## 接手先读这三份

1. **本文件** —— 现状、命令、坑。
2. `docs/TIMELINE.md` —— **下一件事的完整规格**（档案馆里的路线小说，11 条线）。
3. `README.md` —— 面向玩家的功能说明，改玩法时要同步。

推送走 skill：`gh-api-push`（本机 `~/.dsh/skills/gh-api-push/`），`git push` 在这台机器上不通。

## 0. 一句话现状

游戏能从头玩到尾（序章 → 7 天 ×（点名 + 时段 + 自由行动 + 夜行）→ 11 个结局），
地图/战斗/月考/存档/档案馆/羁绊/设置页/关系档案都在；文本全量 3.7 万字，单局读到约 1.5 万。
战斗是五指令 + 预兆 + 破绽，羁绊 LV.1–3 直接进战斗与结局，SAN 分五档会咬人。
本地与远端内容一致，但 **git 历史是分叉的**，且 **github.com:443 不通**——推送走 API（见 skill `gh-api-push`）。

## 1. 三条命令

```powershell
# 环境：node 不在 PATH，用这个
$node="C:\Users\青雨\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
$py="C:\Users\青雨\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe"

# 自测
& $node tools\smoke.js              # 数据完整性 + 11 个结局判定（必须全绿）
& $node tools\careful.js            # 四策略模拟通关
& $node tools\cdp.js play           # 无头浏览器：封面 → 结局全流程（含夜晚 / 战斗 / 月考 / 重掷）
& $node tools\cdp.js flow           # 无头浏览器跑完整流程
& $node tools\cdp.js reroll         # 令咒重掷回归（失败 → 重掷 → 还能继续）
& $node tools\cdp.js b2             # 新战斗层：五指令 / 预兆 / 破绽 / 特效节点
& $node tools\cdp.js ending         # 结局页是否能打开（曾因 ReferenceError 白屏）
& $node tools\cdp.js d6b            # 剧情入口 → 战斗 → 回剧情
& $node tools\cdp.js examflow       # 月考五题 → 评级
& $node tools\cdp.js mapflow        # 地图 → 地点 → 事件
& $node tools\cdp.js mobile         # 390×844 手机端截图与溢出检查

# 推送（github.com 不通，只能走 API）
& $py tools\gh_api_push.py          # 默认增量（只推暂存区改动）；全量加 --full

# 推送这件事的完整流程、七个坑、验收清单，已整理成 skill：
#   ~/.dsh/skills/gh-api-push/SKILL.md   （脚本：scripts/gh_api_push.py，参数化，换项目也能用）
```

`tools/cdp.js` 里还有 `beastfight` / `panels` / `audio2` / `audio5` 等 mode，都是无头验证用的。

## 2. 架构地图

| 文件 | 职责 | 注意 |
| --- | --- | --- |
| `index.html` | 单页入口，script 顺序有依赖 | 新 data 文件要加在 `ui.js` 之前 |
| `js/ui.js`（~2200 行） | 流程与渲染，一切都在这里 | 最重，改前先 `node --check` |
| `js/engine.js` | 状态机、检定、结算、存档 | `newState()` 决定字段；自动档与手动档分开 |
| `js/avg.js` | 打字机 + 演出卡（summon/noble/beast/glitch） | `stinger('noble')` 自己起 BGM |
| `js/audio.js` | BGM：真音源优先 + WebAudio 合成兜底 | `play(theme, {quick:true})` 是宝具用的短渐入 |
| `js/sfx.js` | 合成音效（打字/骰子/心跳/盖章） | 独立 AudioContext，可静音 |
| `js/battle.js` | 回合制战斗逻辑（不碰 DOM） | 只吃 `CFG`；`act()` 返回 `fx` 队列给 ui 演 |
| `assets/css/battle.css` | 战斗层 / 五指令 / 各种特效 / 手机断点 | 新增文件，特效节点 `.bfx.*` |
| `js/data/story_a.js` `story_b.js` | 主线时段（7 天） | 每个 option 必须有 `fx`，否则 smoke 报错 |
| `js/data/map.js` | 10 个地点 + 10 个固定事件 | 自由行动 + 夜巡共用事件池 |
| `js/data/npc_events.js` | 其他御主支线（12+ 条） | 同事补了高鹏/赵铁柱/林小满 |
| `js/data/exam.js` | 70 道初中题 | `{id, subj, q, opts[4], a, why}` |
| `js/data/barks.js` | 从者插话 9×6 句 | 按 `tag` 匹配状态 |
| `js/data/endings.js` / `endings_extra.js` | 结局判定 + 加厚段落 | 判定顺序见 `judge()` |
| `js/data/bonds.js` | 九骑 × 三段羁绊（d2c/d5c/d6c） | `nodes` 的 key 只是「节拍」，实际按未读顺序取 |
| `js/data/bonds_extra.js` | 九骑 × 一段加演 | 夜间主线走完后触发，一篇一次 |
| `js/data/night.js` | 夜间行动：四选一 + 按天/状态的引言 | 数值与文案都在这里，smoke 也读它 |
| `js/data/common.js` | 共通线：每日点名 / 公共叙事 / 幻觉 / 决战回顾 | 只提供句子，判定不在这里 |
| `js/data/expand.js` | 收束段 24 + 引言加厚 24 + 插叙 3 | 按 slot id 取，不改 story_a/b |
| `js/data/endings_more.js` | 结局第三组（11 × 2 段） | 子代理写的，已校 |
| `js/data/bonds_more.js` | 羁绊「加演二」九段 | 子代理写的，已校 |
| `js/data/flags.js` | 事件影响的中文名（160+ 条） | 查不到的键 `flagLabel` 返回 null，界面只显示中文 |
| `assets/css/ui.css` | 设置页 / 关系档案 / 档案夹标签 | 与 battle.css 分开 |
| `assets/css/fx.css` | 四种整屏演出 + SAN 分档画面 | 精神越低，字越不老实 |
| `js/data/codex.js` `summon.js` `roster.js` `quiz.js` | 内容数据 | — |

## 3. 数据契约（改数据前必读）

**选项**（story / map / npc_events 通用）：

```js
{
  id, label, sub,
  check: { skill: '侦查', bonus: 0 },          // 可选；有 check 就必须有 ok 和 fail
  ok: { text: [...], fx: {...} },
  fail: { text: [...], fx: {...} },
  text: [...], fx: {...},                       // 不带 check 的写法
  battle: { foe: 'archer' | 'auto' | 'beast', scale: 0.5, allies: 3 },
  exam: true,                                   // 进月考小游戏
  req: { flag, command, allies, clueCount, route }
}
```

**fx 白名单**：`san / exposure / demerit / beast / mp / clue / clueAll / flag / log / stat / bond / allies / alive / kills`。
**每个 option 必须有 fx**，`tools/smoke.js` 会检查 `no fx`。

**clue 写法**：`clue: { saber: 3 }`（值是情报等级 1–5）。**指向自己从者的 clue 会被 `apply()` 拦掉**，折算成 SAN +1。

**bond 写法**：只出现在羁绊节点上，`ui.js` 解析羁绊选项时会自动追加 `{bond:1}`，数据里不用写。

## 4. 已知的坑（踩过的）

1. **`st.s.servantId` 不存在**。`servantId / masterId / routeId` 在 state **顶层**，`st.s` 里没有。写错过三次，症状是「自己的从者」判定全失效。
2. **`github.com:443` 不通**，`api.github.com` 与 `ssh.github.com:443` 通。所以：不能 `git fetch/pull/push`；同步用 API 下载（`/contents/{path}?ref=SHA` + `Accept: application/vnd.github.raw`，大文件要分段读 + 重试，否则 `IncompleteRead`）。
3. **推送会全量重传**（~48 MB，3 分钟），脚本以远端 main 为 parent 建 commit，相当于把分叉接回去。
4. **`data/` 里每个 option 都要 `fx`**，空对象 `{}` 也算，否则 smoke 挂。
5. **`rich()` 只放行 `<span class="dialog">`**，其余 HTML 会被转义；`markup()` 生成的 `<em class="kw">` 是在 `paras()` 内部拼的，能正常渲染。改正文格式时注意这条链路：`rich()` → `paras()` → `markup()`。
6. **战斗后 HP 归零但没死**会被写成 0，下一场开局就躺——已在 `battle.settle()` 里加「没死留 1 点」。
7. **手机端**：960px 以下侧栏变底部抽屉、音频条缩成圆钮；`#app` 有 116px 底部 padding 防止被抽屉遮。

## 5. 待修 / 待验证清单

> 2026-11-10 第二轮：P0 全部修完，P1 四项已处理，P2 部分处理。细节见 §8。

**P0（影响正确性）**

- [x] 地图与 NPC 事件的 `clue` 没过滤「玩家自己的从者」——已在 `Engine.apply` 里拦掉，命中自己时折算成 SAN +1 并在反馈里写明「这条线指向你自己」。
- [x] `E.save()` 无参时写回 `S.slotUsed` —— 存档拆成两套：`autosave()` 只写 `…_auto`，手动 `save(n)` 才动槽位与 `slotUsed`；`load()` 无参优先读自动档。旧档用 `migrate()` 补 `bond / nights / bondSeen`。
- [x] `barkShown` 是模块级对象 —— 新增 `resetSession()`，新开一局、读档、回到封面都会清。

**P1（体验）**

- [x] 手机端战斗层：新增 `assets/css/battle.css`，960 / 520 两档断点重排（敌我立绘不再互压、名字不溢出、指令 3+2 两行）。
- [x] 文字速度只作用于打字机 —— `paras()` 现在读同一档 `grail_speed`，逐段 delay 与 duration 一起缩放，瞬显直接落地。
- [x] 兽战玩家护体倍数硬编码 —— 进 `battle.js` 的 `CFG.beastGuardMul`（3.2），同表还有 `playerHpMul / foeHpMul / attackBase / bondDmg / bondGuard` 等。
- [x] 档案馆只记结局与从者 —— 现在记：结局图鉴、同行从者（带最高羁绊）、8 个成就、最近 30 次记录。

**P2（内容）**

- [x] 11 个结局正文再厚一轮 —— `endings_extra.js` 新增 `after2`：每个结局补一段「制度那一侧」的收尾；外加按羁绊等级取的三段尾声。
- [x] Day5 校门、Day7 决战只有一处战斗入口 —— 夜间「下楼走一圈」会抽到遭遇战（55%），实际每局多出 1–3 场。
- [x] `EXAM.from` 用后没清 —— 交卷时置空。


## 6. 关键数值

- 技能底值：`CAMPUS` 表（engine.js），中位 30；属性兜底 `floor(attr × 0.6)`。
- 战斗：玩家 HP = (CON+SIZ)/10；普攻 1D8+STR/20；宝具 2D8+6；敌方普攻 1D6+1、宝具 3D8。
- 兽：HP 58 × scale；会随机借用「在场且未退场、不是你、不是盟友」的从者宝具（2D8+6）。
- 结局判定顺序：许愿（E10/E11/E1）→ 全灭 E2 → 曝光 E3 → 门开 E7 → 归因 E6 → 兽满（E8/E5/E4/E9）→ 断电 E4 → 七人齐 E8 → 兜底。
- `smoke.js` 随机 40 局的分布应在 E9 约 30%、E4 约 40%，其余分散。

## 7. 本地 git 状态

```
bc1f2fd  同步远端 e0f77843（同事的修复）
0b6e093  演出增强
cd832c8  初版
```
远端 `main` = `e0f77843`。内容一致，历史不同。下次推送用 `tools/gh_api_push.py`。
token 在 `tools/.gh_token`（已 gitignore），不需要就去 GitHub 吊销。

## 8. 2026-11-10 第二轮改了什么

玩家反馈五条：令咒重掷后卡住、羁绊太薄、宝具 BGM 不跟演出、战斗没特效也不够长、选项把后果写太明白、七天装不下东西。

**令咒重掷（真 bug，三条叠在一起）**

1. `reroll()` 直接 `ui.snapshot` 回档，但没解 `br.text` 可能是函数 → 抛错卡死；
2. 重掷成功后没有重掷按钮，代码却无条件 `acts.removeChild(acts.firstChild)`，把「继续」删了 → 只能刷新页面；
3. `ui.snapshot` 为空时 `setState(null)`，整局没了。

现在：能掷才掷、文本解函数、只在「本次仍失败且还有令咒」时给按钮、走完必留「继续」，并且重掷结果若带 `battle / exam` 会正确转场。回归用 `node tools/cdp.js reroll`。

**宝具 BGM 与演出同帧**

`nobleCut()` 先起曲（`GrailAudio.play(theme, {quick:true})`，渐入 0.8s → 0.14s）再压演出卡；`avg.js` 的 `noble` 分支自己也会兜一次（`data.theme`）。以前 0.8s 渐入放在 2.6s 的卡里，耳朵上就是「画面过半才有声」。

**战斗（js/battle.js 重写）**

- 五手：交手 / 架住 / 读招 / 宝具 / 撤；敌方每回合先给一句**预兆**，读招把它翻成明确意图 + 当回合减伤 60% + 叠破绽。
- 破绽 3 层满 → 下一手必中加伤；架住减伤按羁绊 45%→36%；盟友每两回合补刀、可能挡刀。
- 兽三阶段（66% / 33%），会借用在场从者的宝具、会「点名」。
- 数值进 `CFG`：`playerHpMul 2.8 / foeHpMul 1.75 / beastHpMul 1.5 / attackBase 18`；实测普通遭遇 6–9 回合，决战 5–12 回合。
- 特效在 `assets/css/battle.css` + `ui.js` 的 `combatFx()`：刀光（暴击红）、护体环、扫视线、红边受击、退场烟、破绽裂字、蓄力红光、替身白闪、阶段「翻页/点名」。

**羁绊（不再是纯奖励文本）**

- `s.bond` 0–3，来源：主线三段（d2c/d5c/d6c，按「下一段没看过的」取，不再是钉死的 slot）、夜间「去找从者」、打赢一场（50%）、加演一段。
- 进战斗：伤害 +0/1/2/4、判定 +0/5/8/12、架住系数、LV.3 每场一次「替身」；也进 `Engine.skillValue`（意志/闪避/战斗）。
- 档案夹新增「羁绊」页：等级条、当前效果、四段进度。
- 结局页多一行「与从者的羁绊 LV.n」和按等级取的三段尾声。
- 新增 `js/data/bonds_extra.js`：九骑各一段「加演」（夜里主线走完后可触发）。

**选项不再剧透**

- 卡片上不再显示 `sub` 原文（里面写着「曝光 · 高危」「赢 · 圣杯 · E1 / E10」）、不再显示检定目标值 `目标 45`；
- 只留中性的「判定 · 侦查 / 交手 / 答题」，成功率与后果都不给；
- 许愿卡也去掉了「E1 / E10」这类结局编号；
- 选完之后的数值反馈保留（那是结果，不是赔率）。

**节奏**

每天走完时段后进「熄灯以后」，四选一（复盘 / 巡夜 / 找从者 / 早睡），选完才翻篇。夜晚是独立行动，因此 7 天从约 28 次落笔变成约 37 次；巡夜会把地图事件池和遭遇战也摊开，`早睡` 是唯一能按住兽进度的选项——想控兽就得让掉一次夜间行动。

**验证**

```powershell
& $node tools\smoke.js        # 数据完整性 + 11 个结局判定（现在也跑夜行）
& $node tools\careful.js      # 四策略模拟
& $node tools\cdp.js play     # 无头浏览器从封面自动打到结局（含夜晚/战斗/月考）
& $node tools\cdp.js reroll   # 令咒重掷回归
& $node tools\cdp.js b2       # 新战斗层：五指令 / 预兆 / 破绽 / 特效节点
& $node tools\cdp.js ui2      # 设置页 / 关系页 / 键盘 / 契约 berserker 守卫
& $node tools\cdp.js night2   # 刺客线：同一晚两次夜行，第二次不被 flag 短路
```

## 9. 第三轮（同日，玩家反馈第二批）

**契约 berserker 仍会打 berserker** —— 根源在数据：`story_a.js` 的 `d1c0`（Day1 夜教学战）把 `battle.foe` 写死成 `'berserker'`。契约到 berserker 的玩家会在楼下遇见自己（立绘、名字、宝具全一样）。
改法两层：数据改成 `foe: 'auto'`；`startBattle` 加保险——`cfg.foe === st.servantId` 时一律改走 `randomFoeId()`。回归用 `cdp ui2`（末尾会伪造一次「打自己」）。

**事件影响改成中文** —— 新增 `js/data/flags.js`，160 多个 flag 的中文名；`Engine.flagLabel()` 查不到就返回 `null`，`flagNote()` 给一句中性话。档案夹「被记下来的」不再出现 `fixjiahao` 这种英文键，只多一行「另有 n 条记录，还没写上名字」。

**设置页**（`openSettings`）—— 封面与档案夹都能进：主音量、**全部静音（同时管 BGM 与音效）**、音效开关、文字四档、故障闪/抖屏「全开·减弱」、三个手动槽的读存删、清空进度（两步确认）。
以前静音只静 BGM：`GrailSFX.setMuted` 全项目 0 处调用，打字和骰子照响。现在 `applySettings()` 一处接线。

**关系档案** —— 档案夹第 3 个标签「关系」：九位「档案里的人」各一张卡（你自己 / 已退场 / 打赢过他的从者 / 合作中 / 接触过 / 未接触），外加「结下的人情」一栏。数据全靠现有 flags 推导，没有新状态。

**键盘** —— `1–9` / `A–D` 选选项，`Enter`/`Space` 继续（打字中先跳过），`Esc` 关弹层。战斗中不响应 Esc。

**判定接入夜行与羁绊** —— `judge()` 的「人味」一栏原本只认 8 个固定 flag，夜里做的事一个都不算。现在：非早睡的夜晚 ≥4 次，或羁绊 ≥2，也算人味。三条新用例进了 smoke。

**其余清理**

- 撤退不再免费：MP −40%、情报不涨（以前只有 SAN −1D3，命中率 73% 起）。
- 夜战（巡夜撞上的那一场）赢了多记一级情报、羁绊概率 0.72，SAN 扣 d(6)。
- 死代码：删掉 `s.ap`、`fx.awake`；`roster` 的 `nightAP:1` 真实现了（刺客线每晚多一次行动），不再是个空承诺。
- `beastPhase` 事件原来发出去没人听，删掉，演出改由 `fx` 队列里的 `phase` 负责。
- `migrate()` 按 `s.bond` 把前面几段羁绊补成「已看」，旧档读进来不会把第一段再演一遍。
- 夜行抽成 `js/data/night.js`，smoke 在 node 里也跑七个晚上（以前只有 cdp 覆盖）。
- 深夜行有两次（刺客线）时，`night2_<day>` 由 `nightPick` 落笔，`advance()` 只负责把玩家送回夜行界面——先设 flag 会让第二次进来直接判成「已选过」。

## 10. 第四轮：剧本体量与 SAN



玩家反馈三件事：故事太短、故障/扭曲的抽象感不够、SAN 掉了没感觉。

**先量了一下**（脚本见提交说明）：主线全部含所有分支 11,518 字，但单局只读得到 **4,772 字**；单个结局 443 字；一条羁绊线 710 字。7 天里每天约 600 字——不是「感觉短」，是真的短，差两到三倍。

**补了什么（新增 9,573 字，单局可读 +约 4,900）**

| 块 | 字数 | 数据 |
| --- | --- | --- |
| 段落收束（24 段） | 772 | `expand.js` |
| 引言加厚（24 段 × 2 句） | 1,592 | `expand.js` |
| 中段插叙（Day2/4/6） | 560 | `expand.js` |
| 每日点名 + 公共叙事（7 天） | 1,277 | `common.js` |
| SAN 幻觉（8 条） | 655 | `common.js` |
| 决战回顾 | 481 | `common.js` |
| 结局第三组（11 × 2 段） | 1,761 | `endings_more.js` |
| 羁绊加演二（9 骑） | 2,016 | `bonds_more.js` |

**共通线**（玩家原话「共通线是必要的东西」）：每天开头先播一次教务处点名——应到 6012、在场御主 n/7、谁没答到、兽走到第几格——再播一段当天公共叙事。它不是旁白，是这份档案本身在记录；也是唯一「不管你选什么都一样」的参照系。

**决战回顾**：04:00 之前一段，用 `st.s.flags` 里真实存在的键生成（`savedRunner` / `stayed` / `know1994` / 夜里几晚没睡 / 羁绊等级）。每个人看到的段落不一样，这是全游戏唯一一次把七天串成一条线。

**SAN 分档**（`Engine.sanTier` + `SAN_FX`，五档）：
- 检定 −0/−5/−12/−22/−35，交手伤害 −0/0/−1/−2/−4，挨打 +0/0/+1/+2/+4
- 画面：`body.san-1..4` → 正文红/青色差、字在飘、四边压暗、场景图掉对比
- **幻觉选项**：tier ≥ 2 时，选项里会插一条不存在的（`common.js` 的 `hallucinations`），外观编号和别的完全一样；为不露馅，插在中间并把总数压回 4 个
- 从者插话频率 0.42 + tier×0.13
- `Engine.skillValue` 与 `battle.skillOf` 走同一张表，不许各写一套

**演出**：新增四种整屏（`dissolve` / `static` / `mirror` / `bleed`）+ `fx.css`。
Day6 走廊变形改用 `mirror`，E7 用 `bleed`，E2/E3 用 `static`，幻觉命中时抖一下 `static`。
`#dev=fx&k=mirror` 可以单独预览。

**新增自测**

```powershell
& $node tools\cdp.js ui2   # 设置 / 关系 / 键盘 / 自己打自己
& $node tools\cdp.js night2
# 视觉：dev=rollcall / dev=low / dev=hall / dev=recall / dev=fx&k=mirror
& $node tools\cdp.js shot "…#dev=hall" tools\t_hall.png 1200 1200
```

## 11. 第五轮：抽卡分配修复 + 下一件事

**「老是抽到重复的从者」查出来两个真问题**（`Engine.score()`）：

1. `order` 数组里**漏了 ruler** —— 登记题给了它 8 处加权，但它永远抽不到。
2. 题库对不同职阶的加权次数本来就不一样（berserker/assassin 各 10 处、caster/saber 各 7 处），
   直接比原始分 → 先验严重偏斜。3 万次随机模拟：berserker 22.1%、assassin 18.1%、
   **caster 4.3%、saber 5.1%**，最大差 5 倍。所以会觉得「怎么老是那几个人」。

修法：按每个职阶的**可达上限**归一化再比大小；平手不再按固定顺序排（那会让第一个永远赢），
改用答案哈希挑——**同一个答案永远抽出同一个从者**，但整体分布均匀。
修完 3 万次模拟：7.9%–13.3%，9 位全部可达。

**下一件事**：`docs/TIMELINE.md`。档案馆里加「时间线」，通关一半（已见结局 ≥6）
后解锁，11 条线对应 11 个结局，每条是一篇小说，群像，覆盖固定剧情在自己这条线上的走法。
规格、数据结构、UI、验收清单都在那份文档里，按里面的三阶段做。

## 12. 第六轮：时间线 + 数字口径 + 身份线

这一轮做了四件事，都跟「这游戏到底有几个人」有关。

### 12.1 先钉数字：`docs/CANON.md`

以前 6012 / 七位 / 九骑混着用，互相打架。现在有了一份口径表，**改任何数字之前先看它**：

- 学生 **6000**（不是 6012）。礼堂 2000 座，动员大会分三批。
- **九位御主对九骑从者，一一对应**：江野↔Saber、张远↔Archer、吴迪↔Lancer、王大力↔Rider、邹丽君↔Caster、李嘉豪↔Assassin、高鹏↔Berserker、赵铁柱↔Ruler、林小满↔Foreigner。
- **七席参赛**（玩家 + 六个 NPC 常规御主）。赵铁柱是裁判、林小满是编外，两位不算参赛者。
- 名单七行：前六行已登记，**第七行留给你**——灯灭那一秒才拿到令咒。
  所以「参赛者七名，已到六名」是对的：六个登记了，第七个是你。
- **孙笑川**是被念出来的第八个名字，不在名单上。

改了的地方：`story_prologue.js` 的校务日志（6012→2000，注明分批）、`ui.js` 每日点名、`codex.js` 校务日志。

### 12.2 时间线（档案馆第二个标签）

- 数据：`js/data/timeline.js`（E1 样板，6724 字 6 章）+ `timeline_e2e9/e3e8/e4e11/e5e10/e6e7.js`（子智能体分线写的）。
- 阅读器：`js/timeline_ui.js` + `assets/css/timeline.css`。
- 解锁：已见结局 ≥6。未解锁显示「再走几条路，这里才会打开。」
- 列表：11 条，锁着的线标题显示 `？？？`，点开有提示。
- 进度：`localStorage['grail_archive_v1'].read[E1]`（读到第几章）、`.readDone[E1]`（读完）。
- 手机端：列表变横向条，阅读区占满。

**演出**：正文里带 `fx` 的那一项会渲染成一条「演出条」，滚进视口就自己炸开，
放完变灰、可重放。支持 `clash`（同屏宝具对轰，新增）/ `noble` / `summon` / `broadcast` / `roll` / `impact` / `glitch` / `beast` / `static` / `mirror` / `bleed` / `dissolve`，以及 `{bgm:'battle'}` 换曲。

`fx-clash` 是这一轮新做的：两块真名牌从左右压进来，中间撞一次——白闪、三圈冲击波、
震屏、缝里留一条还在抖的白光，BGM 换 `battle`，音效走 `GrailSFX.boom()`。预览：`#dev=clash`。

### 12.3 开局答题：9 问 → 14 问 + 身份栏

- 新增第零问「你在这所学校里是谁」：学生 / 老师 / 学生会干事。
- 身份决定从者池（`engine.js` 的 `ROLE_POOL`）：
  `student` → 六骑常规；`teacher` → Caster/Ruler；`staff` → Foreigner/Ruler。
  不在池里的从者连候选都不是——这条界不能被题库加权冲掉。
- 御主与从者改成**硬绑定**：先定从者，御主只在该从者对应的那张卡里选。
- 新增 q10–q14 五道题（晚自习最后十分钟 / 手机里那段视频 / 背后那句话 / 如果能重来 / 印子什么时候烫）。
- 3 万次模拟：学生 60%、老师 20%、干事 20%，九骑全可达，九对配对没有串。

### 12.4 身份线：`js/data/story_paths.js`

学生走默认主线。另外三种身份每天开场先过一段只属于他们的（不占行动点、不改主线）：

| 线 | 御主 | 视角 |
| --- | --- | --- |
| 教师线 | 邹丽君 | 巡堂、阅卷、监考护学生、家长会顶人、吹哨拦挖掘机、广播室、楼下点名 |
| 裁判线 | 赵铁柱 | 386 路监控、排名系统第七行、巡考、二楼约谈、主席台、广播总闸、代理第七席 |
| 降临者线 | 林小满 | 广播站那部手机、剪那一段楼梯、考场门缝、家长会走廊、直播挖掘机、私信、后山那扇门 |

接入点：`renderSlotInner()` 里，点名之后、插叙之前，`identityOf(st)` 不是 student 就 `renderIdentityFrame(st)`。

### 12.5 错位召唤写成 if 线

相性 E 不再只是「属性 −10」的一句话。`story_prologue.js` 的 `p3` 加了 `variant.misfit`：
同一格整段换掉——它站在床边，说「你叫错了」。三个选项各自有不同的压法。

**判定书页只在纸的四周透一点红**（`#assign-root.misfit`，会呼吸），不写一个字预告。
进房间那张召唤卡也照常播——正常的那一骑、正常的「契约成立」。

**撕裂发生在卡片自己身上**（`avg.js` 的 `missummon`）：

| 时刻 | 画面 |
| --- | --- |
| 0 – 1.15s | 完全正常的契约卡 |
| 1.15s | 中间裂开一条缝，白线炸开，原卡抖、偏色、碎掉 |
| 1.2 – 1.9s | 黑从缝里涌出来，`clip-path` 从 1% 撑到 100%，把原卡整个盖住 |
| 2.1s | 一圈放射状红光（`repeating-conic-gradient`）从中心往外扎 |
| 2.3s | 三个不规则圆环法阵，各转各的 |
| 2.6s | 名字一个字一个字「扎」进来（`stabIn`，每个字带随机位移、旋转、模糊） |
| 3.85s | 「你叫错了。」 |

- 从者带「暴走」状态：`s.flags.misfitSummon`。
- 第一场战斗之前，`startBattle()` 会先走 `misfitPrelude()`：POW 检定。
  过了，你能压住它（SAN −1）；没过，它先打最近的一个人——通常是你（HP −3~8，SAN −3）。

**相性算法也修了**：以前关键词判定是「tag 出现过一次就算命中」，而单题就给 2–3 分，
结果 A+ 占 79%、**错位 0%**，永远抽不到。现在改成累计强度过线（`KEY_THRESH = 8`）：

| | A+ | A | C | E |
| --- | --- | --- | --- | --- |
| 改前 | 78.7% | 19.4% | 1.9% | 0.0% |
| 改后 | 20.3% | 39.0% | 31.0% | 9.7% |

错位的实现：池子里取**最低分**的那一骑，御主卡仍按「本该」的那张给——
两张牌对不上，就是错位。

### 12.6 验证

```powershell
& $node tools\smoke.js    # 现在也校验 11 条时间线：5–7 章 / ≥4000 字 / ≥4 组御主 / 有演出 / 无 6012
& $node tools\cdp.js tl   # 时间线：解锁 → 列表 → 阅读器 → 目录 → 对轰 → 归档 → 重开续读
& $node tools\cdp.js tlclash
# 预览：dev=misfit（错位召唤） / dev=idf&k=teacher|ruler|foreigner（三条身份线） / dev=clash
```

### 12.7 这一轮补的另一半

**主线战斗里的宝具对轰**：以前只有单张真名卡，现在 `battle.js` 会看这一手敌方的意图——
它也在放宝具，就合并成一次 `nobleClash`；`ui.js` 的 `clashCut()` 播同屏对轰，不再放两张单独的卡。
单测：敌方 intent=noble 时只发 `nobleClash`，普通回合发 `myNoble`，不重复。

**11 条线全部有对轰**：补了 E9/E3/E8/E11/E7，双方按该线在场的人定（E9 是 Archer 对 Saber、
E3 是 Foreigner 对 Ruler、E11 是 Assassin 对 Rider、E7 是 Foreigner 对 Beast）。

**对轰改成「分开 → 融合 → 炸裂」**：两块牌先挤进中线（变白热），中间一道白柱焊住，
再被炸开，然后三圈冲击波。手机端整体转 90 度：上牌贴中缝、下牌贴中缝、缝变横、融合柱横着长。

**阅读器的四件小事**

- 从者小头像（`.tl-cast`）：数据里那个 `cast` 字段终于用上了，一排灰头像，指上去才亮。
- 滚到底自动记「读完」，不用非得点按钮；读完列表立刻刷新。
- 换章时把上一章的 `IntersectionObserver` 摘掉（以前会泄漏，旧节点还在观察）。
- 读小说时换 `daily` 底噪，关掉回 `title`。

**设置里加了「解锁全部」**：`grail_unlock_all`。它只改「看得见什么」——不写结局、不动存档，
关掉就恢复原样，所以可以放心点。

**手机端**：时间线阅读区改成内部滚动（以前是 auto，整章一次展开会让所有演出同时触发）；
390×844 实测无横向溢出（scrollWidth 390 = clientWidth 390）。

**还没做完**

- 时间线里 E3（6457）、E11（6705）是现在最薄的两条，都在规格内，但离 7000 还差一截。
- 身份线目前只有 Day 1–7 的过场，序章（Day 0）还是学生视角。
