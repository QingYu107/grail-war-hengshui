/* 入学登记表 · 六问
   每题选项带四类权重：servant(相性)、route(职介线)、persona(御主卡匹配)、stat(属性微调)
   另把答案写进「四问」：欲望 / 恐惧 / 口头禅 / 作息 */
(function () {
  'use strict';

  var QUIZ = [
    {
      id: 'q0', no: '第零问', title: '登记之前，先填身份。你在这所学校里是谁？', hint: '身份决定你能进哪扇门。',
      options: [
        {
          key: 'A', label: '高一或高二的学生，普通班。', role: 'student',
          servant: { lancer: 1, foreigner: 1 }, route: { flow: 1 }, persona: { group: 2, quiet: 1, online: 1 },
          stat: { app: 2, con: 2 },
          four: { schedule: '05:30 起床，22:30 回寝，白天在走神。', catch: '「等下再说。」' }
        },
        {
          key: 'B', label: '高三，或者复读部。', role: 'student',
          servant: { archer: 2 }, route: { intel: 1 }, persona: { study: 3, stuck: 2, anxious: 1 },
          stat: { int: 3, edu: 3 },
          four: { schedule: '01:00 睡，05:30 起，白天靠浓茶。', desire: '一个确定的、写下来的结果。' }
        },
        {
          key: 'C', label: '体育或艺术特长生，训练队里。', role: 'student',
          servant: { saber: 2, rider: 1 }, route: { assassin: 1 }, persona: { body: 3, hard: 2 },
          stat: { str: 4, con: 3 },
          four: { schedule: '练到灯关，回宿舍翻墙进去。', catch: '「再来一遍。」' }
        },
        {
          key: 'D', label: '老师。我在这所学校里教书。', role: 'teacher',
          servant: { caster: 2, ruler: 1 }, route: { rule: 2 }, persona: { adult: 3, proud: 2, obey: 1 },
          stat: { edu: 4, pow: 2 },
          four: { schedule: '05:20 到校，22:40 查完寝，中间批两摞卷子。', desire: '被人当成一个有分量的人，而不是一个岗位。' }
        },
        {
          key: 'E', label: '学生会的，或者教务处的干事。', role: 'staff',
          servant: { foreigner: 2, ruler: 2 }, route: { flow: 2, rule: 1 }, persona: { record: 3, clever: 2, adult: 1 },
          stat: { app: 3, int: 3 },
          four: { schedule: '别人上课我在拍，别人睡觉我在剪。', desire: '让这条被一百万人看到——或者，让它在名单上消失。' }
        }
      ]
    },
    {
      id: 'q1', no: '第一问', title: '凌晨四点，你在做什么？', hint: '不要想，选你真正做过的那件事。',
      options: [
        {
          key: 'A', label: '在球场上，一个人。',
          servant: { saber: 3, berserker: 1 }, route: { assassin: 1 }, persona: { night: 2, body: 2, alone: 2 },
          stat: { str: 5, con: 5 },
          four: { schedule: '04:00 起，天没亮就在球场，05:20 混进跑操队伍。', desire: '被换上场，然后赢一次。' }
        },
        {
          key: 'B', label: '在教室里，抄最后一道错题。',
          servant: { archer: 3, ruler: 1 }, route: { intel: 2 }, persona: { study: 3, anxious: 2 },
          stat: { int: 5, edu: 5 },
          four: { schedule: '01:00 睡，05:30 起，白天靠浓茶。', desire: '一个确定的、写下来的结果。' }
        },
        {
          key: 'C', label: '在床上，屏幕照着天花板。',
          servant: { lancer: 3, foreigner: 1 }, route: { flow: 2 }, persona: { online: 3, night: 1 },
          stat: { dex: 5, pow: -2 },
          four: { schedule: '03:00 还没睡，白天趴桌，午休补觉。', desire: '被人当成最强，不是「那个社的」。' }
        },
        {
          key: 'D', label: '在睡觉。我四点为什么要醒。',
          servant: { assassin: 3, rider: 1 }, route: { coop: 1 }, persona: { lazy: 3, quiet: 2 },
          stat: { pow: 3, dex: 2 },
          four: { schedule: '能睡就睡，白天像不在场。', desire: '不被任何人安排。' }
        }
      ]
    },
    {
      id: 'q2', no: '第二问', title: '你左手背上出现了一个印记，像你的证件照。你的第一反应？', hint: '这是第一件真正属于你的事。',
      options: [
        {
          key: 'A', label: '先拍照，再查这玩意儿值多少钱。',
          servant: { archer: 1, ruler: 2, caster: 1 }, route: { intel: 3 }, persona: { clever: 3, deal: 2 },
          stat: { int: 4, app: 2 },
          four: { catch: '「先说价。」', desire: '知道别人不知道的那一半。' }
        },
        {
          key: 'B', label: '把它藏进袖子里，谁也不说。',
          servant: { assassin: 2, rider: 2 }, route: { assassin: 3 }, persona: { quiet: 3, night: 1 },
          stat: { dex: 4, pow: 2 },
          four: { catch: '「……哦。」', desire: '不让任何人知道我在做什么。' }
        },
        {
          key: 'C', label: '去办公室，问老师这算不算违纪。',
          servant: { ruler: 2, caster: 2 }, route: { rule: 3 }, persona: { obey: 3, adult: 2 },
          stat: { edu: 4, pow: 1 },
          four: { catch: '「这个要报备吧。」', desire: '把一件怪事变成一件手续。' }
        },
        {
          key: 'D', label: '找另外六个人。他们手上应该也有。',
          servant: { saber: 2, berserker: 1 }, route: { coop: 3 }, persona: { group: 3, warm: 2 },
          stat: { app: 4, pow: 1 },
          four: { catch: '「先别打，先说。」', desire: '七个人坐下来，把话说完。' }
        }
      ]
    },
    {
      id: 'q3', no: '第三问', title: '月考出分，你排第 137 名。你做的第一件事是？', hint: '排名公布的那一晚，走廊里很安静。',
      options: [
        {
          key: 'A', label: '算：离前一百还差多少分，几天能补上。',
          servant: { archer: 3, saber: 1 }, route: { intel: 1, rule: 1 }, persona: { study: 3, hard: 2 },
          stat: { int: 4, edu: 3 },
          four: { fear: '排名停在这张纸上，再也不动。', catch: '「差 37 分。」' }
        },
        {
          key: 'B', label: '把成绩单折起来，塞进抽屉最里面。',
          servant: { rider: 3, assassin: 1 }, route: { coop: 1 }, persona: { quiet: 2, avoid: 3 },
          stat: { con: 4, pow: 2 },
          four: { fear: '一辈子站在被人路过的地方。', catch: '「行吧。」' }
        },
        {
          key: 'C', label: '去光荣榜前面站着，看第一名的照片。',
          servant: { foreigner: 2, ruler: 1 }, route: { flow: 3 }, persona: { seen: 3, curious: 2 },
          stat: { app: 4, pow: 2 },
          four: { desire: '被很多人看见——哪怕只看一眼。', catch: '「他笑得真好看。」' }
        },
        {
          key: 'D', label: '在群里发一句「就这」，然后下线。',
          servant: { lancer: 3, berserker: 1 }, route: { flow: 1, coop: 1 }, persona: { online: 3, loud: 2 },
          stat: { dex: 3, app: 2 },
          four: { fear: '被人截图，挂在群里笑三年。', catch: '「这波不怪我。」' }
        }
      ]
    },
    {
      id: 'q4', no: '第四问', title: '班群里，一个人被骂了一整晚。你在做什么？', hint: '手机屏幕的光很亮，也很凉。',
      options: [
        {
          key: 'A', label: '一句一句看完，什么也没发。',
          servant: { lancer: 3, assassin: 1 }, route: { intel: 2 }, persona: { quiet: 2, online: 2 },
          stat: { int: 3, pow: 3 },
          four: { fear: '有一天被骂的人换成我，也没有人说话。', catch: '「看完了。」' }
        },
        {
          key: 'B', label: '私聊他，问他还好吗。',
          servant: { foreigner: 1, berserker: 2, caster: 1 }, route: { coop: 3 }, persona: { warm: 3, group: 2 },
          stat: { app: 4, pow: 2 },
          four: { desire: '有一个人在需要我的时候，真的找我。', catch: '「你还好吗。」' }
        },
        {
          key: 'C', label: '跟着发了两句。反正大家都在发。',
          servant: { berserker: 3, lancer: 1 }, route: { flow: 2 }, persona: { loud: 3, group: 1 },
          stat: { str: 3, app: 2 },
          four: { fear: '我其实是那种人。', catch: '「哈哈哈哈。」' }
        },
        {
          key: 'D', label: '把截图保存下来。以后有用。',
          servant: { ruler: 2, archer: 1 }, route: { rule: 3, intel: 1 }, persona: { clever: 3, adult: 2 },
          stat: { int: 4, edu: 2 },
          four: { desire: '手里握着别人的把柄，就不用怕任何人。', catch: '「这个我先存着。」' }
        }
      ]
    },
    {
      id: 'q5', no: '第五问', title: '你最怕的不是死。是哪一件？', hint: '这题没有体面的答案。',
      options: [
        {
          key: 'A', label: '被人看穿我其实不行。',
          servant: { caster: 3, lancer: 1 }, route: { rule: 1 }, persona: { proud: 3, adult: 1 },
          stat: { pow: 4, edu: 2 },
          four: { fear: '被人看穿我其实什么都不懂。', catch: '「你听懂我的意思了吗？」' }
        },
        {
          key: 'B', label: '明年的这个时候，还是这张桌子。',
          servant: { archer: 1, rider: 2, saber: 1 }, route: { coop: 1 }, persona: { study: 2, stuck: 3 },
          stat: { int: 3, con: 3 },
          four: { fear: '明年的这个时候，还是这间教室、这张桌子的这个划痕。', catch: '「我这个分……」' }
        },
        {
          key: 'C', label: '没人记得我说过什么。',
          servant: { foreigner: 2, ruler: 1 }, route: { flow: 3 }, persona: { seen: 3 },
          stat: { app: 5, pow: 1 },
          four: { fear: '没人看。数据掉下来的那个晚上我睡不着。', catch: '「这条能爆。」' }
        },
        {
          key: 'D', label: '我妈在家长会上念我的名字。',
          servant: { assassin: 2, rider: 1, berserker: 1 }, route: { assassin: 2 }, persona: { avoid: 2, night: 2 },
          stat: { dex: 3, pow: 2 },
          four: { fear: '被叫到名字，然后所有人都回头。', catch: '「别念我。」' }
        }
      ]
    },
    {
      id: 'q6', no: '第六问', title: '只能带走一样东西离开这所学校。你带什么？', hint: '第七天是月假。你有八小时。',
      options: [
        {
          key: 'A', label: '一本写满了字的笔记本。',
          servant: { ruler: 2, caster: 1, archer: 1 }, route: { intel: 2, coop: 1 }, persona: { study: 2, record: 3 },
          stat: { int: 4, edu: 2 },
          four: { desire: '把发生过的每一件事都记下来，一个字都不许丢。', catch: '「我记一下。」' }
        },
        {
          key: 'B', label: '一副耳机，音量开到最大。',
          servant: { assassin: 3, lancer: 1 }, route: { assassin: 2 }, persona: { quiet: 3, night: 2 },
          stat: { dex: 3, pow: 2 },
          four: { catch: '「……哦。」', desire: '把这个世界调小一点。' }
        },
        {
          key: 'C', label: '那个磨破边的抱枕。',
          servant: { berserker: 3, foreigner: 1 }, route: { coop: 2 }, persona: { warm: 2, loyal: 3 },
          stat: { pow: 3, app: 2 },
          four: { desire: '在一个世界里被真正需要——虚拟的也行。', catch: '「凌华——！！」' }
        },
        {
          key: 'D', label: '一部还在录像的手机。',
          servant: { foreigner: 2, lancer: 1 }, route: { flow: 3 }, persona: { seen: 2, record: 1, online: 2 },
          stat: { app: 3, int: 3 },
          four: { desire: '让这条视频被一百万人看到。', catch: '「你们别动，我拍一下。」' }
        }
      ]
    },
    {
      id: 'q7', no: '第七问', title: '手机相册往前翻十张，都是什么？', hint: '不用体面，翻到什么说什么。',
      options: [
        {
          key: 'A', label: '球场、跑道、自己练到很晚的影子。',
          servant: { saber: 2, rider: 1 }, route: { assassin: 1 }, persona: { body: 3, hard: 2 },
          stat: { str: 4, con: 3 },
          four: { schedule: '练到灯关，回宿舍翻墙进去。' }
        },
        {
          key: 'B', label: '截图：分数线、志愿表、别人家的录取通知。',
          servant: { archer: 3 }, route: { intel: 2 }, persona: { study: 3, anxious: 2 },
          stat: { int: 4, edu: 3 },
          four: { desire: '一个确定的、写下来的结果。' }
        },
        {
          key: 'C', label: '表情包、群里别人的黑照、我自己做的图。',
          servant: { lancer: 2, berserker: 2 }, route: { flow: 1, coop: 1 }, persona: { online: 2, loud: 3 },
          stat: { app: 4, dex: 2 },
          four: { catch: '「这图我做的。」' }
        },
        {
          key: 'D', label: '天空、云、路、没人的走廊。',
          servant: { foreigner: 2, assassin: 1 }, route: { flow: 2 }, persona: { quiet: 2, seen: 2 },
          stat: { pow: 3, app: 2 },
          four: { desire: '被一个人认真地看一眼。' }
        }
      ]
    },
    {
      id: 'q8', no: '第八问', title: '晚自习停电，教室一片黑。你的第一反应？', hint: '黑暗里没有老师。',
      options: [
        {
          key: 'A', label: '继续写。看不清就凭手感写。',
          servant: { caster: 2, archer: 1, saber: 1 }, route: { rule: 2 }, persona: { hard: 3, proud: 1 },
          stat: { edu: 3, pow: 3 },
          four: { catch: '「写完了再说。」' }
        },
        {
          key: 'B', label: '摸黑走到走廊，看看别的班。',
          servant: { assassin: 2, rider: 1 }, route: { assassin: 2 }, persona: { night: 2, curious: 2 },
          stat: { dex: 3, int: 2 },
          four: { fear: '被关在一个地方，什么都不知道。' }
        },
        {
          key: 'C', label: '大声讲个笑话，让全班笑一下。',
          servant: { berserker: 3, lancer: 1 }, route: { coop: 2 }, persona: { loud: 3, group: 2 },
          stat: { app: 3, str: 2 },
          four: { catch: '「都别怕，看我。」' }
        },
        {
          key: 'D', label: '趴下睡。反正也看不见。',
          servant: { assassin: 1, rider: 2 }, route: { coop: 1 }, persona: { lazy: 3, quiet: 1 },
          stat: { con: 3, pow: 2 },
          four: { schedule: '只要有十分钟空，就能睡着。' }
        }
      ]
    },
    {
      id: 'q9', no: '第九问', title: '七天后你只能记住一件事。你记哪件？', hint: '不是最难忘的，是你愿意留下的。',
      options: [
        {
          key: 'A', label: '某个人最后说的那句话。',
          servant: { saber: 2, ruler: 2 }, route: { coop: 1 }, persona: { loyal: 3, proud: 2 },
          stat: { pow: 4 },
          four: { desire: '有人在最后还记得我。' }
        },
        {
          key: 'B', label: '排名表上那个数字。',
          servant: { archer: 2, caster: 1 }, route: { rule: 2, intel: 1 }, persona: { study: 2, anxious: 2 },
          stat: { int: 3, edu: 3 },
          four: { fear: '被人看穿我其实什么都不懂。' }
        },
        {
          key: 'C', label: '那双看着我的眼睛。',
          servant: { foreigner: 3 }, route: { flow: 3 }, persona: { seen: 3, warm: 1 },
          stat: { app: 4, pow: 2 },
          four: { desire: '被看见，哪怕只有一次。' }
        },
        {
          key: 'D', label: '一起吃的那顿饭。',
          servant: { berserker: 1, rider: 2, assassin: 1 }, route: { coop: 3 }, persona: { warm: 3, group: 2 },
          stat: { con: 3, app: 2 },
          four: { desire: '有人跟我一起吃饭，不用说话也行。' }
        }
      ]
    },
    {
      id: 'q10', no: '第十问', title: '晚自习最后十分钟，你在做什么？', hint: '那十分钟里，教室里没有人抬头。',
      options: [
        {
          key: 'A', label: '把明天的错题抄到一张新纸上。',
          servant: { archer: 2, saber: 1 }, route: { intel: 2 }, persona: { study: 3, record: 2 },
          stat: { int: 3, edu: 3 },
          four: { catch: '「我记一下。」', fear: '明年的这个时候，还是这张桌子的这个划痕。' }
        },
        {
          key: 'B', label: '盯着窗外，等教学楼最后一排灯灭。',
          servant: { assassin: 3 }, route: { assassin: 2 }, persona: { night: 3, quiet: 2 },
          stat: { dex: 3, pow: 2 },
          four: { schedule: '灯灭之后才算我自己的时间。' }
        },
        {
          key: 'C', label: '在群里发一个表情包，等有人回。',
          servant: { lancer: 3, berserker: 1 }, route: { flow: 2 }, persona: { online: 3, group: 1 },
          stat: { app: 3, dex: 2 },
          four: { catch: '「这图我做的。」', fear: '发出去没人回。' }
        },
        {
          key: 'D', label: '提前三分钟把书包背好，等铃。',
          servant: { rider: 3, assassin: 1 }, route: { coop: 1 }, persona: { avoid: 3, obey: 2 },
          stat: { con: 3, pow: 2 },
          four: { desire: '不被任何人安排。' }
        }
      ]
    },
    {
      id: 'q11', no: '第十一问', title: '你手机里存着一段视频。是什么？', hint: '相册最后一条，你一直没删。',
      options: [
        {
          key: 'A', label: '自己在球场上的一次投篮，投进了。',
          servant: { saber: 3 }, route: { flow: 1 }, persona: { body: 3, hard: 2, proud: 1 },
          stat: { str: 4, con: 2 },
          four: { desire: '被换上场，然后赢一次。' }
        },
        {
          key: 'B', label: '班主任在走廊里骂人的一段。',
          servant: { ruler: 2, archer: 1 }, route: { rule: 3 }, persona: { clever: 3, adult: 1 },
          stat: { int: 4, edu: 2 },
          four: { catch: '「这个我先存着。」', desire: '手里握着别人的把柄，就不用怕任何人。' }
        },
        {
          key: 'C', label: '半夜宿舍楼下的一个人影。',
          servant: { foreigner: 3 }, route: { intel: 2 }, persona: { seen: 3, curious: 2 },
          stat: { app: 3, pow: 2 },
          four: { fear: '没人看。数据掉下来的那个晚上我睡不着。' }
        },
        {
          key: 'D', label: '一段笑声。录的时候不知道是谁在笑。',
          servant: { berserker: 3, lancer: 1 }, route: { coop: 2 }, persona: { loud: 3, loyal: 2 },
          stat: { app: 3, str: 2 },
          four: { desire: '有人跟我一起笑，不用问为什么。' }
        }
      ]
    },
    {
      id: 'q12', no: '第十二问', title: '有人在你背后说了一句话，你听见了。是哪一句？', hint: '走廊很空，那句话很清楚。',
      options: [
        {
          key: 'A', label: '「他也就这样了。」',
          servant: { caster: 3, lancer: 1 }, route: { rule: 1 }, persona: { proud: 3, adult: 1 },
          stat: { pow: 4, edu: 2 },
          four: { fear: '被人看穿我其实不行。' }
        },
        {
          key: 'B', label: '「他其实挺努力的。」',
          servant: { saber: 2, rider: 1 }, route: { coop: 1 }, persona: { hard: 3, body: 1 },
          stat: { str: 3, pow: 3 },
          four: { catch: '「再来一遍。」' }
        },
        {
          key: 'C', label: '「别跟他一组。」',
          servant: { assassin: 2, berserker: 1 }, route: { assassin: 2 }, persona: { avoid: 3, quiet: 2 },
          stat: { dex: 3, pow: 2 },
          four: { fear: '被叫到名字，然后所有人都回头。' }
        },
        {
          key: 'D', label: '「他家里是不是出事了。」',
          servant: { foreigner: 2, berserker: 1 }, route: { flow: 1 }, persona: { warm: 3, seen: 2 },
          stat: { app: 4, pow: 1 },
          four: { desire: '有一个人在需要我的时候，真的找我。' }
        }
      ]
    },
    {
      id: 'q13', no: '第十三问', title: '如果这七天可以重来一次，你想改哪一件？', hint: '只能改一件。',
      options: [
        {
          key: 'A', label: '那天早上，我没有叫醒他。',
          servant: { berserker: 3, ruler: 1 }, route: { coop: 3 }, persona: { loyal: 3, warm: 2 },
          stat: { con: 3, app: 3 },
          four: { desire: '有人在最后还记得我。' }
        },
        {
          key: 'B', label: '那张纸条，我没有交上去。',
          servant: { archer: 2, caster: 1 }, route: { rule: 2 }, persona: { study: 2, anxious: 3 },
          stat: { int: 4, edu: 2 },
          four: { fear: '排名停在这张纸上，再也不动。' }
        },
        {
          key: 'C', label: '那句「我不去」，我没有说出口。',
          servant: { rider: 2, assassin: 2 }, route: { coop: 1 }, persona: { avoid: 3, quiet: 1 },
          stat: { pow: 3, con: 3 },
          four: { desire: '不被任何人安排。' }
        },
        {
          key: 'D', label: '什么也不改。',
          servant: { ruler: 3 }, route: { rule: 1 }, persona: { obey: 3, proud: 2 },
          stat: { pow: 4 },
          four: { catch: '「这个要报备吧。」' }
        }
      ]
    },
    {
      id: 'q14', no: '第十四问', title: '你手背上的那个印子，什么时候会烫？', hint: '最后一次。选你真正注意到的那个时刻。',
      options: [
        {
          key: 'A', label: '凌晨四点整。',
          servant: { saber: 3, assassin: 1 }, route: { assassin: 1 }, persona: { night: 3, hard: 2 },
          stat: { str: 3, pow: 3 },
          four: { schedule: '04:00 醒，比铃早一个半钟头。' }
        },
        {
          key: 'B', label: '熄灯那一秒。',
          servant: { assassin: 3, foreigner: 1 }, route: { assassin: 3 }, persona: { night: 2, quiet: 3 },
          stat: { dex: 4, pow: 2 },
          four: { desire: '把这个世界调小一点。' }
        },
        {
          key: 'C', label: '广播响的时候。',
          servant: { lancer: 2, ruler: 2 }, route: { flow: 2 }, persona: { online: 3, loud: 1 },
          stat: { app: 3, int: 3 },
          four: { catch: '「你们别动，我拍一下。」' }
        },
        {
          key: 'D', label: '从来没有烫过。',
          servant: { foreigner: 3, caster: 1 }, route: { intel: 1 }, persona: { quiet: 2, seen: 2 },
          stat: { pow: 3, app: 2 },
          four: { fear: '有一天被骂的人换成我，也没有人说话。' }
        }
      ]
    }
  ];

  window.GRAIL = window.GRAIL || {};
  window.GRAIL.QUIZ = QUIZ;
})();
