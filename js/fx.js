/* 過關誇張特效 —— 彩帶爆炸 + 星星煙火 + 大字橫幅 + 震動 + 叮咚音效
   全部純前端、免網路。對外：window.FX.celebrate({ big: false, text: '過關囉！' }) */

(function (global) {
  'use strict';

  var canvas, ctx, particles = [], running = false, banner;
  var COLORS = ['#ff5252', '#ffb300', '#ffe14d', '#43d17a', '#4aa3ff', '#b06bff', '#ff7bd5', '#ff8a3d'];
  var EMOJIS = ['⭐', '🎉', '✨', '🎈', '🌟', '🏆'];

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:9998;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    global.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    var dpr = global.devicePixelRatio || 1;
    canvas.width = global.innerWidth * dpr;
    canvas.height = global.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  // 從某點放射爆開
  function burst(cx, cy, count, power) {
    for (var i = 0; i < count; i++) {
      var ang = rand(0, Math.PI * 2);
      var spd = rand(3, power);
      var isEmoji = Math.random() < 0.22;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - rand(2, 6),
        g: rand(0.12, 0.26),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.3, 0.3),
        life: 0, maxLife: rand(70, 120),
        size: isEmoji ? rand(18, 30) : rand(6, 13),
        color: COLORS[(Math.random() * COLORS.length) | 0],
        emoji: isEmoji ? EMOJIS[(Math.random() * EMOJIS.length) | 0] : null,
        shape: Math.random() < 0.5 ? 'rect' : 'circle'
      });
    }
  }

  // 從頂端落下的彩帶雨
  function rain(count) {
    var w = global.innerWidth;
    for (var i = 0; i < count; i++) {
      particles.push({
        x: rand(0, w), y: rand(-60, -10),
        vx: rand(-1.5, 1.5), vy: rand(2, 5),
        g: rand(0.02, 0.06),
        rot: rand(0, Math.PI * 2), vr: rand(-0.25, 0.25),
        life: 0, maxLife: rand(120, 200),
        size: rand(7, 14),
        color: COLORS[(Math.random() * COLORS.length) | 0],
        emoji: null,
        shape: Math.random() < 0.5 ? 'rect' : 'circle',
        sway: rand(0.02, 0.06), swayPhase: rand(0, 6)
      });
    }
  }

  function loop() {
    ctx.clearRect(0, 0, global.innerWidth, global.innerHeight);
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life++;
      p.vy += p.g;
      if (p.sway) p.x += Math.sin((p.life * p.sway) + p.swayPhase) * 1.2;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      var alpha = p.life > p.maxLife - 25 ? Math.max(0, (p.maxLife - p.life) / 25) : 1;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.emoji) {
        ctx.font = p.size + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
      } else if (p.shape === 'rect') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (p.life >= p.maxLife || p.y > global.innerHeight + 40) particles.splice(i, 1);
    }
    if (particles.length) requestAnimationFrame(loop);
    else { running = false; ctx.clearRect(0, 0, global.innerWidth, global.innerHeight); }
  }

  function start() {
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  // 中央大字橫幅：彈跳登場後淡出
  function showBanner(text, big) {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = document.createElement('div');
    banner.className = 'fx-banner' + (big ? ' big' : '');
    banner.innerHTML = text;
    document.body.appendChild(banner);
    // 觸發動畫
    void banner.offsetWidth;
    banner.classList.add('show');
    var b = banner;
    setTimeout(function () { b.classList.add('out'); }, big ? 2000 : 1200);
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, big ? 2800 : 1900);
  }

  // 叮咚音效（WebAudio，免檔案）
  var actx;
  function chime(big) {
    try {
      actx = actx || new (global.AudioContext || global.webkitAudioContext)();
      var notes = big ? [523, 659, 784, 1047, 1319] : [659, 784, 1047];
      var t0 = actx.currentTime;
      notes.forEach(function (f, i) {
        var o = actx.createOscillator();
        var g = actx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        var st = t0 + i * 0.09;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.25, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.35);
        o.connect(g); g.connect(actx.destination);
        o.start(st); o.stop(st + 0.4);
      });
    } catch (e) { /* 靜音環境忽略 */ }
  }

  // 震動某元素
  function shake(el, big) {
    if (!el) return;
    var cls = big ? 'fx-shake-big' : 'fx-shake';
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, big ? 700 : 450);
  }

  // 吃子小噴發：在螢幕座標 (sx,sy) 噴出一小撮彩帶
  function miniBurst(sx, sy, count) {
    ensureCanvas();
    count = count || 14;
    for (var i = 0; i < count; i++) {
      var ang = rand(0, Math.PI * 2);
      var spd = rand(2, 7);
      var isEmoji = Math.random() < 0.15;
      particles.push({
        x: sx, y: sy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - rand(0, 3),
        g: rand(0.12, 0.22),
        rot: rand(0, Math.PI * 2), vr: rand(-0.3, 0.3),
        life: 0, maxLife: rand(28, 52),
        size: isEmoji ? rand(14, 20) : rand(5, 10),
        color: COLORS[(Math.random() * COLORS.length) | 0],
        emoji: isEmoji ? '✨' : null,
        shape: Math.random() < 0.5 ? 'rect' : 'circle'
      });
    }
    start();
  }

  // 吃子「啵」音效
  function pop() {
    try {
      actx = actx || new (global.AudioContext || global.webkitAudioContext)();
      var o = actx.createOscillator();
      var g = actx.createGain();
      o.type = 'sine';
      var t = actx.currentTime;
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(280, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + 0.18);
    } catch (e) { /* 靜音環境忽略 */ }
  }

  function celebrate(opts) {
    opts = opts || {};
    ensureCanvas();
    var cx = global.innerWidth / 2;
    var cy = global.innerHeight * 0.42;

    if (opts.big) {
      burst(cx, cy, 160, 16);
      rain(120);
      // 兩側再各補一炮
      setTimeout(function () { burst(cx * 0.4, cy, 80, 13); burst(cx * 1.6, cy, 80, 13); start(); }, 220);
      showBanner(opts.text || '🏆 全部通關！🏆<br><span class="sub">澂澂好棒！</span>', true);
    } else {
      burst(cx, cy, 90, 13);
      rain(50);
      showBanner(opts.text || '🎉 過關囉！ ⭐', false);
    }
    start();
    chime(!!opts.big);
    shake(opts.shakeEl, !!opts.big);
  }

  global.FX = { celebrate: celebrate, miniBurst: miniBurst, pop: pop };
})(window);
