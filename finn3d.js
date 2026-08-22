(function () {
  'use strict';

  /* Finn v5 — girl avatar, FAB halo, voice-only activation, proper scroll */

  var root, stage, cardEl, spotlight, shade, fabHalo;
  var step = 0, steps = [], targetEl = null, active = false;

  var CSS = [
    '#finnRoot{position:fixed;inset:0;z-index:230;display:none;pointer-events:none;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif}',
    '#finnRoot.on{display:block}',
    '#finnShade{position:absolute;inset:0;background:rgba(5,7,12,.58);opacity:0;transition:opacity .28s;pointer-events:none}',
    '#finnShade.on{opacity:1}',
    '#finnSpot{position:fixed;z-index:231;display:none;border-radius:18px;pointer-events:none;',
    'box-shadow:0 0 0 9999px rgba(5,7,12,.58),0 0 0 2.5px #f0c384,0 0 32px rgba(229,167,94,.5);',
    'transition:left .32s,top .32s,width .32s,height .32s}',
    '#finnStage{position:fixed;z-index:233;left:4px;bottom:calc(210px + env(safe-area-inset-bottom,0px));',
    'width:150px;height:240px;display:flex;align-items:flex-end;justify-content:center;',
    'pointer-events:none;opacity:0;transform:translateY(24px) scale(.92);',
    'transition:opacity .4s,transform .4s cubic-bezier(.2,.85,.2,1)}',
    '#finnRoot.on #finnStage{opacity:1;transform:none}',
    '#finnStage svg{width:140px;height:auto;filter:drop-shadow(0 14px 22px rgba(0,0,0,.45));',
    'animation:finnFloat 3.2s ease-in-out infinite}',
    '@keyframes finnFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}',
    '#finnCard{position:fixed;z-index:234;left:12px;right:12px;',
    'bottom:calc(88px + env(safe-area-inset-bottom,0px));max-width:480px;margin:0 auto;',
    'pointer-events:auto;background:linear-gradient(165deg,rgba(32,28,40,.98),rgba(14,12,18,.98));',
    'border:1px solid rgba(240,180,200,.22);border-radius:22px;padding:16px;',
    'box-shadow:0 22px 55px rgba(0,0,0,.55);opacity:0;transform:translateY(18px);',
    'transition:opacity .35s,transform .35s}',
    '#finnRoot.tour #finnCard{opacity:1;transform:none}',
    '#finnCard .row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}',
    '#finnCard .badge{font-size:10px;font-weight:800;letter-spacing:.14em;color:#f3b8c8;',
    'background:rgba(243,184,200,.12);border:1px solid rgba(243,184,200,.28);padding:4px 9px;border-radius:999px}',
    '#finnCard .skip{font-size:12px;color:#9a91a0;padding:4px 8px;background:transparent;border:0}',
    '#finnCard .text{font-size:15px;line-height:1.45;color:#f5f2f6;margin:8px 0 12px;min-height:42px}',
    '#finnCard .dots{display:flex;gap:5px;margin-bottom:12px}',
    '#finnCard .dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.14);display:block}',
    '#finnCard .dots i.on{width:16px;border-radius:4px;background:#e8a0b5}',
    '#finnCard .actions{display:flex;gap:8px}',
    '#finnCard .actions button{flex:1;padding:12px;border-radius:13px;font-weight:700;font-size:14px;',
    'background:#2a2430;color:#fff;border:1px solid rgba(255,255,255,.07)}',
    '#finnCard .actions .primary{background:linear-gradient(135deg,#f3c0cf,#e89aaf);color:#2a1520;border:0}',
    '#finnCard .actions .ghost{visibility:hidden}',
    '#finnCard .actions .ghost.show{visibility:visible}',
    '#finnHalo{position:fixed;z-index:59;pointer-events:none;border-radius:50%;',
    'box-shadow:0 0 0 0 rgba(232,154,175,0);transition:box-shadow .3s,opacity .3s;opacity:0}',
    '#finnHalo.idle{opacity:.55;box-shadow:0 0 0 3px rgba(232,154,175,.35),0 0 18px rgba(232,154,175,.25)}',
    '#finnHalo.pulse{opacity:1;animation:finnHaloPulse 1s ease-in-out infinite}',
    '@keyframes finnHaloPulse{0%,100%{box-shadow:0 0 0 3px rgba(232,154,175,.5),0 0 16px rgba(232,154,175,.35);transform:scale(1)}',
    '50%{box-shadow:0 0 0 10px rgba(232,154,175,.15),0 0 36px rgba(232,154,175,.55);transform:scale(1.08)}}',
    '@media(max-width:380px){#finnStage{width:120px;height:200px;left:0}#finnStage svg{width:115px}}'
  ].join('');

  function girlSVG(armDeg) {
    armDeg = armDeg == null ? 8 : armDeg;
    return (
      '<svg viewBox="0 0 160 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="gSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe0c8"/><stop offset="100%" stop-color="#e8b090"/></linearGradient>' +
      '<linearGradient id="gHair" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3a221c"/><stop offset="50%" stop-color="#6b3d32"/><stop offset="100%" stop-color="#2a1814"/></linearGradient>' +
      '<linearGradient id="gDress" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c47a9a"/><stop offset="55%" stop-color="#8e4d6e"/><stop offset="100%" stop-color="#5c3048"/></linearGradient>' +
      '<linearGradient id="gBlush" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f2a0a8" stop-opacity=".55"/><stop offset="100%" stop-color="#f2a0a8" stop-opacity="0"/></linearGradient>' +
      '</defs>' +
      '<ellipse cx="80" cy="268" rx="34" ry="6" fill="rgba(0,0,0,.22)"/>' +
      '<rect x="56" y="175" width="18" height="68" rx="9" fill="url(#gSkin)"/>' +
      '<rect x="86" y="175" width="18" height="68" rx="9" fill="url(#gSkin)"/>' +
      '<ellipse cx="64" cy="245" rx="16" ry="8" fill="#2a1a22"/>' +
      '<ellipse cx="96" cy="245" rx="16" ry="8" fill="#2a1a22"/>' +
      '<path d="M48 108 C48 100 112 100 112 108 L118 178 C118 190 42 190 42 178 Z" fill="url(#gDress)"/>' +
      '<ellipse cx="80" cy="112" rx="34" ry="12" fill="#a85f7e"/>' +
      '<g transform="translate(42,115) rotate(16)">' +
      '<rect x="-7" y="0" width="14" height="48" rx="7" fill="url(#gSkin)"/>' +
      '<ellipse cx="0" cy="52" rx="8" ry="7" fill="url(#gSkin)"/>' +
      '</g>' +
      '<g class="armR" transform="translate(118,115) rotate(' + armDeg + ')">' +
      '<rect x="-7" y="0" width="14" height="44" rx="7" fill="url(#gSkin)"/>' +
      '<g transform="translate(0,40) rotate(-20)">' +
      '<rect x="-6" y="0" width="12" height="36" rx="6" fill="url(#gSkin)"/>' +
      '<ellipse cx="0" cy="38" rx="8" ry="7" fill="url(#gSkin)"/>' +
      '<rect x="-1.5" y="34" width="4.5" height="16" rx="2" fill="#e8b090"/>' +
      '</g></g>' +
      '<rect x="72" y="88" width="16" height="20" rx="5" fill="url(#gSkin)"/>' +
      '<ellipse cx="80" cy="60" rx="32" ry="36" fill="url(#gSkin)"/>' +
      '<path d="M42 70 C40 30 120 30 118 70 C122 100 118 140 110 155 C105 130 108 90 108 70 C108 48 96 38 80 38 C64 38 52 48 52 70 C52 95 55 130 50 155 C42 140 40 100 42 70 Z" fill="url(#gHair)"/>' +
      '<path d="M50 48 C55 32 105 32 110 48 C100 40 90 36 80 36 C70 36 60 40 50 48 Z" fill="url(#gHair)"/>' +
      '<ellipse cx="60" cy="70" rx="7" ry="4" fill="url(#gBlush)"/>' +
      '<ellipse cx="100" cy="70" rx="7" ry="4" fill="url(#gBlush)"/>' +
      '<ellipse cx="68" cy="62" rx="5" ry="5.5" fill="#2a2030"/>' +
      '<ellipse cx="92" cy="62" rx="5" ry="5.5" fill="#2a2030"/>' +
      '<circle cx="69.5" cy="60.5" r="1.6" fill="#fff" opacity=".85"/>' +
      '<circle cx="93.5" cy="60.5" r="1.6" fill="#fff" opacity=".85"/>' +
      '<path d="M62 56 Q68 52 74 56" stroke="#3a2a28" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M86 56 Q92 52 98 56" stroke="#3a2a28" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M70 76 Q80 84 90 76" stroke="#c47a7a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="50" cy="72" r="2.5" fill="#e8a0b5"/>' +
      '<circle cx="110" cy="72" r="2.5" fill="#e8a0b5"/>' +
      '</svg>'
    );
  }

  function ensureStyle() {
    if (document.getElementById('finnStyleV5')) return;
    var s = document.createElement('style');
    s.id = 'finnStyleV5';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function removeLegacy() {
    ['finnLaunch', 'finnFloat', 'finnTip', 'kopeykaAiFab', 'finn3d'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) n.remove();
    });
  }

  function positionHalo() {
    var fab = document.getElementById('fab');
    if (!fab || !fabHalo) return;
    var r = fab.getBoundingClientRect();
    var pad = 10;
    fabHalo.style.left = (r.left - pad) + 'px';
    fabHalo.style.top = (r.top - pad) + 'px';
    fabHalo.style.width = (r.width + pad * 2) + 'px';
    fabHalo.style.height = (r.height + pad * 2) + 'px';
  }

  function inject() {
    ensureStyle();
    removeLegacy();
    if (!document.getElementById('finnHalo')) {
      fabHalo = document.createElement('div');
      fabHalo.id = 'finnHalo';
      fabHalo.className = 'idle';
      document.body.appendChild(fabHalo);
      positionHalo();
      window.addEventListener('resize', positionHalo);
      window.addEventListener('scroll', positionHalo, { passive: true });
      setInterval(positionHalo, 800);
    } else fabHalo = document.getElementById('finnHalo');

    if (document.getElementById('finnRoot')) {
      root = document.getElementById('finnRoot');
      stage = document.getElementById('finnStage');
      cardEl = document.getElementById('finnCard');
      spotlight = document.getElementById('finnSpot');
      shade = document.getElementById('finnShade');
      return;
    }

    root = document.createElement('div');
    root.id = 'finnRoot';
    root.innerHTML =
      '<div id="finnShade"></div><div id="finnSpot"></div>' +
      '<div id="finnStage">' + girlSVG(8) + '</div>' +
      '<div id="finnCard">' +
      '<div class="row"><span class="badge">ФИНН</span><button type="button" class="skip">Пропустить</button></div>' +
      '<div class="text"></div><div class="dots"></div>' +
      '<div class="actions"><button type="button" class="ghost prev">Назад</button>' +
      '<button type="button" class="primary next">Далее</button></div></div>';
    document.body.appendChild(root);

    stage = document.getElementById('finnStage');
    cardEl = document.getElementById('finnCard');
    spotlight = document.getElementById('finnSpot');
    shade = document.getElementById('finnShade');
    cardEl.querySelector('.skip').onclick = finishTour;
    cardEl.querySelector('.next').onclick = nextTour;
    cardEl.querySelector('.prev').onclick = prevTour;
  }

  function setArm(deg) {
    if (stage) stage.innerHTML = girlSVG(deg);
  }

  function scrollToEl(el) {
    if (!el) return Promise.resolve();
    return new Promise(function (resolve) {
      var tries = 0;
      function go() {
        var r = el.getBoundingClientRect();
        var vh = window.innerHeight;
        var topSafe = 72;
        var bottomSafe = vh - 220;
        var fullyVisible = r.top >= topSafe && r.bottom <= bottomSafe && r.height > 0;
        if (fullyVisible || tries > 6) { resolve(); return; }
        tries++;
        var center = window.scrollY + r.top - (vh * 0.28);
        window.scrollTo({ top: Math.max(0, center), behavior: tries === 1 ? 'smooth' : 'auto' });
        setTimeout(go, tries === 1 ? 480 : 120);
      }
      go();
    });
  }

  function highlight(sel) {
    targetEl = sel ? document.querySelector(sel) : null;
    if (!targetEl) {
      if (spotlight) spotlight.style.display = 'none';
      if (shade) shade.classList.remove('on');
      setArm(8);
      return Promise.resolve();
    }
    return scrollToEl(targetEl).then(function () {
      var r = targetEl.getBoundingClientRect();
      spotlight.style.display = 'block';
      spotlight.style.left = Math.max(4, r.left - 8) + 'px';
      spotlight.style.top = Math.max(4, r.top - 8) + 'px';
      spotlight.style.width = (r.width + 16) + 'px';
      spotlight.style.height = (r.height + 16) + 'px';
      shade.classList.add('on');
      var mid = r.top + r.height / 2;
      setArm(mid < window.innerHeight * 0.4 ? -28 : mid > window.innerHeight * 0.6 ? 18 : 4);
    });
  }

  function renderDots() {
    var d = cardEl.querySelector('.dots'), html = '', i;
    for (i = 0; i < steps.length; i++) html += '<i' + (i === step ? ' class="on"' : '') + '></i>';
    d.innerHTML = html;
  }

  function setStep(i) {
    step = i;
    var s = steps[i];
    cardEl.querySelector('.text').textContent = s.text;
    var prev = cardEl.querySelector('.prev');
    if (i > 0) prev.classList.add('show'); else prev.classList.remove('show');
    cardEl.querySelector('.next').textContent = i === steps.length - 1 ? 'Готово' : 'Далее';
    renderDots();
    highlight(s.target || null);
  }

  function startTour() {
    inject();
    steps = [
      { text: 'Привет! Я Финн — твоя помощница. Покажу главное за полминуты.' },
      { target: '.hero', text: 'Здесь баланс: сколько можно тратить сегодня и состояние кассы.' },
      { target: '#btnCloud', text: 'Облако — синхронизация данных.' },
      { target: '#btnSettings', text: 'Настройки: ИИ, ставки, бэкап.' },
      { target: '#fab', text: 'Плюс — доходы, расходы, резервы и долги. Вокруг него подсветка: скажи «Финн» — и я отвечу.' },
      { target: '.sec', text: 'Ниже разделы с платежами, резервами и операциями. Экран сам прокручивается к ним.' },
      { text: 'Готово. Лишних кнопок нет — просто скажи «Привет, Финн» или «Фин».' }
    ];
    root.classList.add('on', 'tour');
    setStep(0);
  }

  function nextTour() { if (step < steps.length - 1) setStep(step + 1); else finishTour(); }
  function prevTour() { if (step > 0) setStep(step - 1); }

  function finishTour() {
    if (root) root.classList.remove('on', 'tour');
    targetEl = null;
    if (spotlight) spotlight.style.display = 'none';
    if (shade) shade.classList.remove('on');
    try {
      localStorage.setItem('finn_onboarding_done', '1');
      localStorage.setItem('finn3d_seen_v5', '1');
    } catch (e) {}
  }

  function activate(cmd) {
    inject();
    positionHalo();
    if (fabHalo) {
      fabHalo.classList.remove('idle');
      fabHalo.classList.add('pulse');
    }
    root.classList.add('on');
    root.classList.remove('tour');
    if (cardEl) cardEl.style.display = 'none';
    if (stage) {
      stage.style.opacity = '1';
      stage.style.transform = 'none';
    }
    setArm(-18);
    active = true;
    setTimeout(function () {
      if (window.kopeykaAssistant && typeof window.kopeykaAssistant.open === 'function') {
        window.kopeykaAssistant.open({ command: cmd || null, listen: !cmd });
      }
    }, 280);
    setTimeout(function () {
      if (fabHalo) {
        fabHalo.classList.remove('pulse');
        fabHalo.classList.add('idle');
      }
    }, 3500);
  }

  function deactivateVisual() {
    active = false;
    if (root) root.classList.remove('on', 'tour');
    if (cardEl) cardEl.style.display = '';
    if (fabHalo) {
      fabHalo.classList.remove('pulse');
      fabHalo.classList.add('idle');
    }
  }

  function boot() {
    document.title = 'Финн';
    var h = document.querySelector('.topbar h1');
    if (h) h.textContent = 'Финн';
    inject();
    positionHalo();
    if (fabHalo) fabHalo.classList.add('idle');
    var seen = false;
    try { seen = localStorage.getItem('finn3d_seen_v5') === '1'; } catch (e) {}
    if (!seen) setTimeout(startTour, 700);
    var obs = new MutationObserver(function () {
      if (!document.getElementById('kopeykaAiDialog') && active) deactivateVisual();
    });
    obs.observe(document.body, { childList: true, subtree: false });
  }

  window.Finn3D = {
    start: startTour,
    finish: finishTour,
    replay: function () {
      try { localStorage.removeItem('finn3d_seen_v5'); } catch (e) {}
      startTour();
    },
    activate: activate,
    deactivate: deactivateVisual,
    pointTo: function (sel) {
      inject();
      root.classList.add('on', 'tour');
      highlight(sel);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
