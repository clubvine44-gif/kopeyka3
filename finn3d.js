(function () {
  'use strict';

  /* Finn visual assistant v4 — clean layout, SVG character, no overlap chaos */

  var root, floatBtn, cardEl, spotlight, shade, stage;
  var step = 0, steps = [], targetEl = null, raf = 0;

  var CSS = [
    '#finnRoot{position:fixed;inset:0;z-index:220;display:none;pointer-events:none;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif}',
    '#finnRoot.on{display:block}',

    '#finnShade{position:absolute;inset:0;background:rgba(6,8,12,.55);opacity:0;',
    'transition:opacity .25s ease;pointer-events:none}',
    '#finnShade.on{opacity:1}',

    '#finnSpot{position:fixed;z-index:221;display:none;border-radius:18px;',
    'box-shadow:0 0 0 9999px rgba(6,8,12,.55),0 0 0 2px #f0c384,0 0 28px rgba(229,167,94,.45);',
    'pointer-events:none;transition:all .3s cubic-bezier(.2,.8,.2,1)}',

    '#finnStage{position:fixed;z-index:223;left:0;top:0;width:42%;max-width:200px;height:58%;',
    'display:flex;align-items:flex-end;justify-content:center;padding:0 0 8px 8px;',
    'pointer-events:none;opacity:0;transform:translateY(20px);transition:opacity .35s,transform .35s}',
    '#finnRoot.on #finnStage{opacity:1;transform:none}',
    '#finnStage svg{width:100%;max-width:180px;height:auto;filter:drop-shadow(0 16px 28px rgba(0,0,0,.4));',
    'animation:finnBob 3s ease-in-out infinite}',
    '@keyframes finnBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',

    '#finnCard{position:fixed;z-index:224;left:12px;right:12px;bottom:calc(96px + env(safe-area-inset-bottom,0px));',
    'max-width:480px;margin:0 auto;pointer-events:auto;',
    'background:linear-gradient(180deg,rgba(28,32,42,.98),rgba(16,18,24,.98));',
    'border:1px solid rgba(229,167,94,.28);border-radius:20px;padding:16px 16px 14px;',
    'box-shadow:0 20px 50px rgba(0,0,0,.55);backdrop-filter:blur(16px);',
    'opacity:0;transform:translateY(16px);transition:opacity .3s,transform .3s}',
    '#finnRoot.on #finnCard{opacity:1;transform:none}',
    '#finnCard .row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}',
    '#finnCard .badge{font-size:10px;font-weight:800;letter-spacing:.12em;color:#f0c384;',
    'background:rgba(229,167,94,.12);border:1px solid rgba(229,167,94,.25);padding:4px 8px;border-radius:999px}',
    '#finnCard .skip{font-size:12px;color:#8b92a3;padding:4px 8px;border-radius:8px;background:transparent}',
    '#finnCard .skip:active{background:rgba(255,255,255,.06)}',
    '#finnCard .text{font-size:15px;line-height:1.45;color:#f2f3f7;margin:8px 0 14px;min-height:44px}',
    '#finnCard .dots{display:flex;gap:5px;margin-bottom:12px}',
    '#finnCard .dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.15);display:block}',
    '#finnCard .dots i.on{background:#e5a75e;width:16px;border-radius:4px}',
    '#finnCard .actions{display:flex;gap:8px}',
    '#finnCard .actions button{flex:1;padding:12px;border-radius:12px;font-weight:700;font-size:14px;',
    'background:#222632;color:#fff;border:1px solid rgba(255,255,255,.08)}',
    '#finnCard .actions .primary{background:linear-gradient(135deg,#f0c384,#e5a75e);color:#1a1208;border:0}',
    '#finnCard .actions .ghost{visibility:hidden}',
    '#finnCard .actions .ghost.show{visibility:visible}',

    '#finnLaunch{position:fixed;z-index:200;',
    'right:calc(16px + 56px + 12px);bottom:calc(18px + env(safe-area-inset-bottom,0px));',
    'width:52px;height:52px;border-radius:16px;padding:0;border:1px solid rgba(229,167,94,.4);',
    'background:linear-gradient(145deg,#2a3144,#12161f);',
    'box-shadow:0 10px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.08);',
    'display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:auto}',
    '#finnLaunch svg{width:36px;height:36px;display:block}',
    '#finnLaunch .pulse{position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;',
    'background:#4ade80;box-shadow:0 0 8px #4ade80;animation:finnPulse 1.8s infinite}',
    '@keyframes finnPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}}',
    '#finnLaunch:active{transform:scale(.96)}',

    '@media (max-width:380px){',
    '#finnStage{width:38%;max-width:150px}',
    '#finnCard{left:10px;right:10px;bottom:calc(90px + env(safe-area-inset-bottom,0px));padding:14px}',
    '#finnCard .text{font-size:14px}',
    '}'
  ].join('');

  function characterSVG(opts) {
    opts = opts || {};
    var armRot = opts.armRot != null ? opts.armRot : -8;
    var w = opts.w || 160;
    var h = opts.h || 280;
    return (
      '<svg viewBox="0 0 160 280" width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="fnSuit" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#3d5a80"/><stop offset="55%" stop-color="#2b3f5c"/><stop offset="100%" stop-color="#1a2740"/>' +
      '</linearGradient>' +
      '<linearGradient id="fnSkin" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#ffd4b0"/><stop offset="100%" stop-color="#e0a57a"/>' +
      '</linearGradient>' +
      '<linearGradient id="fnHair" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#4a342c"/><stop offset="100%" stop-color="#2a1c18"/>' +
      '</linearGradient>' +
      '<linearGradient id="fnGold" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#f0c384"/><stop offset="100%" stop-color="#e5a75e"/>' +
      '</linearGradient>' +
      '<linearGradient id="fnPants" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#1e2a3d"/><stop offset="100%" stop-color="#121a28"/>' +
      '</linearGradient>' +
      '</defs>' +
      '<ellipse cx="80" cy="268" rx="36" ry="6" fill="rgba(0,0,0,.25)"/>' +
      '<rect x="52" y="168" width="22" height="72" rx="10" fill="url(#fnPants)"/>' +
      '<rect x="86" y="168" width="22" height="72" rx="10" fill="url(#fnPants)"/>' +
      '<rect x="46" y="232" width="32" height="14" rx="7" fill="#0f141c"/>' +
      '<rect x="82" y="232" width="32" height="14" rx="7" fill="#0f141c"/>' +
      '<rect x="44" y="100" width="72" height="78" rx="18" fill="url(#fnSuit)"/>' +
      '<path d="M70 104 L90 104 L84 150 L76 150 Z" fill="#e8eaef"/>' +
      '<circle cx="98" cy="128" r="5" fill="url(#fnGold)"/>' +
      '<g transform="translate(40,108) rotate(14)">' +
      '<rect x="-8" y="0" width="16" height="54" rx="8" fill="url(#fnSuit)"/>' +
      '<rect x="-6" y="48" width="12" height="40" rx="6" fill="url(#fnSkin)"/>' +
      '<ellipse cx="0" cy="90" rx="9" ry="8" fill="url(#fnSkin)"/>' +
      '</g>' +
      '<g id="finnArmR" transform="translate(120,108) rotate(' + armRot + ')">' +
      '<rect x="-8" y="0" width="16" height="50" rx="8" fill="url(#fnSuit)"/>' +
      '<g transform="translate(0,46) rotate(-18)">' +
      '<rect x="-6" y="0" width="12" height="42" rx="6" fill="url(#fnSkin)"/>' +
      '<ellipse cx="0" cy="44" rx="9" ry="8" fill="url(#fnSkin)"/>' +
      '<rect x="-2" y="40" width="5" height="18" rx="2.5" fill="#e0a57a"/>' +
      '</g></g>' +
      '<rect x="70" y="88" width="20" height="18" rx="5" fill="url(#fnSkin)"/>' +
      '<ellipse cx="80" cy="62" rx="34" ry="38" fill="url(#fnSkin)"/>' +
      '<path d="M48 58 C48 28 112 28 112 58 C112 42 100 32 80 32 C60 32 48 42 48 58 Z" fill="url(#fnHair)"/>' +
      '<path d="M108 55 C116 62 118 78 112 92 C108 80 108 68 108 55 Z" fill="url(#fnHair)"/>' +
      '<ellipse cx="68" cy="64" rx="4.5" ry="5" fill="#1a1f2b"/>' +
      '<ellipse cx="92" cy="64" rx="4.5" ry="5" fill="#1a1f2b"/>' +
      '<circle cx="69.5" cy="62.5" r="1.4" fill="#fff" opacity=".7"/>' +
      '<circle cx="93.5" cy="62.5" r="1.4" fill="#fff" opacity=".7"/>' +
      '<path d="M60 54 Q68 50 76 54" stroke="#3a2a24" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M84 54 Q92 50 100 54" stroke="#3a2a24" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M70 76 Q80 84 90 76" stroke="#b06a58" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '</svg>'
    );
  }

  function miniSVG() {
    return (
      '<svg viewBox="40 20 80 100" width="36" height="36" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
      '<linearGradient id="mSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffd4b0"/><stop offset="100%" stop-color="#e0a57a"/></linearGradient>' +
      '<linearGradient id="mHair" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4a342c"/><stop offset="100%" stop-color="#2a1c18"/></linearGradient>' +
      '<linearGradient id="mSuit" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3d5a80"/><stop offset="100%" stop-color="#1a2740"/></linearGradient>' +
      '</defs>' +
      '<rect x="54" y="78" width="52" height="38" rx="12" fill="url(#mSuit)"/>' +
      '<rect x="72" y="70" width="16" height="14" rx="4" fill="url(#mSkin)"/>' +
      '<ellipse cx="80" cy="52" rx="26" ry="28" fill="url(#mSkin)"/>' +
      '<path d="M56 50 C56 28 104 28 104 50 C104 38 96 30 80 30 C64 30 56 38 56 50 Z" fill="url(#mHair)"/>' +
      '<ellipse cx="71" cy="54" rx="3.5" ry="4" fill="#1a1f2b"/>' +
      '<ellipse cx="89" cy="54" rx="3.5" ry="4" fill="#1a1f2b"/>' +
      '<path d="M72 64 Q80 70 88 64" stroke="#b06a58" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
      '</svg>'
    );
  }

  function ensureStyle() {
    if (document.getElementById('finnStyleV4')) return;
    var s = document.createElement('style');
    s.id = 'finnStyleV4';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function inject() {
    ensureStyle();
    if (!document.getElementById('finnLaunch')) {
      floatBtn = document.createElement('button');
      floatBtn.id = 'finnLaunch';
      floatBtn.type = 'button';
      floatBtn.title = 'Финн';
      floatBtn.innerHTML = miniSVG() + '<span class="pulse"></span>';
      floatBtn.onclick = function () {
        if (window.Finn3D) window.Finn3D.replay();
      };
      document.body.appendChild(floatBtn);
    } else {
      floatBtn = document.getElementById('finnLaunch');
    }

    if (document.getElementById('finnRoot')) {
      root = document.getElementById('finnRoot');
      cardEl = document.getElementById('finnCard');
      spotlight = document.getElementById('finnSpot');
      shade = document.getElementById('finnShade');
      stage = document.getElementById('finnStage');
      return;
    }

    root = document.createElement('div');
    root.id = 'finnRoot';
    root.innerHTML =
      '<div id="finnShade"></div>' +
      '<div id="finnSpot"></div>' +
      '<div id="finnStage">' + characterSVG() + '</div>' +
      '<div id="finnCard">' +
      '<div class="row"><span class="badge">ФИНН</span><button type="button" class="skip">Пропустить</button></div>' +
      '<div class="text"></div>' +
      '<div class="dots"></div>' +
      '<div class="actions"><button type="button" class="ghost prev">Назад</button><button type="button" class="primary next">Далее</button></div>' +
      '</div>';
    document.body.appendChild(root);

    cardEl = document.getElementById('finnCard');
    spotlight = document.getElementById('finnSpot');
    shade = document.getElementById('finnShade');
    stage = document.getElementById('finnStage');

    cardEl.querySelector('.skip').onclick = finish;
    cardEl.querySelector('.next').onclick = next;
    cardEl.querySelector('.prev').onclick = prev;
  }

  function setArm(deg) {
    if (!stage) return;
    stage.innerHTML = characterSVG({ armRot: deg });
  }

  function scrollToEl(el) {
    if (!el) return Promise.resolve();
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight;
    var cardH = 200;
    if (r.top >= 80 && r.bottom <= vh - cardH - 20) return Promise.resolve();
    var y = window.scrollY + r.top - vh * 0.28;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    return new Promise(function (res) { setTimeout(res, 420); });
  }

  function highlight(sel) {
    targetEl = sel ? document.querySelector(sel) : null;
    if (!targetEl) {
      spotlight.style.display = 'none';
      shade.classList.remove('on');
      setArm(-8);
      return Promise.resolve();
    }
    return scrollToEl(targetEl).then(function () {
      var r = targetEl.getBoundingClientRect();
      spotlight.style.display = 'block';
      spotlight.style.left = (r.left - 6) + 'px';
      spotlight.style.top = (r.top - 6) + 'px';
      spotlight.style.width = (r.width + 12) + 'px';
      spotlight.style.height = (r.height + 12) + 'px';
      shade.classList.add('on');
      var midY = r.top + r.height / 2;
      var deg = midY < window.innerHeight * 0.4 ? -35 : midY > window.innerHeight * 0.65 ? 12 : -12;
      setArm(deg);
    });
  }

  function renderDots() {
    var d = cardEl.querySelector('.dots');
    var html = '';
    for (var i = 0; i < steps.length; i++) html += '<i' + (i === step ? ' class="on"' : '') + '></i>';
    d.innerHTML = html;
  }

  function setStep(i) {
    step = i;
    var s = steps[i];
    cardEl.querySelector('.text').textContent = s.text;
    var prevB = cardEl.querySelector('.prev');
    if (i > 0) prevB.classList.add('show'); else prevB.classList.remove('show');
    cardEl.querySelector('.next').textContent = i === steps.length - 1 ? 'Готово' : 'Далее';
    renderDots();
    highlight(s.target || null);
  }

  function start() {
    inject();
    steps = [
      { text: 'Привет! Я Финн — твой помощник по финансам. Коротко покажу, где что лежит.' },
      { target: '.hero', text: 'Главный блок: сколько можно тратить сегодня, касса и доступный остаток.' },
      { target: '#btnCloud', text: 'Облако — синхронизация данных между устройствами.' },
      { target: '#btnSettings', text: 'Настройки: ключ ИИ, ставки смен, экспорт и импорт.' },
      { target: '#fab', text: 'Плюс — добавить доход, расход, резерв, долг или обязательный платёж.' },
      { target: '.sec', text: 'Ниже разделы: обязательные платежи, резервы, долги и история операций.' },
      { text: 'Готово. Я всегда справа внизу — нажми на меня, если захочешь повторить тур.' }
    ];
    root.classList.add('on');
    if (floatBtn) floatBtn.style.visibility = 'hidden';
    setStep(0);
  }

  function next() {
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  function finish() {
    if (root) root.classList.remove('on');
    targetEl = null;
    if (spotlight) spotlight.style.display = 'none';
    if (shade) shade.classList.remove('on');
    if (floatBtn) floatBtn.style.visibility = 'visible';
    try {
      localStorage.setItem('finn_onboarding_done', '1');
      localStorage.setItem('finn3d_seen_v4', '1');
    } catch (e) {}
  }

  function replay() {
    try { localStorage.removeItem('finn3d_seen_v4'); } catch (e) {}
    start();
  }

  function boot() {
    document.title = 'Финн';
    var h = document.querySelector('.topbar h1');
    if (h) h.textContent = 'Финн';
    inject();
    var seen = false;
    try { seen = localStorage.getItem('finn3d_seen_v4') === '1'; } catch (e) {}
    if (!seen) setTimeout(start, 650);
  }

  window.Finn3D = {
    start: start,
    finish: finish,
    replay: replay,
    pointTo: function (sel) {
      inject();
      root.classList.add('on');
      if (floatBtn) floatBtn.style.visibility = 'hidden';
      highlight(sel);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
