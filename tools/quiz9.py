# -*- coding: utf-8 -*-
import io
p = r'E:\dsh-workspace\grail-war\js\data\quiz.js'
s = io.open(p, encoding='utf-8').read()
extra = """    },
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
  ];"""
s = s.replace("""    }
  ];""", """    }
""" + extra)
io.open(p,'w',encoding='utf-8').write(s)
print('quiz ok', s.count("no: '第"))
