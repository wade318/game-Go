/* 圍棋規則核心引擎 —— 13 路棋盤
   負責：落子、氣的計算、提子、禁著點(自殺)、打劫(簡易 ko)
   不含任何畫面邏輯，方便對戰與練習共用 */

(function (global) {
  'use strict';

  var EMPTY = 0;
  var BLACK = 1;
  var WHITE = 2;

  function GoEngine(size) {
    this.size = size || 13;
    this.reset();
  }

  GoEngine.EMPTY = EMPTY;
  GoEngine.BLACK = BLACK;
  GoEngine.WHITE = WHITE;

  GoEngine.prototype.reset = function () {
    var n = this.size;
    this.board = [];
    for (var y = 0; y < n; y++) {
      var row = [];
      for (var x = 0; x < n; x++) row.push(EMPTY);
      this.board.push(row);
    }
    this.turn = BLACK;            // 黑先
    this.captures = { 1: 0, 2: 0 }; // 各方提子數
    this.koPoint = null;         // 打劫禁著點 {x,y}
    this.history = [];           // 每步快照，供悔棋
    this.lastMove = null;
    this.passes = 0;
    this.record = [];            // 覆盤用：每手後的盤面快照
    this.recordReset();
  };

  // 覆盤快照工具 ----------------------------------------------------
  GoEngine.prototype._frame = function (move, captured) {
    return {
      board: this.board.map(function (r) { return r.slice(); }),
      captures: { 1: this.captures[1], 2: this.captures[2] },
      lastMove: move,           // { x, y, color } 或 null（起手/虛手）
      captured: captured || 0,
      moveNo: this.record ? this.record.length : 0
    };
  };

  // 以「目前盤面」為第 0 手起點（讓子擺完後呼叫，含讓子）
  GoEngine.prototype.recordReset = function () {
    var f = this._frame(null, 0);
    f.moveNo = 0;
    this.record = [f];
  };

  GoEngine.prototype.inBounds = function (x, y) {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  };

  GoEngine.prototype.get = function (x, y) {
    return this.board[y][x];
  };

  GoEngine.prototype.opponent = function (color) {
    return color === BLACK ? WHITE : BLACK;
  };

  // 取得某顆棋子所屬的整塊(相連同色) + 這塊的氣
  GoEngine.prototype.groupAndLiberties = function (x, y) {
    var color = this.board[y][x];
    var stones = [];
    var liberties = {};
    var seen = {};
    var stack = [[x, y]];
    seen[x + ',' + y] = true;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (stack.length) {
      var cur = stack.pop();
      var cx = cur[0], cy = cur[1];
      stones.push({ x: cx, y: cy });
      for (var i = 0; i < 4; i++) {
        var nx = cx + dirs[i][0], ny = cy + dirs[i][1];
        if (!this.inBounds(nx, ny)) continue;
        var v = this.board[ny][nx];
        if (v === EMPTY) {
          liberties[nx + ',' + ny] = true;
        } else if (v === color && !seen[nx + ',' + ny]) {
          seen[nx + ',' + ny] = true;
          stack.push([nx, ny]);
        }
      }
    }
    return { stones: stones, liberties: Object.keys(liberties).length };
  };

  // 計算某座標若有棋子的氣數（不改動棋盤）
  GoEngine.prototype.libertiesAt = function (x, y) {
    if (this.board[y][x] === EMPTY) return 0;
    return this.groupAndLiberties(x, y).liberties;
  };

  // 試落子，回傳結果物件而不修改棋盤（供 AI / 練習判斷）
  // { legal, reason, captured:[{x,y}...] }
  GoEngine.prototype.tryPlay = function (x, y, color) {
    if (!this.inBounds(x, y)) return { legal: false, reason: 'out' };
    if (this.board[y][x] !== EMPTY) return { legal: false, reason: 'occupied' };
    if (this.koPoint && this.koPoint.x === x && this.koPoint.y === y) {
      return { legal: false, reason: 'ko' };
    }

    var opp = this.opponent(color);
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    // 暫放
    this.board[y][x] = color;
    var captured = [];
    var capKeys = {};

    // 檢查四鄰敵子是否被提
    for (var i = 0; i < 4; i++) {
      var nx = x + dirs[i][0], ny = y + dirs[i][1];
      if (!this.inBounds(nx, ny)) continue;
      if (this.board[ny][nx] === opp) {
        var g = this.groupAndLiberties(nx, ny);
        if (g.liberties === 0) {
          for (var j = 0; j < g.stones.length; j++) {
            var s = g.stones[j];
            var k = s.x + ',' + s.y;
            if (!capKeys[k]) { capKeys[k] = true; captured.push(s); }
          }
        }
      }
    }

    // 若沒提到子，檢查自己是否有氣（禁自殺）
    if (captured.length === 0) {
      var self = this.groupAndLiberties(x, y);
      if (self.liberties === 0) {
        this.board[y][x] = EMPTY; // 還原
        return { legal: false, reason: 'suicide' };
      }
    }

    this.board[y][x] = EMPTY; // 還原（tryPlay 不改棋盤）
    return { legal: true, captured: captured };
  };

  // 正式落子；成功回傳 true
  GoEngine.prototype.play = function (x, y) {
    var color = this.turn;
    var res = this.tryPlay(x, y, color);
    if (!res.legal) return res;

    this.pushHistory();

    var opp = this.opponent(color);
    this.board[y][x] = color;
    for (var i = 0; i < res.captured.length; i++) {
      var c = res.captured[i];
      this.board[c.y][c.x] = EMPTY;
    }
    this.captures[color] += res.captured.length;

    // 簡易打劫：只提 1 子、且自身也只有 1 氣時，設禁著點
    if (res.captured.length === 1) {
      var self = this.groupAndLiberties(x, y);
      if (self.liberties === 1 && self.stones.length === 1) {
        this.koPoint = { x: res.captured[0].x, y: res.captured[0].y };
      } else {
        this.koPoint = null;
      }
    } else {
      this.koPoint = null;
    }

    this.lastMove = { x: x, y: y, color: color };
    this.turn = opp;
    this.passes = 0;
    if (this.record) this.record.push(this._frame(this.lastMove, res.captured.length));
    return { legal: true, captured: res.captured };
  };

  GoEngine.prototype.pass = function () {
    this.pushHistory();
    this.koPoint = null;
    this.lastMove = null;
    var passColor = this.turn;
    this.passes += 1;
    this.turn = this.opponent(this.turn);
    if (this.record) {
      var f = this._frame(null, 0);
      f.pass = passColor;   // 記錄虛手方
      this.record.push(f);
    }
    return this.passes >= 2; // 連續兩 pass 即終局
  };

  GoEngine.prototype.pushHistory = function () {
    this.history.push({
      board: this.board.map(function (r) { return r.slice(); }),
      turn: this.turn,
      captures: { 1: this.captures[1], 2: this.captures[2] },
      koPoint: this.koPoint ? { x: this.koPoint.x, y: this.koPoint.y } : null,
      lastMove: this.lastMove
    });
  };

  GoEngine.prototype.undo = function () {
    if (!this.history.length) return false;
    var s = this.history.pop();
    this.board = s.board.map(function (r) { return r.slice(); });
    this.turn = s.turn;
    this.captures = { 1: s.captures[1], 2: s.captures[2] };
    this.koPoint = s.koPoint;
    this.lastMove = s.lastMove;
    this.passes = 0;
    if (this.record && this.record.length > 1) this.record.pop();
    return true;
  };

  // 找出所有合法落子點（給 AI 用）
  GoEngine.prototype.legalMoves = function (color) {
    var moves = [];
    for (var y = 0; y < this.size; y++) {
      for (var x = 0; x < this.size; x++) {
        if (this.board[y][x] !== EMPTY) continue;
        var r = this.tryPlay(x, y, color);
        if (r.legal) moves.push({ x: x, y: y, captured: r.captured.length });
      }
    }
    return moves;
  };

  // 簡易數子(面積法)：空點若只被單一顏色包圍算該方地
  // 兒童版粗略估算，回傳 { black, white }
  GoEngine.prototype.scoreEstimate = function () {
    var n = this.size;
    var visited = {};
    var territory = { 1: 0, 2: 0 };
    var stoneCount = { 1: 0, 2: 0 };
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        var v = this.board[y][x];
        if (v === BLACK) stoneCount[1]++;
        else if (v === WHITE) stoneCount[2]++;
        else {
          var key = x + ',' + y;
          if (visited[key]) continue;
          // flood fill 這塊空地
          var region = [];
          var borders = {};
          var stack = [[x, y]];
          visited[key] = true;
          while (stack.length) {
            var c = stack.pop();
            region.push(c);
            for (var i = 0; i < 4; i++) {
              var nx = c[0] + dirs[i][0], ny = c[1] + dirs[i][1];
              if (!this.inBounds(nx, ny)) continue;
              var nv = this.board[ny][nx];
              if (nv === EMPTY) {
                var nk = nx + ',' + ny;
                if (!visited[nk]) { visited[nk] = true; stack.push([nx, ny]); }
              } else {
                borders[nv] = true;
              }
            }
          }
          if (borders[BLACK] && !borders[WHITE]) territory[1] += region.length;
          else if (borders[WHITE] && !borders[BLACK]) territory[2] += region.length;
        }
      }
    }
    return {
      black: stoneCount[1] + territory[1],
      white: stoneCount[2] + territory[2],
      blackTerritory: territory[1],
      whiteTerritory: territory[2]
    };
  };

  // 由外部佈局（練習題用）：stones = [{x,y,color}], turn
  GoEngine.prototype.setup = function (stones, turn) {
    this.reset();
    for (var i = 0; i < stones.length; i++) {
      var s = stones[i];
      this.board[s.y][s.x] = s.color;
    }
    this.turn = turn || BLACK;
    this.history = [];
  };

  global.GoEngine = GoEngine;
})(window);
