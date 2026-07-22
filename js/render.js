/* Canvas 棋盤繪製器 —— 童趣木紋棋盤、立體棋子、星位、最後一手標記
   對外：new BoardRenderer(canvas, engine, options)
        .draw()           重繪
        .onPoint(cb)      註冊點擊格點回呼 (x,y)
        .setMarks(arr)    設定額外標記（練習提示用） */

(function (global) {
  'use strict';

  var BLACK = 1, WHITE = 2, EMPTY = 0;

  function BoardRenderer(canvas, engine, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.opts = options || {};
    this.eink = !!this.opts.eink;  // 墨水模式：純黑白、實心、無漸層、關閉落子預覽
    this.marks = [];          // [{x,y,type:'circle|triangle|square|dot', color, text}]
    this.ghost = null;        // 滑鼠預覽落子點
    this.pointCb = null;
    this._bindEvents();
    this.resize();
  }

  BoardRenderer.prototype.resize = function () {
    // 依 CSS 尺寸配置高解析度畫布
    var rect = this.canvas.getBoundingClientRect();
    var px = Math.max(300, Math.min(rect.width || 560, 640));
    var dpr = global.devicePixelRatio || 1;
    this.pixel = px;
    this.canvas.width = px * dpr;
    this.canvas.height = px * dpr;
    this.canvas.style.width = px + 'px';
    this.canvas.style.height = px + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var n = this.engine.size;
    this.pad = px * 0.06 + 8;          // 邊距（留座標）
    this.grid = (px - this.pad * 2) / (n - 1);
    this.stoneR = this.grid * 0.46;
    this.draw();
  };

  BoardRenderer.prototype._bindEvents = function () {
    var self = this;
    this.canvas.addEventListener('click', function (e) {
      var p = self._eventToGrid(e);
      if (p && self.pointCb) self.pointCb(p.x, p.y);
    });
    this.canvas.addEventListener('mousemove', function (e) {
      if (self.eink) return;  // 墨水模式不做落子預覽，避免移動時不斷重繪殘影
      var p = self._eventToGrid(e);
      var changed = (!!p !== !!self.ghost) ||
        (p && self.ghost && (p.x !== self.ghost.x || p.y !== self.ghost.y));
      self.ghost = p;
      if (changed) self.draw();
    });
    this.canvas.addEventListener('mouseleave', function () {
      if (self.ghost) { self.ghost = null; self.draw(); }
    });
  };

  BoardRenderer.prototype._eventToGrid = function (e) {
    var rect = this.canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var gx = Math.round((mx - this.pad) / this.grid);
    var gy = Math.round((my - this.pad) / this.grid);
    if (gx < 0 || gy < 0 || gx >= this.engine.size || gy >= this.engine.size) return null;
    // 只在靠近格點時有效
    var cx = this.pad + gx * this.grid;
    var cy = this.pad + gy * this.grid;
    if (Math.hypot(mx - cx, my - cy) > this.grid * 0.5) return null;
    return { x: gx, y: gy };
  };

  BoardRenderer.prototype.onPoint = function (cb) { this.pointCb = cb; };
  BoardRenderer.prototype.setMarks = function (arr) { this.marks = arr || []; this.draw(); };

  BoardRenderer.prototype._starPoints = function () {
    var n = this.engine.size;
    if (n === 13) return [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]];
    if (n === 9) return [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]];
    if (n === 19) return [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]];
    return [];
  };

  BoardRenderer.prototype.cx = function (x) { return this.pad + x * this.grid; };
  BoardRenderer.prototype.cy = function (y) { return this.pad + y * this.grid; };

  BoardRenderer.prototype.draw = function () {
    var ctx = this.ctx, n = this.engine.size, px = this.pixel;

    // 底色（墨水模式：純白平面，無漸層）
    if (this.eink) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, px, px);
    } else {
      var g = ctx.createLinearGradient(0, 0, px, px);
      g.addColorStop(0, '#f5c877');
      g.addColorStop(1, '#e8a94e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, px, px);
    }

    var lineColor = this.eink ? '#000000' : '#5a3a1a';

    // 格線
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = this.eink ? 1.6 : 1.2;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      ctx.moveTo(this.cx(0), this.cy(i)); ctx.lineTo(this.cx(n - 1), this.cy(i));
      ctx.moveTo(this.cx(i), this.cy(0)); ctx.lineTo(this.cx(i), this.cy(n - 1));
    }
    ctx.stroke();

    // 座標標示（A.. / 1..）
    ctx.fillStyle = this.eink ? '#000000' : '#6b4a24';
    ctx.font = Math.max(9, this.grid * 0.32) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var letters = 'ABCDEFGHJKLMNOPQRST';
    for (var c = 0; c < n; c++) {
      ctx.fillText(letters[c], this.cx(c), this.pad - this.grid * 0.55);
      ctx.fillText(String(n - c), this.pad - this.grid * 0.6, this.cy(c));
    }

    // 星位
    var stars = this._starPoints();
    ctx.fillStyle = lineColor;
    for (var s = 0; s < stars.length; s++) {
      ctx.beginPath();
      ctx.arc(this.cx(stars[s][0]), this.cy(stars[s][1]), Math.max(2.5, this.grid * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }

    // 落子預覽
    if (this.ghost && this.engine.get(this.ghost.x, this.ghost.y) === EMPTY) {
      this._drawStone(this.ghost.x, this.ghost.y, this.engine.turn, 0.35);
    }

    // 棋子
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        var v = this.engine.board[y][x];
        if (v !== EMPTY) this._drawStone(x, y, v, 1);
      }
    }

    // 最後一手標記
    var lm = this.engine.lastMove;
    if (lm) {
      if (this.eink) {
        // 墨水：在棋子中央畫與棋子相反色的實心小方塊，高對比不靠顏色
        ctx.fillStyle = lm.color === BLACK ? '#ffffff' : '#000000';
        var hs = this.stoneR * 0.32;
        ctx.fillRect(this.cx(lm.x) - hs, this.cy(lm.y) - hs, hs * 2, hs * 2);
      } else {
        ctx.strokeStyle = '#ff5252';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.cx(lm.x), this.cy(lm.y), this.stoneR * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 練習標記
    for (var m = 0; m < this.marks.length; m++) this._drawMark(this.marks[m]);
  };

  BoardRenderer.prototype._drawStone = function (x, y, color, alpha) {
    var ctx = this.ctx, cx = this.cx(x), cy = this.cy(y), r = this.stoneR;

    // 墨水模式：實心黑棋 / 白棋為白底粗黑框，無陰影無漸層
    if (this.eink) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (color === BLACK) {
        ctx.fillStyle = '#000000';
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = Math.max(2, r * 0.2);
        ctx.strokeStyle = '#000000';
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    // 陰影
    ctx.beginPath();
    ctx.arc(cx + 1.5, cy + 2, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();
    // 立體漸層
    var rg = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    if (color === BLACK) { rg.addColorStop(0, '#666'); rg.addColorStop(1, '#111'); }
    else { rg.addColorStop(0, '#fff'); rg.addColorStop(1, '#cfcfcf'); }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.restore();
  };

  BoardRenderer.prototype._drawMark = function (m) {
    var ctx = this.ctx, cx = this.cx(m.x), cy = this.cy(m.y), r = this.stoneR * 0.6;
    var dflt = this.eink ? '#000000' : '#ff3b3b';
    ctx.save();
    ctx.lineWidth = this.eink ? 3.5 : 3;
    ctx.strokeStyle = m.color || dflt;
    ctx.fillStyle = m.color || dflt;
    if (m.type === 'circle') {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    } else if (m.type === 'square') {
      ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
    } else if (m.type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx - r, cy + r * 0.8); ctx.lineTo(cx + r, cy + r * 0.8);
      ctx.closePath(); ctx.stroke();
    } else if (m.type === 'dot') {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill();
    } else if (m.type === 'text') {
      ctx.fillStyle = m.color || '#ff3b3b';
      ctx.font = 'bold ' + (this.grid * 0.5) + 'px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(m.text, cx, cy);
    }
    ctx.restore();
  };

  global.BoardRenderer = BoardRenderer;
})(window);
