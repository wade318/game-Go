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

  var STORE_KEY = 'chengcheng-go-stars';

  function PracticeController(ui) {
    this.ui = ui;               // { canvas, titleEl, descEl, hintEl, statusEl, prevBtn, nextBtn, retryBtn, progressEl, starsEl }
    this.engine = new global.GoEngine(13);
    this.renderer = new global.BoardRenderer(ui.canvas, this.engine);
    this.index = 0;
    this.solved = false;
    this.store = this.loadStore();   // { 題目id: true } 已過關紀錄
    var self = this;
    this.renderer.onPoint(function (x, y) { self.handleClick(x, y); });
    this.bind();
    this.renderStars();
    this.load(this.firstUnsolved());
  }

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
    var n = 0;
    for (var i = 0; i < PROBLEMS.length; i++) if (this.store[PROBLEMS[i].id]) n++;
    return n;
  };
  PracticeController.prototype.firstUnsolved = function () {
    for (var i = 0; i < PROBLEMS.length; i++) if (!this.store[PROBLEMS[i].id]) return i;
    return 0;
  };

  // ---- 星星列：每關一顆，過關亮金星，可點擊跳關 ----
  PracticeController.prototype.renderStars = function () {
    var el = this.ui.starsEl;
    if (!el) return;
    el.innerHTML = '';
    var self = this;
    for (var i = 0; i < PROBLEMS.length; i++) {
      var s = document.createElement('button');
      var done = !!this.store[PROBLEMS[i].id];
      s.className = 'star' + (done ? ' done' : '') + (i === this.index ? ' current' : '');
      s.textContent = done ? '⭐' : (i + 1);
      s.title = PROBLEMS[i].title;
      (function (idx) { s.addEventListener('click', function () { self.load(idx); }); })(i);
      el.appendChild(s);
    }
  };

  PracticeController.prototype.bind = function () {
    var self = this, ui = this.ui;
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
    if (i < 0) i = 0;
    if (i >= PROBLEMS.length) i = PROBLEMS.length - 1;
    this.index = i;
    this.solved = false;
    var p = PROBLEMS[i];
    this.engine.setup(p.stones, p.turn);
    this.renderer.setMarks(p.marks || []);
    this.renderer.draw();

    this.ui.titleEl.textContent = p.title;
    this.ui.descEl.textContent = p.desc;
    this.ui.hintEl.textContent = '';
    this.ui.hintEl.classList.remove('show');
    if (this.store[p.id]) {
      this.setStatus('⭐ 這一關已經通過囉！想再玩一次就直接下正解 👆', 'ok');
    } else {
      this.setStatus('輪到你（黑棋），點棋盤下一手 👆', '');
    }
    this.ui.progressEl.textContent = '第 ' + (i + 1) + ' / ' + PROBLEMS.length + ' 關　⭐ 已得 ' + this.starCount() + ' 顆星';
    this.ui.prevBtn.disabled = (i === 0);
    this.ui.nextBtn.disabled = (i === PROBLEMS.length - 1);
    this.renderStars();
  };

  PracticeController.prototype.setStatus = function (text, cls) {
    var el = this.ui.statusEl;
    el.textContent = text;
    el.className = 'status ' + (cls || '');
  };

  PracticeController.prototype.handleClick = function (x, y) {
    if (this.solved) return;
    var p = PROBLEMS[this.index];
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
      var msg = '🎉 答對了！' + (res.captured.length ? '成功吃掉 ' + res.captured.length + ' 顆白棋！' : '漂亮的一手！');
      if (newStar) msg += ' ⭐ 得到一顆星（' + got + '/' + PROBLEMS.length + '）';
      var allClear = (got === PROBLEMS.length);
      if (allClear) msg = '🏆 全部 ' + PROBLEMS.length + ' 關都通關了！澂澂好棒！🎉';
      this.setStatus(msg, 'ok');
      this.ui.progressEl.textContent = '第 ' + (this.index + 1) + ' / ' + PROBLEMS.length + ' 關　⭐ 已得 ' + got + ' 顆星';
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
