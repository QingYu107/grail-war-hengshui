/* 入学登记表 · 六问
   每题选项带四类权重：servant(相性)、route(职介线)、persona(御主卡匹配)、stat(属性微调)
   另把答案写进「四问」：欲望 / 恐惧 / 口头禅 / 作息 */
(function () {
  'use strict';

  var QUIZ = [
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
    }
  ];

  window.GRAIL = window.GRAIL || {};
  window.GRAIL.QUIZ = QUIZ;
})();
