/* 對戰模式 —— 支援「雙人對戰」與「對電腦(低段位)」
   功能：輪流落子、顯示提子數、悔棋、虛手(Pass)、認輸、重新開始、終局粗略數子 */

(function (global) {
  'use strict';

  var B = 1, W = 2;

  // 對手等級：strength 0~5，附換算級/段標籤
  var LEVELS = [
    { strength: 0, label: '入門（約 20 級）' },
    { strength: 1, label: '初學（約 15 級）' },
    { strength: 2, label: '初級（約 10 級）' },
    { strength: 3, label: '中級（約 5 級）' },
    { strength: 4, label: '高級（約 1 級）' },
    { strength: 5, label: '高手（約 1 段）' }
  ];

  // 13 路讓子星位（依讓子數擺放）
  var HANDICAP_POINTS = {
    2: [[9, 3], [3, 9]],
    4: [[3, 3], [9, 3], [3, 9], [9, 9]],
    6: [[3, 3], [9, 3], [3, 9], [9, 9], [3, 6], [9, 6]],
    9: [[3, 3], [9, 3], [3, 9], [9, 9], [3, 6], [9, 6], [6, 3], [6, 9], [6, 6]]
  };

  function VsController(ui) {
    this.ui = ui;
    this.engine = new global.GoEngine(13);
    this.renderer = new global.BoardRenderer(ui.canvas, this.engine, { eink: !!ui.eink });
    this.level = ui.levelSel ? parseInt(ui.levelSel.value, 10) : 1;
    this.ai = new global.GoAI(this.engine, LEVELS[this.level].strength);
    this.handicap = ui.handicapSel ? parseInt(ui.handicapSel.value, 10) : 0;
    this.mode = 'ai';        // 'ai' | 'human'
    this.aiColor = W;        // 電腦執白，玩家執黑先
    this.gameOver = false;
    this.thinking = false;

    var self = this;
    this.renderer.onPoint(function (x, y) { self.handleClick(x, y); });
    this.bind();
    this.restart();
  }

  VsController.prototype.bind = function () {
    var self = this, ui = this.ui;
    ui.modeSel.addEventListener('change', function () {
      self.mode = ui.modeSel.value;
      self.restart();
    });
    if (ui.levelSel) {
      ui.levelSel.addEventListener('change', function () {
        self.level = parseInt(ui.levelSel.value, 10);
        self.ai.setStrength(LEVELS[self.level].strength);
        self.restart();
      });
    }
    if (ui.handicapSel) {
      ui.handicapSel.addEventListener('change', function () {
        self.handicap = parseInt(ui.handicapSel.value, 10);
        self.restart();
      });
    }
    ui.undoBtn.addEventListener('click', function () { self.undo(); });
    ui.passBtn.addEventListener('click', function () { self.pass(); });
    ui.resignBtn.addEventListener('click', function () { self.resign(); });
    ui.restartBtn.addEventListener('click', function () { self.restart(); });
  };

  VsController.prototype.restart = function () {
    this.engine.reset();
    this.gameOver = false;
    this.thinking = false;
    this.ui.scoreEl.textContent = '';

    // 讓子（僅對電腦時生效）：黑先擺讓子，之後白(電腦)先下
    var handInfo = '';
    if (this.mode === 'ai' && this.handicap > 0 && HANDICAP_POINTS[this.handicap]) {
      var pts = HANDICAP_POINTS[this.handicap];
      for (var i = 0; i < pts.length; i++) this.engine.board[pts[i][1]][pts[i][0]] = B;
      this.engine.turn = W;
      handInfo = '（讓 ' + this.handicap + ' 子）';
    }

    this.renderer.draw();
    this.refresh();

    if (this.mode === 'ai') {
      this.setStatus('對手：' + LEVELS[this.level].label + handInfo + '　開始對局！', '');
      if (this.isAiTurn()) { this.aiMove(); return; }
    } else {
      this.setStatus('雙人對戰　開始！黑棋先下 ⚫', '');
    }
  };

  VsController.prototype.refresh = function () {
    var e = this.engine;
    this.ui.turnEl.textContent = e.turn === B ? '⚫ 黑棋' : '⚪ 白棋';
    this.ui.capBlackEl.textContent = e.captures[B];
    this.ui.capWhiteEl.textContent = e.captures[W];
    this.ui.undoBtn.disabled = this.gameOver || !e.history.length;
  };

  VsController.prototype.setStatus = function (text, cls) {
    this.ui.statusEl.textContent = text;
    this.ui.statusEl.className = 'status ' + (cls || '');
  };

  VsController.prototype.isAiTurn = function () {
    return this.mode === 'ai' && this.engine.turn === this.aiColor;
  };

  VsController.prototype.handleClick = function (x, y) {
    if (this.gameOver || this.thinking) return;
    if (this.isAiTurn()) return;   // 電腦回合不接受點擊

    var res = this.engine.play(x, y);
    if (!res.legal) {
      this.setStatus('這裡不能下（' + reasonText(res.reason) + '）', 'warn');
      return;
    }
    this.renderer.draw();
    this.afterMove(res);

    if (!this.gameOver && this.isAiTurn()) this.aiMove();
  };

  VsController.prototype.afterMove = function (res) {
    this.refresh();
    if (res.captured && res.captured.length) {
      this.setStatus('提子 ' + res.captured.length + ' 顆！', 'ok');
      this.captureFx(res.captured);
    } else {
      this.setStatus('', '');
    }
  };

  // 吃子小特效：每顆被提的棋位置噴一撮彩帶 + 啵一聲
  VsController.prototype.captureFx = function (caps) {
    if (!global.FX) return;
    var r = this.renderer;
    var rect = r.canvas.getBoundingClientRect();
    for (var i = 0; i < caps.length; i++) {
      global.FX.miniBurst(rect.left + r.cx(caps[i].x), rect.top + r.cy(caps[i].y), 14);
    }
    global.FX.pop();
  };

  VsController.prototype.aiMove = function () {
    var self = this;
    this.thinking = true;
    this.setStatus('電腦思考中… 🤖', '');
    setTimeout(function () {
      var mv = self.ai.chooseMove(self.aiColor);
      if (!mv) {
        self.thinking = false;
        self.pass();
        return;
      }
      var res = self.engine.play(mv.x, mv.y);
      self.renderer.draw();
      self.thinking = false;
      self.afterMove(res);
    }, 450);
  };

  VsController.prototype.undo = function () {
    if (this.gameOver || this.thinking) return;
    // 對電腦時一次退兩手(退回玩家)，雙人退一手
    this.engine.undo();
    if (this.mode === 'ai' && this.engine.turn === this.aiColor) this.engine.undo();
    this.renderer.draw();
    this.refresh();
    this.setStatus('悔棋一步 ↩️', '');
  };

  VsController.prototype.pass = function () {
    if (this.gameOver || this.thinking) return;
    var ended = this.engine.pass();
    this.renderer.draw();
    this.refresh();
    if (ended) {
      this.endByScore('雙方虛手，對局結束');
    } else {
      this.setStatus((this.engine.turn === B ? '黑棋' : '白棋') + '回合（對方虛手 Pass）', '');
      if (this.isAiTurn()) this.aiMove();
    }
  };

  VsController.prototype.resign = function () {
    if (this.gameOver) return;
    var loser = this.engine.turn; // 認輸方視為當前回合方(由按鈕方主動)
    this.gameOver = true;
    var winner = loser === B ? '白棋 ⚪' : '黑棋 ⚫';
    this.setStatus('認輸！' + winner + '獲勝 🏆', 'ok');
    this.refresh();
  };

  VsController.prototype.endByScore = function (prefix) {
    this.gameOver = true;
    var s = this.engine.scoreEstimate();
    // 兒童版：黑不貼目，直接比大小
    var winner, diff;
    if (s.black > s.white) { winner = '黑棋 ⚫'; diff = s.black - s.white; }
    else if (s.white > s.black) { winner = '白棋 ⚪'; diff = s.white - s.black; }
    else { winner = null; }
    var txt = prefix + '｜黑 ' + s.black + ' vs 白 ' + s.white + '。';
    if (winner) txt += winner + '贏 ' + diff + ' 子 🏆';
    else txt += '平手！';
    this.ui.scoreEl.textContent = '（粗估：黑地 ' + s.blackTerritory + '、白地 ' + s.whiteTerritory + '）';
    this.setStatus(txt, 'ok');
    this.refresh();
  };

  function reasonText(r) {
    return { occupied: '已有棋子', ko: '打劫不能馬上提回', suicide: '會沒有氣', out: '出界' }[r] || '不行';
  }

  global.VsController = VsController;
})(window);
