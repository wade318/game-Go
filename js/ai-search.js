/* 圍棋搜尋引擎 —— α-β 剪枝 negamax + 全盤評估，讓高等級電腦會「往下算幾手」
   純前端、離線。對外：window.GoSearch.chooseMove(engine, color, depth)
   在 engine 的複製體上搜尋，不動到實際對局。 */

(function (global) {
  'use strict';

  var EMPTY = 0, BLACK = 1, WHITE = 2;
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  function opp(c) { return c === BLACK ? WHITE : BLACK; }

  // 複製一個引擎狀態，搜尋在複製體上進行
  function cloneEngine(e) {
    var c = new global.GoEngine(e.size);
    for (var y = 0; y < e.size; y++) {
      for (var x = 0; x < e.size; x++) c.board[y][x] = e.board[y][x];
    }
    c.turn = e.turn;
    c.captures = { 1: e.captures[1], 2: e.captures[2] };
    c.koPoint = e.koPoint ? { x: e.koPoint.x, y: e.koPoint.y } : null;
    c.history = [];
    c.recordReset();
    return c;
  }

  // 全盤評估：從 forColor 角度，數字越大越好
  function evalBoard(e, forColor) {
    var o = opp(forColor), size = e.size, score = 0;
    var x, y, d;
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        var v = e.board[y][x];
        if (v === forColor) score += 2;         // 子力較重：不放槍、會吃子
        else if (v === o) score -= 2;
        else {
          // 空點的地盤傾向：只被單一顏色包圍就偏向該方（權重較輕）
          var f = 0, oo = 0;
          for (d = 0; d < 4; d++) {
            var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
            if (!e.inBounds(nx, ny)) continue;
            var nv = e.board[ny][nx];
            if (nv === forColor) f++; else if (nv === o) oo++;
          }
          if (f > 0 && oo === 0) score += 0.3;
          else if (oo > 0 && f === 0) score -= 0.3;
        }
      }
    }
    // 提子（材料）—— 加重，讓吃子明顯有價值
    score += (e.captures[forColor] - e.captures[o]) * 2.0;
    // 各群的氣安全度：自己被打吃扣重分、能吃對方加分
    var seen = {};
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        var vv = e.board[y][x];
        if (vv !== EMPTY && !seen[x + ',' + y]) {
          var g = e.groupAndLiberties(x, y);
          for (var i = 0; i < g.stones.length; i++) seen[g.stones[i].x + ',' + g.stones[i].y] = 1;
          var n = g.stones.length;
          if (g.liberties === 1) {
            if (vv === forColor) score -= 4.0 * n; else score += 3.0 * n;
          } else if (g.liberties === 2) {
            if (vv === forColor) score -= 0.4 * n; else score += 0.4 * n;
          }
        }
      }
    }
    return score;
  }

  // 快速單手評分，用於候選排序與剪枝（越大越優先）
  function quickScore(e, x, y, color) {
    var o = opp(color), s = 0;
    e.board[y][x] = color;
    // 提子
    var captured = 0;
    for (var d = 0; d < 4; d++) {
      var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (!e.inBounds(nx, ny)) continue;
      var nv = e.board[ny][nx];
      if (nv === o) {
        var og = e.groupAndLiberties(nx, ny);
        if (og.liberties === 0) captured += og.stones.length;
        else if (og.liberties === 1) s += 4;   // 打吃對方
      }
      if (nv !== EMPTY) s += 0.6;
    }
    var self = e.groupAndLiberties(x, y);
    e.board[y][x] = EMPTY;
    s += captured * 6;
    if (self.liberties <= 1 && captured === 0) s -= 6;   // 自送打吃
    s += Math.min(self.liberties, 4) * 0.8;
    return s;
  }

  // 產生候選手：貼近既有棋子的空點；空盤則用星位/天元。合法者依 quickScore 取前 K
  function candidateMoves(e, color, K) {
    var size = e.size, cand = [], mark = {};
    var x, y, d;
    var hasStone = false;
    for (y = 0; y < size && !hasStone; y++) {
      for (x = 0; x < size; x++) { if (e.board[y][x] !== EMPTY) { hasStone = true; break; } }
    }
    if (!hasStone) {
      var pts = e.size === 13 ? [[3, 3], [9, 3], [3, 9], [9, 9], [6, 6]] : [[3, 3]];
      return pts.map(function (p) { return { x: p[0], y: p[1], q: 0 }; });
    }
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        if (e.board[y][x] !== EMPTY) continue;
        var near = false;
        for (d = 0; d < 8; d++) {
          var nx = x + DIRS8[d][0], ny = y + DIRS8[d][1];
          if (e.inBounds(nx, ny) && e.board[ny][nx] !== EMPTY) { near = true; break; }
        }
        if (!near) continue;
        var r = e.tryPlay(x, y, color);
        if (!r.legal) continue;
        cand.push({ x: x, y: y, q: quickScore(e, x, y, color) });
      }
    }
    cand.sort(function (a, b) { return b.q - a.q; });
    if (cand.length > K) cand.length = K;
    return cand;
  }

  // negamax + α-β；回傳「輪到 toMove 時」的最佳局面值
  function negamax(e, toMove, depth, alpha, beta, K) {
    if (depth === 0) return evalBoard(e, toMove);
    var moves = candidateMoves(e, toMove, K);
    if (!moves.length) return evalBoard(e, toMove);
    var best = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var res = e.play(moves[i].x, moves[i].y);
      if (!res.legal) continue;
      var val = -negamax(e, opp(toMove), depth - 1, -beta, -alpha, K);
      e.undo();
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best === -Infinity ? evalBoard(e, toMove) : best;
  }

  function chooseMove(engine, color, depth) {
    var e = cloneEngine(engine);
    // 深度越深，候選越少以控制速度
    var K = depth >= 3 ? 10 : (depth >= 2 ? 14 : 18);
    var moves = candidateMoves(e, color, K);
    if (!moves.length) return null;

    var best = [], bestVal = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var res = e.play(moves[i].x, moves[i].y);
      if (!res.legal) continue;
      var val = -negamax(e, opp(color), depth - 1, -Infinity, Infinity, K);
      e.undo();
      // 混入立即戰術價值：確保明顯的吃子/打吃/救棋一定被採用（深搜有時會低估「當下就吃」）
      val += 0.6 * (moves[i].q || 0) + Math.random() * 0.2;
      if (val > bestVal) { bestVal = val; best = [moves[i]]; }
      else if (val === bestVal) best.push(moves[i]);
    }
    if (!best.length) return null;
    var pick = best[Math.floor(Math.random() * best.length)];
    return { x: pick.x, y: pick.y };
  }

  global.GoSearch = { chooseMove: chooseMove };
})(window);
