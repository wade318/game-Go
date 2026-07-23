/* 解說教學 —— 純規則分析盤面，產生白話解說（不需 LLM、不連網）
   對外：window.Teach.commentMove(engine, x, y, color, captured) → { icon, text }
   分析「剛下在 (x,y) 的一手」的戰術意義。engine 需為落子後狀態。 */

(function (global) {
  'use strict';

  var EMPTY = 0, B = 1, W = 2;
  var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function opp(c) { return c === B ? W : B; }

  function commentMove(engine, x, y, color, captured) {
    var o = opp(color);
    var atari = false;        // 是否打吃到對方
    var friendly = 0;         // 相鄰己方棋子數
    var enemyAdj = 0;         // 相鄰對方棋子數

    for (var i = 0; i < 4; i++) {
      var nx = x + dirs[i][0], ny = y + dirs[i][1];
      if (!engine.inBounds(nx, ny)) continue;
      var v = engine.get(nx, ny);
      if (v === color) {
        friendly++;
      } else if (v === o) {
        enemyAdj++;
        var g = engine.groupAndLiberties(nx, ny);
        if (g.liberties === 1) atari = true;
      }
    }

    var myLibs = engine.get(x, y) === EMPTY ? 0 : engine.groupAndLiberties(x, y).liberties;

    if (captured > 0) {
      return { icon: '🎉', text: '提子 ' + captured + ' 顆！對方那塊棋沒有氣了，就被拿走。' };
    }
    if (atari) {
      return { icon: '⚠️', text: '打吃！讓對方只剩最後 1 口氣，下一手就可能把它吃掉。' };
    }
    if (myLibs === 1) {
      return { icon: '😮', text: '小心，這手自己只剩 1 口氣，容易被對方反過來吃掉。' };
    }
    if (friendly >= 2) {
      return { icon: '💪', text: '連接：把附近幾顆棋接成更強的一塊，不容易被切斷。' };
    }
    if (friendly === 1) {
      return { icon: '➡️', text: '延伸：讓自己的棋變長、氣變多，比較安全。' };
    }
    if (enemyAdj > 0) {
      return { icon: '⚔️', text: '貼著對方下，開始跟它搶氣、逼近它。' };
    }
    return { icon: '🗺️', text: '先在空曠的地方佔一塊地盤，把勢力範圍圍大。' };
  }

  global.Teach = { commentMove: commentMove };
})(window);
