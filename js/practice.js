/* 基礎棋形練習 —— 針對低段位兒童的入門棋形
   題型皆為「找出正確的一手」，點對了就過關。
   概念涵蓋：氣、打吃、提子、逃跑、連接、做眼做活、征子。
   座標以 13 路棋盤、左上為 (0,0)。 */

(function (global) {
  'use strict';

  var B = 1, W = 2;

  // 每題：
  //   id, title, concept, desc, hint
  //   stones: 初始佈局
  //   turn:   輪到誰(通常黑=玩家)
  //   solutions: [{x,y}] 允許的正解落點（點對即過）
  //   badHint: 點錯時的鼓勵提示（可省略）
  var PROBLEMS = [
    {
      id: 'liberty-1',
      title: '第 1 關 · 認識「氣」',
      concept: '氣',
      desc: '棋子旁邊空的地方叫做「氣」。中間這顆白棋只剩一口氣了（紅圈處）。' +
            '輪到你(黑棋)，下在紅圈把最後一口氣堵住，就能把白棋吃掉！',
      stones: [
        { x: 6, y: 6, color: W },
        { x: 6, y: 5, color: B },
        { x: 5, y: 6, color: B },
        { x: 7, y: 6, color: B }
      ],
      turn: B,
      solutions: [{ x: 6, y: 7 }],
      marks: [{ x: 6, y: 7, type: 'circle' }],
      hint: '白棋下面那個空點就是它最後一口氣。'
    },
    {
      id: 'atari-1',
      title: '第 2 關 · 打吃（叫吃）',
      concept: '打吃',
      desc: '讓對方只剩一口氣，叫做「打吃」。輪到你(黑棋)，' +
            '下哪一點可以打吃白棋，逼它只剩最後一口氣？',
      stones: [
        { x: 6, y: 6, color: W },
        { x: 5, y: 6, color: B },
        { x: 6, y: 5, color: B }
      ],
      turn: B,
      solutions: [{ x: 7, y: 6 }, { x: 6, y: 7 }],
      hint: '把白棋四口氣堵到只剩一口，右邊或下面都可以。'
    },
    {
      id: 'capture-2',
      title: '第 3 關 · 兩顆一起吃',
      concept: '提子',
      desc: '白棋這兩顆連在一起，也只剩一口氣了。輪到你(黑棋)，' +
            '找出那一口氣把它們一次吃光！',
      stones: [
        { x: 6, y: 6, color: W },
        { x: 7, y: 6, color: W },
        { x: 5, y: 6, color: B },
        { x: 6, y: 5, color: B },
        { x: 7, y: 5, color: B },
        { x: 8, y: 6, color: B },
        { x: 6, y: 7, color: B }
      ],
      turn: B,
      solutions: [{ x: 7, y: 7 }],
      marks: [{ x: 7, y: 7, type: 'circle' }],
      hint: '兩顆白棋共用的氣，只剩右下那一個空點。'
    },
    {
      id: 'escape-1',
      title: '第 4 關 · 逃跑！',
      concept: '長氣',
      desc: '你的黑棋被白棋打吃了，只剩一口氣。輪到你(黑棋)，' +
            '往哪裡跑可以增加氣、逃出去？',
      stones: [
        { x: 6, y: 6, color: B },
        { x: 5, y: 6, color: W },
        { x: 6, y: 5, color: W },
        { x: 7, y: 6, color: W }
      ],
      turn: B,
      solutions: [{ x: 6, y: 7 }],
      marks: [{ x: 6, y: 7, type: 'circle' }],
      hint: '往還開著的那口氣（下方）延伸，就能一起變多氣。'
    },
    {
      id: 'connect-1',
      title: '第 5 關 · 連接',
      concept: '連接',
      desc: '把分開的棋子連起來會更堅固。你的兩顆黑棋中間有個缺口，' +
            '被白棋盯上了。下哪一點把它們連成一塊？',
      stones: [
        { x: 5, y: 6, color: B },
        { x: 7, y: 6, color: B },
        { x: 6, y: 5, color: W },
        { x: 6, y: 7, color: W }
      ],
      turn: B,
      solutions: [{ x: 6, y: 6 }],
      marks: [{ x: 6, y: 6, type: 'circle' }],
      hint: '正中間那個點能把左右兩顆黑棋牽起來。'
    },
    {
      id: 'eye-1',
      title: '第 6 關 · 做出兩隻眼',
      concept: '做活',
      desc: '有「兩隻眼」的棋永遠吃不掉，這叫「活棋」。你的黑棋左邊已經有一隻眼了（標「眼」的空點），' +
            '右邊還差一個角沒補好。輪到你(黑棋)，補上那個缺口，做出第二隻眼，讓這塊棋活起來！',
      stones: [
        { x: 4, y: 5, color: B }, { x: 5, y: 5, color: B }, { x: 6, y: 5, color: B }, { x: 7, y: 5, color: B }, { x: 8, y: 5, color: B }, { x: 9, y: 5, color: B },
        { x: 4, y: 6, color: B }, { x: 6, y: 6, color: B }, { x: 7, y: 6, color: B }, { x: 9, y: 6, color: B },
        { x: 4, y: 7, color: B }, { x: 5, y: 7, color: B }, { x: 6, y: 7, color: B }, { x: 7, y: 7, color: B }, { x: 9, y: 7, color: B }
      ],
      turn: B,
      // 左眼(5,6)已成立；右邊(8,6)只差下方(8,7)一顆黑棋就能成第二隻眼
      solutions: [{ x: 8, y: 7 }],
      marks: [{ x: 5, y: 6, type: 'text', text: '眼' }, { x: 8, y: 6, type: 'circle' }],
      hint: '紅圈那個空點快變成眼了，只差它「下面」缺一顆黑棋；補起來就是第二隻眼。'
    },
    {
      id: 'edge-capture-1',
      title: '第 7 關 · 邊上吃子',
      concept: '提子',
      desc: '棋盤邊邊的棋子氣比較少，更容易被吃！這顆貼邊的白棋只剩一口氣了，' +
            '輪到你(黑棋)，把它吃掉吧！',
      stones: [
        { x: 0, y: 6, color: W },
        { x: 0, y: 5, color: B },
        { x: 1, y: 6, color: B }
      ],
      turn: B,
      solutions: [{ x: 0, y: 7 }],
      marks: [{ x: 0, y: 7, type: 'circle' }],
      hint: '白棋下面貼著邊的那個空點就是最後一口氣。'
    },
    {
      id: 'corner-capture-2',
      title: '第 8 關 · 角落抓兩顆',
      concept: '提子',
      desc: '角落是氣最少的地方！這兩顆白棋躲在角落，卻只剩一口氣。' +
            '輪到你(黑棋)，一次把牠們兩顆都抓起來！',
      stones: [
        { x: 0, y: 0, color: W },
        { x: 1, y: 0, color: W },
        { x: 0, y: 1, color: B },
        { x: 1, y: 1, color: B }
      ],
      turn: B,
      solutions: [{ x: 2, y: 0 }],
      marks: [{ x: 2, y: 0, type: 'circle' }],
      hint: '沿著上面邊線，兩顆白棋右邊那個空點就是唯一的氣。'
    },
    {
      id: 'capture-three-1',
      title: '第 9 關 · 一次吃三顆！',
      concept: '提子',
      desc: '哇，三顆白棋排成一排貼在邊上，全被你包住了，只剩一口氣。' +
            '輪到你(黑棋)，下最後一手，一次吃掉三顆！',
      stones: [
        { x: 0, y: 5, color: W },
        { x: 0, y: 6, color: W },
        { x: 0, y: 7, color: W },
        { x: 0, y: 4, color: B },
        { x: 1, y: 5, color: B },
        { x: 1, y: 6, color: B },
        { x: 1, y: 7, color: B }
      ],
      turn: B,
      solutions: [{ x: 0, y: 8 }],
      marks: [{ x: 0, y: 8, type: 'circle' }],
      hint: '三顆白棋共用的最後一口氣，在最下面那顆的下方。'
    },
    {
      id: 'double-atari-1',
      title: '第 10 關 · 雙打吃（一石二鳥）',
      concept: '雙打吃',
      desc: '厲害的一手可以同時攻擊兩塊棋！這裡有上下兩顆白棋，' +
            '輪到你(黑棋)，找出那個「一下子打吃到兩邊」的神奇點。',
      stones: [
        { x: 6, y: 6, color: W },
        { x: 6, y: 8, color: W },
        { x: 5, y: 6, color: B },
        { x: 6, y: 5, color: B },
        { x: 5, y: 8, color: B },
        { x: 6, y: 9, color: B }
      ],
      turn: B,
      solutions: [{ x: 6, y: 7 }],
      hint: '兩顆白棋中間那個點，下下去會讓上下都只剩一口氣，下一手就能吃一顆。'
    },
    {
      id: 'escape-two-1',
      title: '第 11 關 · 帶著兩顆一起逃',
      concept: '長氣',
      desc: '你的兩顆黑棋被白棋團團圍住，只剩一口氣了！' +
            '輪到你(黑棋)，往還開著的那個方向延伸，帶牠們一起逃出去！',
      stones: [
        { x: 6, y: 6, color: B },
        { x: 7, y: 6, color: B },
        { x: 5, y: 6, color: W },
        { x: 6, y: 5, color: W },
        { x: 6, y: 7, color: W },
        { x: 7, y: 5, color: W },
        { x: 7, y: 7, color: W }
      ],
      turn: B,
      solutions: [{ x: 8, y: 6 }],
      marks: [{ x: 8, y: 6, type: 'circle' }],
      hint: '只有右邊那口氣還開著，往那裡長出去就能一起變多氣。'
    },
    {
      id: 'life-vital-1',
      title: '第 12 關 · 做活的正中要點',
      concept: '做活',
      desc: '中間有一排長長的空地，如果讓白棋先佔到正中間，你的眼就做不成了。' +
            '輪到你(黑棋)，搶下最重要的「正中央」，把大空間切成兩隻眼，讓這塊棋活起來！',
      stones: [
        { x: 4, y: 6, color: B }, { x: 8, y: 6, color: B },
        { x: 5, y: 5, color: B }, { x: 6, y: 5, color: B }, { x: 7, y: 5, color: B },
        { x: 5, y: 7, color: B }, { x: 6, y: 7, color: B }, { x: 7, y: 7, color: B }
      ],
      turn: B,
      solutions: [{ x: 6, y: 6 }],
      marks: [{ x: 6, y: 6, type: 'circle' }],
      hint: '下在三個空點的正中央，左右就各自變成一隻眼。'
    },
    {
      id: 'ladder-1',
      title: '第 13 關 · 征子（門吃）',
      concept: '征子',
      desc: '白棋只剩兩口氣。用「征子」一路打吃追著跑，白棋會越跑氣越少。' +
            '輪到你(黑棋)，下哪一點開始征子（打吃且把它逼向邊角）？',
      stones: [
        { x: 6, y: 6, color: W },
        { x: 6, y: 5, color: B },
        { x: 5, y: 6, color: B }
      ],
      turn: B,
      solutions: [{ x: 7, y: 6 }, { x: 6, y: 7 }],
      hint: '先把白棋打成一口氣，之後不管它往哪逃你都繼續打吃。'
    }
  ];

  // 各關「這一步的目的」解說（答對後顯示）
  var TEACH = {
    'liberty-1': '堵住對方最後一口「氣」。棋子周圍的空點就是氣，氣被堵光就會被提走。',
    'atari-1': '把對方逼到只剩 1 口氣，這叫「打吃」，下一手就能吃掉它。',
    'capture-2': '兩顆相連的棋共用氣，堵住它們共同的最後一口氣，就能一次全吃。',
    'escape-1': '往還開著的那口氣延伸，讓自己這塊棋氣變多、逃離被吃。',
    'connect-1': '補住中間的斷點，把兩塊棋接成一塊就切不斷、更堅固。',
    'eye-1': '補好缺口做出第二隻「眼」。有兩隻眼的棋永遠吃不掉，這叫活棋。',
    'edge-capture-1': '棋盤邊上氣本來就少，堵住最後一口氣就能提子。',
    'corner-capture-2': '角落是氣最少的地方，堵住共同的最後一口氣，兩顆一起提走。',
    'capture-three-1': '一排三顆共用氣，堵掉最後一口氣就能一次吃三顆。',
    'double-atari-1': '一手同時打吃兩塊棋（雙打吃），對方只能救一邊，另一邊一定被吃。',
    'escape-two-1': '帶著被打吃的兩顆往唯一的活路延伸，一起長出更多氣。',
    'life-vital-1': '搶下正中央的要點，把大空間切成兩隻眼，這塊棋就活了。',
    'ladder-1': '用連續打吃（征子）一路追著跑，對方怎麼逃氣都補不上，最後被吃。'
  };

  var B2 = 1, W2 = 2;
  function stn(list, color) { return list.map(function (p) { return { x: p[0], y: p[1], color: color }; }); }

  // ===== 手工精選：活死棋（做活，落子後真的形成兩隻眼，已用引擎驗證）=====
  var LIFE = [
    {
      id: 'lf-straight3h', title: '活棋 · 直三做活', concept: '做活',
      desc: '中間一排三個空點，被你先佔到正中央，就能切成兩隻眼活棋。輪到你(黑棋)！',
      stones: stn([[4, 6], [8, 6], [5, 5], [6, 5], [7, 5], [5, 7], [6, 7], [7, 7]], B2),
      turn: B2, solutions: [{ x: 6, y: 6 }],
      hint: '下在三個空點的正中央。', teach: '直三的要害在正中央，佔到就左右各一眼、活棋。'
    },
    {
      id: 'lf-straight3v', title: '活棋 · 直三做活（直立）', concept: '做活',
      desc: '直立的三個空點，一樣搶正中央做出兩隻眼。輪到你(黑棋)！',
      stones: stn([[6, 4], [6, 8], [5, 5], [5, 6], [5, 7], [7, 5], [7, 6], [7, 7]], B2),
      turn: B2, solutions: [{ x: 6, y: 6 }],
      hint: '下在三個空點的正中央。', teach: '不管橫的直的，直三的要害都是正中央。'
    },
    {
      id: 'lf-bent3', title: '活棋 · 彎三做活', concept: '做活',
      desc: '彎彎的三個空點（L 形），要害是那個轉角。輪到你(黑棋)，佔轉角做兩眼！',
      stones: stn([[4, 6], [5, 5], [5, 7], [6, 5], [7, 7], [6, 8]], B2),
      turn: B2, solutions: [{ x: 6, y: 6 }],
      hint: '下在 L 形的轉角處。', teach: '彎三的要害在轉角，佔到就能分出兩隻眼。'
    },
    {
      id: 'lf-eye', title: '活棋 · 補出第二眼', concept: '做活',
      desc: '左邊已經有一隻眼了，右邊缺一角。輪到你(黑棋)，補起來做出第二隻眼！',
      stones: stn([[4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [4, 6], [6, 6], [7, 6], [9, 6], [4, 7], [5, 7], [6, 7], [7, 7], [9, 7]], B2),
      turn: B2, solutions: [{ x: 8, y: 7 }],
      hint: '右邊那個快成眼的空點，下面缺一顆黑棋。', teach: '有兩隻眼就永遠吃不掉；補好缺口讓第二隻眼成形。'
    },
    {
      id: 'lf-eye2', title: '活棋 · 補出第二眼（鏡像）', concept: '做活',
      desc: '這次缺口在另一邊，一樣補好做出兩隻眼讓棋活起來。輪到你(黑棋)！',
      stones: stn([[3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [3, 6], [5, 6], [6, 6], [8, 6], [3, 7], [5, 7], [6, 7], [7, 7], [8, 7]], B2),
      turn: B2, solutions: [{ x: 4, y: 7 }],
      hint: '左邊那個快成眼的空點，下面缺一顆黑棋。', teach: '看清楚哪一邊還缺一角，補起來就是第二隻眼。'
    }
  ];

  // ===== 手工精選：手筋（雙打吃，已用引擎驗證同時打吃兩塊）=====
  var TESUJI = [
    {
      id: 'ts-double-1', title: '手筋 · 雙打吃', concept: '雙打吃',
      desc: '一手同時攻擊兩塊白棋！找出那個「一下打吃到上下兩邊」的點。輪到你(黑棋)。',
      stones: stn([[6, 5], [6, 7]], W2).concat(stn([[5, 5], [6, 4], [5, 7], [6, 8]], B2)),
      turn: B2, solutions: [{ x: 6, y: 6 }],
      hint: '兩顆白棋中間那個點。', teach: '一手同時打吃兩塊（雙打吃），對方只能救一邊，另一邊必被吃。'
    },
    {
      id: 'ts-double-2', title: '手筋 · 雙打吃（橫向）', concept: '雙打吃',
      desc: '左右兩塊白棋，找出同時打吃兩邊的一手。輪到你(黑棋)。',
      stones: stn([[6, 6], [8, 6]], W2).concat(stn([[6, 5], [6, 7], [8, 5], [8, 7]], B2)),
      turn: B2, solutions: [{ x: 7, y: 6 }],
      hint: '兩塊白棋中間那個點。', teach: '中間一點同時逼近左右兩塊，兩邊都剩一口氣。'
    },
    {
      id: 'ts-double-3', title: '手筋 · 雙打吃（角上）', concept: '雙打吃',
      desc: '換個位置，一樣找出同時打吃兩塊的關鍵點。輪到你(黑棋)。',
      stones: stn([[3, 4], [3, 6]], W2).concat(stn([[2, 4], [3, 3], [2, 6], [3, 7]], B2)),
      turn: B2, solutions: [{ x: 3, y: 5 }],
      hint: '兩顆白棋中間那個點。', teach: '雙打吃在任何位置都成立，先看有沒有「一點打兩塊」。'
    },
    {
      id: 'ts-double-4', title: '手筋 · 雙打吃（下邊）', concept: '雙打吃',
      desc: '下邊也有機會，找出那一手雙打吃。輪到你(黑棋)。',
      stones: stn([[4, 9], [6, 9]], W2).concat(stn([[4, 8], [4, 10], [6, 8], [6, 10]], B2)),
      turn: B2, solutions: [{ x: 5, y: 9 }],
      hint: '兩塊白棋中間那個點。', teach: '養成習慣：先找有沒有雙打吃這種一石二鳥的好手。'
    }
  ];

  // ===== 手工精選：定石／佈局（開局方向的基本觀念）=====
  var JOSEKI = [
    {
      id: 'jo-corner', title: '佈局 · 先佔角', concept: '佈局',
      desc: '圍棋開局，先搶「角」最有效率！下在盤角的星位（有小黑點的角）。輪到你(黑棋)。',
      stones: [], turn: B2,
      solutions: [{ x: 3, y: 3 }, { x: 9, y: 3 }, { x: 3, y: 9 }, { x: 9, y: 9 }],
      hint: '四個角的星位都可以。', teach: '金角銀邊草肚皮：先佔角、再守邊，中腹最難圍。'
    },
    {
      id: 'jo-last-corner', title: '佈局 · 搶最後一個空角', concept: '佈局',
      desc: '三個角都有棋了，剩下一個空角最大，先去把它佔起來！輪到你(黑棋)。',
      stones: stn([[3, 3], [9, 3], [3, 9]], B2), turn: B2,
      solutions: [{ x: 9, y: 9 }],
      hint: '右下角那個還空著的星位。', teach: '空的角比守邊、圍中腹都大，開局優先把角佔滿。'
    }
  ];

  // ===== 分類題庫（生成題 + 手工精選）=====
  function buildCategories() {
    var gen = global.ProblemGen;
    return [
      { key: 'basic', name: '基礎入門', level: '20~18級', problems: PROBLEMS },
      { key: 'capture', name: '吃子', level: '18~15級', problems: gen ? gen.genSet('capture', 1001, 15) : [] },
      { key: 'atari', name: '打吃', level: '17~14級', problems: gen ? gen.genSet('atari', 2002, 15) : [] },
      { key: 'escape', name: '逃子', level: '16~13級', problems: gen ? gen.genSet('escape', 3003, 15) : [] },
      { key: 'life', name: '活死棋', level: '13~10級', problems: LIFE },
      { key: 'tesuji', name: '手筋', level: '14~11級', problems: TESUJI },
      { key: 'joseki', name: '定石·佈局', level: '15~11級', problems: JOSEKI }
    ];
  }

  var STORE_KEY = 'chengcheng-go-stars';

  function PracticeController(ui) {
    this.ui = ui;               // { canvas, titleEl, descEl, hintEl, statusEl, prevBtn, nextBtn, retryBtn, progressEl, starsEl }
    this.engine = new global.GoEngine(13);
    this.renderer = new global.BoardRenderer(ui.canvas, this.engine, { eink: !!ui.eink });
    this.index = 0;
    this.solved = false;
    this.store = this.loadStore();   // { 題目id: true } 已過關紀錄
    this.categories = buildCategories();
    this.catIndex = 0;
    this.problems = this.categories[0].problems;
    var self = this;
    this.renderer.onPoint(function (x, y) { self.handleClick(x, y); });
    this.bind();
    this.populateCategories();
    this.renderStars();
    this.load(this.firstUnsolved());
  }

  // 目前分類
  PracticeController.prototype.category = function () { return this.categories[this.catIndex]; };

  // 填入分類下拉選單
  PracticeController.prototype.populateCategories = function () {
    var sel = this.ui.categorySel;
    if (!sel) return;
    sel.innerHTML = '';
    for (var i = 0; i < this.categories.length; i++) {
      var c = this.categories[i];
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = c.name + '（' + c.level + '·' + c.problems.length + '題）';
      sel.appendChild(o);
    }
    sel.value = String(this.catIndex);
  };

  PracticeController.prototype.switchCategory = function (idx) {
    if (idx < 0 || idx >= this.categories.length) return;
    this.catIndex = idx;
    this.problems = this.categories[idx].problems;
    if (this.ui.categorySel) this.ui.categorySel.value = String(idx);
    this.load(this.firstUnsolved());
  };

  // ---- 進度存檔（localStorage，換頁/關掉重開都記得） ----
  PracticeController.prototype.loadStore = function () {
    try { return JSON.parse(global.localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  };
  PracticeController.prototype.saveStore = function () {
    try { global.localStorage.setItem(STORE_KEY, JSON.stringify(this.store)); }
    catch (e) { /* 無痕模式等情況忽略 */ }
  };
  PracticeController.prototype.starCount = function () {
    var n = 0, ps = this.problems;
    for (var i = 0; i < ps.length; i++) if (this.store[ps[i].id]) n++;
    return n;
  };
  PracticeController.prototype.firstUnsolved = function () {
    var ps = this.problems;
    for (var i = 0; i < ps.length; i++) if (!this.store[ps[i].id]) return i;
    return 0;
  };

  // ---- 星星列：每關一顆，過關亮金星，可點擊跳關 ----
  PracticeController.prototype.renderStars = function () {
    var el = this.ui.starsEl;
    if (!el) return;
    el.innerHTML = '';
    var self = this, ps = this.problems;
    for (var i = 0; i < ps.length; i++) {
      var s = document.createElement('button');
      var done = !!this.store[ps[i].id];
      s.className = 'star' + (done ? ' done' : '') + (i === this.index ? ' current' : '');
      s.textContent = done ? (this.ui.eink ? '★' : '⭐') : (i + 1);
      s.title = ps[i].title;
      (function (idx) { s.addEventListener('click', function () { self.load(idx); }); })(i);
      el.appendChild(s);
    }
  };

  PracticeController.prototype.bind = function () {
    var self = this, ui = this.ui;
    if (ui.categorySel) {
      ui.categorySel.addEventListener('change', function () {
        self.switchCategory(parseInt(ui.categorySel.value, 10));
      });
    }
    ui.prevBtn.addEventListener('click', function () { self.load(self.index - 1); });
    ui.nextBtn.addEventListener('click', function () { self.load(self.index + 1); });
    ui.retryBtn.addEventListener('click', function () { self.load(self.index); });
    if (ui.resetBtn) {
      ui.resetBtn.addEventListener('click', function () {
        if (!global.confirm('確定要清除所有星星，重新挑戰嗎？')) return;
        self.store = {};
        self.saveStore();
        self.load(0);
      });
    }
  };

  PracticeController.prototype.load = function (i) {
    var ps = this.problems;
    if (i < 0) i = 0;
    if (i >= ps.length) i = ps.length - 1;
    this.index = i;
    this.solved = false;
    var p = ps[i];
    this.engine.setup(p.stones, p.turn);
    this.renderer.setMarks(p.marks || []);
    this.renderer.draw();

    this.ui.titleEl.textContent = p.title;
    this.ui.descEl.textContent = p.desc;
    this.ui.hintEl.textContent = '';
    this.ui.hintEl.classList.remove('show');
    if (this.ui.teachEl) this.ui.teachEl.textContent = '';
    if (this.store[p.id]) {
      this.setStatus('⭐ 這一關已經通過囉！想再玩一次就直接下正解 👆', 'ok');
    } else {
      this.setStatus('輪到你（黑棋），點棋盤下一手 👆', '');
    }
    this.ui.progressEl.textContent = this.category().name + '　第 ' + (i + 1) + ' / ' + ps.length + ' 題　⭐ 已得 ' + this.starCount() + '/' + ps.length;
    this.ui.prevBtn.disabled = (i === 0);
    this.ui.nextBtn.disabled = (i === ps.length - 1);
    this.renderStars();
  };

  PracticeController.prototype.setStatus = function (text, cls) {
    var el = this.ui.statusEl;
    el.textContent = text;
    el.className = 'status ' + (cls || '');
  };

  PracticeController.prototype.handleClick = function (x, y) {
    if (this.solved) return;
    var p = this.problems[this.index];
    var isSolution = p.solutions.some(function (s) { return s.x === x && s.y === y; });

    var res = this.engine.play(x, y);
    if (!res.legal) {
      this.setStatus('這裡不能下喔（' + reasonText(res.reason) + '），換一個點試試 🙂', 'warn');
      return;
    }
    this.renderer.setMarks([]);
    this.renderer.draw();

    if (isSolution) {
      this.solved = true;
      var newStar = !this.store[p.id];
      this.store[p.id] = true;
      this.saveStore();
      this.renderStars();
      var got = this.starCount();
      var total = this.problems.length;
      var msg = '🎉 答對了！' + (res.captured.length ? '成功吃掉 ' + res.captured.length + ' 顆白棋！' : '漂亮的一手！');
      if (newStar) msg += ' ⭐ 得到一顆星（' + got + '/' + total + '）';
      var allClear = (got === total);
      if (allClear) msg = '🏆「' + this.category().name + '」' + total + ' 題全部通關！澂澂好棒！🎉';
      this.setStatus(msg, 'ok');
      this.ui.progressEl.textContent = this.category().name + '　第 ' + (this.index + 1) + ' / ' + total + ' 題　⭐ 已得 ' + got + '/' + total;
      var teachText = p.teach || TEACH[p.id];
      if (this.ui.teachEl && teachText) {
        this.ui.teachEl.textContent = '📖 這一步的目的：' + teachText;
      }
      celebrate(this.ui.canvas);
      // 誇張過關特效
      var wrap = this.ui.canvas.parentNode;
      if (global.FX) {
        if (allClear) {
          global.FX.celebrate({ big: true, shakeEl: wrap });
        } else {
          global.FX.celebrate({ text: '🎉 第 ' + (this.index + 1) + ' 關 過關囉！ ⭐', shakeEl: wrap });
        }
      }
    } else {
      this.setStatus('差一點點～再想想看 💪', 'warn');
      this.ui.hintEl.textContent = '💡 提示：' + p.hint;
      this.ui.hintEl.classList.add('show');
      // 讓小孩看到後果後可再試：短暫延遲後還原此手
      var self = this;
      setTimeout(function () {
        self.engine.undo();
        self.renderer.setMarks(p.marks || []);
        self.renderer.draw();
      }, 900);
    }
  };

  function reasonText(r) {
    return { occupied: '已經有棋子', ko: '打劫暫時不能下', suicide: '會沒有氣', out: '超出棋盤' }[r] || '不行';
  }

  function celebrate(canvas) {
    canvas.classList.remove('celebrate');
    void canvas.offsetWidth;
    canvas.classList.add('celebrate');
  }

  global.PracticeController = PracticeController;
  global.GO_PROBLEMS = PROBLEMS;
})(window);
