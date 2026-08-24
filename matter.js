/* МАТЕРИЯ v2 — чёрная дыра, созвездие, дверь, комната */
(function () {
  'use strict';
  var LS_KEY = 'kopeyka_matter_v1';
  function defState() {
    return { plant: { stage: 0, lastWatered: 0 }, diary: [], book: { progress: 0.18, title: 'Атомные привычки' }, windowNight: true, updatedAt: null };
  }
  function loadMatter() {
    try { return Object.assign(defState(), JSON.parse(localStorage.getItem(LS_KEY) || '{}')); }
    catch (e) { return defState(); }
  }
  var M = loadMatter();
  function saveMatter() {
    try { M.updatedAt = new Date().toISOString(); localStorage.setItem(LS_KEY, JSON.stringify(M)); } catch (e) {}
  }
  function readReserveTotal() {
    try {
      if (window.STATE && Array.isArray(window.STATE.reserves)) {
        return window.STATE.reserves.reduce(function (a, r) {
          if (!r || r.deleted) return a;
          return a + (Number(r.saved) || Number(r.amount) || 0);
        }, 0);
      }
    } catch (e) {}
    return 0;
  }
  function buildGoals() {
    var list = [];
    try {
      (window.STATE && window.STATE.reserves || []).forEach(function (r) {
        if (!r || r.deleted) return;
        var tgt = Number(r.target) || 0, sav = Number(r.saved) || 0;
        list.push({ id: 'r_' + r.id, type: 'goal', title: String(r.name || 'Цель'), progress: tgt > 0 ? Math.min(1, sav / tgt) : 0, remain: tgt > 0 ? Math.max(0, tgt - sav).toLocaleString('ru-RU') + ' ₽' : '—' });
      });
    } catch (e) {}
    if (!list.length) {
      list = [
        { id: 'g1', type: 'goal', title: 'Подушка', progress: 0.25, remain: '—' },
        { id: 'g2', type: 'goal', title: 'Права', progress: 0.4, remain: '—' },
        { id: 'd1', type: 'dream', title: 'Отпуск', progress: 0.12, remain: '—' }
      ];
    }
    return list;
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return Math.abs(h); }

  /* audio */
  var AC = null;
  function ac() {
    if (AC) return AC;
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    return AC;
  }
  function playCreak() {
    var a = ac(); if (!a) return;
    try {
      if (a.state === 'suspended') a.resume();
      var t = a.currentTime;
      var o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.65);
      f.type = 'lowpass'; f.frequency.value = 700;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
      o.connect(f); f.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + 0.8);
      // noise layer
      var n = a.createBufferSource();
      var buf = a.createBuffer(1, a.sampleRate * 0.6, a.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
      n.buffer = buf;
      var ng = a.createGain(), nf = a.createBiquadFilter();
      nf.type = 'bandpass'; nf.frequency.value = 400;
      ng.gain.setValueAtTime(0.08, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      n.connect(nf); nf.connect(ng); ng.connect(a.destination);
      n.start(t); n.stop(t + 0.6);
    } catch (e) {}
  }
  var ambientNodes = null;
  function startAmbient() {
    stopAmbient();
    var a = ac(); if (!a) return;
    try {
      if (a.state === 'suspended') a.resume();
      var master = a.createGain(); master.gain.value = 0.028; master.connect(a.destination);
      ambientNodes = { master: master, list: [] };
      [174.61, 220, 261.63].forEach(function (freq, i) {
        var o = a.createOscillator(), g = a.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.value = 0.2 / (i + 1);
        var lfo = a.createOscillator(), lg = a.createGain();
        lfo.frequency.value = 0.05 + i * 0.015; lg.gain.value = 0.06;
        lfo.connect(lg); lg.connect(g.gain);
        o.connect(g); g.connect(master);
        o.start(); lfo.start();
        ambientNodes.list.push(o, lfo);
      });
    } catch (e) { ambientNodes = null; }
  }
  function stopAmbient() {
    if (!ambientNodes) return;
    try {
      ambientNodes.list.forEach(function (n) { try { n.stop(); } catch (e) {} });
      ambientNodes.master.disconnect();
    } catch (e) {}
    ambientNodes = null;
  }

  var css = ''
    + '#matterRoot{position:fixed;inset:0;z-index:9999;display:none;background:#000;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;touch-action:none}'
    + '#matterRoot.open{display:block}'
    + '#mtCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;background:#000}'
    + '.mt-hud{position:absolute;left:0;right:0;top:0;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 8px;display:flex;align-items:center;justify-content:flex-end;z-index:5;pointer-events:none}'
    + '.mt-hud button{pointer-events:auto}'
    + '.mt-exit{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);color:#eaf2ff;font-size:16px}'
    + '.mt-brand{position:absolute;left:50%;top:calc(18px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:4;pointer-events:none;text-align:center}'
    + '.mt-brand span{display:block;font-weight:800;letter-spacing:.22em;font-size:15px;color:#fff8e8;'
    + 'text-shadow:0 0 8px rgba(255,220,140,.95),0 0 22px rgba(255,180,60,.75),0 0 48px rgba(255,140,40,.45),0 0 80px rgba(255,100,20,.25);'
    + 'animation:mtSun 3.2s ease-in-out infinite alternate}'
    + '@keyframes mtSun{from{filter:brightness(.92);text-shadow:0 0 6px rgba(255,220,140,.8),0 0 18px rgba(255,180,60,.55),0 0 36px rgba(255,140,40,.3)}to{filter:brightness(1.12);text-shadow:0 0 12px rgba(255,230,160,1),0 0 28px rgba(255,190,80,.9),0 0 56px rgba(255,150,40,.55),0 0 90px rgba(255,120,20,.3)}}'
    + '.mt-panel{position:absolute;left:14px;right:14px;bottom:calc(16px + env(safe-area-inset-bottom,0px));background:rgba(10,12,20,.88);border:1px solid rgba(148,180,255,.22);border-radius:18px;padding:16px;color:#eaf2ff;opacity:0;transform:translateY(20px);transition:opacity .35s,transform .35s;pointer-events:none;z-index:6}'
    + '.mt-panel.show{opacity:1;transform:translateY(0);pointer-events:auto}'
    + '.mt-panel h3{font-size:16px;margin:0 0 8px;font-weight:700}'
    + '.mt-meta{font-size:13px;color:#9db3d9;line-height:1.45}'
    + '.mt-close{margin-top:12px;width:100%;padding:11px;border-radius:12px;background:rgba(255,255,255,.08);color:#eaf2ff;font-weight:600;border:1px solid rgba(255,255,255,.12)}'
    + '#matterRoom{position:absolute;inset:0;display:none;background:#0a0604;overflow:hidden;z-index:3}'
    + '#matterRoom.show{display:block}'
    + '.rm-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;background:#120e0a}'
    + '.rm-hot{position:absolute;border:0;background:transparent;padding:0;z-index:4;-webkit-tap-highlight-color:transparent}'
    + '.rm-hot:active{background:rgba(255,200,120,.06)}'
    + '.mt-sheet{position:absolute;left:0;right:0;bottom:0;top:18%;background:rgba(8,8,12,.94);border-radius:22px 22px 0 0;transform:translateY(105%);transition:transform .4s cubic-bezier(.2,.9,.25,1);z-index:8;padding:18px;color:#eaf2ff}'
    + '.mt-sheet.show{transform:translateY(0)}'
    + '.mt-sheet h3{font-size:17px;margin:0 0 10px}'
    + '.mt-sheet textarea{width:100%;min-height:110px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.35);color:#f5e6c8;padding:10px;font:inherit}'
    + '.mt-act{margin-top:12px;width:100%;padding:12px;border-radius:12px;border:0;font-weight:700;background:linear-gradient(135deg,#E5A75E,#F0C060);color:#1a1208}'
    + '.mt-goalrow{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px}'
    + '.radial button.matter-act{border-top:1px solid rgba(255,255,255,.08);margin-top:4px;color:#C4D4FF}';
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var root = document.createElement('div');
  root.id = 'matterRoot';
  root.innerHTML =
    '<canvas id="mtCanvas"></canvas>' +
    '<div class="mt-brand" id="mtBrand" hidden><span>МОЯ МАТЕРИЯ</span></div>' +
    '<div class="mt-hud"><button type="button" class="mt-exit" id="mtExit">✕</button></div>' +
    '<div class="mt-panel" id="mtPanel"></div>' +
    '<div id="matterRoom">' +
      '<img class="rm-bg" id="rmBg" alt="" draggable="false"/>' +
      /* hotspots by room composition — no labels */
      '<button type="button" class="rm-hot" data-obj="diary" style="left:2%;bottom:1%;width:32%;height:20%" aria-label="Дневник"></button>' +
      '<button type="button" class="rm-hot" data-obj="book" style="left:30%;bottom:12%;width:30%;height:16%" aria-label="Книга"></button>' +
      '<button type="button" class="rm-hot" data-obj="plant" style="right:14%;bottom:20%;width:24%;height:24%" aria-label="Растение"></button>' +
      '<button type="button" class="rm-hot" data-obj="piggy" style="right:6%;top:40%;width:22%;height:14%" aria-label="Копилка"></button>' +
      '<button type="button" class="rm-hot" data-obj="goals" style="right:5%;top:18%;width:24%;height:18%" aria-label="Цели"></button>' +
      '<button type="button" class="rm-hot" data-obj="window" style="left:28%;top:14%;width:40%;height:24%" aria-label="Окно"></button>' +
      '<button type="button" class="rm-hot" data-obj="desk" style="left:26%;top:42%;width:42%;height:18%" aria-label="Стол"></button>' +
      '<button type="button" class="rm-hot" data-obj="bed" style="left:0%;top:38%;width:30%;height:32%" aria-label="Кровать"></button>' +
      '<button type="button" class="rm-hot" data-obj="door" style="right:0%;top:26%;width:16%;height:44%" aria-label="Выход"></button>' +
      '<button type="button" class="rm-hot" data-obj="lamp" style="right:4%;bottom:4%;width:18%;height:14%" aria-label="Лампа"></button>' +
    '</div>' +
    '<div class="mt-sheet" id="mtSheet"><div id="mtSheetBody"></div></div>';
  document.body.appendChild(root);

  var canvas = document.getElementById('mtCanvas');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var phase = 'idle'; /* idle | blackhole | space | room */
  var rafId = 0, t0 = 0, lastT = 0;
  var bgStars = [], goals = [], particles = [];
  var bh = { r: 2, max: 400, swirl: 0, fall: 0 };
  var door = { x: 0, y: 0, open: 0, opening: false };
  var roomImg = null, roomImgOk = false;

  function loadRoomImage() {
    var img = document.getElementById('rmBg');
    if (!img) return;
    roomImg = new Image();
    roomImg.onload = function () {
      roomImgOk = true;
      img.src = roomImg.src;
    };
    roomImg.onerror = function () {
      // CSS painted fallback already via background color; try alternate path
      roomImgOk = false;
      img.removeAttribute('src');
      img.style.background =
        'radial-gradient(ellipse 70% 40% at 50% 30%,rgba(40,60,100,.35),transparent 55%),'
        + 'radial-gradient(circle at 72% 42%,rgba(255,180,80,.2),transparent 16%),'
        + 'radial-gradient(circle at 18% 52%,rgba(255,160,60,.14),transparent 14%),'
        + 'linear-gradient(180deg,#1a120c 0%,#0c0806 55%,#070504 100%)';
    };
    // relative to app root (www/)
    roomImg.src = 'matter-room.jpg?v=4';
  }
  loadRoomImage();

  function mountRadial() {
    var radial = document.getElementById('radial');
    if (!radial || radial.querySelector('[data-act="matter"]')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-act', 'matter');
    btn.className = 'matter-act';
    btn.innerHTML = '<span class="ic">🌌</span> Материя <span style="opacity:.7;font-size:11px">(бета)</span>';
    btn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      try { radial.classList.remove('show'); var fab = document.getElementById('fab'); if (fab) fab.classList.remove('open'); } catch (x) {}
      enterMatter();
    });
    radial.appendChild(btn);
  }
  function removeTopEntry() {
    var el = document.getElementById('matterEnterWrap');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  function mountAll() { removeTopEntry(); mountRadial(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(mountAll, 200); });
  else setTimeout(mountAll, 200);
  setTimeout(mountAll, 1200);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedSpace() {
    bgStars = [];
    for (var i = 0; i < 160; i++) {
      bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: 0.4 + Math.random() * 1.5, ph: Math.random() * 6.28, sp: 0.25 + Math.random() * 0.7 });
    }
    goals = buildGoals();
    var cx = W * 0.5, cy = H * 0.48, n = goals.length;
    goals.forEach(function (g, i) {
      var ang = -Math.PI * 0.55 + (i / Math.max(1, n - 1)) * Math.PI * 1.1;
      var rad = Math.min(W, H) * 0.22 + ((hash(g.id) % 40));
      g.x = cx + Math.cos(ang) * rad * 1.15;
      g.y = cy + Math.sin(ang) * rad * 0.72;
      g.hue = g.type === 'dream' ? 42 : 200;
      g.pulse = Math.random() * 6;
    });
    door.x = W * 0.78;
    door.y = H * 0.64;
    door.open = 0;
    door.opening = false;
  }

  function enterMatter() {
    try { ac(); } catch (e) {}
    resize();
    root.classList.add('open');
    document.getElementById('matterRoom').classList.remove('show');
    document.getElementById('mtBrand').hidden = true;
    canvas.style.display = 'block';
    hidePanel();
    hideSheet();
    stopAmbient();
    phase = 'blackhole';
    bh = { r: 2, max: Math.max(W, H) * 0.95, swirl: 0, fall: 0 };
    particles = [];
    for (var i = 0; i < 90; i++) {
      particles.push({ a: Math.random() * Math.PI * 2, r: 24 + Math.random() * 50, sp: 0.9 + Math.random() * 2, s: 1 + Math.random() * 2.2 });
    }
    t0 = performance.now();
    lastT = t0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function exitMatter() {
    phase = 'idle';
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    stopAmbient();
    root.classList.remove('open');
    document.getElementById('matterRoom').classList.remove('show');
    document.getElementById('mtBrand').hidden = true;
    hidePanel();
    hideSheet();
  }
  document.getElementById('mtExit').onclick = exitMatter;

  function enterSpace() {
    phase = 'space';
    seedSpace();
    document.getElementById('mtBrand').hidden = false;
  }

  function openDoor() {
    if (door.opening) return;
    door.opening = true;
    playCreak();
  }

  function enterRoom() {
    phase = 'room';
    canvas.style.display = 'none';
    document.getElementById('mtBrand').hidden = true;
    document.getElementById('matterRoom').classList.add('show');
    // re-apply image
    var img = document.getElementById('rmBg');
    if (roomImgOk && roomImg) img.src = roomImg.src;
    startAmbient();
  }

  function leaveRoom() {
    stopAmbient();
    document.getElementById('matterRoom').classList.remove('show');
    canvas.style.display = 'block';
    hideSheet();
    door.open = 0;
    door.opening = false;
    enterSpace();
  }

  function loop(ts) {
    if (phase === 'idle') return;
    rafId = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (ts - lastT) / 1000);
    lastT = ts;
    if (phase === 'blackhole') drawBlackHole(dt, ts);
    else if (phase === 'space') drawSpace(dt, ts);
  }

  function drawBlackHole(dt) {
    resize();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.55;
    bh.swirl += dt * 2.4;
    bh.r += (bh.max * 0.52 - bh.r) * Math.min(1, dt * 1.15);
    if (bh.r > bh.max * 0.32) bh.fall += dt;
    particles.forEach(function (p) {
      p.a += dt * p.sp;
      p.r = Math.max(3, p.r - dt * 20 * (bh.r / bh.max));
      var x = cx + Math.cos(p.a + bh.swirl) * p.r * (0.55 + bh.r / bh.max);
      var y = cy + Math.sin(p.a + bh.swirl) * p.r * 0.5 * (0.55 + bh.r / bh.max);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(180,210,255,' + (0.15 + 0.5 * (1 - p.r / 80)) + ')';
      ctx.arc(x, y, p.s, 0, Math.PI * 2);
      ctx.fill();
    });
    for (var i = 0; i < 16; i++) {
      var rr = bh.r * (0.32 + i * 0.04);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(120,160,255,' + (0.035 + i * 0.007) + ')';
      ctx.lineWidth = 2;
      ctx.ellipse(cx, cy, rr, rr * 0.36, bh.swirl * 0.12, 0, Math.PI * 2);
      ctx.stroke();
    }
    var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, bh.r * 0.55);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(0.6, 'rgba(8,10,20,1)');
    grd.addColorStop(0.88, 'rgba(40,60,120,0.3)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.fillStyle = grd; ctx.arc(cx, cy, bh.r * 0.55, 0, Math.PI * 2); ctx.fill();
    if (bh.fall > 0) {
      var v = Math.min(1, bh.fall / 1.35);
      ctx.fillStyle = 'rgba(0,0,0,' + v + ')';
      ctx.fillRect(0, 0, W, H);
      if (v > 0.92) enterSpace();
    }
  }

  function drawSpace(dt, ts) {
    resize();
    var t = (ts - t0) / 1000;
    var g = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
    g.addColorStop(0, '#0a1020'); g.addColorStop(0.55, '#05080f'); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.14;
    var ng = ctx.createRadialGradient(W * 0.28, H * 0.28, 0, W * 0.28, H * 0.28, W * 0.5);
    ng.addColorStop(0, '#2a4a8a'); ng.addColorStop(1, 'transparent');
    ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    bgStars.forEach(function (s) {
      var a = 0.22 + Math.abs(Math.sin(t * s.sp + s.ph)) * 0.55;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // links
    ctx.strokeStyle = 'rgba(140,180,255,0.14)'; ctx.lineWidth = 1;
    for (var i = 0; i < goals.length - 1; i++) {
      ctx.beginPath(); ctx.moveTo(goals[i].x, goals[i].y); ctx.lineTo(goals[i + 1].x, goals[i + 1].y); ctx.stroke();
    }
    goals.forEach(function (s) {
      var pulse = 0.65 + 0.35 * Math.sin(t * 1.4 + s.pulse);
      var r = (4 + (s.progress || 0) * 3) * pulse;
      ctx.beginPath();
      ctx.fillStyle = 'hsla(' + s.hue + ',80%,70%,' + (0.1 * pulse) + ')';
      ctx.arc(s.x, s.y, r * 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = 'hsla(' + s.hue + ',90%,88%,' + (0.55 + 0.35 * pulse) + ')';
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
    });
    // door visual
    if (door.opening) {
      door.open = Math.min(1, door.open + dt * 0.9);
      if (door.open >= 1) {
        // fade into room
        ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, (door.open - 0.85) * 8) + ')';
        ctx.fillRect(0, 0, W, H);
        if (door.open >= 1) enterRoom();
      }
    }
    var dx = door.x, dy = door.y, dr = 16 + door.open * 36;
    ctx.save();
    ctx.translate(dx, dy);
    // portal glow
    var pg = ctx.createRadialGradient(0, 0, 0, 0, 0, dr * 1.4);
    pg.addColorStop(0, 'rgba(100,160,255,' + (0.3 + door.open * 0.4) + ')');
    pg.addColorStop(1, 'rgba(20,40,80,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, dr * 1.4, 0, Math.PI * 2); ctx.fill();
    // frame
    ctx.strokeStyle = 'rgba(180,210,255,' + (0.45 + door.open * 0.4) + ')';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-dr * 0.55, -dr * 1.15, dr * 1.1, dr * 2.3);
    // leaf
    ctx.fillStyle = 'rgba(12,18,32,' + (0.92 - door.open * 0.75) + ')';
    ctx.fillRect(-dr * 0.5, -dr * 1.1, dr * (1 - door.open * 0.88), dr * 2.2);
    // handle
    if (door.open < 0.5) {
      ctx.fillStyle = 'rgba(220,200,140,0.7)';
      ctx.beginPath(); ctx.arc(dr * 0.28, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // vignette
    var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  canvas.addEventListener('click', function (ev) {
    if (phase !== 'space') return;
    var rect = canvas.getBoundingClientRect();
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    var dx = x - door.x, dy = y - door.y;
    if (dx * dx + dy * dy < (door.open * 40 + 40) * (door.open * 40 + 40)) { openDoor(); return; }
    var best = null, bestD = 44 * 44;
    goals.forEach(function (s) {
      var ddx = x - s.x, ddy = y - s.y, d = ddx * ddx + ddy * ddy;
      if (d < bestD) { bestD = d; best = s; }
    });
    if (best) showStar(best);
  });

  function showStar(s) {
    var pct = Math.round((s.progress || 0) * 100);
    var p = document.getElementById('mtPanel');
    p.innerHTML = '<h3>' + s.title + '</h3><div class="mt-meta">Прогресс: ' + pct + '%<br>Осталось: ' + (s.remain || '—') + '</div><button type="button" class="mt-close" id="mtPanelClose">Закрыть</button>';
    p.classList.add('show');
    document.getElementById('mtPanelClose').onclick = hidePanel;
  }
  function hidePanel() { document.getElementById('mtPanel').classList.remove('show'); }

  function openSheet(html) {
    var sheet = document.getElementById('mtSheet');
    document.getElementById('mtSheetBody').innerHTML = html + '<button type="button" class="mt-close" id="mtSheetClose">Закрыть</button>';
    sheet.classList.add('show');
    document.getElementById('mtSheetClose').onclick = hideSheet;
    return sheet;
  }
  function hideSheet() { document.getElementById('mtSheet').classList.remove('show'); }

  root.querySelectorAll('.rm-hot').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      onObj(b.getAttribute('data-obj'));
    });
  });

  function onObj(id) {
    if (id === 'door') { leaveRoom(); return; }
    if (id === 'piggy') {
      openSheet('<h3>Копилка</h3><p class="mt-meta">В резервах: <b style="color:#ffd9a8">' + readReserveTotal().toLocaleString('ru-RU') + ' ₽</b><br>Отражение финансов Финны — здесь ничего не списывается.</p>');
      return;
    }
    if (id === 'plant') {
      var names = ['Росток', 'Маленькое', 'Взрослое', 'Цветение'];
      var html = '<h3>Растение</h3><p class="mt-meta">Стадия: <b>' + names[M.plant.stage | 0] + '</b></p><button type="button" class="mt-act" id="mWater">Полить</button>';
      var sh = openSheet(html);
      setTimeout(function () {
        var btn = document.getElementById('mWater');
        if (btn) btn.onclick = function () {
          var now = Date.now();
          if (M.plant.lastWatered && now - M.plant.lastWatered < 3000) return;
          M.plant.lastWatered = now;
          if (M.plant.stage < 3) M.plant.stage++;
          saveMatter();
          hideSheet();
        };
      }, 20);
      return;
    }
    if (id === 'book') {
      openSheet('<h3>' + M.book.title + '</h3><p class="mt-meta">Прогресс: ' + Math.round(M.book.progress * 100) + '%</p>');
      return;
    }
    if (id === 'diary' || id === 'desk') {
      var last = (M.diary && M.diary[M.diary.length - 1]) || '';
      var sh = openSheet('<h3>Дневник</h3><textarea id="mtDiaryInput" placeholder="Мысли…">' + last + '</textarea><button type="button" class="mt-act" id="mSaveDiary">Сохранить</button>');
      setTimeout(function () {
        var b = document.getElementById('mSaveDiary');
        if (b) b.onclick = function () {
          var v = (document.getElementById('mtDiaryInput') || {}).value || '';
          v = String(v).trim();
          if (v) { M.diary = M.diary || []; M.diary.push(v); if (M.diary.length > 40) M.diary.shift(); saveMatter(); }
          hideSheet();
        };
      }, 20);
      return;
    }
    if (id === 'goals') {
      var rows = buildGoals().map(function (g) {
        return '<div class="mt-goalrow"><span>' + g.title + '</span><b>' + Math.round((g.progress || 0) * 100) + '%</b></div>';
      }).join('') || '<p class="mt-meta">Добавь резерв в Финне</p>';
      openSheet('<h3>Цели</h3>' + rows);
      return;
    }
    if (id === 'window') {
      openSheet('<h3>Окно</h3><p class="mt-meta">Ночной город. Здесь позже заиграет время суток.</p>');
      return;
    }
    if (id === 'bed') {
      openSheet('<h3>Кровать</h3><p class="mt-meta">Место для паузы. Вечерний режим — позже.</p>');
      return;
    }
    if (id === 'lamp') {
      openSheet('<h3>Свет</h3><p class="mt-meta">Тёплый огонёк. Комната живёт.</p>');
      return;
    }
  }

  window.FinMatter = { enter: enterMatter, exit: exitMatter, isOpen: function () { return phase !== 'idle'; } };
})();
