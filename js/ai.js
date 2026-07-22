/* 低段位電腦對手 —— 啟發式，故意「不太強」讓兒童有成就感
   策略優先序：
   1. 能吃掉對方（提子）就吃，優先吃多的
   2. 自己被打吃(剩 1 氣)就逃 / 或反提
   3. 避免自填(下了自己剩 1 氣的笨手)
   4. 靠近最後一手或己方棋子附近落子
   5. 隨機（偏中央） */

(function (global) {
  'use strict';

  var EMPTY = 0;

  function GoAI(engine, strength) {
    this.engine = engine;
    this.strength = (strength == null) ? 2 : strength;  // 0(最弱)~5(最強)
  }

  GoAI.prototype.setStrength = function (s) {
    this.strength = s;
  };

  // 計算「若在 (x,y) 落子後，自己這塊的氣」
  function selfLibertiesAfter(engine, x, y, color) {
    engine.board[y][x] = color;
    // 先移除被提的敵子以正確計氣
    var opp = engine.opponent(color);
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var removed = [];
    for (var i = 0; i < 4; i++) {
      var nx = x + dirs[i][0], ny = y + dirs[i][1];
      if (!engine.inBounds(nx, ny)) continue;
      if (engine.board[ny][nx] === opp) {
        var g = engine.groupAndLiberties(nx, ny);
        if (g.liberties === 0) {
          for (var j = 0; j < g.stones.length; j++) {
            removed.push(g.stones[j]);
            engine.board[g.stones[j].y][g.stones[j].x] = EMPTY;
          }
        }
      }
    }
    var libs = engine.groupAndLiberties(x, y).liberties;
    // 還原
    engine.board[y][x] = EMPTY;
    for (var k = 0; k < removed.length; k++) {
      engine.board[removed[k].y][removed[k].x] = opp;
    }
    return libs;
  }

  GoAI.prototype.chooseMove = function (color) {
    var e = this.engine;
    var moves = e.legalMoves(color);
    if (!moves.length) return null;

    var opp = e.opponent(color);
    var s = this.strength;                 // 0~5
    // 強度越高：越信任棋理、越少亂下、吃子/打吃看得越重
    var smartW = 0.3 + 0.14 * s;           // 棋理權重
    var noiseAmp = (5 - s) * 1.6 + 0.5;    // 隨機幅度（越弱越亂）
    var capW = 4 + s * 2;                  // 吃子權重（弱手常錯過吃子）
    var atariW = 1 + s * 1.2;              // 打吃權重
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    // 高段(>=3)：先找出己方被打吃(剩1氣)的群，之後會嘗試救活
    var ataried = [];
    if (s >= 3) {
      var seen = {};
      for (var yy = 0; yy < e.size; yy++) {
        for (var xx = 0; xx < e.size; xx++) {
          if (e.board[yy][xx] === color && !seen[xx + ',' + yy]) {
            var gg = e.groupAndLiberties(xx, yy);
            for (var q = 0; q < gg.stones.length; q++) seen[gg.stones[q].x + ',' + gg.stones[q].y] = true;
            if (gg.liberties === 1) ataried.push(gg);
          }
        }
      }
    }

    var best = [];
    var bestScore = -Infinity;
    var center = (e.size - 1) / 2;

    for (var i = 0; i < moves.length; i++) {
      var mv = moves[i];
      var smart = 0;

      // 吃子
      smart += mv.captured * capW;

      // 自身氣：避免自送打吃（入門 s<1 不懂，故較弱）
      var libs = selfLibertiesAfter(e, mv.x, mv.y, color);
      if (libs <= 1 && mv.captured === 0 && s >= 1) smart -= 8 + s;
      smart += Math.min(libs, 4) * 1.2;

      // 打吃對方 / 貼近互動
      e.board[mv.y][mv.x] = color;
      for (var d = 0; d < 4; d++) {
        var nx = mv.x + dirs[d][0], ny = mv.y + dirs[d][1];
        if (!e.inBounds(nx, ny)) continue;
        if (e.board[ny][nx] === opp) {
          var og = e.groupAndLiberties(nx, ny);
          if (og.liberties === 1) smart += atariW * 4;
        }
        if (e.board[ny][nx] !== EMPTY) smart += 0.8;
      }
      e.board[mv.y][mv.x] = EMPTY;

      // 高段：救自己被打吃的群
      if (s >= 3 && ataried.length) {
        for (var a = 0; a < ataried.length; a++) {
          var adj = false;
          for (var p = 0; p < ataried[a].stones.length; p++) {
            var st = ataried[a].stones[p];
            if (Math.abs(st.x - mv.x) + Math.abs(st.y - mv.y) === 1) { adj = true; break; }
          }
          if (adj && selfLibertiesAfter(e, mv.x, mv.y, color) >= 2) smart += 6 + s;
        }
      }

      // 偏好中央
      var distC = Math.abs(mv.x - center) + Math.abs(mv.y - center);
      smart += (e.size - distC) * 0.15;

      var score = smart * smartW + Math.random() * noiseAmp;
      if (score > bestScore) { bestScore = score; best = [mv]; }
      else if (score === bestScore) best.push(mv);
    }

    return best[Math.floor(Math.random() * best.length)];
  };

  global.GoAI = GoAI;
})(window);
