/* 練習題自動生成器 —— 用引擎生成並「自我驗證」正解，只回傳驗證通過的題目
   類別：吃子(capture)、打吃(atari)、逃子(escape)
   種子固定 → 每次載入題目一致（星星進度可累積） */

(function (global) {
  'use strict';

  var B = 1, W = 2, EMPTY = 0;
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // 種子亂數（mulberry32）
  function makeRng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function newEngine() { return new global.GoEngine(13); }

  // 某群（stones 陣列）的所有「氣」座標
  function libertyPoints(e, stones) {
    var seen = {}, libs = [];
    for (var i = 0; i < stones.length; i++) {
      for (var d = 0; d < 4; d++) {
        var nx = stones[i].x + DIRS[d][0], ny = stones[i].y + DIRS[d][1];
        if (!e.inBounds(nx, ny)) continue;
        if (e.get(nx, ny) === EMPTY) {
          var k = nx + ',' + ny;
          if (!seen[k]) { seen[k] = true; libs.push({ x: nx, y: ny }); }
        }
      }
    }
    return libs;
  }

  function allHaveLiberties(e, pts) {
    for (var i = 0; i < pts.length; i++) {
      if (e.get(pts[i].x, pts[i].y) !== EMPTY && e.groupAndLiberties(pts[i].x, pts[i].y).liberties === 0) return false;
    }
    return true;
  }

  // 隨機放一個白群（1~2 子，避免貼邊太滿）
  function placeWhite(e, rand) {
    var cx = 2 + Math.floor(rand() * 9);
    var cy = 2 + Math.floor(rand() * 9);
    var white = [{ x: cx, y: cy }];
    if (rand() < 0.35) {
      var d = DIRS[Math.floor(rand() * 4)];
      var nx = cx + d[0], ny = cy + d[1];
      if (e.inBounds(nx, ny)) white.push({ x: nx, y: ny });
    }
    for (var i = 0; i < white.length; i++) e.board[white[i].y][white[i].x] = W;
    return white;
  }

  function toStones(list, color) {
    return list.map(function (s) { return { x: s.x, y: s.y, color: color }; });
  }

  // ---- 吃子：白在打吃，黑提子（唯一解）----
  function genCapture(rand) {
    for (var t = 0; t < 300; t++) {
      var e = newEngine();
      var white = placeWhite(e, rand);
      var g = e.groupAndLiberties(white[0].x, white[0].y);
      var libs = libertyPoints(e, g.stones);
      if (libs.length < 2 || libs.length > 4) continue;
      var solIdx = Math.floor(rand() * libs.length);
      var sol = libs[solIdx];
      var blacks = [];
      for (var j = 0; j < libs.length; j++) {
        if (j === solIdx) continue;
        e.board[libs[j].y][libs[j].x] = B;
        blacks.push(libs[j]);
      }
      var r = e.tryPlay(sol.x, sol.y, B);
      if (!r.legal || r.captured.length !== g.stones.length) continue;
      if (!allHaveLiberties(e, blacks)) continue;
      return { stones: toStones(white, W).concat(toStones(blacks, B)), turn: B, solutions: [sol] };
    }
    return null;
  }

  // ---- 打吃：白剩 2 氣，黑打吃成 1 氣（兩個解都算）----
  function genAtari(rand) {
    for (var t = 0; t < 300; t++) {
      var e = newEngine();
      var white = placeWhite(e, rand);
      var g = e.groupAndLiberties(white[0].x, white[0].y);
      var libs = libertyPoints(e, g.stones);
      if (libs.length < 2 || libs.length > 4) continue;
      // 填到只剩 2 口氣
      var blacks = [];
      while (libs.length > 2) {
        var p = libs.pop();
        e.board[p.y][p.x] = B;
        blacks.push(p);
      }
      // 重新確認白剩 2 氣
      var g2 = e.groupAndLiberties(white[0].x, white[0].y);
      var remain = libertyPoints(e, g2.stones);
      if (remain.length !== 2) continue;
      // 兩個解各驗證：下後白剩 1 氣、未提子
      var ok = true, sols = [];
      for (var s = 0; s < remain.length; s++) {
        var pr = e.tryPlay(remain[s].x, remain[s].y, B);
        if (!pr.legal || pr.captured.length !== 0) { ok = false; break; }
        e.board[remain[s].y][remain[s].x] = B;
        var after = e.groupAndLiberties(white[0].x, white[0].y).liberties;
        e.board[remain[s].y][remain[s].x] = EMPTY;
        if (after !== 1) { ok = false; break; }
        sols.push(remain[s]);
      }
      if (!ok || sols.length !== 2) continue;
      if (!allHaveLiberties(e, blacks)) continue;
      return { stones: toStones(white, W).concat(toStones(blacks, B)), turn: B, solutions: sols };
    }
    return null;
  }

  // ---- 逃子：黑被打吃(1 氣)，往唯一的氣延伸逃出 ----
  function genEscape(rand) {
    for (var t = 0; t < 300; t++) {
      var e = newEngine();
      var cx = 3 + Math.floor(rand() * 7), cy = 3 + Math.floor(rand() * 7);
      var black = [{ x: cx, y: cy }];
      if (rand() < 0.3) {
        var d = DIRS[Math.floor(rand() * 4)];
        if (e.inBounds(cx + d[0], cy + d[1])) black.push({ x: cx + d[0], y: cy + d[1] });
      }
      for (var i = 0; i < black.length; i++) e.board[black[i].y][black[i].x] = B;
      var g = e.groupAndLiberties(black[0].x, black[0].y);
      var libs = libertyPoints(e, g.stones);
      if (libs.length < 2 || libs.length > 4) continue;
      // 保留一口氣當逃跑點，其餘填白
      var escIdx = Math.floor(rand() * libs.length);
      var esc = libs[escIdx];
      var whites = [];
      for (var j = 0; j < libs.length; j++) {
        if (j === escIdx) continue;
        e.board[libs[j].y][libs[j].x] = W;
        whites.push(libs[j]);
      }
      // 黑此時應為 1 氣（被打吃）
      if (e.groupAndLiberties(black[0].x, black[0].y).liberties !== 1) continue;
      // 驗證逃跑點：合法、未提白、逃後氣 >= 2
      var pr = e.tryPlay(esc.x, esc.y, B);
      if (!pr.legal || pr.captured.length !== 0) continue;
      e.board[esc.y][esc.x] = B;
      var after = e.groupAndLiberties(esc.x, esc.y).liberties;
      e.board[esc.y][esc.x] = EMPTY;
      if (after < 2) continue;
      if (!allHaveLiberties(e, whites)) continue;
      return { stones: toStones(black, B).concat(toStones(whites, W)), turn: B, solutions: [esc] };
    }
    return null;
  }

  var GENERATORS = { capture: genCapture, atari: genAtari, escape: genEscape };

  var TEXT = {
    capture: {
      title: '吃子', concept: '吃子',
      desc: '白棋只剩一口氣了！輪到你（黑棋），找出那口氣把它吃掉。',
      hint: '白棋旁邊唯一還空著的點，就是它最後一口氣。',
      teach: '堵住對方最後一口氣，沒氣的棋就被提走。'
    },
    atari: {
      title: '打吃', concept: '打吃',
      desc: '輪到你（黑棋），下一手把白棋「打吃」——逼到只剩一口氣。',
      hint: '白棋還有兩口氣，堵掉其中一口就是打吃。',
      teach: '把對方逼到只剩一口氣，叫做打吃，下一手就能吃。'
    },
    escape: {
      title: '逃子', concept: '長氣',
      desc: '你的黑棋被打吃了，只剩一口氣！往哪裡逃可以增加氣、逃出去？',
      hint: '往還開著、沒有白棋的那個方向延伸。',
      teach: '往空的方向長出去，自己的氣就變多、逃離被吃。'
    }
  };

  // 產生某類別的一組題目（種子固定 → 可重現，星星進度可累積）
  function genSet(kind, seed, count) {
    var rand = makeRng(seed);
    var fn = GENERATORS[kind], tx = TEXT[kind];
    var out = [];
    var n = 0, guard = 0;
    while (out.length < count && guard < count * 20) {
      guard++;
      var p = fn(rand);
      if (!p) continue;
      n++;
      out.push({
        id: kind + '-' + n,
        title: tx.title + ' · 第 ' + n + ' 題',
        concept: tx.concept,
        desc: tx.desc,
        stones: p.stones,
        turn: p.turn,
        solutions: p.solutions,
        hint: tx.hint,
        teach: tx.teach
      });
    }
    return out;
  }

  global.ProblemGen = { genSet: genSet };
})(window);
