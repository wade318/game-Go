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

  function GoAI(engine) {
    this.engine = engine;
  }

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
    var best = [];
    var bestScore = -Infinity;
    var center = (e.size - 1) / 2;

    for (var i = 0; i < moves.length; i++) {
      var mv = moves[i];
      var score = 0;

      // 1. 吃子加高分
      score += mv.captured * 12;

      // 3. 自身氣：落子後自己氣越多越好，避免自填
      var libs = selfLibertiesAfter(e, mv.x, mv.y, color);
      if (libs <= 1 && mv.captured === 0) score -= 8;   // 自送打吃，扣分
      score += Math.min(libs, 4) * 1.2;

      // 2. 打吃對方：落子後讓某鄰接敵塊剩 1 氣，加分
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      e.board[mv.y][mv.x] = color;
      for (var d = 0; d < 4; d++) {
        var nx = mv.x + dirs[d][0], ny = mv.y + dirs[d][1];
        if (!e.inBounds(nx, ny)) continue;
        if (e.board[ny][nx] === opp) {
          var og = e.groupAndLiberties(nx, ny);
          if (og.liberties === 1) score += 5;
        }
        // 貼近己方或敵方棋子（有互動）
        if (e.board[ny][nx] !== EMPTY) score += 0.8;
      }
      e.board[mv.y][mv.x] = EMPTY;

      // 5. 偏好中央 + 加隨機抖動，避免每盤一樣
      var distC = Math.abs(mv.x - center) + Math.abs(mv.y - center);
      score += (e.size - distC) * 0.15;
      score += Math.random() * 1.5;

      if (score > bestScore) { bestScore = score; best = [mv]; }
      else if (score === bestScore) best.push(mv);
    }

    return best[Math.floor(Math.random() * best.length)];
  };

  global.GoAI = GoAI;
})(window);
