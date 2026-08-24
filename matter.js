/* МАТЕРИЯ v4 + finn loader */
(function () {
  'use strict';
  var LS_KEY = 'kopeyka_matter_v1';
  var LS_BOOKS = 'kopeyka_matter_books_v1';
  function defState() { return { plant: { stage: 0, lastWatered: 0 }, diary: [], book: { progress: 0.18, title: 'Атомные привычки' }, windowNight: true, updatedAt: null }; }
  function loadMatter() { try { return Object.assign(defState(), JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch (e) { return defState(); } }
  var M = loadMatter();
  function saveMatter() { try { M.updatedAt = new Date().toISOString(); localStorage.setItem(LS_KEY, JSON.stringify(M)); } catch (e) {} }
  function loadBooks() { try { return JSON.parse(localStorage.getItem(LS_BOOKS) || '[]'); } catch (e) { return []; } }
  function saveBooks(list) { try { localStorage.setItem(LS_BOOKS, JSON.stringify(list)); } catch (e) {} }
  function readReserveTotal() {
    try {
      if (window.STATE && Array.isArray(window.STATE.reserves))
        return window.STATE.reserves.reduce(function (a, r) { if (!r || r.deleted) return a; return a + (Number(r.saved) || Number(r.amount) || 0); }, 0);
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
    if (!list.length) list = [{ id: 'g1', type: 'goal', title: 'Подушка', progress: 0.25, remain: '—' }, { id: 'g2', type: 'goal', title: 'Права', progress: 0.4, remain: '—' }, { id: 'd1', type: 'dream', title: 'Отпуск', progress: 0.12, remain: '—' }];
    return list;
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return Math.abs(h); }
  var AC = null;
  function ac() { if (AC) return AC; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} return AC; }
  function playCreak() {
    var a = ac(); if (!a) return;
    try {
      if (a.state === 'suspended') a.resume();
      var t = a.currentTime, o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.72);
      f.type = 'lowpass'; f.frequency.value = 580;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(f); f.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.85);
    } catch (e) {}
  }
  var ambientNodes = null;
  function startAmbient() {
    stopAmbient(); var a = ac(); if (!a) return;
    try {
      if (a.state === 'suspended') a.resume();
      var master = a.createGain(); master.gain.value = 0; master.connect(a.destination);
      master.gain.linearRampToValueAtTime(0.035, a.currentTime + 2.5);
      ambientNodes = { master: master, list: [] };
      [146.83, 174.61, 220, 261.63, 329.63].forEach(function (freq, i) {
        var o = a.createOscillator(), g = a.createGain();
        o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = freq; g.gain.value = 0.12 / (1 + i * 0.35);
        var lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 0.03 + i * 0.008; lg.gain.value = 0.04;
        lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(master); o.start(); lfo.start();
        ambientNodes.list.push(o, lfo);
      });
    } catch (e) { ambientNodes = null; }
  }
  function stopAmbient() {
    if (!ambientNodes) return;
    try { ambientNodes.list.forEach(function (n) { try { n.stop(); } catch (e) {} }); ambientNodes.master.disconnect(); } catch (e) {}
    ambientNodes = null;
  }
  var css = '#matterRoot{position:fixed;inset:0;z-index:9999;display:none;background:#000;overflow:hidden;font-family:Georgia,serif;touch-action:none}'
    + '#matterRoot.open{display:block}#mtCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;background:#000}'
    + '.mt-hud{position:absolute;left:0;right:0;top:0;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 8px;display:flex;justify-content:flex-end;z-index:5;pointer-events:none}'
    + '.mt-hud button{pointer-events:auto}.mt-exit{width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.22);color:#f5efe6;font-size:16px;font-family:system-ui,sans-serif}'
    + '.mt-brand{position:absolute;left:50%;top:calc(20px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:4;pointer-events:none;text-align:center;width:92%}'
    + '.mt-brand .mt-title-main{display:block;font-family:Georgia,serif;font-weight:700;font-style:italic;letter-spacing:.32em;font-size:clamp(12px,3.4vw,16px);color:#fff8e6;text-shadow:0 0 3px #fff,0 0 10px rgba(255,220,140,1),0 0 24px rgba(255,180,70,.85),0 0 48px rgba(255,130,30,.5);animation:mtSun 3s ease-in-out infinite alternate}'
    + '.mt-brand .mt-title-sub{display:block;margin-top:6px;font-size:9px;letter-spacing:.4em;color:rgba(200,220,255,.45);font-family:system-ui,sans-serif}'
    + '@keyframes mtSun{from{filter:brightness(.88)}to{filter:brightness(1.2)}}'
    + '#matterRoom{position:absolute;inset:0;display:none;overflow:hidden;z-index:3;background:#0a0604}#matterRoom.show{display:block}'
    + '.rm-bg{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:center center;border:0;display:block;pointer-events:none}'
    + '.rm-hot{position:absolute;border:0;background:transparent;padding:0;z-index:4;-webkit-tap-highlight-color:transparent}.rm-hot:active{background:rgba(255,200,120,.06)}'
    + '.mt-float{position:absolute;left:50%;top:50%;transform:translate(-50%,-48%) scale(.94);opacity:0;pointer-events:none;z-index:10;width:min(340px,88vw);background:rgba(6,8,14,.55);backdrop-filter:blur(16px);border:1px solid rgba(255,220,160,.18);border-radius:20px;padding:20px 18px;color:#f2e8d4;transition:opacity .35s,transform .4s;font-family:system-ui,sans-serif}'
    + '.mt-float.show{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:auto}.mt-float h3{font-size:16px;margin:0 0 10px;color:#ffe9b8}.mt-float .mt-meta{font-size:13px;color:rgba(220,210,190,.85);line-height:1.5}'
    + '.mt-float .mt-close,.mt-float .mt-act{margin-top:14px;width:100%;padding:11px;border-radius:12px;border:0;font-weight:600;font-size:14px}'
    + '.mt-float .mt-close{background:rgba(255,255,255,.07);color:#e8e0d0;border:1px solid rgba(255,255,255,.1)}.mt-float .mt-act{background:linear-gradient(135deg,rgba(229,167,94,.9),rgba(240,192,96,.95));color:#1a1208}'
    + '.mt-float textarea{width:100%;min-height:100px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.3);color:#f5e6c8;padding:10px;font:inherit;margin-top:6px}'
    + '.mt-goalrow{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:13px}.mt-goalrow b{color:#ffd9a8}'
    + '#mtReader{position:absolute;inset:0;display:none;z-index:20;background:#0c0a08;flex-direction:column;font-family:Georgia,serif}#mtReader.show{display:flex}'
    + '.rd-top{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px;border-bottom:1px solid rgba(255,255,255,.08)}'
    + '.rd-top button{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#e8e0d0}'
    + '.rd-top .rd-name{flex:1;font-size:13px;color:#f0e6d0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.rd-progress{height:3px;background:rgba(255,255,255,.08);margin:0 14px 8px;border-radius:99px;overflow:hidden}.rd-progress i{display:block;height:100%;background:linear-gradient(90deg,#E5A75E,#F0C060)}'
    + '.rd-body{flex:1;overflow:hidden;padding:0 18px}.rd-page{height:100%;overflow-y:auto;color:#e8e0d0;font-size:17px;line-height:1.65;padding:8px 0 24px;white-space:pre-wrap}'
    + '.rd-nav{display:flex;gap:10px;padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,255,255,.08)}'
    + '.rd-nav button{flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#e8e0d0;font-weight:600;font-family:system-ui,sans-serif}'
    + '.rd-nav .rd-info{min-width:70px;text-align:center;font-size:12px;color:rgba(200,190,170,.7);align-self:center;font-family:system-ui,sans-serif}'
    + '.rd-lib{padding:12px 14px;overflow-y:auto;flex:1}.rd-item{padding:12px 14px;margin-bottom:8px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}'
    + '.rd-item b{display:block;font-size:14px;color:#f0e6d0;margin-bottom:6px}.rd-bar{height:4px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;margin-top:4px}.rd-bar i{display:block;height:100%;background:#E5A75E}'
    + '.rd-add{width:100%;padding:14px;border-radius:14px;border:1px dashed rgba(255,220,160,.3);background:transparent;color:#E5A75E;font-weight:600;margin-bottom:12px;font-family:system-ui,sans-serif}'
    + '.radial button.matter-act{border-top:1px solid rgba(255,255,255,.08);margin-top:4px;color:#C4D4FF}';
  var styleEl = document.createElement('style'); styleEl.textContent = css; document.head.appendChild(styleEl);
  var HOTSPOTS = [
    { id: 'bed', style: 'left:1%;top:38%;width:26%;height:30%' }, { id: 'window', style: 'left:30%;top:12%;width:36%;height:20%' },
    { id: 'desk', style: 'left:28%;top:40%;width:36%;height:14%' }, { id: 'goals', style: 'right:5%;top:14%;width:18%;height:14%' },
    { id: 'piggy', style: 'right:7%;top:36%;width:16%;height:11%' }, { id: 'plant', style: 'right:12%;bottom:18%;width:20%;height:20%' },
    { id: 'book', style: 'left:34%;bottom:12%;width:26%;height:13%' }, { id: 'diary', style: 'left:2%;bottom:1%;width:28%;height:16%' },
    { id: 'lamp', style: 'right:2%;bottom:2%;width:14%;height:12%' }, { id: 'door', style: 'right:0%;top:24%;width:13%;height:46%' }
  ];
  var root = document.createElement('div'); root.id = 'matterRoot';
  var hotHtml = HOTSPOTS.map(function (h) { return '<button type="button" class="rm-hot" data-obj="' + h.id + '" style="' + h.style + '"></button>'; }).join('');
  root.innerHTML = '<canvas id="mtCanvas"></canvas><div class="mt-brand" id="mtBrand" hidden><span class="mt-title-main">МАТЕРИЯ</span><span class="mt-title-sub">СОЗВЕЗДИЕ · КОМНАТА</span></div><div class="mt-hud"><button type="button" class="mt-exit" id="mtExit">✕</button></div><div id="matterRoom"><img class="rm-bg" id="rmBg" alt="" draggable="false"/>' + hotHtml + '</div><div class="mt-float" id="mtFloat"><div id="mtFloatBody"></div></div><div id="mtReader"><div class="rd-top"><button type="button" id="rdBack">←</button><div class="rd-name" id="rdName">Книги</div></div><div class="rd-progress" id="rdProgWrap" hidden><i id="rdProg" style="width:0%"></i></div><div class="rd-lib" id="rdLib"></div><div class="rd-body" id="rdBody" hidden><div class="rd-page" id="rdPage"></div></div><div class="rd-nav" id="rdNav" hidden><button type="button" id="rdPrev">← Назад</button><span class="rd-info" id="rdInfo">1 / 1</span><button type="button" id="rdNext">Далее →</button></div><input type="file" id="rdFile" accept=".fb2,application/x-fictionbook+xml,text/xml" hidden/></div>';
  document.body.appendChild(root);
  var canvas = document.getElementById('mtCanvas'); var ctx = canvas.getContext('2d', { alpha: false });
  var W = 0, H = 0, dpr = 1, phase = 'idle', rafId = 0, t0 = 0, lastT = 0;
  var bgStars = [], goals = [], particles = [], bh = { r: 2, max: 400, swirl: 0, fall: 0 };
  var door = { x: 0, y: 0, open: 0, opening: false }, needResize = true;
  var reader = { mode: 'lib', pages: [], page: 0, title: '', bookId: null };
  function loadRoomImage() {
    var img = document.getElementById('rmBg'); if (!img) return;
    ['matter-room.jpg', 'matter-room.png'].forEach(function (u) { var p = new Image(); p.onload = function () { img.src = p.src; }; p.src = u + '?v=7'; });
  }
  loadRoomImage();
  function mountRadial() {
    var radial = document.getElementById('radial'); if (!radial || radial.querySelector('[data-act="matter"]')) return;
    var btn = document.createElement('button'); btn.type = 'button'; btn.setAttribute('data-act', 'matter'); btn.className = 'matter-act';
    btn.innerHTML = '<span class="ic">🌌</span> Материя <span style="opacity:.7;font-size:11px">(бета)</span>';
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); try { radial.classList.remove('show'); var fab = document.getElementById('fab'); if (fab) fab.classList.remove('open'); } catch (x) {} enterMatter(); });
    radial.appendChild(btn);
  }
  function mountAll() { var el = document.getElementById('matterEnterWrap'); if (el && el.parentNode) el.parentNode.removeChild(el); mountRadial(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(mountAll, 200); }); else setTimeout(mountAll, 200);
  setTimeout(mountAll, 1200);
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75); W = window.innerWidth | 0; H = window.innerHeight | 0;
    var bw = Math.floor(W * dpr), bh2 = Math.floor(H * dpr);
    if (canvas.width !== bw || canvas.height !== bh2) { canvas.width = bw; canvas.height = bh2; canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); needResize = false;
  }
  window.addEventListener('resize', function () { needResize = true; }, { passive: true });
  function seedSpace() {
    bgStars = []; var nStars = Math.min(110, Math.floor((W * H) / 9500));
    for (var i = 0; i < nStars; i++) bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: 0.4 + Math.random() * 1.25, ph: Math.random() * 6.28, sp: 0.25 + Math.random() * 0.6 });
    goals = buildGoals(); var cx = W * 0.42, cy = H * 0.48, n = goals.length;
    goals.forEach(function (g, i) {
      var ang = -Math.PI * 0.6 + (i / Math.max(1, n - 1)) * Math.PI * 1.05;
      var rad = Math.min(W, H) * 0.2 + ((hash(g.id) % 36));
      g.x = cx + Math.cos(ang) * rad * 1.1; g.y = cy + Math.sin(ang) * rad * 0.7;
      g.hue = g.type === 'dream' ? 42 : 200; g.pulse = Math.random() * 6;
    });
    door.x = W * 0.86; door.y = H * 0.58; door.open = 0; door.opening = false;
    window.__matterDoor = { x: door.x, y: door.y };
  }
  function enterMatter() {
    try { ac(); } catch (e) {}
    needResize = true; resize(); root.classList.add('open');
    document.getElementById('matterRoom').classList.remove('show');
    document.getElementById('mtBrand').hidden = true; canvas.style.display = 'block';
    hideFloat(); closeReader(); stopAmbient(); phase = 'blackhole';
    bh = { r: 2, max: Math.max(W, H) * 0.95, swirl: 0, fall: 0 }; particles = [];
    for (var i = 0; i < Math.min(60, Math.floor(W / 9)); i++) particles.push({ a: Math.random() * Math.PI * 2, r: 20 + Math.random() * 48, sp: 0.85 + Math.random() * 1.8, s: 1 + Math.random() * 2 });
    t0 = performance.now(); lastT = t0; if (rafId) cancelAnimationFrame(rafId); rafId = requestAnimationFrame(loop);
  }
  function exitMatter() {
    phase = 'idle'; if (rafId) cancelAnimationFrame(rafId); rafId = 0; stopAmbient(); closeReader();
    root.classList.remove('open'); document.getElementById('matterRoom').classList.remove('show');
    document.getElementById('mtBrand').hidden = true; hideFloat();
  }
  document.getElementById('mtExit').onclick = exitMatter;
  function enterSpace() { phase = 'space'; needResize = true; resize(); seedSpace(); document.getElementById('mtBrand').hidden = false; }
  function openDoor() { if (door.opening) return; door.opening = true; playCreak(); }
  window.__matterOpenDoor = openDoor;
  function enterRoom() { phase = 'room'; canvas.style.display = 'none'; document.getElementById('mtBrand').hidden = true; document.getElementById('matterRoom').classList.add('show'); loadRoomImage(); startAmbient(); }
  function leaveRoom() { stopAmbient(); document.getElementById('matterRoom').classList.remove('show'); canvas.style.display = 'block'; hideFloat(); closeReader(); door.open = 0; door.opening = false; enterSpace(); }
  function loop(ts) {
    if (phase === 'idle') return; rafId = requestAnimationFrame(loop);
    var dt = Math.min(0.048, (ts - lastT) / 1000); lastT = ts; if (needResize) resize();
    if (phase === 'blackhole') drawBlackHole(dt); else if (phase === 'space') drawSpace(dt, ts);
  }
  function drawBlackHole(dt) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.55; bh.swirl += dt * 2.5; bh.r += (bh.max * 0.5 - bh.r) * Math.min(1, dt * 1.2);
    if (bh.r > bh.max * 0.3) bh.fall += dt;
    for (var i = 0; i < 11; i++) { var rr = bh.r * (0.28 + i * 0.045); ctx.beginPath(); ctx.strokeStyle = 'rgba(100,140,255,' + (0.03 + i * 0.008) + ')'; ctx.lineWidth = 1.4; ctx.ellipse(cx, cy, rr, rr * 0.32, bh.swirl * 0.1 + i * 0.02, 0, Math.PI * 2); ctx.stroke(); }
    for (var j = 0; j < particles.length; j++) {
      var p = particles[j]; p.a += dt * p.sp; p.r = Math.max(2, p.r - dt * 22 * (bh.r / bh.max));
      var scale = 0.5 + bh.r / bh.max;
      ctx.beginPath(); ctx.fillStyle = 'rgba(190,215,255,' + (0.12 + 0.45 * (1 - p.r / 70)) + ')';
      ctx.arc(cx + Math.cos(p.a + bh.swirl) * p.r * scale, cy + Math.sin(p.a + bh.swirl) * p.r * 0.42 * scale, p.s, 0, Math.PI * 2); ctx.fill();
    }
    var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, bh.r * 0.52);
    grd.addColorStop(0, '#000'); grd.addColorStop(0.55, '#050810'); grd.addColorStop(0.82, 'rgba(30,50,100,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.fillStyle = grd; ctx.arc(cx, cy, bh.r * 0.52, 0, Math.PI * 2); ctx.fill();
    if (bh.fall > 0) { var v = Math.min(1, bh.fall / 1.25); ctx.fillStyle = 'rgba(0,0,0,' + v + ')'; ctx.fillRect(0, 0, W, H); if (v > 0.93) enterSpace(); }
  }
  function drawSpace(dt, ts) {
    var t = (ts - t0) / 1000;
    var g = ctx.createRadialGradient(W * 0.45, H * 0.38, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    g.addColorStop(0, '#0a1020'); g.addColorStop(0.55, '#05080f'); g.addColorStop(1, '#000'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < bgStars.length; i++) { var s = bgStars[i]; ctx.globalAlpha = 0.2 + Math.abs(Math.sin(t * s.sp + s.ph)) * 0.55; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(140,180,255,0.12)'; ctx.lineWidth = 1;
    for (var k = 0; k < goals.length - 1; k++) { ctx.beginPath(); ctx.moveTo(goals[k].x, goals[k].y); ctx.lineTo(goals[k + 1].x, goals[k + 1].y); ctx.stroke(); }
    for (var gi = 0; gi < goals.length; gi++) {
      var st = goals[gi]; var pulse = 0.65 + 0.35 * Math.sin(t * 1.35 + st.pulse); var r = (4 + (st.progress || 0) * 3) * pulse;
      ctx.beginPath(); ctx.fillStyle = 'hsla(' + st.hue + ',80%,70%,' + (0.09 * pulse) + ')'; ctx.arc(st.x, st.y, r * 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.fillStyle = 'hsla(' + st.hue + ',90%,88%,' + (0.55 + 0.35 * pulse) + ')'; ctx.arc(st.x, st.y, r, 0, Math.PI * 2); ctx.fill();
    }
    if (door.opening) { door.open = Math.min(1, door.open + dt * 0.85); if (door.open >= 0.98) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, (door.open - 0.85) * 8) + ')'; ctx.fillRect(0, 0, W, H); if (door.open >= 1) enterRoom(); } }
    drawConstellationDoor(t);
    window.__matterDoor = { x: door.x, y: door.y };
  }
  function drawConstellationDoor(t) {
    var dx = door.x, dy = door.y, sc = 1 + door.open * 0.28, hw = 18 * sc, hh = 32 * sc;
    var pg = ctx.createRadialGradient(dx, dy, 0, dx, dy, hh * 1.4);
    pg.addColorStop(0, 'rgba(120,170,255,' + (0.14 + door.open * 0.28) + ')'); pg.addColorStop(1, 'rgba(20,40,80,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(dx, dy, hh * 1.4, 0, Math.PI * 2); ctx.fill();
    var pts = [[-hw, hh], [-hw, -hh * 0.5], [-hw * 0.5, -hh], [0, -hh * 1.15], [hw * 0.5, -hh], [hw, -hh * 0.5], [hw, hh]];
    ctx.strokeStyle = 'rgba(180,210,255,' + (0.4 + 0.35 * door.open) + ')'; ctx.lineWidth = 1.3; ctx.beginPath();
    for (var i = 0; i < pts.length; i++) { var px = dx + pts[i][0], py = dy + pts[i][1]; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.closePath(); ctx.stroke();
    for (var j = 0; j < pts.length; j++) {
      var qx = dx + pts[j][0], qy = dy + pts[j][1], pr = 2.1 * (0.85 + 0.15 * Math.sin(t * 2 + j));
      ctx.beginPath(); ctx.fillStyle = 'rgba(255,245,220,' + (0.7 + 0.3 * Math.sin(t * 1.5 + j)) + ')'; ctx.arc(qx, qy, pr, 0, Math.PI * 2); ctx.fill();
    }
  }
  canvas.addEventListener('click', function (ev) {
    if (phase !== 'space') return;
    var rect = canvas.getBoundingClientRect(); var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    if (Math.abs(x - door.x) < 36 && Math.abs(y - door.y) < 50) { openDoor(); return; }
    var best = null, bestD = 40 * 40;
    for (var i = 0; i < goals.length; i++) { var s = goals[i], d = (x - s.x) * (x - s.x) + (y - s.y) * (y - s.y); if (d < bestD) { bestD = d; best = s; } }
    if (best) showFloat('<h3>' + best.title + '</h3><p class="mt-meta">Прогресс: ' + Math.round((best.progress || 0) * 100) + '%</p><button type="button" class="mt-close" id="mtFClose">Закрыть</button>');
  }, { passive: true });
  function showFloat(html) { var f = document.getElementById('mtFloat'); document.getElementById('mtFloatBody').innerHTML = html; f.classList.add('show'); var c = document.getElementById('mtFClose'); if (c) c.onclick = hideFloat; }
  function hideFloat() { document.getElementById('mtFloat').classList.remove('show'); }
  root.querySelectorAll('.rm-hot').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); onObj(b.getAttribute('data-obj')); }); });
  function onObj(id) {
    if (id === 'door') { leaveRoom(); return; }
    if (id === 'piggy') { showFloat('<h3>Копилка</h3><p class="mt-meta">В резервах: <b style="color:#ffd9a8">' + readReserveTotal().toLocaleString('ru-RU') + ' ₽</b></p><button type="button" class="mt-close" id="mtFClose">Закрыть</button>'); return; }
    if (id === 'plant') {
      var names = ['Росток', 'Маленькое', 'Взрослое', 'Цветение'];
      showFloat('<h3>Растение</h3><p class="mt-meta">Стадия: <b>' + names[M.plant.stage | 0] + '</b></p><button type="button" class="mt-act" id="mWater">Полить</button><button type="button" class="mt-close" id="mtFClose">Закрыть</button>');
      setTimeout(function () { var btn = document.getElementById('mWater'); if (btn) btn.onclick = function () { var now = Date.now(); if (M.plant.lastWatered && now - M.plant.lastWatered < 3000) return; M.plant.lastWatered = now; if (M.plant.stage < 3) M.plant.stage++; saveMatter(); hideFloat(); }; }, 20); return;
    }
    if (id === 'book') { openReader(); return; }
    if (id === 'diary' || id === 'desk') {
      var last = (M.diary && M.diary[M.diary.length - 1]) || '';
      showFloat('<h3>Дневник</h3><textarea id="mtDiaryInput">' + last + '</textarea><button type="button" class="mt-act" id="mSaveDiary">Сохранить</button><button type="button" class="mt-close" id="mtFClose">Закрыть</button>');
      setTimeout(function () { var b = document.getElementById('mSaveDiary'); if (b) b.onclick = function () { var v = String((document.getElementById('mtDiaryInput') || {}).value || '').trim(); if (v) { M.diary = M.diary || []; M.diary.push(v); saveMatter(); } hideFloat(); }; }, 20); return;
    }
    if (id === 'goals') { var rows = buildGoals().map(function (g) { return '<div class="mt-goalrow"><span>' + g.title + '</span><b>' + Math.round((g.progress || 0) * 100) + '%</b></div>'; }).join(''); showFloat('<h3>Цели</h3>' + rows + '<button type="button" class="mt-close" id="mtFClose">Закрыть</button>'); return; }
    if (id === 'window') { showFloat('<h3>Окно</h3><p class="mt-meta">Город внизу дышит огнями.</p><button type="button" class="mt-close" id="mtFClose">Закрыть</button>'); return; }
    if (id === 'bed') { showFloat('<h3>Кровать</h3><p class="mt-meta">Место, где можно выдохнуть.</p><button type="button" class="mt-close" id="mtFClose">Закрыть</button>'); return; }
    if (id === 'lamp') { showFloat('<h3>Свет</h3><p class="mt-meta">Тёплый огонёк.</p><button type="button" class="mt-close" id="mtFClose">Закрыть</button>'); return; }
  }
  function openReader() { hideFloat(); document.getElementById('mtReader').classList.add('show'); reader.mode = 'lib'; document.getElementById('rdLib').hidden = false; document.getElementById('rdBody').hidden = true; document.getElementById('rdNav').hidden = true; document.getElementById('rdProgWrap').hidden = true; document.getElementById('rdName').textContent = 'Книги'; renderLibrary(); }
  function closeReader() { document.getElementById('mtReader').classList.remove('show'); if (reader.bookId != null && reader.pages.length) { var list = loadBooks(); for (var i = 0; i < list.length; i++) if (list[i].id === reader.bookId) { list[i].page = reader.page; list[i].progress = reader.pages.length ? reader.page / reader.pages.length : 0; break; } saveBooks(list); } }
  document.getElementById('rdBack').onclick = function () { if (reader.mode === 'read') { closeReader(); openReader(); return; } closeReader(); };
  function renderLibrary() {
    var box = document.getElementById('rdLib'), list = loadBooks(), html = '<button type="button" class="rd-add" id="rdAdd">+ Загрузить FB2</button>';
    if (!list.length) html += '<p style="color:rgba(200,190,170,.55);font-size:13px;text-align:center;margin-top:24px">Пока пусто. Загрузи FB2.</p>';
    list.forEach(function (b) { var pct = Math.round((b.progress || 0) * 100); html += '<div class="rd-item" data-bid="' + b.id + '"><b>' + (b.title || 'Книга') + '</b><span style="font-size:11px;color:rgba(200,190,170,.55)">' + pct + '%</span><div class="rd-bar"><i style="width:' + pct + '%"></i></div></div>'; });
    box.innerHTML = html; document.getElementById('rdAdd').onclick = function () { document.getElementById('rdFile').click(); };
    box.querySelectorAll('.rd-item').forEach(function (el) { el.onclick = function () { openBook(el.getAttribute('data-bid')); }; });
  }
  document.getElementById('rdFile').onchange = function (ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    var ro = new FileReader(); ro.onload = function () {
      try {
        var text = String(ro.result || ''), parsed = parseFb2(text); if (!parsed.pages.length) { alert('Не удалось прочитать FB2'); return; }
        var list = loadBooks(), id = 'b_' + Date.now();
        list.unshift({ id: id, title: parsed.title || f.name, pages: parsed.pages, page: 0, total: parsed.pages.length, progress: 0 });
        saveBooks(list); openBook(id);
      } catch (e) { alert('Ошибка чтения'); }
    }; ro.readAsText(f, 'UTF-8'); ev.target.value = '';
  };
  function parseFb2(xml) {
    var title = 'Книга'; try { var tm = xml.match(/<book-title[^>]*>([\s\S]*?)<\/book-title>/i); if (tm) title = tm[1].replace(/<[^>]+>/g, '').trim() || title; } catch (e) {}
    var body = xml; try { var bm = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i); if (bm) body = bm[1]; } catch (e) {}
    body = body.replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    var pages = []; for (var i = 0; i < body.length; i += 900) pages.push(body.slice(i, i + 900));
    if (!pages.length) pages = ['(пусто)']; return { title: title, pages: pages };
  }
  function openBook(id) {
    var list = loadBooks(), b = null; for (var i = 0; i < list.length; i++) if (list[i].id === id) { b = list[i]; break; }
    if (!b || !b.pages || !b.pages.length) return;
    reader.mode = 'read'; reader.bookId = b.id; reader.title = b.title; reader.pages = b.pages; reader.page = Math.min(b.page || 0, b.pages.length - 1);
    document.getElementById('rdLib').hidden = true; document.getElementById('rdBody').hidden = false; document.getElementById('rdNav').hidden = false; document.getElementById('rdProgWrap').hidden = false;
    document.getElementById('rdName').textContent = b.title; renderPage();
  }
  function renderPage() {
    document.getElementById('rdPage').textContent = reader.pages[reader.page] || '';
    document.getElementById('rdInfo').textContent = (reader.page + 1) + ' / ' + reader.pages.length;
    document.getElementById('rdProg').style.width = (reader.pages.length ? ((reader.page + 1) / reader.pages.length) * 100 : 0) + '%';
    var list = loadBooks(); for (var i = 0; i < list.length; i++) if (list[i].id === reader.bookId) { list[i].page = reader.page; list[i].progress = reader.pages.length ? (reader.page + 1) / reader.pages.length : 0; break; } saveBooks(list);
  }
  document.getElementById('rdPrev').onclick = function () { if (reader.page > 0) { reader.page--; renderPage(); document.getElementById('rdPage').scrollTop = 0; } };
  document.getElementById('rdNext').onclick = function () { if (reader.page < reader.pages.length - 1) { reader.page++; renderPage(); document.getElementById('rdPage').scrollTop = 0; } };
  window.FinMatter = { enter: enterMatter, exit: exitMatter, isOpen: function () { return phase !== 'idle'; } };
  // load Finn star module
  (function () {
    if (document.querySelector('script[data-matter-finn]')) return;
    var s = document.createElement('script');
    s.src = 'matter-finn.js?v=2026082501';
    s.setAttribute('data-matter-finn', '1');
    document.body.appendChild(s);
  })();
})();
