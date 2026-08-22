(function () {
  'use strict';

  /* Finn UI v7 — без персонажа, подсветка строго по контуру FAB, цвета темы */
  var FAB_CLASS = 'finn-active';
  var STYLE_ID = 'finnStyleV7';

  var CSS = [
    /* пульс прямо на кнопке «+» — по её контуру */
    '.fab.finn-active{',
    '  animation:finnFabPulse 1.05s ease-in-out infinite;',
    '  box-shadow:0 0 0 0 rgba(229,167,94,.55),0 8px 28px rgba(229,167,94,.45);',
    '}',
    '@keyframes finnFabPulse{',
    '  0%,100%{',
    '    box-shadow:0 0 0 0 rgba(229,167,94,.55),0 8px 28px rgba(229,167,94,.4);',
    '    filter:brightness(1.05);',
    '  }',
    '  50%{',
    '    box-shadow:0 0 0 8px rgba(229,167,94,.18),0 0 28px rgba(229,167,94,.65);',
    '    filter:brightness(1.12);',
    '  }',
    '}',
    /* тихий idle-контур (лёгкая обводка в цвете темы) */
    '.fab.finn-idle{',
    '  box-shadow:0 0 0 2px rgba(229,167,94,.35),0 8px 28px rgba(229,167,94,.35);',
    '}',
    /* подсказка в шапке */
    '.finn-hint{',
    '  display:inline-flex;align-items:center;gap:5px;margin-left:10px;',
    '  padding:3px 10px;border-radius:999px;',
    '  border:1px solid rgba(229,167,94,.28);',
    '  background:rgba(229,167,94,.09);',
    '  color:#c9b08a;font-size:11px;font-weight:600;letter-spacing:.01em;',
    '  white-space:nowrap;max-width:48vw;overflow:hidden;text-overflow:ellipsis;',
    '}',
    '.finn-hint b{color:var(--accent,#E5A75E);font-weight:700}',
    '@media(max-width:360px){.finn-hint{display:none}}'
  ].join('');

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function purgeLegacy() {
    [
      'finnRoot', 'finnLaunch', 'finnFloat', 'finnTip', 'finn3d', 'finnStage',
      'finnCard', 'finnShade', 'finnSpot', 'kopeykaAiFab', 'finnHalo'
    ].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) n.remove();
    });
    ['finnStyleV6', 'finnStyleV5', 'finnStyleV4', 'finn3dStyle'].forEach(function (id) {
      var old = document.getElementById(id);
      if (old) old.remove();
    });
  }

  function getFab() {
    return document.getElementById('fab');
  }

  function setIdle() {
    var fab = getFab();
    if (!fab) return;
    fab.classList.remove(FAB_CLASS);
    fab.classList.add('finn-idle');
  }

  function activate(cmd) {
    var fab = getFab();
    if (fab) {
      fab.classList.remove('finn-idle');
      fab.classList.add(FAB_CLASS);
    }
    try { if (window.__finnWakeStop) window.__finnWakeStop(); } catch (e) {}
    setTimeout(function () {
      if (window.kopeykaAssistant && typeof window.kopeykaAssistant.open === 'function') {
        window.kopeykaAssistant.open({ command: cmd || null, listen: !cmd });
      }
    }, 80);
  }

  function deactivate() {
    setIdle();
  }

  function injectHint() {
    if (document.querySelector('.finn-hint')) return;
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    var h1 = bar.querySelector('h1');
    var hint = document.createElement('div');
    hint.className = 'finn-hint';
    hint.innerHTML = 'Позови: <b>Привет, Финн</b>';
    if (h1 && h1.parentNode === bar) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;align-items:center;min-width:0;flex:1';
      h1.parentNode.insertBefore(wrap, h1);
      wrap.appendChild(h1);
      wrap.appendChild(hint);
    } else {
      bar.insertBefore(hint, bar.firstChild);
    }
  }

  function boot() {
    ensureStyle();
    purgeLegacy();
    injectHint();
    setIdle();

    var obs = new MutationObserver(function () {
      if (!document.getElementById('kopeykaAiDialog')) deactivate();
    });
    obs.observe(document.body, { childList: true, subtree: false });
  }

  window.Finn3D = {
    start: function () {},
    finish: function () {},
    replay: function () {},
    activate: activate,
    deactivate: deactivate,
    pointTo: function () {}
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
