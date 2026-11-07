/* 校园地图与自由行动事件：每天一次，你自己决定去哪 */
(function () {
  'use strict';

  var PLACES = [
    { id: 'gate', name: '校门', img: 'assets/img/scene_gate.jpg', risk: 1, desc: '铁栅门、保安室、一条能看见尽头的路。' },
    { id: 'track', name: '操场', img: 'assets/img/scene_track.jpg', risk: 2, desc: '七条脉交汇的地方。白线被人踩得发虚。' },
    { id: 'canteen', name: '食堂', img: 'assets/img/scene_canteen.jpg', risk: 0, desc: '两块钱的汤，加半勺不要钱。' },
    { id: 'exam', name: '高三楼', img: 'assets/img/scene_exam.jpg', risk: 3, desc: '封条、排名表、三十张桌子。' },
    { id: 'roof', name: '宿舍天台', img: 'assets/img/scene_roof.jpg', risk: 2, desc: '风大，铁链锁着，但锁是坏的。' },
    { id: 'club', name: '旧澡堂', img: 'assets/img/scene_honor.jpg', risk: 3, desc: '体育馆后面的澡堂，停用七年。' },
    { id: 'hill', name: '后山', img: 'assets/img/scene_hill.jpg', risk: 4, desc: '旧坟地。学校从来不组织去那边。' },
    { id: 'shed', name: '车棚', img: 'assets/img/scene_wall.jpg', risk: 1, desc: '两百九十八辆电瓶车，钥匙都不拔。' },
    { id: 'radio', name: '广播室', img: 'assets/img/scene_radio.jpg', risk: 3, desc: '三楼最里面。门牌上的字掉了一半。' },
    { id: 'infirm', name: '校医室', img: 'assets/img/scene_corridor.jpg', risk: 1, desc: '消毒水味。台账上每一个来过的人都要签字。' }
  ];

  var EVENTS = [
    {
      id: 'm_gate_1', place: 'gate', day: [1, 7], once: true, title: '校门口的横幅',
      intro: [
        '新横幅挂上去了，红底黄字，写的是今年的目标。风把它吹得鼓起来，字一个都没看清。',
        '保安老周站在门口，手里拿着竹竿，看样子是准备把边角挑平。'
      ],
      options: [
        {
          label: '上去帮老周扶竹竿。', sub: '跑操耐力 · 站得稳',
          check: { skill: '跑操耐力', bonus: 0 },
          ok: { text: ['你扶着，他挑。挑到一半他忽然说：「去年这条也挂过。」', '「去年挂的人，今年没来报名。」'], fx: { san: 1, flag: 'helpedBanner', log: '你帮老周把横幅挑平了。' } },
          fail: { text: ['竹竿太滑，横幅掉下来一角，盖了你一脸。老周笑得直不起腰。'], fx: { san: 1, demerit: 1, log: '横幅砸了你一脸。' } }
        },
        {
          label: '不帮忙，站在对面看那行字。', sub: '侦查 · 认字',
          text: ['你退到马路对面，眯着眼看。风停的一瞬间，你看清了四个字——不是今年写的。'],
          fx: { clue: { ruler: 1 }, exposure: 1, log: '那行字是去年的。有人把它翻过来重新挂了。' }
        }
      ]
    },
    {
      id: 'm_track_1', place: 'track', day: [1, 7], once: true, title: '跑道上多了一个人',
      intro: [
        '六点半，操场。跑步的人不多，稀稀拉拉。',
        '第三道上有人在跑，跑得很稳，不快。你已经看了他两圈，他没有停过。'
      ],
      options: [
        {
          label: '跟上他，跑一圈。', sub: '跑操耐力 · 跟住',
          check: { skill: '跑操耐力', bonus: 0 },
          ok: { text: ['你跟了一圈。他没回头，只在转弯的时候往内道让了半步。', '跑完他停下，说：「你喘得比我还厉害。走，喝汤去。」'], fx: { san: 2, clue: { saber: 1 }, log: '你陪一个不认识的人跑完一圈。' } },
          fail: { text: ['半圈就跟丢了。你撑着膝盖喘，抬头的时候跑道上已经没人了。'], fx: { san: -1, mp: -2 } }
        },
        {
          label: '坐看台上数他跑了几圈。', sub: '心理学 · 读人',
          text: ['你数到第十圈就数不下去了。不是数错，是每一圈的姿势一模一样，像同一段录像被接在了后面。'],
          fx: { san: -2, clue: { saber: 2 }, log: '那个人跑的不是圈，是同一圈。' }
        }
      ]
    },
    {
      id: 'm_canteen_1', place: 'canteen', day: [0, 7], once: true, title: '加半勺',
      intro: [
        '九点，食堂没几个人。王阿姨在盛汤，勺子举到半空，停一下，再往下。',
        '你排在后面，看见她在每一个碗里都多加了半勺，然后抬头看人一眼。'
      ],
      options: [
        {
          label: '接过碗，说声谢谢。', sub: '',
          text: ['她愣了一下，说：「哟，还知道说谢谢。」', '汤是热的，比两块钱该有的热。'],
          fx: { san: 3, flag: 'auntieWarm', log: '王阿姨多给了你半勺汤。' }
        },
        {
          label: '问她为什么要多看人一眼。', sub: '话术 · 套话',
          check: { skill: '话术', bonus: 0 },
          ok: { text: ['她擦了擦手：「看谁瘦。瘦的多给点。」', '「那您怎么知道谁瘦？」我问。', '「我看得多了。」她说，「这一届有几个我看了三年，看着看着就不来了。」'], fx: { san: 1, flag: 'knowAuntie', clue: { foreigner: 1 }, log: '王阿姨在数来吃饭的人。' } },
          fail: { text: ['她把勺子往锅里一放：「吃饭就吃饭，问那么多。」'], fx: { demerit: 1, san: -1 } }
        }
      ]
    },
    {
      id: 'm_exam_1', place: 'exam', day: [2, 7], once: true, title: '空着的第十三号',
      intro: [
        '高三楼一层最里面，门没锁。教室里三十张桌子，第十三号桌上有一层灰，别的都没有。',
        '黑板上还留着上次的板书：倒计时 178。数字被人擦过又写上去，重了好几遍。'
      ],
      options: [
        {
          label: '坐到第十三号上。', sub: '意志 · 坐一会儿',
          check: { skill: '意志', bonus: 0 },
          ok: { text: ['桌子有点晃。你坐下，手放在桌面上，忽然发现桌面下的横梁上刻着一行小字：「坐过这里的人都记得我。」', '你把手抽回来。'], fx: { san: -2, flag: 'satIn13', clue: { assassin: 1 }, log: '第十三号桌下面刻着一行字。' } },
          fail: { text: ['你刚坐下，铃响了。是那种只有一段的铃，响完整个楼道安静得不正常。', '你站起来，椅子在地上拖出一声很长的响。'], fx: { san: -4, beast: 1 } }
        },
        {
          label: '数桌子，看少了几张。', sub: '侦查 · 数',
          text: ['二十九张。名册上写着三十人。', '少的那张桌子不是被搬走的——地砖上留着四只脚的痕迹，痕迹里还有点灰。'],
          fx: { san: -1, clue: { assassin: 2 }, log: '考场少了一张桌子。' }
        }
      ]
    },
    {
      id: 'm_roof_1', place: 'roof', day: [2, 7], once: true, title: '天台上有人抽烟',
      intro: [
        '铁门锁着，但锁舌是断的。你推开一条缝，风灌进来，走廊的味道一下被吹散了。',
        '天台上有人，背对着你，手里夹着一根没点着的烟。'
      ],
      options: [
        {
          label: '走过去，站到他旁边。', sub: '',
          text: ['「学校不让抽烟。」你说。', '他把烟翻过来给你看——是断的，只有半根。「我知道。」他说，「我拿着它，只是因为手里没东西会抖。」', '他把烟收回口袋：「你也是来吹风的？」'],
          fx: { san: 2, flag: 'metRulerRoof', clue: { ruler: 2 }, log: '你在天台遇到一个拿着半根烟的人。' }
        },
        {
          label: '退回去，把门关上。', sub: '潜行 · 不惊动',
          text: ['你把门轻轻带上，锁舌的位置刚好卡住。', '下楼的时候你听见楼上有很轻的、火柴划响的声音。'],
          fx: { san: -1, clue: { ruler: 1 }, log: '你选择不惊动天台上的人。' }
        }
      ]
    },
    {
      id: 'm_club_1', place: 'club', day: [2, 7], once: true, title: '旧澡堂的水声',
      intro: [
        '体育馆后面的澡堂停了七年，地砖缝里长着草。',
        '你站在门口听了一会儿：里面有水声，一直在响，像谁忘了关龙头。'
      ],
      options: [
        {
          label: '推门进去，把龙头关掉。', sub: '意志 · 进去',
          check: { skill: '意志', bonus: 0 },
          ok: { text: ['龙头在最后一排，锈死了，关不上。你把手指塞进缝里，水停了。', '抬头时，镜子里的你比你慢了半拍才抬头。'], fx: { san: -3, clue: { berserker: 2 }, flag: 'turnedTap', log: '你把旧澡堂的龙头堵住了。' } },
          fail: { text: ['你推开门，水声停了。整个澡堂安静得像有人屏住了呼吸。', '你退出来的时候，鞋底是湿的——门口的地面是干的。'], fx: { san: -4, beast: 1, clue: { berserker: 1 } } }
        },
        {
          label: '在门外听，听它响多久。', sub: '聆听 · 计时',
          text: ['你数到四十七下，水声忽然停了，然后隔了三秒，又开始。', '不是漏水。是有人在里面一遍一遍地关、开。'],
          fx: { san: -2, clue: { berserker: 1 }, log: '澡堂里的水是有节奏的。' }
        }
      ]
    },
    {
      id: 'm_hill_1', place: 'hill', day: [3, 7], once: true, title: '后山的界碑',
      intro: [
        '后山没有路灯。你打着手电往上走，走到第三道坡，看见一块半截的界碑，字被凿掉了。',
        '碑旁边的土是新的。'
      ],
      options: [
        {
          label: '蹲下去，用手扒开土。', sub: '意志 · 硬撑',
          check: { skill: '意志', bonus: -10 },
          ok: { text: ['土下面是一个铁盒，里面是一叠卷子，卷头写着年份，最近的是一九九四年。', '每一张的分数栏都是空白，姓名栏写的是同一个名字。'], fx: { san: -4, beast: 1, clue: { foreigner: 2 }, flag: 'foundBox', log: '后山埋着一叠一九九四年的卷子。' } },
          fail: { text: ['土下面是空的——不是箱子，是一段什么都没有的深度。你的手伸进去，指尖碰不到底。', '你把手抽回来的时候，手指是干的。'], fx: { san: -5, beast: 2, clue: { foreigner: 1 } } }
        },
        {
          label: '把界碑扶正，然后下山。', sub: '',
          text: ['碑很沉。你把它扶起来，靠在旁边的树上。', '下山的时候你回头看了一眼——碑又倒了。'],
          fx: { san: -2, flag: 'fixedStone', log: '你扶过一次那块碑。' }
        }
      ]
    },
    {
      id: 'm_shed_1', place: 'shed', day: [0, 7], once: true, title: '两百九十八辆',
      intro: [
        '车棚里的车排得很整齐，钥匙都插在车上。你数了两遍，都是两百九十八。',
        '第三次数，是三百。多出来的两辆停在最里面。'
      ],
      options: [
        {
          label: '走到最里面，看那两辆车。', sub: '侦查 · 认车',
          text: ['一辆黑色，一辆掉漆的蓝色。蓝色那辆的后座上绑着一卷塑料布。', '你伸手碰了一下车把，是温的——像刚有人骑过。'],
          fx: { san: -3, clue: { assassin: 3 }, flag: 'sawTwoBikes', log: '车棚里多出来的两辆车，车把是温的。' }
        },
        {
          label: '退回门口，再数第四次。', sub: '',
          text: ['第四次：两百九十八。', '你不确定是自己数错了，还是它知道有人在数。'],
          fx: { san: -1, clue: { assassin: 1 }, log: '那两辆车只在你不看的时候存在。' }
        }
      ]
    },
    {
      id: 'm_radio_1', place: 'radio', day: [2, 7], once: true, title: '广播室的磁带',
      intro: [
        '广播室的门虚掩着。调音台上落了一层灰，只有播放键那块是干净的。',
        '卡座里有一盘磁带，标签上写着「试音」，字迹很旧。'
      ],
      options: [
        {
          label: '按下播放键。', sub: '意志 · 听',
          check: { skill: '意志', bonus: 0 },
          ok: { text: ['磁带开始转。先是一段空白，然后是念名字的声音——很平，一个接一个。', '念到第七个的时候，卡住了。同一个字重复了十几遍。', '你按下停止。手在抖。'], fx: { san: -3, exposure: 1, clue: { ruler: 3 }, flag: 'heardTape', log: '你听了那盘磁带。它在念名字。' } },
          fail: { text: ['磁带一放，喇叭里全是尖啸。你赶紧按停，但尖啸没有停——它从走廊的喇叭里继续响，一直响到你跑下二楼。'], fx: { san: -5, exposure: 2, demerit: 1, beast: 1 } }
        },
        {
          label: '把磁带带走，不在这里放。', sub: '潜行 · 顺',
          text: ['你把磁带塞进口袋，出门的时候顺手把门带上了。', '走出十米，身后的广播自己响了一下，很短，像在试音。'],
          fx: { san: -1, exposure: 1, flag: 'tookTape', clue: { ruler: 1 }, log: '那盘磁带现在在你口袋里。' }
        }
      ]
    },
    {
      id: 'm_infirm_1', place: 'infirm', day: [1, 7], once: true, title: '登记本',
      intro: [
        '校医室的灯只开了一盏。桌上摊着一本登记本，翻到今天的这一页。',
        '每一行都是名字、时间、症状。最后一行的时间是空白的。'
      ],
      options: [
        {
          label: '翻到前面几页。', sub: '图书馆使用 · 找规律',
          check: { skill: '图书馆使用', bonus: 0 },
          ok: { text: ['你发现每七页就有一天是空的，一个名字都没有。', '那七天的日期，都是每月七号。'], fx: { san: -2, flag: 'knowSeven', clue: { ruler: 1 }, log: '校医室的登记本，每月七号是空的。' } },
          fail: { text: ['你翻得太快，纸边割了手。血滴在登记本上，落在「症状」那一栏。', '你抬头，校医正站在门口看你。'], fx: { san: -3, demerit: 1 } }
        },
        {
          label: '在最后一行签上自己的名字。', sub: '',
          text: ['你写了名字，症状栏空着。', '你放下笔。笔是温的。'],
          fx: { san: 1, exposure: 1, flag: 'signedInfirm', log: '你在校医室的本子上留下了名字。' }
        }
      ]
    }
  ];

  window.GRAIL_MAP = { places: PLACES, events: EVENTS };
})();
