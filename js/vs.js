/* 對戰模式 —— 支援「雙人對戰」與「對電腦(低段位)」
   功能：輪流落子、顯示提子數、悔棋、虛手(Pass)、認輸、重新開始、終局粗略數子 */

(function (global) {
  'use strict';

  var B = 1, W = 2;

  function VsController(ui) {
    this.ui = ui;   // { canvas, turnEl, capBlackEl, capWhiteEl, statusEl,
                    //   modeSel, undoBtn, passBtn, resignBtn, restartBtn, scoreEl }
    this.engine = new global.GoEngine(13);
    this.renderer = new global.BoardRenderer(ui.canvas, this.engine, { eink: !!ui.eink });
    this.ai = new global.GoAI(this.engine);
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
    this.renderer.draw();
    this.refresh();
    this.setStatus('開始對局！黑棋先下 ⚫', '');
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
