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

  // 電腦中盤認輸：走到「中盤」之後才評估，須「面積落後」且「材料(被吃子)落後」才投子
  var RESIGN_MIN_MOVES = 30;   // 至少下滿這麼多手才評估（避免開局亂認輸）
  var RESIGN_MARGIN = 18;      // 面積落後超過這麼多目視為落後
  var RESIGN_CAP_DIFF = 8;     // 且被黑吃掉的子比白吃掉的多這麼多（材料大幅落後，最可靠的訊號）

  function VsController(ui) {
    this.ui = ui;
    this.engine = new global.GoEngine(13);
    this.renderer = new global.BoardRenderer(ui.canvas, this.engine, { eink: !!ui.eink });
    this.level = ui.levelSel ? parseInt(ui.levelSel.value, 10) : 1;
    this.ai = new global.GoAI(this.engine, LEVELS[this.level].strength);
    this.handicap = ui.handicapSel ? parseInt(ui.handicapSel.value, 10) : 0;
    this.teachOff = ui.teachToggle ? !ui.teachToggle.checked : false;
    this.replaying = false;
    this.replayIdx = 0;
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
    if (ui.teachToggle) {
      ui.teachToggle.addEventListener('change', function () {
        self.teachOff = !ui.teachToggle.checked;
        if (self.teachOff && ui.teachEl) ui.teachEl.textContent = '';
      });
    }
    if (ui.hintBtn) ui.hintBtn.addEventListener('click', function () { self.hint(); });
    if (ui.replayBtn) ui.replayBtn.addEventListener('click', function () { self.enterReplay(); });
    if (ui.rpFirst) ui.rpFirst.addEventListener('click', function () { self.replayGoto(0); });
    if (ui.rpPrev) ui.rpPrev.addEventListener('click', function () { self.replayGoto(self.replayIdx - 1); });
    if (ui.rpNext) ui.rpNext.addEventListener('click', function () { self.replayGoto(self.replayIdx + 1); });
    if (ui.rpLast) ui.rpLast.addEventListener('click', function () { self.replayGoto(self.engine.record.length - 1); });
    if (ui.rpExit) ui.rpExit.addEventListener('click', function () { self.exitReplay(); });
    ui.undoBtn.addEventListener('click', function () { self.undo(); });
    ui.passBtn.addEventListener('click', function () { self.pass(); });
    ui.resignBtn.addEventListener('click', function () { self.resign(); });
    ui.restartBtn.addEventListener('click', function () { self.restart(); });
  };

  VsController.prototype.restart = function () {
    if (this.replaying) this.exitReplay(true);
    this.engine.reset();
    this.gameOver = false;
    this.thinking = false;
    this.ui.scoreEl.textContent = '';
    if (this.ui.teachEl) this.ui.teachEl.textContent = '';

    // 讓子（僅對電腦時生效）：黑先擺讓子，之後白(電腦)先下
    var handInfo = '';
    if (this.mode === 'ai' && this.handicap > 0 && HANDICAP_POINTS[this.handicap]) {
      var pts = HANDICAP_POINTS[this.handicap];
      for (var i = 0; i < pts.length; i++) this.engine.board[pts[i][1]][pts[i][0]] = B;
      this.engine.turn = W;
      handInfo = '（讓 ' + this.handicap + ' 子）';
    }

    this.engine.recordReset();    // 以目前盤面（含讓子）為覆盤起點
    this.renderer.setMarks([]);   // 清掉提示標記並重繪
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
    if (this.gameOver || this.thinking || this.replaying) return;
    if (this.isAiTurn()) return;   // 電腦回合不接受點擊

    var res = this.engine.play(x, y);
    if (!res.legal) {
      this.setStatus('這裡不能下（' + reasonText(res.reason) + '）', 'warn');
      return;
    }
    this.renderer.setMarks([]);   // 落子後清掉提示標記
    this.afterMove(res, 'you');

    if (!this.gameOver && this.isAiTurn()) this.aiMove();
  };

  // 提示一手：用強 AI 評估幫目前該下的一方找個好點，標在盤上並解說為什麼
  VsController.prototype.hint = function () {
    if (this.gameOver || this.thinking || this.replaying) return;
    if (this.isAiTurn()) { this.setStatus('現在是電腦回合，等牠下完再按提示 🙂', 'warn'); return; }
    var color = this.engine.turn;
    var helper = new global.GoAI(this.engine, 5);
    var mv = helper.chooseMove(color);
    if (!mv) { this.setStatus('目前沒有適合的點，可以考慮「虛手」', 'warn'); return; }

    // 預覽這一手以取得解說，再還原（不真的落子）
    var res = this.engine.play(mv.x, mv.y);
    var comment = global.Teach
      ? global.Teach.commentMove(this.engine, mv.x, mv.y, color, res.captured.length)
      : { icon: '💡', text: '' };
    this.engine.undo();

    var mark = { x: mv.x, y: mv.y, type: 'square', color: this.ui.eink ? '#000000' : '#2a9d3f' };
    this.renderer.setMarks([mark]);
    this.setStatus('💡 建議下在 ' + coordLabel(this.engine, mv.x, mv.y) + '（方框處）', 'ok');
    if (this.ui.teachEl && !this.teachOff) {
      this.ui.teachEl.textContent = comment.icon + ' 為什麼：' + comment.text;
    }
  };

  // ===== 覆盤（棋譜回顧）=====
  VsController.prototype.enterReplay = function () {
    if (this.thinking) return;
    var rec = this.engine.record;
    if (!rec || rec.length < 2) {
      this.setStatus('還沒有棋步可以覆盤，先下幾手吧 🙂', 'warn');
      return;
    }
    // 保存目前實戰盤面，覆盤結束後還原
    this.savedLive = {
      board: this.engine.board.map(function (r) { return r.slice(); }),
      lastMove: this.engine.lastMove,
      turn: this.engine.turn,
      captures: { 1: this.engine.captures[1], 2: this.engine.captures[2] }
    };
    this.replaying = true;
    this.replayIdx = rec.length - 1;
    if (this.ui.replayBar) this.ui.replayBar.style.display = 'block';
    this.renderReplay();
  };

  VsController.prototype.exitReplay = function (silent) {
    if (!this.replaying) return;
    var s = this.savedLive;
    if (s) {
      this.engine.board = s.board.map(function (r) { return r.slice(); });
      this.engine.lastMove = s.lastMove;
      this.engine.turn = s.turn;
      this.engine.captures = { 1: s.captures[1], 2: s.captures[2] };
    }
    this.replaying = false;
    if (this.ui.replayBar) this.ui.replayBar.style.display = 'none';
    this.renderer.setMarks([]);
    this.refresh();
    if (!silent) this.setStatus('已離開覆盤，回到對局。', '');
  };

  VsController.prototype.replayGoto = function (idx) {
    var rec = this.engine.record;
    if (!this.replaying || !rec) return;
    this.replayIdx = Math.max(0, Math.min(idx, rec.length - 1));
    this.renderReplay();
  };

  VsController.prototype.renderReplay = function () {
    var rec = this.engine.record;
    var k = this.replayIdx;
    var f = rec[k];
    // 把該手盤面套進 engine 供繪製
    this.engine.board = f.board.map(function (r) { return r.slice(); });
    this.engine.lastMove = f.lastMove;
    this.renderer.setMarks([]);

    var total = rec.length - 1;
    var info;
    if (k === 0) {
      info = '起手前（第 0 / ' + total + ' 手）';
    } else if (f.pass) {
      info = '第 ' + k + ' / ' + total + ' 手：' + (f.pass === B ? '⚫ 黑' : '⚪ 白') + ' 虛手 (Pass)';
    } else if (f.lastMove) {
      var who = f.lastMove.color === B ? '⚫ 黑' : '⚪ 白';
      var coord = coordLabel(this.engine, f.lastMove.x, f.lastMove.y);
      info = '第 ' + k + ' / ' + total + ' 手：' + who + ' 下 ' + coord;
      if (global.Teach) {
        var c = global.Teach.commentMove(this.engine, f.lastMove.x, f.lastMove.y, f.lastMove.color, f.captured);
        info += '　' + c.icon + ' ' + c.text;
      }
    }
    if (this.ui.replayInfo) this.ui.replayInfo.textContent = info;
  };

  VsController.prototype.afterMove = function (res, who) {
    this.refresh();
    if (res.captured && res.captured.length) {
      this.setStatus('提子 ' + res.captured.length + ' 顆！', 'ok');
      this.captureFx(res.captured);
    } else {
      this.setStatus('', '');
    }
    this.showTeach(res.captured ? res.captured.length : 0, who);
  };

  // 解說：分析剛剛這一手的目的（你的或電腦的），顯示白話說明
  VsController.prototype.showTeach = function (captured, who) {
    var el = this.ui.teachEl;
    if (!el) return;
    if (this.teachOff || !global.Teach) { el.textContent = ''; return; }
    var lm = this.engine.lastMove;
    if (!lm) { el.textContent = ''; return; }
    var c = global.Teach.commentMove(this.engine, lm.x, lm.y, lm.color, captured);
    var subj = who === 'ai' ? '電腦這手 🤖' : '你這手 🙂';
    el.textContent = c.icon + ' ' + subj + '：' + c.text;
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

  // 中盤認輸評估：走到中盤後，電腦(白)若面積大幅落後就投子
  VsController.prototype.shouldAiResign = function () {
    if (this.mode !== 'ai' || this.gameOver) return false;
    var e = this.engine;
    var moves = e.record ? e.record.length - 1 : 0;
    if (moves < RESIGN_MIN_MOVES) return false;
    var s = e.scoreEstimate();
    var areaMargin = s.white - s.black;                    // 電腦(白)面積領先，負值=落後
    var capDiff = e.captures[B] - e.captures[W];           // 黑吃白 − 白吃黑，正值=白材料落後
    // 讓子局：黑先天有子，門檻放寬
    var areaThreshold = -(RESIGN_MARGIN + this.handicap * 3);
    // 兩條件同時成立才認輸：面積大幅落後，且被吃子明顯較多（避免面積估算雜訊誤判）
    return areaMargin <= areaThreshold && capDiff >= RESIGN_CAP_DIFF;
  };

  VsController.prototype.aiResign = function () {
    this.gameOver = true;
    this.thinking = false;
    var s = this.engine.scoreEstimate();
    this.setStatus('🏳️ 電腦認輸了，你贏了！🏆', 'ok');
    this.ui.scoreEl.textContent = '（電腦大幅落後：黑 ' + s.black + ' vs 白 ' + s.white + '，投子認輸）';
    if (this.ui.teachEl) this.ui.teachEl.textContent = '';
    this.refresh();
    if (global.FX) {
      global.FX.celebrate({ big: true, text: '🏆 你贏了！🏆<br><span class="sub">電腦認輸</span>' });
    }
  };

  VsController.prototype.aiMove = function () {
    var self = this;
    if (this.shouldAiResign()) { this.aiResign(); return; }
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
      self.afterMove(res, 'ai');
    }, 450);
  };

  VsController.prototype.undo = function () {
    if (this.gameOver || this.thinking || this.replaying) return;
    // 對電腦時一次退兩手(退回玩家)，雙人退一手
    this.engine.undo();
    if (this.mode === 'ai' && this.engine.turn === this.aiColor) this.engine.undo();
    this.renderer.draw();
    this.refresh();
    this.setStatus('悔棋一步 ↩️', '');
  };

  VsController.prototype.pass = function () {
    if (this.gameOver || this.thinking || this.replaying) return;
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

  // 座標標籤，如 (6,6) → G7（跳過 I）
  function coordLabel(engine, x, y) {
    var letters = 'ABCDEFGHJKLMNOPQRST';
    return letters[x] + (engine.size - y);
  }

  global.VsController = VsController;
})(window);
