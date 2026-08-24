/* МАТЕРИЯ v3 — дыра, созвездие, дверь-созвездие, комната fullscreen */
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
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.7);
      f.type = 'lowpass'; f.frequency.value = 620;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.78);
      o.connect(f); f.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + 0.82);
      var n = a.createBufferSource();
      var buf = a.createBuffer(1, Math.floor(a.sampleRate * 0.55), a.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.35;
      n.buffer = buf;
      var ng = a.createGain(), nf = a.createBiquadFilter();
      nf.type = 'bandpass'; nf.frequency.value = 380;
      ng.gain.setValueAtTime(0.07, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      n.connect(nf); nf.connect(ng); ng.connect(a.destination);
      n.start(t); n.stop(t + 0.55);
    } catch (e) {}
  }
  var ambientNodes = null;
  function startAmbient() {
    stopAmbient();
    var a = ac(); if (!a) return;
    try {
      if (a.state === 'suspended') a.resume();
      var master = a.createGain(); master.gain.value = 0.022; master.connect(a.destination);
      ambientNodes = { master: master, list: [] };
      [174.61, 220].forEach(function (freq, i) {
        var o = a.createOscillator(), g = a.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.value = 0.18 / (i + 1);
        var lfo = a.createOscillator(), lg = a.createGain();
        lfo.frequency.value = 0.04 + i * 0.012; lg.gain.value = 0.05;
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
    + '#matterRoot{position:fixed;inset:0;z-index:9999;display:none;background:#000;overflow:hidden;font-family:Georgia,"Times New Roman",serif;touch-action:none;-webkit-user-select:none;user-select:none}'
    + '#matterRoot.open{display:block}'
    + '#mtCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;background:#000}'
    + '.mt-hud{position:absolute;left:0;right:0;top:0;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 8px;display:flex;align-items:center;justify-content:flex-end;z-index:5;pointer-events:none}'
    + '.mt-hud button{pointer-events:auto}'
    + '.mt-exit{width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.22);color:#f5efe6;font-size:16px;font-family:system-ui,sans-serif}'
    + '.mt-brand{position:absolute;left:50%;top:calc(22px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:4;pointer-events:none;text-align:center;width:90%}'
    + '.mt-brand span{display:inline-block;font-family:Georgia,"Palatino Linotype","Book Antiqua",serif;font-weight:700;font-style:italic;letter-spacing:.28em;font-size:clamp(13px,3.6vw,17px);color:#fff6d8;'
    + 'text-shadow:0 0 4px #ffe9a8,0 0 14px rgba(255,200,90,.95),0 0 28px rgba(255,160,40,.7),0 0 52px rgba(255,120,20,.4),0 0 90px rgba(255,90,10,.22);'
    + 'animation:mtSun 2.8s ease-in-out infinite alternate}'
    + '@keyframes mtSun{from{filter:brightness(.9) saturate(1);opacity:.92}to{filter:brightness(1.18) saturate(1.15);opacity:1}}'
    + '.mt-panel{position:absolute;left:14px;right:14px;bottom:calc(16px + env(safe-area-inset-bottom,0px));background:rgba(8,10,16,.9);border:1px solid rgba(148,180,255,.2);border-radius:18px;padding:16px;color:#eaf2ff;opacity:0;transform:translateY(20px);transition:opacity .3s,transform .3s;pointer-events:none;z-index:6;font-family:system-ui,sans-serif}'
    + '.mt-panel.show{opacity:1;transform:translateY(0);pointer-events:auto}'
    + '.mt-panel h3{font-size:16px;margin:0 0 8px;font-weight:700}'
    + '.mt-meta{font-size:13px;color:#9db3d9;line-height:1.45}'
    + '.mt-close{margin-top:12px;width:100%;padding:11px;border-radius:12px;background:rgba(255,255,255,.08);color:#eaf2ff;font-weight:600;border:1px solid rgba(255,255,255,.12);font-family:system-ui,sans-serif}'
    + '#matterRoom{position:absolute;inset:0;display:none;overflow:hidden;z-index:3;background:#0a0604}'
    + '#matterRoom.show{display:block}'
    + '.rm-bg{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:center center;border:0;margin:0;padding:0;display:block;pointer-events:none;transform:translateZ(0);will-change:auto}'
    + '.rm-hot{position:absolute;border:0;background:transparent;padding:0;z-index:4;-webkit-tap-highlight-color:transparent}'
    + '.rm-hot:active{background:rgba(255,200,120,.05)}'
    + '.mt-sheet{position:absolute;left:0;right:0;bottom:0;top:18%;background:rgba(8,8,12,.94);border-radius:22px 22px 0 0;transform:translateY(105%);transition:transform .38s cubic-bezier(.2,.9,.25,1);z-index:8;padding:18px;color:#eaf2ff;font-family:system-ui,sans-serif}'
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
  var ctx = canvas.getContext('2d', { alpha: false });
  var W = 0, H = 0, dpr = 1;
  var phase = 'idle';
  var rafId = 0, t0 = 0, lastT = 0;
  var bgStars = [], goals = [], particles = [];
  var bh = { r: 2, max: 400, swirl: 0, fall: 0 };
  var door = { x: 0, y: 0, open: 0, opening: false };
  var needResize = true;
  var roomImgOk = false;

  function loadRoomImage() {
    var img = document.getElementById('rmBg');
    if (!img) return;
    var candidates = [
      'matter-room.jpg',
      'matter-room.png',
      'assets/matter-room.jpg',
      './matter-room.jpg'
    ];
    var i = 0;
    function tryNext() {
      if (i >= candidates.length) {
        roomImgOk = false;
        img.style.background =
          'radial-gradient(ellipse 80% 50% at 50% 22%,rgba(35,55,95,.4),transparent 60%),'
          + 'radial-gradient(circle at 72% 40%,rgba(255,170,70,.18),transparent 18%),'
          + 'radial-gradient(circle at 18% 50%,rgba(255,150,50,.12),transparent 16%),'
          + 'linear-gradient(180deg,#1c1410 0%,#0e0a08 50%,#070504 100%)';
        return;
      }
      var u = candidates[i++] + (candidates[i - 1].indexOf('?') >= 0 ? '' : '?v=5');
      var probe = new Image();
      probe.onload = function () {
        roomImgOk = true;
        img.src = probe.src;
        img.style.background = 'none';
      };
      probe.onerror = tryNext;
      probe.src = u;
    }
    tryNext();
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
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = window.innerWidth | 0;
    H = window.innerHeight | 0;
    var bw = Math.floor(W * dpr), bh2 = Math.floor(H * dpr);
    if (canvas.width !== bw || canvas.height !== bh2) {
      canvas.width = bw;
      canvas.height = bh2;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    needResize = false;
  }
  window.addEventListener('resize', function () { needResize = true; }, { passive: true });
  window.addEventListener('orientationchange', function () { needResize = true; }, { passive: true });

  function seedSpace() {
    bgStars = [];
    var nStars = Math.min(120, Math.floor((W * H) / 9000));
    for (var i = 0; i < nStars; i++) {
      bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: 0.4 + Math.random() * 1.3, ph: Math.random() * 6.28, sp: 0.25 + Math.random() * 0.65 });
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
    door.y = H * 0.62;
    door.open = 0;
    door.opening = false;
  }

  function enterMatter() {
    try { ac(); } catch (e) {}
    needResize = true;
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
    var np = Math.min(70, Math.floor(W / 8));
    for (var i = 0; i < np; i++) {
      particles.push({ a: Math.random() * Math.PI * 2, r: 20 + Math.random() * 48, sp: 0.85 + Math.random() * 1.8, s: 1 + Math.random() * 2 });
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
    needResize = true;
    resize();
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
    loadRoomImage();
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
    var dt = Math.min(0.048, (ts - lastT) / 1000);
    lastT = ts;
    if (needResize) resize();
    if (phase === 'blackhole') drawBlackHole(dt);
    else if (phase === 'space') drawSpace(dt, ts);
  }

  function drawBlackHole(dt) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.55;
    bh.swirl += dt * 2.6;
    bh.r += (bh.max * 0.5 - bh.r) * Math.min(1, dt * 1.2);
    if (bh.r > bh.max * 0.3) bh.fall += dt;

    // accretion disk
    for (var i = 0; i < 12; i++) {
      var rr = bh.r * (0.28 + i * 0.045);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(100,140,255,' + (0.03 + i * 0.008) + ')';
      ctx.lineWidth = 1.5;
      ctx.ellipse(cx, cy, rr, rr * 0.32, bh.swirl * 0.1 + i * 0.02, 0, Math.PI * 2);
      ctx.stroke();
    }
    // orbiting dust
    for (var j = 0; j < particles.length; j++) {
      var p = particles[j];
      p.a += dt * p.sp;
      p.r = Math.max(2, p.r - dt * 22 * (bh.r / bh.max));
      var scale = 0.5 + bh.r / bh.max;
      var x = cx + Math.cos(p.a + bh.swirl) * p.r * scale;
      var y = cy + Math.sin(p.a + bh.swirl) * p.r * 0.42 * scale;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(190,215,255,' + (0.12 + 0.45 * (1 - p.r / 70)) + ')';
      ctx.arc(x, y, p.s, 0, Math.PI * 2);
      ctx.fill();
    }
    // event horizon
    var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, bh.r * 0.52);
    grd.addColorStop(0, '#000');
    grd.addColorStop(0.55, '#050810');
    grd.addColorStop(0.82, 'rgba(30,50,100,0.35)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.fillStyle = grd; ctx.arc(cx, cy, bh.r * 0.52, 0, Math.PI * 2); ctx.fill();
    // photon ring
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,220,160,' + (0.15 + 0.2 * Math.sin(bh.swirl * 2)) + ')';
    ctx.lineWidth = 1.5;
    ctx.arc(cx, cy, bh.r * 0.38, 0, Math.PI * 2);
    ctx.stroke();

    if (bh.fall > 0) {
      var v = Math.min(1, bh.fall / 1.25);
      ctx.fillStyle = 'rgba(0,0,0,' + v + ')';
      ctx.fillRect(0, 0, W, H);
      if (v > 0.93) enterSpace();
    }
  }

  function drawSpace(dt, ts) {
    var t = (ts - t0) / 1000;
    var g = ctx.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    g.addColorStop(0, '#0a1020'); g.addColorStop(0.55, '#05080f'); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // stars
    for (var i = 0; i < bgStars.length; i++) {
      var s = bgStars[i];
      var a = 0.2 + Math.abs(Math.sin(t * s.sp + s.ph)) * 0.55;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // goal links
    ctx.strokeStyle = 'rgba(140,180,255,0.13)'; ctx.lineWidth = 1;
    for (var k = 0; k < goals.length - 1; k++) {
      ctx.beginPath(); ctx.moveTo(goals[k].x, goals[k].y); ctx.lineTo(goals[k + 1].x, goals[k + 1].y); ctx.stroke();
    }
    // goal stars
    for (var gi = 0; gi < goals.length; gi++) {
      var st = goals[gi];
      var pulse = 0.65 + 0.35 * Math.sin(t * 1.35 + st.pulse);
      var r = (4 + (st.progress || 0) * 3) * pulse;
      ctx.beginPath();
      ctx.fillStyle = 'hsla(' + st.hue + ',80%,70%,' + (0.09 * pulse) + ')';
      ctx.arc(st.x, st.y, r * 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = 'hsla(' + st.hue + ',90%,88%,' + (0.55 + 0.35 * pulse) + ')';
      ctx.arc(st.x, st.y, r, 0, Math.PI * 2); ctx.fill();
    }

    // door open progress
    if (door.opening) {
      door.open = Math.min(1, door.open + dt * 0.85);
      if (door.open >= 0.98) {
        ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, (door.open - 0.85) * 8) + ')';
        ctx.fillRect(0, 0, W, H);
        if (door.open >= 1) enterRoom();
      }
    }
    drawConstellationDoor(t);

    // vignette
    var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.48)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  /* Дверь = созвездие: контур из звёзд */
  function drawConstellationDoor(t) {
    var dx = door.x, dy = door.y;
    var sc = 1 + door.open * 0.35;
    var hw = 22 * sc, hh = 38 * sc;
    // soft glow behind door
    var pg = ctx.createRadialGradient(dx, dy, 0, dx, dy, hh * 1.3);
    pg.addColorStop(0, 'rgba(120,170,255,' + (0.12 + door.open * 0.25) + ')');
    pg.addColorStop(1, 'rgba(20,40,80,0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(dx, dy, hh * 1.3, 0, Math.PI * 2); ctx.fill();

    // star points forming a door rectangle + arch
    var pts = [
      [-hw, hh], [-hw, -hh * 0.55], [-hw * 0.55, -hh], [0, -hh * 1.12], [hw * 0.55, -hh], [hw, -hh * 0.55], [hw, hh],
      [-hw * 0.35, 0], [hw * 0.35, 0] // handle-ish stars
    ];
    // links
    ctx.strokeStyle = 'rgba(180,210,255,' + (0.35 + 0.3 * door.open) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var i = 0; i < 7; i++) {
      var p = pts[i];
      var px = dx + p[0], py = dy + p[1];
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    // vertical midline fading with open
    if (door.open < 0.7) {
      ctx.globalAlpha = 1 - door.open;
      ctx.beginPath();
      ctx.moveTo(dx, dy - hh * 0.9);
      ctx.lineTo(dx, dy + hh);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // stars at vertices
    for (var j = 0; j < pts.length; j++) {
      var q = pts[j];
      var qx = dx + q[0] * (1 - door.open * 0.15);
      var qy = dy + q[1];
      var pr = (j < 7 ? 2.2 : 1.6) * (0.85 + 0.15 * Math.sin(t * 2 + j));
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,245,220,' + (0.7 + 0.3 * Math.sin(t * 1.5 + j)) + ')';
      ctx.arc(qx, qy, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(160,200,255,0.25)';
      ctx.arc(qx, qy, pr * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // open: fade interior
    if (door.open > 0.05) {
      ctx.fillStyle = 'rgba(8,12,24,' + (0.55 * (1 - door.open)) + ')';
      ctx.fillRect(dx - hw * 0.9, dy - hh, hw * 1.8 * (1 - door.open * 0.9), hh * 2);
    }
  }

  canvas.addEventListener('click', function (ev) {
    if (phase !== 'space') return;
    var rect = canvas.getBoundingClientRect();
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    var dx = x - door.x, dy = y - door.y;
    if (Math.abs(dx) < 40 && Math.abs(dy) < 55) { openDoor(); return; }
    var best = null, bestD = 44 * 44;
    for (var i = 0; i < goals.length; i++) {
      var s = goals[i];
      var ddx = x - s.x, ddy = y - s.y, d = ddx * ddx + ddy * ddy;
      if (d < bestD) { bestD = d; best = s; }
    }
    if (best) showStar(best);
  }, { passive: true });

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
      openSheet('<h3>Растение</h3><p class="mt-meta">Стадия: <b>' + names[M.plant.stage | 0] + '</b></p><button type="button" class="mt-act" id="mWater">Полить</button>');
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
      openSheet('<h3>Дневник</h3><textarea id="mtDiaryInput" placeholder="Мысли…">' + last + '</textarea><button type="button" class="mt-act" id="mSaveDiary">Сохранить</button>');
      setTimeout(function () {
        var b = document.getElementById('mSaveDiary');
        if (b) b.onclick = function () {
          var v = String((document.getElementById('mtDiaryInput') || {}).value || '').trim();
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
