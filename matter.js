/* ===== МАТЕРИЯ — экспериментальный космический режим «Копейки» =====
   Полностью изолированный модуль. Не читает и не пишет STATE напрямую
   (кроме одностороннего безопасного чтения резерва для витрины копилки).
   Своё хранилище: localStorage['kopeyka_matter_v1'].
================================================================== */
(function () {
  'use strict';

  var LS_KEY = 'kopeyka_matter_v1';

  /* ---------- 1. Состояние Материи ---------- */
  function defState() {
    return {
      openDoors: { room: false },
      plant: { stage: 0, lastWatered: 0 }, // 0..3
      diary: [],
      book: { progress: 0.18, title: 'Атомные привычки' },
      windowNight: true,
      firstVisit: true,
      updatedAt: null
    };
  }
  function loadMatter() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return defState();
      var d = JSON.parse(raw);
      return Object.assign(defState(), d);
    } catch (e) { return defState(); }
  }
  var M = loadMatter();
  function saveMatter() {
    try { M.updatedAt = new Date().toISOString(); localStorage.setItem(LS_KEY, JSON.stringify(M)); } catch (e) {}
  }

  /* Безопасное одностороннее чтение финансов — только для отображения */
  function readReserveTotal() {
    try {
      if (window.kopeykaGetState) {
        var s = window.kopeykaGetState();
        if (s && Array.isArray(s.reserves)) return s.reserves.reduce(function (a, r) { return a + (Number(r.amount) || 0); }, 0);
      }
      var raw = localStorage.getItem('kopeyka_state_v1') || localStorage.getItem('finna_state_v1');
      if (raw) {
        var st = JSON.parse(raw);
        if (Array.isArray(st.reserves)) return st.reserves.reduce(function (a, r) { return a + (Number(r.amount) || 0); }, 0);
      }
    } catch (e) {}
    return 46500; // безопасный fallback для витрины, если формат стейта не найден
  }

  /* ---------- 2. Моковые объекты созвездия (пока нет модели «Целей») ---------- */
  var OBJECTS = [
    { id: 'g1', type: 'goal', title: 'Купить автомобиль', progress: 0.67, remain: '64 500 ₽' },
    { id: 'g2', type: 'goal', title: 'Получить права', progress: 0.4, remain: '3 занятия' },
    { id: 'd1', type: 'dream', title: 'Своё жильё', progress: 0.12, remain: 'долгий путь' },
    { id: 'p1', type: 'plan', title: 'Накопить 200 000 ₽', progress: 0.31, remain: '138 000 ₽' },
    { id: 'e1', type: 'event', title: 'День рождения дочери', progress: 1, remain: 'скоро' },
    { id: 'door_room', type: 'door', title: 'Комната', locked: false }
  ];
  var LINKS = [['g1', 'p1'], ['d1', 'p1'], ['g2', 'g1']];

  function hash(str) { var h = 0; for (var i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; } return Math.abs(h); }
  function seededPos(id, w, h) {
    var hh = hash(id);
    var x = 0.14 + ((hh % 1000) / 1000) * 0.72;
    var y = 0.16 + (((hh >> 5) % 1000) / 1000) * 0.6;
    return { x: x * w, y: y * h };
  }

  var TYPE_STYLE = {
    goal: { color: '#5EC8FF', r: 6, glow: 18 },
    dream: { color: '#F0C060', r: 8, glow: 26 },
    plan: { color: '#7CF2C0', r: 5, glow: 14 },
    event: { color: '#F0A0E0', r: 5, glow: 14 },
    door: { color: '#FFFFFF', r: 7, glow: 22 }
  };

  /* ---------- 3. DOM / CSS ---------- */
  var css = ''
    + '#matterRoot{position:fixed;inset:0;z-index:9999;display:none;background:#000;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;}'
    + '#matterRoot.open{display:block;}'
    + '#matterEnter{position:relative;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.85),rgba(94,200,255,.25) 60%,transparent 75%);border:1px solid rgba(148,180,255,.4);box-shadow:0 0 14px rgba(94,200,255,.35),inset 0 0 8px rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;}'
    + '#matterEnter:active{transform:scale(.92);}'
    + '.mt-veil{position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity 1.1s ease;z-index:10000;}'
    + '.mt-veil.on{opacity:1;pointer-events:all;}'
    + '#mtCanvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;}'
    + '.mt-topbar{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:0 16px;z-index:3;}'
    + '.mt-title{color:#dfe9ff;font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.75;font-weight:600;}'
    + '.mt-exit{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);color:#dfe9ff;font-size:15px;display:flex;align-items:center;justify-content:center;}'
    + '.mt-panel{position:absolute;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 20px);background:rgba(10,14,26,.72);backdrop-filter:blur(14px);border:1px solid rgba(148,180,255,.22);border-radius:20px;padding:18px;color:#eaf2ff;opacity:0;transform:translateY(16px);transition:opacity .5s ease,transform .5s ease;pointer-events:none;z-index:4;}'
    + '.mt-panel.show{opacity:1;transform:translateY(0);pointer-events:all;}'
    + '.mt-panel h3{font-size:17px;margin-bottom:10px;font-weight:700;letter-spacing:.01em;}'
    + '.mt-ring-wrap{display:flex;align-items:center;gap:14px;}'
    + '.mt-meta{font-size:13px;color:#9db3d9;line-height:1.5;}'
    + '.mt-close{margin-top:14px;width:100%;padding:11px;border-radius:12px;background:rgba(255,255,255,.08);color:#dfe9ff;font-size:14px;font-weight:600;border:1px solid rgba(255,255,255,.12);}'
    + '#matterRoom{position:absolute;inset:0;display:none;background:linear-gradient(180deg,#120E0A 0%,#1C140D 55%,#221809 100%);overflow:hidden;}'
    + '#matterRoom.show{display:block;}'
    + '.rm-ceiling{position:absolute;top:0;left:0;right:0;height:34%;}'
    + '.rm-hotspot{position:absolute;background:transparent;border:none;padding:0;-webkit-tap-highlight-color:transparent;}'
    + '.rm-dot{position:absolute;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle,rgba(255,210,140,.95),rgba(255,180,90,.15));box-shadow:0 0 12px rgba(255,190,110,.6);animation:mtPulse 3.4s ease-in-out infinite;}'
    + '.rm-label{position:absolute;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#ffd9a8;background:rgba(20,14,8,.55);border:1px solid rgba(255,190,110,.3);padding:3px 7px;border-radius:8px;white-space:nowrap;pointer-events:none;transform:translate(-50%,6px);}'
    + '@keyframes mtPulse{0%,100%{transform:scale(1);opacity:.85;}50%{transform:scale(1.35);opacity:1;}}'
    + '.mt-plant-stage{position:absolute;bottom:16%;left:20%;font-size:44px;filter:drop-shadow(0 0 10px rgba(120,220,140,.35));transition:transform .4s ease;}'
    + '.mt-sheet{position:absolute;left:0;right:0;bottom:0;top:14%;background:rgba(8,10,18,.92);backdrop-filter:blur(18px);border-top-left-radius:24px;border-top-right-radius:24px;transform:translateY(100%);transition:transform .45s cubic-bezier(.2,.9,.25,1);z-index:6;padding:20px;color:#eaf2ff;}'
    + '.mt-sheet.show{transform:translateY(0);}'
    + '.mt-sheet h3{font-size:18px;margin-bottom:12px;}'
    + '.mt-sheet textarea{width:100%;min-height:120px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#eaf2ff;padding:12px;font-size:14px;font-family:inherit;}'
    + '.mt-sheet .mt-close{margin-top:14px;}'
    + '.mt-water{margin-top:14px;width:100%;padding:12px;border-radius:12px;background:linear-gradient(135deg,#3a7,#2a5);color:#fff;font-weight:700;}'
    + '.mt-goalrow{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px;}'
    + '.mt-goalrow b{color:#ffd9a8;}';
  var styleEl = document.createElement('style'); styleEl.textContent = css; document.head.appendChild(styleEl);

  var veil = document.createElement('div'); veil.className = 'mt-veil'; document.body.appendChild(veil);

  var root = document.createElement('div'); root.id = 'matterRoot';
  root.innerHTML =
    '<div class="mt-topbar"><span class="mt-title">Материя · Созвездие</span><button class="mt-exit" id="mtExit">✕</button></div>' +
    '<canvas id="mtCanvas"></canvas>' +
    '<div class="mt-panel" id="mtPanel"></div>' +
    '<div id="matterRoom">' +
      '<canvas id="mtRoomSky"></canvas>' +
      '<div class="mt-plant-stage" id="mtPlant">🌱</div>' +
      '<button class="rm-hotspot" id="rmBed" style="left:2%;top:52%;width:34%;height:30%;"><span class="rm-dot" style="left:14%;top:18%;"></span><span class="rm-label" style="left:14%;top:12%;">Кровать</span></button>' +
      '<button class="rm-hotspot" id="rmDesk" style="left:58%;top:44%;width:30%;height:26%;"><span class="rm-dot" style="left:50%;top:14%;"></span><span class="rm-label" style="left:50%;top:8%;">Стол</span></button>' +
      '<button class="rm-hotspot" id="rmBook" style="left:36%;top:66%;width:20%;height:16%;"><span class="rm-dot" style="left:50%;top:20%;"></span><span class="rm-label" style="left:50%;top:14%;">Книга</span></button>' +
      '<button class="rm-hotspot" id="rmPlant" style="left:14%;top:60%;width:22%;height:22%;"><span class="rm-dot" style="left:60%;top:10%;"></span><span class="rm-label" style="left:60%;top:4%;">Растение</span></button>' +
      '<button class="rm-hotspot" id="rmPig" style="left:70%;top:60%;width:20%;height:18%;"><span class="rm-dot" style="left:50%;top:14%;"></span><span class="rm-label" style="left:50%;top:8%;">Копилка</span></button>' +
      '<button class="rm-hotspot" id="rmBoard" style="left:70%;top:14%;width:24%;height:20%;"><span class="rm-dot" style="left:50%;top:50%;"></span><span class="rm-label" style="left:50%;top:44%;">Доска целей</span></button>' +
      '<button class="rm-hotspot" id="rmWindow" style="left:32%;top:16%;width:34%;height:26%;"><span class="rm-dot" style="left:50%;top:70%;"></span><span class="rm-label" style="left:50%;top:64%;">Окно</span></button>' +
      '<button class="rm-hotspot" id="rmDoor" style="left:4%;top:10%;width:16%;height:34%;"><span class="rm-dot" style="left:50%;top:90%;"></span><span class="rm-label" style="left:50%;top:84%;">Назад</span></button>' +
    '</div>' +
    '<div class="mt-sheet" id="mtSheet"><div id="mtSheetBody"></div></div>';
  document.body.appendChild(root);

  /* ---------- 4. Кнопка входа в topbar ---------- */
  function mountEntry() {
    var actions = document.querySelector('.top-actions');
    if (!actions || document.getElementById('matterEnterWrap')) return;
    var wrap = document.createElement('button');
    wrap.id = 'matterEnterWrap'; wrap.className = 'icon-btn'; wrap.title = 'Материя'; wrap.style.padding = '0';
    wrap.innerHTML = '<span id="matterEnter">✨</span>';
    wrap.addEventListener('click', enterMatter);
    actions.insertBefore(wrap, actions.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountEntry);
  else mountEntry();

  /* ---------- 5. Переход в Материю ---------- */
  function enterMatter() {
    veil.classList.add('on');
    setTimeout(function () {
      root.classList.add('open');
      showConstellation();
      resizeCanvas();
      requestAnimationFrame(loop);
      setTimeout(function () { veil.classList.remove('on'); }, 60);
    }, 700);
  }
  function exitMatter() {
    veil.classList.add('on');
    setTimeout(function () {
      root.classList.remove('open');
      cancelAnimationFrame(rafId);
      veil.classList.remove('on');
    }, 500);
  }
  document.getElementById('mtExit').addEventListener('click', exitMatter);

  /* ---------- 6. Canvas Созвездия ---------- */
  var canvas = document.getElementById('mtCanvas');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var bgStars = [];
  var t0 = performance.now();
  var camera = { scale: 1, x: 0, y: 0, target: null, animT: 0 };
  var rafId = null;

  function resizeCanvas() {
    W = canvas.clientWidth = root.clientWidth;
    H = canvas.clientHeight = root.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!bgStars.length) {
      for (var i = 0; i < 140; i++) {
        bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + .3, ph: Math.random() * 6.28, sp: .3 + Math.random() * .6 });
      }
    }
    OBJECTS.forEach(function (o) { o.pos = seededPos(o.id, W, H); });
  }
  window.addEventListener('resize', resizeCanvas);

  function showConstellation() {
    document.getElementById('matterRoom').classList.remove('show');
    document.getElementById('mtRoomSky') && (document.getElementById('mtRoomSky').style.display = '');
    canvas.style.display = 'block';
    document.querySelector('.mt-title').textContent = 'Материя · Созвездие';
    hidePanel();
  }

  function drawStar(o, tSec, hovered) {
    var st = TYPE_STYLE[o.type];
    var pulse = 1 + Math.sin(tSec * 1.6 + hash(o.id) % 10) * 0.14;
    var r = st.r * pulse * (hovered ? 1.6 : 1);
    var glow = ctx.createRadialGradient(o.pos.x, o.pos.y, 0, o.pos.x, o.pos.y, st.glow * pulse);
    glow.addColorStop(0, st.color + 'CC'); glow.addColorStop(1, st.color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, st.glow * pulse, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, r, 0, 7); ctx.fill();
    if (o.type === 'goal' && o.progress > 0) {
      ctx.strokeStyle = st.color; ctx.lineWidth = 1.4; ctx.globalAlpha = .8;
      ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, st.glow * .62, -Math.PI / 2, -Math.PI / 2 + o.progress * 6.283);
      ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    var tSec = (ts - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    // фон / туманность
    var neb = ctx.createRadialGradient(W * .5, H * .3, 0, W * .5, H * .3, Math.max(W, H) * .7);
    neb.addColorStop(0, 'rgba(20,30,60,.5)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
    // частицы фона
    ctx.fillStyle = '#fff';
    bgStars.forEach(function (s) {
      var a = .25 + Math.abs(Math.sin(tSec * s.sp + s.ph)) * .55;
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // связи
    ctx.strokeStyle = 'rgba(140,180,255,.18)'; ctx.lineWidth = 1;
    LINKS.forEach(function (pair) {
      var a = OBJECTS.find(function (o) { return o.id === pair[0]; });
      var b = OBJECTS.find(function (o) { return o.id === pair[1]; });
      if (a && b) { ctx.beginPath(); ctx.moveTo(a.pos.x, a.pos.y); ctx.lineTo(b.pos.x, b.pos.y); ctx.stroke(); }
    });
    // объекты
    OBJECTS.forEach(function (o) { drawStar(o, tSec, false); });
    if (canvas.style.display !== 'none') {} // no-op guard
  }

  /* тап по звезде */
  canvas.addEventListener('click', function (ev) {
    var rect = canvas.getBoundingClientRect();
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    var hit = null, best = 999;
    OBJECTS.forEach(function (o) {
      var d = Math.hypot(o.pos.x - x, o.pos.y - y);
      var hitR = (TYPE_STYLE[o.type].glow) + 18; // увеличенная touch-зона
      if (d < hitR && d < best) { best = d; hit = o; }
    });
    if (!hit) return;
    if (hit.type === 'door') { openDoorTransition(); return; }
    openObjectPanel(hit);
  });

  function openObjectPanel(o) {
    var p = document.getElementById('mtPanel');
    var pct = Math.round((o.progress || 0) * 100);
    p.innerHTML =
      '<h3>' + o.title.toUpperCase() + '</h3>' +
      '<div class="mt-ring-wrap">' + ringSVG(o.progress || 0, TYPE_STYLE[o.type].color) +
      '<div class="mt-meta">Прогресс: ' + pct + '%<br>Осталось: ' + (o.remain || '—') + '</div></div>' +
      '<button class="mt-close" id="mtPanelClose">Закрыть</button>';
    p.classList.add('show');
    document.getElementById('mtPanelClose').onclick = hidePanel;
  }
  function hidePanel() { document.getElementById('mtPanel').classList.remove('show'); }
  function ringSVG(progress, color) {
    var r = 30, c = 2 * Math.PI * r, off = c * (1 - progress);
    return '<svg width="72" height="72" viewBox="0 0 72 72">' +
      '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="6"/>' +
      '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" ' +
      'stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" transform="rotate(-90 36 36)"/>' +
      '</svg>';
  }

  /* ---------- 7. Дверь → Комната (кинематографический переход) ---------- */
  function openDoorTransition() {
    veil.classList.add('on');
    setTimeout(function () {
      M.openDoors.room = true; saveMatter();
      canvas.style.display = 'none';
      hidePanel();
      document.querySelector('.mt-title').textContent = 'Материя · Комната';
      document.getElementById('matterRoom').classList.add('show');
      renderRoom();
      veil.classList.remove('on');
    }, 650);
  }
  function backToConstellation() {
    veil.classList.add('on');
    setTimeout(function () {
      document.getElementById('matterRoom').classList.remove('show');
      canvas.style.display = 'block';
      showConstellation();
      veil.classList.remove('on');
    }, 500);
  }

  /* ---------- 8. Комната: рендер + интерактивные объекты ---------- */
  var roomSky = document.getElementById('mtRoomSky');
  var skyCtx = roomSky.getContext('2d');
  var roomStars = [];
  function renderRoom() {
    roomSky.width = root.clientWidth; roomSky.height = root.clientHeight * .36;
    roomSky.style.position = 'absolute'; roomSky.style.top = '0'; roomSky.style.left = '0'; roomSky.style.width = '100%';
    if (!roomStars.length) {
      for (var i = 0; i < 40; i++) roomStars.push({ x: Math.random() * roomSky.width, y: Math.random() * roomSky.height * .8, r: Math.random() * 1.1 + .3 });
    }
    skyCtx.clearRect(0, 0, roomSky.width, roomSky.height);
    skyCtx.fillStyle = '#fff';
    roomStars.forEach(function (s) { skyCtx.globalAlpha = .4 + Math.random() * .5; skyCtx.beginPath(); skyCtx.arc(s.x, s.y, s.r, 0, 7); skyCtx.fill(); });
    skyCtx.globalAlpha = 1;
    var stages = ['🌱', '🌿', '🪴', '🌸'];
    document.getElementById('mtPlant').textContent = stages[M.plant.stage] || '🌱';
  }

  function openSheet(html) {
    var sheet = document.getElementById('mtSheet');
    document.getElementById('mtSheetBody').innerHTML = html + '<button class="mt-close" id="mtSheetClose">Закрыть</button>';
    sheet.classList.add('show');
    document.getElementById('mtSheetClose').onclick = function () { sheet.classList.remove('show'); };
    return sheet;
  }

  document.getElementById('rmDoor').addEventListener('click', backToConstellation);

  document.getElementById('rmBed').addEventListener('click', function () {
    openSheet('<h3>Кровать</h3><p class="mt-meta">Тихий вечер. Здесь позже появится вечерний режим Материи и статистика сна.</p>');
  });

  document.getElementById('rmDesk').addEventListener('click', function () {
    var last = M.diary[M.diary.length - 1] || '';
    var sheet = openSheet('<h3>Дневник</h3><textarea id="mtDiaryInput" placeholder="Мысли, идеи, планы...">' + last + '</textarea>' +
      '<button class="mt-water" id="mtDiarySave" style="background:linear-gradient(135deg,#5ec8ff,#3a86d1);margin-top:12px;">Сохранить запись</button>');
    sheet.querySelector('#mtDiarySave').onclick = function () {
      var v = sheet.querySelector('#mtDiaryInput').value.trim();
      if (v) { M.diary.push(v); if (M.diary.length > 50) M.diary.shift(); saveMatter(); }
      sheet.classList.remove('show');
    };
  });

  document.getElementById('rmBook').addEventListener('click', function () {
    openSheet('<h3>' + M.book.title + '</h3><p class="mt-meta">Прогресс чтения: ' + Math.round(M.book.progress * 100) + '%</p>');
  });

  document.getElementById('rmPlant').addEventListener('click', function () {
    var now = Date.now();
    var canWater = now - (M.plant.lastWatered || 0) > 12 * 3600 * 1000;
    var stages = ['Росток', 'Молодое растение', 'Взрослое растение', 'Цветение'];
    var sheet = openSheet('<h3>Растение</h3><p class="mt-meta">Стадия: ' + stages[M.plant.stage] + '</p>' +
      (canWater ? '<button class="mt-water" id="mtWaterBtn">Полить 💧</button>' : '<p class="mt-meta" style="margin-top:10px;">Уже полито недавно. Загляни позже.</p>'));
    if (canWater) sheet.querySelector('#mtWaterBtn').onclick = function () {
      M.plant.lastWatered = now;
      if (M.plant.stage < 3) M.plant.stage++;
      saveMatter(); renderRoom(); sheet.classList.remove('show');
    };
  });

  document.getElementById('rmPig').addEventListener('click', function () {
    var total = readReserveTotal();
    openSheet('<h3>Копилка</h3><p class="mt-meta">Накоплено в резервах: <b style="color:#ffd9a8">' + total.toLocaleString('ru-RU') + ' ₽</b><br>Копилка растёт вместе с реальными накоплениями в «Копейке».</p>');
  });

  document.getElementById('rmBoard').addEventListener('click', function () {
    var rows = OBJECTS.filter(function (o) { return o.type === 'goal' || o.type === 'plan'; })
      .map(function (o) { return '<div class="mt-goalrow"><span>' + o.title + '</span><b>' + Math.round((o.progress || 0) * 100) + '%</b></div>'; }).join('');
    openSheet('<h3>Доска целей</h3>' + rows);
  });

  document.getElementById('rmWindow').addEventListener('click', function () {
    M.windowNight = !M.windowNight; saveMatter();
    openSheet('<h3>Окно</h3><p class="mt-meta">Город внизу живёт своей жизнью. ' + (M.windowNight ? 'Сейчас ночь — тихо и спокойно.' : 'Скоро рассвет.') + '</p>');
  });

})();
