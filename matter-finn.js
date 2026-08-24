/* matter-finn.js — звезда-Фина: пламя, морф при падении, заход в дверь */
(function () {
  'use strict';

  var finn = {
    mode: 'star',
    x: 0, y: 0,
    startY: 0, targetY: 0,
    morph: 0, scale: 1,
    emotion: 'idle',
    firstListenDone: false,
    listening: false,
    trail: [],
    sparks: [],
    fallT: 0,
    active: false,
    pulse: 0
  };
  var overlay = null, octx = null, raf = 0, lastT = 0;
  var W = 0, H = 0, dpr = 1;
  var rec = null, subEl = null, hintEl = null;

  function ensureOverlay() {
    var root = document.getElementById('matterRoot');
    if (!root) return false;
    if (overlay && overlay.parentNode) return true;
    overlay = document.createElement('canvas');
    overlay.id = 'mtFinnOverlay';
    overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:7;pointer-events:auto;background:transparent';
    root.appendChild(overlay);
    octx = overlay.getContext('2d');
    if (!subEl) {
      var st = document.createElement('style');
      st.textContent = '.mt-finn-sub{position:absolute;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:86vw;padding:8px 14px;border-radius:14px;background:rgba(0,0,0,.55);color:#f5ecd8;font-size:13px;font-family:system-ui,sans-serif;text-align:center;opacity:0;pointer-events:none;z-index:12;transition:opacity .25s;border:1px solid rgba(255,220,160,.18);backdrop-filter:blur(8px)}.mt-finn-sub.show{opacity:1}.mt-finn-hint{position:absolute;left:50%;bottom:calc(56px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);font-size:11px;color:rgba(200,220,255,.45);font-family:system-ui,sans-serif;z-index:11;pointer-events:none;letter-spacing:.06em}';
      document.head.appendChild(st);
      subEl = document.createElement('div'); subEl.className = 'mt-finn-sub'; root.appendChild(subEl);
      hintEl = document.createElement('div'); hintEl.className = 'mt-finn-hint'; root.appendChild(hintEl);
    }
    overlay.addEventListener('click', onClick);
    return true;
  }

  function resize() {
    if (!overlay) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = window.innerWidth | 0; H = window.innerHeight | 0;
    overlay.width = Math.floor(W * dpr);
    overlay.height = Math.floor(H * dpr);
    overlay.style.width = W + 'px'; overlay.style.height = H + 'px';
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function showSub(t) { if (subEl) { subEl.textContent = t || ''; subEl.classList.toggle('show', !!t); } }
  function setHint(t) { if (hintEl) hintEl.textContent = t || ''; }

  function resetFinn() {
    resize();
    finn.mode = 'star';
    finn.x = W * 0.5;
    finn.startY = Math.max(56, H * 0.10);
    finn.y = finn.startY;
    finn.targetY = H * 0.74;
    finn.morph = 0; finn.scale = 1;
    finn.emotion = 'idle';
    finn.firstListenDone = false;
    finn.listening = false;
    finn.trail = []; finn.sparks = []; finn.fallT = 0;
    finn.pulse = 0;
    finn.active = true;
    showSub(''); setHint('нажми на звезду');
  }

  function startFall() {
    if (finn.mode !== 'star') return;
    finn.mode = 'fall'; finn.fallT = 0; finn.emotion = 'happy'; setHint('');
    for (var i = 0; i < 18; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 40 + Math.random() * 90;
      finn.sparks.push({ x: finn.x, y: finn.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.7 + Math.random() * 0.5, r: 1.2 + Math.random() * 2.2 });
    }
  }

  function spawnTrailSpark() {
    if (finn.sparks.length > 40) return;
    var a = Math.random() * Math.PI * 2;
    finn.sparks.push({
      x: finn.x + (Math.random() - 0.5) * 10,
      y: finn.y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 50,
      vy: -20 - Math.random() * 40,
      life: 0.45 + Math.random() * 0.4,
      r: 1 + Math.random() * 1.8
    });
  }

  function drawFlameGlow(x, y, baseR, t, intensity) {
    intensity = intensity == null ? 1 : intensity;
    var flick = 0.82 + 0.18 * Math.sin(t * 5.1) + 0.08 * Math.sin(t * 11.3);
    var layers = [
      { mul: 4.8, a0: 0.07, c0: '255,90,20', c1: '255,40,0' },
      { mul: 3.4, a0: 0.12, c0: '255,140,40', c1: '255,70,15' },
      { mul: 2.2, a0: 0.22, c0: '255,200,90', c1: '255,120,30' },
      { mul: 1.35, a0: 0.38, c0: '255,240,180', c1: '255,180,60' }
    ];
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var rr = baseR * L.mul * flick;
      var g = octx.createRadialGradient(x, y - baseR * 0.15, 0, x, y, rr);
      var a = L.a0 * intensity * (0.85 + 0.15 * Math.sin(t * 3.5 + i));
      g.addColorStop(0, 'rgba(' + L.c0 + ',' + a + ')');
      g.addColorStop(0.45, 'rgba(' + L.c1 + ',' + (a * 0.45) + ')');
      g.addColorStop(1, 'rgba(255,40,0,0)');
      octx.beginPath(); octx.fillStyle = g; octx.arc(x, y, rr, 0, Math.PI * 2); octx.fill();
    }
    for (var k = 0; k < 5; k++) {
      var ang = -Math.PI / 2 + (k - 2) * 0.22 + Math.sin(t * 4 + k) * 0.12;
      var len = baseR * (1.8 + 0.9 * Math.sin(t * 6 + k * 1.3)) * intensity;
      var lx = x + Math.cos(ang) * len * 0.35;
      var ly = y + Math.sin(ang) * len;
      var tg = octx.createRadialGradient(x, y, 0, lx, ly, baseR * 0.9);
      var ta = 0.18 * intensity * (0.6 + 0.4 * Math.sin(t * 7 + k));
      tg.addColorStop(0, 'rgba(255,220,120,' + ta + ')');
      tg.addColorStop(0.6, 'rgba(255,100,30,' + (ta * 0.35) + ')');
      tg.addColorStop(1, 'rgba(255,40,0,0)');
      octx.beginPath(); octx.fillStyle = tg; octx.arc(lx, ly, baseR * 0.9, 0, Math.PI * 2); octx.fill();
    }
  }

  function drawStar(t) {
    var x = finn.x, y = finn.y;
    var flick = 0.88 + 0.12 * Math.sin(t * 4.8);
    var r = 7.5 * flick * finn.scale;
    drawFlameGlow(x, y, r, t, 1);
    octx.beginPath();
    octx.fillStyle = 'rgba(255,252,240,' + (0.95 * flick) + ')';
    octx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    octx.fill();
    octx.strokeStyle = 'rgba(255,230,160,' + (0.35 * flick) + ')';
    octx.lineWidth = 1.1;
    octx.lineCap = 'round';
    for (var k = 0; k < 6; k++) {
      var ang = t * 0.55 + k * Math.PI / 3;
      var len = r * (2.1 + 0.55 * Math.sin(t * 4.5 + k));
      octx.beginPath();
      octx.moveTo(x + Math.cos(ang) * r * 1.05, y + Math.sin(ang) * r * 1.05);
      octx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      octx.stroke();
    }
  }

  function drawBody(t) {
    var x = finn.x, y = finn.y;
    var s = 26 * finn.scale;
    var flick = 0.9 + 0.1 * Math.sin(t * 3.2);
    drawFlameGlow(x, y, s * 0.55, t, 0.75 * finn.morph);
    var body = octx.createRadialGradient(x - s * 0.18, y - s * 0.22, 0, x, y, s * 1.05);
    body.addColorStop(0, '#FFF0C8');
    body.addColorStop(0.45, '#F0C070');
    body.addColorStop(0.85, '#D48A38');
    body.addColorStop(1, '#A85E22');
    octx.beginPath();
    octx.fillStyle = body;
    octx.ellipse(x, y, s * 0.98, s * 1.05, 0, 0, Math.PI * 2);
    octx.fill();
    octx.beginPath();
    octx.strokeStyle = 'rgba(255,235,190,' + (0.5 * flick) + ')';
    octx.lineWidth = 1.8;
    octx.ellipse(x, y, s * 0.88, s * 0.94, 0, 0, Math.PI * 2);
    octx.stroke();
    var eyeY = y - s * 0.06;
    var eyeOpen = finn.emotion === 'listen' ? 0.28 : (finn.emotion === 'think' ? 0.7 : 1);
    octx.fillStyle = '#2a1810';
    octx.beginPath(); octx.ellipse(x - s * 0.26, eyeY, s * 0.12, s * 0.14 * eyeOpen, 0, 0, Math.PI * 2); octx.fill();
    octx.beginPath(); octx.ellipse(x + s * 0.26, eyeY, s * 0.12, s * 0.14 * eyeOpen, 0, 0, Math.PI * 2); octx.fill();
    if (eyeOpen > 0.4) {
      octx.fillStyle = 'rgba(255,255,255,0.55)';
      octx.beginPath(); octx.arc(x - s * 0.3, eyeY - s * 0.04, s * 0.035, 0, Math.PI * 2); octx.fill();
      octx.beginPath(); octx.arc(x + s * 0.22, eyeY - s * 0.04, s * 0.035, 0, Math.PI * 2); octx.fill();
    }
    octx.strokeStyle = '#5a3020';
    octx.lineWidth = 2.1;
    octx.lineCap = 'round';
    octx.beginPath();
    if (finn.emotion === 'happy' || finn.emotion === 'listen') {
      octx.arc(x, y + s * 0.22, s * 0.32, 0.15, Math.PI - 0.15);
    } else if (finn.emotion === 'think') {
      octx.moveTo(x - s * 0.16, y + s * 0.3);
      octx.quadraticCurveTo(x, y + s * 0.22, x + s * 0.16, y + s * 0.3);
    } else {
      octx.arc(x, y + s * 0.24, s * 0.2, 0.25, Math.PI - 0.25);
    }
    octx.stroke();
    if (finn.listening) {
      var pr = s * (1.35 + 0.22 * Math.sin(t * 5.5));
      octx.beginPath();
      octx.strokeStyle = 'rgba(255,200,100,' + (0.35 + 0.2 * Math.sin(t * 5.5)) + ')';
      octx.lineWidth = 2;
      octx.arc(x, y, pr, 0, Math.PI * 2);
      octx.stroke();
    }
  }

  function drawSparks(dt) {
    for (var i = finn.sparks.length - 1; i >= 0; i--) {
      var sp = finn.sparks[i];
      sp.life -= dt * 1.1;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vy += 90 * dt;
      if (sp.life <= 0) { finn.sparks.splice(i, 1); continue; }
      var a = Math.max(0, Math.min(1, sp.life));
      octx.beginPath();
      octx.fillStyle = 'rgba(255,' + (180 + (a * 60) | 0) + ',' + (60 + (a * 80) | 0) + ',' + (a * 0.85) + ')';
      octx.arc(sp.x, sp.y, sp.r * a, 0, Math.PI * 2);
      octx.fill();
    }
  }

  function draw(t) {
    if (!octx) return;
    octx.clearRect(0, 0, W, H);
    if (!finn.active) return;
    var room = document.getElementById('matterRoom');
    if (room && room.classList.contains('show')) {
      overlay.style.pointerEvents = 'none';
      return;
    }
    overlay.style.pointerEvents = 'auto';
    if (finn.mode === 'fall' || finn.mode === 'toDoor' || finn.mode === 'enterDoor') {
      finn.trail.push({ x: finn.x, y: finn.y, life: 1 });
      if (finn.trail.length > 18) finn.trail.shift();
      for (var i = 0; i < finn.trail.length; i++) {
        var tr = finn.trail[i];
        tr.life -= 0.055;
        if (tr.life <= 0) continue;
        octx.beginPath();
        octx.fillStyle = 'rgba(255,190,80,' + (tr.life * 0.45) + ')';
        octx.arc(tr.x, tr.y, 1.5 + tr.life * 3.2, 0, Math.PI * 2);
        octx.fill();
      }
    }
    drawSparks(1 / 60);
    if (finn.morph < 0.65) {
      octx.save();
      octx.globalAlpha = Math.max(0, 1 - (finn.morph - 0.25) / 0.4);
      drawStar(t);
      octx.restore();
    }
    if (finn.morph > 0.15) {
      octx.save();
      octx.globalAlpha = Math.min(1, (finn.morph - 0.15) / 0.55);
      drawBody(t);
      octx.restore();
    }
  }

  function update(dt) {
    finn.pulse += dt;
    if (finn.mode === 'fall') {
      finn.fallT += dt;
      var p = Math.min(1, finn.fallT / 1.55);
      var e = 1 - Math.pow(1 - p, 2.6);
      finn.y = finn.startY + (finn.targetY - finn.startY) * e;
      finn.morph = Math.min(1, p * 1.35);
      finn.scale = 1 + 0.35 * Math.sin(p * Math.PI);
      if (Math.random() < 0.45) spawnTrailSpark();
      if (p >= 1) {
        finn.mode = 'ready';
        finn.morph = 1;
        finn.scale = 1;
        finn.y = finn.targetY;
        finn.emotion = 'idle';
        setHint('нажми · сказать');
        for (var i = 0; i < 12; i++) {
          var a = Math.random() * Math.PI * 2;
          finn.sparks.push({ x: finn.x, y: finn.y, vx: Math.cos(a) * (30 + Math.random() * 50), vy: Math.sin(a) * (20 + Math.random() * 40) - 10, life: 0.5 + Math.random() * 0.4, r: 1.2 + Math.random() * 1.8 });
        }
        if (!finn.firstListenDone) {
          finn.firstListenDone = true;
          setTimeout(startListen, 500);
        }
      }
    } else if (finn.mode === 'toDoor') {
      var door = window.__matterDoor || { x: W * 0.86, y: H * 0.58 };
      var dx = door.x - finn.x, dy = door.y - finn.y;
      var dist = Math.hypot(dx, dy) || 1;
      var sp = 220 * dt;
      if (dist < 14) {
        finn.mode = 'enterDoor';
        finn.scale = 0.28;
        showSub('');
        setTimeout(function () {
          try {
            if (typeof window.__matterOpenDoor === 'function') {
              window.__matterOpenDoor();
            } else {
              var c = document.getElementById('mtCanvas');
              if (c) {
                var r = c.getBoundingClientRect();
                var ev = new MouseEvent('click', { clientX: r.left + door.x, clientY: r.top + door.y, bubbles: true });
                c.dispatchEvent(ev);
              }
            }
          } catch (e) {}
          finn.active = false;
          if (overlay && octx) octx.clearRect(0, 0, W, H);
        }, 380);
      } else {
        finn.x += (dx / dist) * sp;
        finn.y += (dy / dist) * sp;
        finn.scale = Math.max(0.28, Math.min(1, dist / 140));
        finn.morph = 1;
        if (Math.random() < 0.3) spawnTrailSpark();
      }
    } else if (finn.mode === 'enterDoor') {
      finn.scale = Math.max(0.05, finn.scale - dt * 1.2);
    } else if (finn.mode === 'star') {
      finn.y = finn.startY + Math.sin(finn.pulse * 1.4) * 3.5;
    } else if (finn.mode === 'ready') {
      finn.y = finn.targetY + Math.sin(finn.pulse * 1.1) * 2.2;
    }
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    var root = document.getElementById('matterRoot');
    if (!root || !root.classList.contains('open')) {
      finn.active = false;
      if (overlay && octx) { try { octx.clearRect(0, 0, W, H); } catch (e) {} }
      return;
    }
    if (!ensureOverlay()) return;
    if (!finn.active) {
      var brand = document.getElementById('mtBrand');
      if (brand && !brand.hidden) resetFinn();
      else return;
    }
    var dt = Math.min(0.05, ((ts - lastT) || 16) / 1000);
    lastT = ts;
    if (overlay.width < 2) resize();
    update(dt);
    draw(ts / 1000);
  }

  function onClick(ev) {
    if (!finn.active) return;
    var room = document.getElementById('matterRoom');
    if (room && room.classList.contains('show')) return;
    var rect = overlay.getBoundingClientRect();
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    if (finn.mode === 'star' && Math.hypot(x - finn.x, y - finn.y) < 44) {
      startFall(); ev.stopPropagation(); return;
    }
    if (finn.mode === 'ready' && Math.hypot(x - finn.x, y - finn.y) < 56) {
      if (!finn.listening) startListen();
      ev.stopPropagation();
    }
  }

  function startListen() {
    if (finn.mode !== 'ready') return;
    stopListen();
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showSub('Голос недоступен'); return; }
    try {
      rec = new SR();
      rec.lang = 'ru-RU';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = function () { finn.listening = true; finn.emotion = 'listen'; showSub('Слушаю…'); setHint(''); };
      rec.onresult = function (ev) {
        var text = '';
        try { text = (ev.results[0][0].transcript || '').trim(); } catch (e) {}
        finn.listening = false; finn.emotion = 'think';
        showSub(text || '…');
        handleCommand(text);
      };
      rec.onerror = function () { finn.listening = false; finn.emotion = 'idle'; showSub(''); setHint('нажми · сказать'); };
      rec.onend = function () { finn.listening = false; if (finn.emotion === 'listen') finn.emotion = 'idle'; setHint('нажми · сказать'); };
      rec.start();
    } catch (e) { showSub('Микрофон недоступен'); }
  }

  function stopListen() {
    try { if (rec) rec.abort(); } catch (e) {}
    rec = null; finn.listening = false;
  }

  function handleCommand(text) {
    var t = (text || '').toLowerCase();
    if (/комнат|двер|заглян|по[йи]д[её]м|открой|зайд[её]м|давай\s+в\s+комнат|внутрь|зайти/.test(t)) {
      finn.emotion = 'happy';
      showSub('Хорошо, идём в комнату');
      setTimeout(function () {
        window.__matterDoor = window.__matterDoor || { x: W * 0.86, y: H * 0.58 };
        finn.mode = 'toDoor';
      }, 500);
      return;
    }
    finn.emotion = 'idle';
    showSub(text ? ('«' + text + '»') : '');
    setTimeout(function () { showSub(''); setHint('нажми · сказать'); }, 2200);
  }

  function boot() {
    if (!raf) raf = requestAnimationFrame(loop);
    window.addEventListener('resize', function () { if (finn.active) resize(); }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  setInterval(function () {
    if (!window.__matterDoor) {
      window.__matterDoor = { x: (window.innerWidth || 360) * 0.86, y: (window.innerHeight || 640) * 0.58 };
    }
  }, 2000);

  window.__MatterFinn = { finn: finn, startFall: startFall, startListen: startListen };
})();
