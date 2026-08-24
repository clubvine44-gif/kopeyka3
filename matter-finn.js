/* matter-finn.js — звезда-Фина, падение, голос, вход в дверь
   Подключается после matter.js. Расширяет FinMatter. */
(function () {
  'use strict';
  if (!window.FinMatter) return;

  var finn = {
    mode: 'star', // star | fall | ready | toDoor | enterDoor
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    morph: 0, // 0 star → 1 finn
    scale: 1,
    emotion: 'idle', // idle | listen | think | happy
    firstListenDone: false,
    listening: false,
    trail: [],
    fallT: 0
  };
  var rec = null;
  var subtitleEl = null;

  function ensureUI() {
    if (subtitleEl) return;
    var css = document.createElement('style');
    css.textContent = ''
      + '.mt-finn-sub{position:absolute;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);'
      + 'max-width:86vw;padding:8px 14px;border-radius:14px;background:rgba(0,0,0,.45);color:#f5ecd8;font-size:13px;'
      + 'font-family:system-ui,sans-serif;text-align:center;opacity:0;pointer-events:none;z-index:12;transition:opacity .25s;'
      + 'border:1px solid rgba(255,220,160,.15)}'
      + '.mt-finn-sub.show{opacity:1}'
      + '.mt-finn-hint{position:absolute;left:50%;bottom:calc(56px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);'
      + 'font-size:11px;color:rgba(200,220,255,.4);font-family:system-ui,sans-serif;z-index:11;pointer-events:none;letter-spacing:.06em}';
    document.head.appendChild(css);
    subtitleEl = document.createElement('div');
    subtitleEl.className = 'mt-finn-sub';
    subtitleEl.id = 'mtFinnSub';
    var root = document.getElementById('matterRoot');
    if (root) root.appendChild(subtitleEl);
    var hint = document.createElement('div');
    hint.className = 'mt-finn-hint';
    hint.id = 'mtFinnHint';
    hint.textContent = '';
    if (root) root.appendChild(hint);
  }

  function showSub(t) {
    ensureUI();
    subtitleEl.textContent = t || '';
    subtitleEl.classList.toggle('show', !!t);
  }
  function setHint(t) {
    ensureUI();
    var h = document.getElementById('mtFinnHint');
    if (h) h.textContent = t || '';
  }

  function resetFinn(W, H) {
    finn.mode = 'star';
    finn.x = W * 0.5;
    finn.y = Math.max(70, H * 0.12);
    finn.targetX = W * 0.5;
    finn.targetY = H * 0.78;
    finn.morph = 0;
    finn.scale = 1;
    finn.emotion = 'idle';
    finn.firstListenDone = false;
    finn.listening = false;
    finn.trail = [];
    finn.fallT = 0;
    showSub('');
    setHint('');
  }

  function startFall() {
    if (finn.mode !== 'star') return;
    finn.mode = 'fall';
    finn.fallT = 0;
    finn.emotion = 'happy';
  }

  function goToDoor(door) {
    if (finn.mode !== 'ready' && finn.mode !== 'star') return;
    stopListen();
    finn.mode = 'toDoor';
    finn.targetX = door.x;
    finn.targetY = door.y;
    finn.emotion = 'happy';
    showSub('Идём в комнату…');
  }

  /* drawing */
  function drawFinnStar(ctx, t) {
    var x = finn.x, y = finn.y;
    var flick = 0.85 + 0.15 * Math.sin(t * 4.2);
    var r = 7 * flick * finn.scale;
    // outer flame layers
    for (var i = 4; i >= 1; i--) {
      var rr = r * (1.8 + i * 1.1);
      var g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      var a = (0.08 + 0.06 * Math.sin(t * 3 + i)) * flick;
      g.addColorStop(0, 'rgba(255,230,160,' + a + ')');
      g.addColorStop(0.4, 'rgba(255,160,60,' + (a * 0.5) + ')');
      g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.beginPath(); ctx.fillStyle = g; ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
    }
    // core
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,250,230,' + (0.9 * flick) + ')';
    ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // spark rays
    ctx.strokeStyle = 'rgba(255,220,140,' + (0.35 * flick) + ')';
    ctx.lineWidth = 1;
    for (var k = 0; k < 6; k++) {
      var ang = t * 0.6 + k * Math.PI / 3;
      var len = r * (2.2 + 0.6 * Math.sin(t * 5 + k));
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * r * 1.1, y + Math.sin(ang) * r * 1.1);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
  }

  function drawFinnBody(ctx, t) {
    var x = finn.x, y = finn.y;
    var s = 22 * finn.scale;
    var morph = finn.morph;
    var flick = 0.9 + 0.1 * Math.sin(t * 3.5);
    // aura flame
    var g = ctx.createRadialGradient(x, y - s * 0.1, 0, x, y, s * 2.4);
    g.addColorStop(0, 'rgba(255,220,140,' + (0.35 * flick * morph) + ')');
    g.addColorStop(0.45, 'rgba(255,150,50,' + (0.12 * morph) + ')');
    g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.beginPath(); ctx.fillStyle = g; ctx.arc(x, y, s * 2.4, 0, Math.PI * 2); ctx.fill();
    // body coin-like
    var body = ctx.createRadialGradient(x - s * 0.2, y - s * 0.25, 0, x, y, s);
    body.addColorStop(0, '#FCE7B8');
    body.addColorStop(0.55, '#E9AE66');
    body.addColorStop(1, '#B8712E');
    ctx.beginPath(); ctx.fillStyle = body; ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.strokeStyle = 'rgba(255,230,180,0.5)'; ctx.lineWidth = 1.5;
    ctx.arc(x, y, s * 0.92, 0, Math.PI * 2); ctx.stroke();
    // face
    var eyeY = y - s * 0.08;
    var eyeOpen = finn.emotion === 'listen' ? 0.35 : 1;
    ctx.fillStyle = '#2a1810';
    ctx.beginPath(); ctx.ellipse(x - s * 0.28, eyeY, s * 0.1, s * 0.12 * eyeOpen, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + s * 0.28, eyeY, s * 0.1, s * 0.12 * eyeOpen, 0, 0, Math.PI * 2); ctx.fill();
    // mouth
    ctx.strokeStyle = '#5a3020'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();
    if (finn.emotion === 'happy' || finn.emotion === 'listen') {
      ctx.arc(x, y + s * 0.2, s * 0.28, 0.15, Math.PI - 0.15);
    } else if (finn.emotion === 'think') {
      ctx.moveTo(x - s * 0.18, y + s * 0.28); ctx.lineTo(x + s * 0.18, y + s * 0.28);
    } else {
      ctx.arc(x, y + s * 0.22, s * 0.22, 0.2, Math.PI - 0.2);
    }
    ctx.stroke();
    // listen pulse ring
    if (finn.listening) {
      var pr = s * (1.4 + 0.3 * Math.sin(t * 6));
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(94,200,255,' + (0.35 + 0.25 * Math.sin(t * 6)) + ')';
      ctx.lineWidth = 2;
      ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawFinn(ctx, t) {
    // trail during fall
    if (finn.mode === 'fall' || finn.mode === 'toDoor') {
      finn.trail.push({ x: finn.x, y: finn.y, life: 1 });
      if (finn.trail.length > 18) finn.trail.shift();
      for (var i = 0; i < finn.trail.length; i++) {
        var tr = finn.trail[i];
        tr.life -= 0.06;
        if (tr.life <= 0) continue;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,200,100,' + (tr.life * 0.35) + ')';
        ctx.arc(tr.x, tr.y, 2 + tr.life * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (finn.morph < 0.55) drawFinnStar(ctx, t);
    if (finn.morph > 0.25) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (finn.morph - 0.25) / 0.5);
      drawFinnBody(ctx, t);
      ctx.restore();
    }
  }

  function updateFinn(dt, door) {
    if (finn.mode === 'fall') {
      finn.fallT += dt;
      var p = Math.min(1, finn.fallT / 1.35);
      // ease out cubic
      var e = 1 - Math.pow(1 - p, 3);
      finn.y = finn.y + (finn.targetY - finn.y) * Math.min(1, dt * 2.2);
      // actually lerp from start
      // better: store start on fall begin — approximate
      finn.morph = Math.min(1, p * 1.15);
      finn.scale = 1 + 0.35 * Math.sin(p * Math.PI);
      if (p >= 1) {
        finn.mode = 'ready';
        finn.morph = 1;
        finn.scale = 1;
        finn.y = finn.targetY;
        finn.emotion = 'idle';
        setHint('нажми · сказать');
        if (!finn.firstListenDone) {
          finn.firstListenDone = true;
          setTimeout(function () { startListen(); }, 400);
        }
      }
    } else if (finn.mode === 'toDoor' && door) {
      var dx = door.x - finn.x, dy = door.y - finn.y;
      var dist = Math.hypot(dx, dy) || 1;
      var sp = 180 * dt;
      if (dist < 14) {
        finn.mode = 'enterDoor';
        finn.scale = 0.35;
        showSub('');
        // trigger door open via FinMatter if available
        try {
          if (typeof window.__matterOpenDoor === 'function') window.__matterOpenDoor();
        } catch (e) {}
      } else {
        finn.x += (dx / dist) * sp;
        finn.y += (dy / dist) * sp;
        finn.scale = Math.max(0.35, Math.min(1, dist / 120));
        finn.morph = 1;
      }
    }
  }

  /* speech */
  function startListen() {
    if (finn.mode !== 'ready') return;
    stopListen();
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      showSub('Голос недоступен на этом устройстве');
      return;
    }
    try {
      rec = new SR();
      rec.lang = 'ru-RU';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = function () {
        finn.listening = true;
        finn.emotion = 'listen';
        showSub('Слушаю…');
        setHint('');
      };
      rec.onresult = function (ev) {
        var text = '';
        try { text = (ev.results[0][0].transcript || '').trim(); } catch (e) {}
        finn.listening = false;
        finn.emotion = 'think';
        showSub(text || '…');
        handleCommand(text);
      };
      rec.onerror = function () {
        finn.listening = false;
        finn.emotion = 'idle';
        showSub('');
        setHint('нажми · сказать');
      };
      rec.onend = function () {
        finn.listening = false;
        if (finn.emotion === 'listen') finn.emotion = 'idle';
        setHint('нажми · сказать');
      };
      rec.start();
    } catch (e) {
      showSub('Не удалось включить микрофон');
    }
  }
  function stopListen() {
    try { if (rec) rec.abort(); } catch (e) {}
    rec = null;
    finn.listening = false;
  }

  function handleCommand(text) {
    var t = (text || '').toLowerCase();
    // room commands
    if (/комнат|двер|заглян|по[йи]д[её]м|открой|зайд[её]м|давай\s+в\s+комнат/.test(t)) {
      finn.emotion = 'happy';
      showSub('Хорошо, идём в комнату');
      setTimeout(function () {
        var door = window.__matterDoor;
        if (door) goToDoor(door);
        else if (typeof window.__matterOpenDoor === 'function') window.__matterOpenDoor();
      }, 600);
      return;
    }
    finn.emotion = 'idle';
    showSub(text ? ('«' + text + '»') : '');
    setTimeout(function () { showSub(''); setHint('нажми · сказать'); }, 2200);
  }

  /* hooks into matter canvas loop via monkey-patch */
  var origEnter = window.FinMatter.enter;
  window.FinMatter.enter = function () {
    origEnter.apply(this, arguments);
    setTimeout(function () {
      var c = document.getElementById('mtCanvas');
      if (!c) return;
      resetFinn(window.innerWidth, window.innerHeight);
      ensureUI();
    }, 50);
  };

  // expose for matter.js integration
  window.__MatterFinn = {
    finn: finn,
    reset: resetFinn,
    startFall: startFall,
    draw: drawFinn,
    update: updateFinn,
    startListen: startListen,
    stopListen: stopListen,
    hitTest: function (x, y) {
      if (finn.mode === 'star') return Math.hypot(x - finn.x, y - finn.y) < 36;
      if (finn.mode === 'ready') return Math.hypot(x - finn.x, y - finn.y) < 48;
      return false;
    },
    onTap: function () {
      if (finn.mode === 'star') startFall();
      else if (finn.mode === 'ready' && !finn.listening) startListen();
    }
  };
})();
