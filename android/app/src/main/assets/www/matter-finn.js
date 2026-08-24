/* matter-finn.js — Фина: лицо как в приложении, пламя без колец, комната */
(function () {
  'use strict';

  var finn = {
    mode: 'star', // star | fall | ready | toDoor | enterDoor | room
    x: 0, y: 0,
    startY: 0, targetY: 0,
    morph: 0, scale: 1,
    emotion: 'idle',
    firstListenDone: false,
    listening: false,
    trail: [], sparks: [],
    fallT: 0, pulse: 0,
    active: false,
    roomX: 0, roomY: 0
  };
  var overlay = null, octx = null, raf = 0, lastT = 0;
  var W = 0, H = 0, dpr = 1;
  var rec = null, subEl = null, hintEl = null, closeBtn = null;

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
      st.textContent =
        '.mt-finn-sub{position:absolute;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:86vw;padding:10px 16px;border-radius:16px;background:rgba(12,10,18,.62);color:#f5ecd8;font-size:14px;font-family:system-ui,sans-serif;text-align:center;opacity:0;pointer-events:none;z-index:12;transition:opacity .25s;border:1px solid rgba(232,121,249,.22);line-height:1.4}' +
        '.mt-finn-sub.show{opacity:1}' +
        '.mt-finn-hint{position:absolute;left:50%;bottom:calc(58px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);font-size:11px;color:rgba(200,220,255,.42);font-family:system-ui,sans-serif;z-index:11;pointer-events:none;letter-spacing:.06em}' +
        '.mt-finn-close{position:absolute;z-index:13;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.45);color:#f5efe6;font-size:16px;display:none;align-items:center;justify-content:center;padding:0;line-height:1}' +
        '.mt-finn-close.show{display:flex}';
      document.head.appendChild(st);
      subEl = document.createElement('div'); subEl.className = 'mt-finn-sub'; root.appendChild(subEl);
      hintEl = document.createElement('div'); hintEl.className = 'mt-finn-hint'; root.appendChild(hintEl);
      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'mt-finn-close';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('aria-label', 'Скрыть Фину');
      closeBtn.onclick = function (e) {
        e.stopPropagation();
        hideRoomFinn();
      };
      root.appendChild(closeBtn);
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

  function hideRoomFinn() {
    finn.mode = 'ready';
    finn.active = false;
    if (closeBtn) closeBtn.classList.remove('show');
    showSub(''); setHint('');
    if (overlay && octx) octx.clearRect(0, 0, W, H);
  }

  function showRoomFinn() {
    resize();
    finn.mode = 'room';
    finn.active = true;
    finn.morph = 1;
    finn.scale = 1.15;
    finn.emotion = 'happy';
    finn.roomX = W * 0.18;
    finn.roomY = H * 0.72;
    finn.x = finn.roomX;
    finn.y = finn.roomY;
    if (closeBtn) {
      closeBtn.classList.add('show');
      closeBtn.style.left = (finn.roomX + 38) + 'px';
      closeBtn.style.top = (finn.roomY - 52) + 'px';
    }
    showSub('Я здесь. Нажми — поговорить');
    setTimeout(function () { showSub(''); }, 2200);
  }

  function resetFinn() {
    resize();
    finn.mode = 'star';
    finn.x = W * 0.5;
    finn.startY = Math.max(56, H * 0.10);
    finn.y = finn.startY;
    finn.targetY = H * 0.72;
    finn.morph = 0; finn.scale = 1.15;
    finn.emotion = 'idle';
    finn.firstListenDone = false;
    finn.listening = false;
    finn.trail = []; finn.sparks = []; finn.fallT = 0;
    finn.pulse = 0;
    finn.active = true;
    if (closeBtn) closeBtn.classList.remove('show');
    showSub(''); setHint('нажми на звезду');
  }

  function startFall() {
    if (finn.mode !== 'star') return;
    finn.mode = 'fall'; finn.fallT = 0; finn.emotion = 'happy'; setHint('');
    for (var i = 0; i < 22; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 50 + Math.random() * 100;
      finn.sparks.push({ x: finn.x, y: finn.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.7 + Math.random() * 0.5, r: 1.4 + Math.random() * 2.4 });
    }
  }

  function spawnTrailSpark() {
    if (finn.sparks.length > 48) return;
    finn.sparks.push({
      x: finn.x + (Math.random() - 0.5) * 12,
      y: finn.y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 55,
      vy: -25 - Math.random() * 45,
      life: 0.4 + Math.random() * 0.45,
      r: 1.1 + Math.random() * 2
    });
  }

  /** Мягкое пламя вокруг — без колец */
  function drawFlameAura(x, y, baseR, t, intensity) {
    intensity = intensity == null ? 1 : intensity;
    var flick = 0.86 + 0.14 * Math.sin(t * 4.8) + 0.06 * Math.sin(t * 9.7);
    var layers = [
      { mul: 5.2, a: 0.055, c0: '255,70,15', c1: '255,30,0' },
      { mul: 3.6, a: 0.10, c0: '255,130,35', c1: '255,60,10' },
      { mul: 2.3, a: 0.18, c0: '255,195,80', c1: '255,110,25' },
      { mul: 1.4, a: 0.32, c0: '255,240,170', c1: '255,170,55' }
    ];
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var rr = baseR * L.mul * flick;
      var g = octx.createRadialGradient(x, y - baseR * 0.2, 0, x, y, rr);
      var a = L.a * intensity * (0.88 + 0.12 * Math.sin(t * 3.2 + i));
      g.addColorStop(0, 'rgba(' + L.c0 + ',' + a + ')');
      g.addColorStop(0.5, 'rgba(' + L.c1 + ',' + (a * 0.4) + ')');
      g.addColorStop(1, 'rgba(255,30,0,0)');
      octx.beginPath(); octx.fillStyle = g; octx.arc(x, y, rr, 0, Math.PI * 2); octx.fill();
    }
    // языки вверх
    for (var k = 0; k < 6; k++) {
      var ang = -Math.PI / 2 + (k - 2.5) * 0.2 + Math.sin(t * 5 + k) * 0.14;
      var len = baseR * (2.0 + 1.1 * Math.sin(t * 6.2 + k * 1.4)) * intensity;
      var lx = x + Math.cos(ang) * len * 0.4;
      var ly = y + Math.sin(ang) * len * 0.95;
      var tg = octx.createRadialGradient(x, y - baseR * 0.1, 0, lx, ly, baseR * 1.0);
      var ta = 0.16 * intensity * (0.55 + 0.45 * Math.sin(t * 7.5 + k));
      tg.addColorStop(0, 'rgba(255,230,130,' + ta + ')');
      tg.addColorStop(0.55, 'rgba(255,100,25,' + (ta * 0.35) + ')');
      tg.addColorStop(1, 'rgba(255,30,0,0)');
      octx.beginPath(); octx.fillStyle = tg; octx.arc(lx, ly, baseR * 1.0, 0, Math.PI * 2); octx.fill();
    }
  }

  function drawStar(t) {
    var x = finn.x, y = finn.y;
    var flick = 0.9 + 0.1 * Math.sin(t * 5);
    var r = 9 * flick * finn.scale;
    drawFlameAura(x, y, r, t, 1.05);
    octx.beginPath();
    octx.fillStyle = 'rgba(255,252,245,' + (0.96 * flick) + ')';
    octx.arc(x, y, r * 0.9, 0, Math.PI * 2);
    octx.fill();
    octx.strokeStyle = 'rgba(255,230,160,' + (0.4 * flick) + ')';
    octx.lineWidth = 1.2;
    octx.lineCap = 'round';
    for (var k = 0; k < 6; k++) {
      var ang = t * 0.5 + k * Math.PI / 3;
      var len = r * (2.2 + 0.6 * Math.sin(t * 4.2 + k));
      octx.beginPath();
      octx.moveTo(x + Math.cos(ang) * r * 1.05, y + Math.sin(ang) * r * 1.05);
      octx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      octx.stroke();
    }
  }

  /** Лицо в стиле приложения: розово-фиолетовая «монетка», голубые глаза */
  function drawBody(t) {
    var x = finn.x, y = finn.y;
    var s = 34 * finn.scale;
    drawFlameAura(x, y, s * 0.48, t, 0.85 * Math.max(0.3, finn.morph));

    // бантики
    octx.fillStyle = 'rgba(244,114,182,0.92)';
    octx.beginPath();
    octx.ellipse(x - s * 0.55, y - s * 0.72, s * 0.18, s * 0.12, -0.5, 0, Math.PI * 2);
    octx.fill();
    octx.beginPath();
    octx.ellipse(x + s * 0.55, y - s * 0.72, s * 0.18, s * 0.12, 0.5, 0, Math.PI * 2);
    octx.fill();
    // камень на макушке
    var gem = octx.createRadialGradient(x, y - s * 0.95, 0, x, y - s * 0.95, s * 0.14);
    gem.addColorStop(0, '#FDE68A'); gem.addColorStop(1, '#F472B6');
    octx.beginPath(); octx.fillStyle = gem; octx.arc(x, y - s * 0.95, s * 0.12, 0, Math.PI * 2); octx.fill();

    // внешнее кольцо
    octx.beginPath();
    octx.strokeStyle = 'rgba(232,121,249,0.75)';
    octx.lineWidth = 2.2;
    octx.arc(x, y, s * 1.02, 0, Math.PI * 2);
    octx.stroke();

    // тело градиент
    var body = octx.createRadialGradient(x - s * 0.25, y - s * 0.3, 0, x, y, s);
    body.addColorStop(0, '#FFF5FB');
    body.addColorStop(0.3, '#F9A8D4');
    body.addColorStop(0.65, '#E879F9');
    body.addColorStop(1, '#A855F7');
    octx.beginPath(); octx.fillStyle = body; octx.arc(x, y, s, 0, Math.PI * 2); octx.fill();

    // тёмное ядро лица
    var core = octx.createRadialGradient(x, y - s * 0.05, 0, x, y, s * 0.72);
    core.addColorStop(0, '#1E1030'); core.addColorStop(1, '#0C0614');
    octx.beginPath(); octx.fillStyle = core; octx.arc(x, y, s * 0.72, 0, Math.PI * 2); octx.fill();

    // блик
    octx.beginPath();
    octx.fillStyle = 'rgba(255,255,255,0.22)';
    octx.ellipse(x - s * 0.22, y - s * 0.28, s * 0.28, s * 0.16, -0.4, 0, Math.PI * 2);
    octx.fill();

    // румянец
    octx.fillStyle = 'rgba(244,114,182,0.28)';
    octx.beginPath(); octx.ellipse(x - s * 0.38, y + s * 0.12, s * 0.12, s * 0.07, 0, 0, Math.PI * 2); octx.fill();
    octx.beginPath(); octx.ellipse(x + s * 0.38, y + s * 0.12, s * 0.12, s * 0.07, 0, 0, Math.PI * 2); octx.fill();

    // брови
    octx.strokeStyle = '#FCE7F3';
    octx.lineWidth = 1.7;
    octx.lineCap = 'round';
    octx.beginPath();
    octx.moveTo(x - s * 0.42, y - s * 0.18);
    octx.quadraticCurveTo(x - s * 0.28, y - s * 0.28, x - s * 0.12, y - s * 0.16);
    octx.stroke();
    octx.beginPath();
    octx.moveTo(x + s * 0.12, y - s * 0.16);
    octx.quadraticCurveTo(x + s * 0.28, y - s * 0.28, x + s * 0.42, y - s * 0.18);
    octx.stroke();

    // глаза
    var eyeY = y - s * 0.02;
    var eyeOpen = finn.emotion === 'listen' ? 0.35 : (finn.emotion === 'think' ? 0.75 : 1);
    var eyeColor = finn.emotion === 'happy' ? '#4ADE80' : (finn.emotion === 'listen' || finn.emotion === 'think' ? '#67E8F9' : '#67E8F9');
    octx.fillStyle = eyeColor;
    octx.beginPath(); octx.ellipse(x - s * 0.24, eyeY, s * 0.15, s * 0.18 * eyeOpen, 0, 0, Math.PI * 2); octx.fill();
    octx.beginPath(); octx.ellipse(x + s * 0.24, eyeY, s * 0.15, s * 0.18 * eyeOpen, 0, 0, Math.PI * 2); octx.fill();
    if (eyeOpen > 0.4) {
      octx.fillStyle = 'rgba(255,255,255,0.9)';
      octx.beginPath(); octx.arc(x - s * 0.28, eyeY - s * 0.05, s * 0.045, 0, Math.PI * 2); octx.fill();
      octx.beginPath(); octx.arc(x + s * 0.2, eyeY - s * 0.05, s * 0.045, 0, Math.PI * 2); octx.fill();
    }

    // рот
    octx.strokeStyle = '#F9A8D4';
    octx.lineWidth = 2.2;
    octx.beginPath();
    if (finn.emotion === 'happy') {
      octx.arc(x, y + s * 0.28, s * 0.28, 0.15, Math.PI - 0.15);
    } else if (finn.emotion === 'listen' || finn.emotion === 'think') {
      octx.moveTo(x - s * 0.14, y + s * 0.32);
      octx.lineTo(x + s * 0.14, y + s * 0.32);
    } else {
      octx.arc(x, y + s * 0.3, s * 0.22, 0.25, Math.PI - 0.25);
    }
    octx.stroke();
  }

  function drawSparks(dt) {
    for (var i = finn.sparks.length - 1; i >= 0; i--) {
      var sp = finn.sparks[i];
      sp.life -= dt * 1.15;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vy += 95 * dt;
      if (sp.life <= 0) { finn.sparks.splice(i, 1); continue; }
      var a = Math.max(0, Math.min(1, sp.life));
      octx.beginPath();
      octx.fillStyle = 'rgba(255,' + (170 + (a * 70) | 0) + ',' + (50 + (a * 90) | 0) + ',' + (a * 0.9) + ')';
      octx.arc(sp.x, sp.y, sp.r * a, 0, Math.PI * 2);
      octx.fill();
    }
  }

  function draw(t) {
    if (!octx) return;
    octx.clearRect(0, 0, W, H);
    if (!finn.active) return;

    var room = document.getElementById('matterRoom');
    var inRoom = room && room.classList.contains('show');

    if (inRoom && finn.mode !== 'room') {
      // ждём showRoomFinn после входа
      return;
    }

    if (finn.mode === 'fall' || finn.mode === 'toDoor' || finn.mode === 'enterDoor') {
      finn.trail.push({ x: finn.x, y: finn.y, life: 1 });
      if (finn.trail.length > 20) finn.trail.shift();
      for (var i = 0; i < finn.trail.length; i++) {
        var tr = finn.trail[i];
        tr.life -= 0.05;
        if (tr.life <= 0) continue;
        octx.beginPath();
        octx.fillStyle = 'rgba(255,185,70,' + (tr.life * 0.5) + ')';
        octx.arc(tr.x, tr.y, 1.8 + tr.life * 3.5, 0, Math.PI * 2);
        octx.fill();
      }
    }
    drawSparks(1 / 60);

    if (finn.mode === 'room') {
      drawBody(t);
      return;
    }

    if (finn.morph < 0.65) {
      octx.save();
      octx.globalAlpha = Math.max(0, 1 - (finn.morph - 0.25) / 0.4);
      drawStar(t);
      octx.restore();
    }
    if (finn.morph > 0.12) {
      octx.save();
      octx.globalAlpha = Math.min(1, (finn.morph - 0.12) / 0.5);
      drawBody(t);
      octx.restore();
    }
  }

  function update(dt) {
    finn.pulse += dt;
    if (finn.mode === 'fall') {
      finn.fallT += dt;
      var p = Math.min(1, finn.fallT / 1.55);
      var e = 1 - Math.pow(1 - p, 2.5);
      finn.y = finn.startY + (finn.targetY - finn.startY) * e;
      finn.morph = Math.min(1, p * 1.4);
      finn.scale = 1.05 + 0.4 * Math.sin(p * Math.PI);
      if (Math.random() < 0.5) spawnTrailSpark();
      if (p >= 1) {
        finn.mode = 'ready';
        finn.morph = 1;
        finn.scale = 1.2;
        finn.y = finn.targetY;
        finn.emotion = 'idle';
        setHint('нажми · сказать');
        for (var i = 0; i < 14; i++) {
          var a = Math.random() * Math.PI * 2;
          finn.sparks.push({ x: finn.x, y: finn.y, vx: Math.cos(a) * (35 + Math.random() * 55), vy: Math.sin(a) * (25 + Math.random() * 40) - 15, life: 0.5 + Math.random() * 0.4, r: 1.3 + Math.random() * 2 });
        }
        if (!finn.firstListenDone) {
          finn.firstListenDone = true;
          setTimeout(startListen, 480);
        }
      }
    } else if (finn.mode === 'toDoor') {
      var door = window.__matterDoor || { x: W * 0.84, y: H * 0.55 };
      var dx = door.x - finn.x, dy = door.y - finn.y;
      var dist = Math.hypot(dx, dy) || 1;
      var sp = 230 * dt;
      if (dist < 16) {
        finn.mode = 'enterDoor';
        finn.scale = 0.25;
        showSub('');
        setTimeout(function () {
          try {
            if (typeof window.__matterOpenDoor === 'function') window.__matterOpenDoor();
          } catch (e) {}
          // после открытия комнаты появимся там
          setTimeout(function () {
            var rm = document.getElementById('matterRoom');
            if (rm && rm.classList.contains('show')) showRoomFinn();
            else finn.active = false;
          }, 900);
        }, 320);
      } else {
        finn.x += (dx / dist) * sp;
        finn.y += (dy / dist) * sp;
        finn.scale = Math.max(0.25, Math.min(1.2, dist / 120));
        finn.morph = 1;
        if (Math.random() < 0.35) spawnTrailSpark();
      }
    } else if (finn.mode === 'enterDoor') {
      finn.scale = Math.max(0.04, finn.scale - dt * 1.3);
    } else if (finn.mode === 'star') {
      finn.y = finn.startY + Math.sin(finn.pulse * 1.3) * 3.2;
    } else if (finn.mode === 'ready') {
      finn.y = finn.targetY + Math.sin(finn.pulse * 1.05) * 2.4;
    } else if (finn.mode === 'room') {
      finn.x = finn.roomX;
      finn.y = finn.roomY + Math.sin(finn.pulse * 1.0) * 2;
      if (closeBtn) {
        closeBtn.style.left = (finn.x + 40) + 'px';
        closeBtn.style.top = (finn.y - 54) + 'px';
      }
    }
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    var root = document.getElementById('matterRoot');
    if (!root || !root.classList.contains('open')) {
      finn.active = false;
      if (closeBtn) closeBtn.classList.remove('show');
      if (overlay && octx) { try { octx.clearRect(0, 0, W, H); } catch (e) {} }
      return;
    }
    if (!ensureOverlay()) return;
    if (!finn.active) {
      var brand = document.getElementById('mtBrand');
      var room = document.getElementById('matterRoom');
      if (brand && !brand.hidden && !(room && room.classList.contains('show'))) resetFinn();
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
    var rect = overlay.getBoundingClientRect();
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    if (finn.mode === 'star' && Math.hypot(x - finn.x, y - finn.y) < 48) {
      startFall(); ev.stopPropagation(); return;
    }
    if ((finn.mode === 'ready' || finn.mode === 'room') && Math.hypot(x - finn.x, y - finn.y) < 62) {
      if (!finn.listening) startListen();
      ev.stopPropagation();
    }
  }

  function startListen() {
    if (finn.mode !== 'ready' && finn.mode !== 'room') return;
    stopListen();
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showSub('Голос недоступен, солнышко'); return; }
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
        handleCommand(text);
      };
      rec.onerror = function () { finn.listening = false; finn.emotion = 'idle'; showSub(''); setHint(finn.mode === 'room' ? '' : 'нажми · сказать'); };
      rec.onend = function () { finn.listening = false; if (finn.emotion === 'listen') finn.emotion = 'idle'; };
      rec.start();
    } catch (e) { showSub('Микрофон недоступен'); }
  }

  function stopListen() {
    try { if (rec) rec.abort(); } catch (e) {}
    rec = null; finn.listening = false;
  }

  function reply(msg, emotion) {
    finn.emotion = emotion || 'happy';
    showSub(msg);
    setTimeout(function () {
      showSub('');
      finn.emotion = 'idle';
      if (finn.mode === 'ready') setHint('нажми · сказать');
    }, 2800);
  }

  function handleCommand(text) {
    var t = (text || '').toLowerCase().trim();
    if (!t) { reply('Я рядом. Скажи ещё раз', 'idle'); return; }

    if (/комнат|двер|заглян|по[йи]д[её]м|открой|зайд[её]м|давай\s+в\s+комнат|внутрь|зайти/.test(t)) {
      if (finn.mode === 'room') {
        reply('Мы уже в комнате', 'happy');
        return;
      }
      reply('Хорошо, идём', 'happy');
      setTimeout(function () {
        window.__matterDoor = window.__matterDoor || { x: W * 0.84, y: H * 0.55 };
        finn.mode = 'toDoor';
      }, 600);
      return;
    }

    if (/привет|здравств|хай|hello/.test(t)) {
      reply('Привет. Я здесь', 'happy'); return;
    }
    if (/как\s+дела|что\s+нового|как\s+ты/.test(t)) {
      reply('Всё спокойно. Готова помочь', 'happy'); return;
    }
    if (/спасибо|благодар/.test(t)) {
      reply('Всегда пожалуйста', 'happy'); return;
    }
    if (/пока|выйди|закрой|убери/.test(t) && finn.mode === 'room') {
      reply('Хорошо', 'idle');
      setTimeout(hideRoomFinn, 500);
      return;
    }

    // мягкий ответ в стиле приложения
    var soft = [
      'Слышу тебя',
      'Могу помочь с этим',
      'Расскажи чуть подробнее',
      'Я рядом'
    ];
    reply(soft[Math.floor(Math.random() * soft.length)], 'think');
  }

  function boot() {
    if (!raf) raf = requestAnimationFrame(loop);
    window.addEventListener('resize', function () { if (finn.active) resize(); }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  setInterval(function () {
    if (!window.__matterDoor) {
      window.__matterDoor = { x: (window.innerWidth || 360) * 0.84, y: (window.innerHeight || 640) * 0.55 };
    }
  }, 2000);

  window.__MatterFinn = {
    finn: finn,
    startFall: startFall,
    startListen: startListen,
    showRoomFinn: showRoomFinn,
    hideRoomFinn: hideRoomFinn
  };
})();
