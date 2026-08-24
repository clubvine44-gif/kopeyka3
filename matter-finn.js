/* matter-finn.js — звезда-Фина поверх созвездия (оверлей) */
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
    fallT: 0,
    active: false
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
      st.textContent = '.mt-finn-sub{position:absolute;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:86vw;padding:8px 14px;border-radius:14px;background:rgba(0,0,0,.5);color:#f5ecd8;font-size:13px;font-family:system-ui,sans-serif;text-align:center;opacity:0;pointer-events:none;z-index:12;transition:opacity .25s;border:1px solid rgba(255,220,160,.15)}.mt-finn-sub.show{opacity:1}.mt-finn-hint{position:absolute;left:50%;bottom:calc(56px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);font-size:11px;color:rgba(200,220,255,.4);font-family:system-ui,sans-serif;z-index:11;pointer-events:none;letter-spacing:.06em}';
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
    finn.startY = Math.max(64, H * 0.11);
    finn.y = finn.startY;
    finn.targetY = H * 0.76;
    finn.morph = 0; finn.scale = 1;
    finn.emotion = 'idle';
    finn.firstListenDone = false;
    finn.listening = false;
    finn.trail = []; finn.fallT = 0;
    finn.active = true;
    showSub(''); setHint('нажми на звезду');
  }

  function startFall() {
    if (finn.mode !== 'star') return;
    finn.mode = 'fall'; finn.fallT = 0; finn.emotion = 'happy'; setHint('');
  }

  function drawStar(t) {
    var x = finn.x, y = finn.y;
    var flick = 0.85 + 0.15 * Math.sin(t * 4.2);
    var r = 8 * flick * finn.scale;
    for (var i = 4; i >= 1; i--) {
      var rr = r * (1.9 + i * 1.15);
      var g = octx.createRadialGradient(x, y, 0, x, y, rr);
      var a = (0.09 + 0.07 * Math.sin(t * 3 + i)) * flick;
      g.addColorStop(0, 'rgba(255,230,160,' + a + ')');
      g.addColorStop(0.4, 'rgba(255,160,60,' + (a * 0.55) + ')');
      g.addColorStop(1, 'rgba(255,80,20,0)');
      octx.beginPath(); octx.fillStyle = g; octx.arc(x, y, rr, 0, Math.PI * 2); octx.fill();
    }
    octx.beginPath(); octx.fillStyle = 'rgba(255,250,230,' + (0.92 * flick) + ')';
    octx.arc(x, y, r, 0, Math.PI * 2); octx.fill();
    octx.strokeStyle = 'rgba(255,220,140,' + (0.4 * flick) + ')'; octx.lineWidth = 1.2;
    for (var k = 0; k < 6; k++) {
      var ang = t * 0.7 + k * Math.PI / 3;
      var len = r * (2.4 + 0.7 * Math.sin(t * 5 + k));
      octx.beginPath();
      octx.moveTo(x + Math.cos(ang) * r * 1.15, y + Math.sin(ang) * r * 1.15);
      octx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      octx.stroke();
    }
  }

  function drawBody(t) {
    var x = finn.x, y = finn.y, s = 24 * finn.scale;
    var flick = 0.9 + 0.1 * Math.sin(t * 3.5);
    var g = octx.createRadialGradient(x, y, 0, x, y, s * 2.5);
    g.addColorStop(0, 'rgba(255,220,140,' + (0.4 * flick * finn.morph) + ')');
    g.addColorStop(0.5, 'rgba(255,150,50,' + (0.14 * finn.morph) + ')');
    g.addColorStop(1, 'rgba(255,80,20,0)');
    octx.beginPath(); octx.fillStyle = g; octx.arc(x, y, s * 2.5, 0, Math.PI * 2); octx.fill();
    var body = octx.createRadialGradient(x - s * 0.2, y - s * 0.25, 0, x, y, s);
    body.addColorStop(0, '#FCE7B8'); body.addColorStop(0.55, '#E9AE66'); body.addColorStop(1, '#B8712E');
    octx.beginPath(); octx.fillStyle = body; octx.arc(x, y, s, 0, Math.PI * 2); octx.fill();
    octx.beginPath(); octx.strokeStyle = 'rgba(255,230,180,0.55)'; octx.lineWidth = 1.6;
    octx.arc(x, y, s * 0.92, 0, Math.PI * 2); octx.stroke();
    var eyeY = y - s * 0.08;
    var eyeOpen = finn.emotion === 'listen' ? 0.32 : 1;
    octx.fillStyle = '#2a1810';
    octx.beginPath(); octx.ellipse(x - s * 0.28, eyeY, s * 0.11, s * 0.13 * eyeOpen, 0, 0, Math.PI * 2); octx.fill();
    octx.beginPath(); octx.ellipse(x + s * 0.28, eyeY, s * 0.11, s * 0.13 * eyeOpen, 0, 0, Math.PI * 2); octx.fill();
    octx.strokeStyle = '#5a3020'; octx.lineWidth = 2; octx.lineCap = 'round';
    octx.beginPath();
    if (finn.emotion === 'happy' || finn.emotion === 'listen') octx.arc(x, y + s * 0.2, s * 0.3, 0.12, Math.PI - 0.12);
    else if (finn.emotion === 'think') { octx.moveTo(x - s * 0.18, y + s * 0.28); octx.lineTo(x + s * 0.18, y + s * 0.28); }
    else octx.arc(x, y + s * 0.22, s * 0.22, 0.2, Math.PI - 0.2);
    octx.stroke();
    if (finn.listening) {
      var pr = s * (1.45 + 0.28 * Math.sin(t * 6));
      octx.beginPath();
      octx.strokeStyle = 'rgba(94,200,255,' + (0.4 + 0.25 * Math.sin(t * 6)) + ')';
      octx.lineWidth = 2.2; octx.arc(x, y, pr, 0, Math.PI * 2); octx.stroke();
    }
  }

  function draw(t) {
    if (!octx) return;
    octx.clearRect(0, 0, W, H);
    if (!finn.active) return;
    // hide overlay interactions when room open
    var room = document.getElementById('matterRoom');
    if (room && room.classList.contains('show')) {
      overlay.style.pointerEvents = 'none';
      return;
    }
    overlay.style.pointerEvents = 'auto';

    if (finn.mode === 'fall' || finn.mode === 'toDoor') {
      finn.trail.push({ x: finn.x, y: finn.y, life: 1 });
      if (finn.trail.length > 16) finn.trail.shift();
      for (var i = 0; i < finn.trail.length; i++) {
        var tr = finn.trail[i]; tr.life -= 0.07;
        if (tr.life <= 0) continue;
        octx.beginPath();
        octx.fillStyle = 'rgba(255,200,100,' + (tr.life * 0.4) + ')';
        octx.arc(tr.x, tr.y, 2 + tr.life * 3.5, 0, Math.PI * 2); octx.fill();
      }
    }
    if (finn.morph < 0.55) drawStar(t);
    if (finn.morph > 0.2) {
      octx.save();
      octx.globalAlpha = Math.min(1, (finn.morph - 0.2) / 0.5);
      drawBody(t);
      octx.restore();
    }
  }

  function update(dt) {
    if (finn.mode === 'fall') {
      finn.fallT += dt;
      var p = Math.min(1, finn.fallT / 1.4);
      var e = 1 - Math.pow(1 - p, 3);
      finn.y = finn.startY + (finn.targetY - finn.startY) * e;
      finn.morph = Math.min(1, p * 1.2);
      finn.scale = 1 + 0.4 * Math.sin(p * Math.PI);
      if (p >= 1) {
        finn.mode = 'ready'; finn.morph = 1; finn.scale = 1; finn.y = finn.targetY;
        finn.emotion = 'idle'; setHint('нажми · сказать');
        if (!finn.firstListenDone) {
          finn.firstListenDone = true;
          setTimeout(startListen, 450);
        }
      }
    } else if (finn.mode === 'toDoor') {
      var door = window.__matterDoor || { x: W * 0.86, y: H * 0.58 };
      var dx = door.x - finn.x, dy = door.y - finn.y;
      var dist = Math.hypot(dx, dy) || 1;
      var sp = 200 * dt;
      if (dist < 16) {
        finn.mode = 'enterDoor';
        finn.scale = 0.3;
        showSub('');
        setTimeout(function () {
          try {
            // click door via synthetic: open room
            var c = document.getElementById('mtCanvas');
            if (c) {
              var r = c.getBoundingClientRect();
              var ev = new MouseEvent('click', { clientX: r.left + door.x, clientY: r.top + door.y, bubbles: true });
              c.dispatchEvent(ev);
            }
          } catch (e) {}
          finn.active = false;
          if (overlay) octx && octx.clearRect(0, 0, W, H);
        }, 350);
      } else {
        finn.x += (dx / dist) * sp;
        finn.y += (dy / dist) * sp;
        finn.scale = Math.max(0.3, Math.min(1, dist / 130));
        finn.morph = 1;
      }
    }
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    var root = document.getElementById('matterRoot');
    if (!root || !root.classList.contains('open')) {
      finn.active = false;
      if (overlay) { try { octx.clearRect(0, 0, W, H); } catch (e) {} }
      return;
    }
    if (!ensureOverlay()) return;
    if (!finn.active) {
      // just entered space after blackhole — detect constellation visible
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
    if (finn.mode === 'star' && Math.hypot(x - finn.x, y - finn.y) < 40) {
      startFall(); ev.stopPropagation(); return;
    }
    if (finn.mode === 'ready' && Math.hypot(x - finn.x, y - finn.y) < 52) {
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
    if (/комнат|двер|заглян|по[йи]д[её]м|открой|зайд[её]м|давай\s+в\s+комнат/.test(t)) {
      finn.emotion = 'happy';
      showSub('Хорошо, идём в комнату');
      setTimeout(function () {
        window.__matterDoor = window.__matterDoor || { x: W * 0.86, y: H * 0.58 };
        finn.mode = 'toDoor';
      }, 550);
      return;
    }
    finn.emotion = 'idle';
    showSub(text ? ('«' + text + '»') : '');
    setTimeout(function () { showSub(''); setHint('нажми · сказать'); }, 2200);
  }

  // boot RAF watcher
  function boot() {
    if (!raf) raf = requestAnimationFrame(loop);
    window.addEventListener('resize', function () { if (finn.active) resize(); }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // try capture door coords from matter by watching canvas clicks — approximate right side
  setInterval(function () {
    if (!window.__matterDoor) window.__matterDoor = { x: (window.innerWidth || 360) * 0.86, y: (window.innerHeight || 640) * 0.58 };
  }, 2000);

  window.__MatterFinn = { finn: finn, startFall: startFall, startListen: startListen };
})();
