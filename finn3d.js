(function () {
  'use strict';

  /* Finn UI v6 — no character, theme-colored FAB outline, header hint */

  var fabHalo = null;

  var CSS = [
    '#finnHalo{position:fixed;z-index:59;pointer-events:none;border-radius:50%;',
    'border:2px solid rgba(229,167,94,.5);box-sizing:border-box;',
    'opacity:0;transition:opacity .25s,border-color .25s,box-shadow .25s}',
    '#finnHalo.idle{opacity:1}',
    '#finnHalo.pulse{opacity:1;animation:finnFabPulse 1.05s ease-in-out infinite}',
    '@keyframes finnFabPulse{',
    '0%,100%{border-color:rgba(229,167,94,.95);box-shadow:0 0 0 0 rgba(229,167,94,.45),0 0 12px rgba(229,167,94,.35)}',
    '50%{border-color:rgba(240,195,132,1);box-shadow:0 0 0 6px rgba(229,167,94,.12),0 0 22px rgba(229,167,94,.55)}',
    '}',
    '.finn-hint{display:flex;align-items:center;gap:6px;margin-left:8px;padding:4px 10px;',
    'border-radius:999px;border:1px solid rgba(229,167,94,.28);background:rgba(229,167,94,.08);',
    'color:#c9b08a;font-size:11px;font-weight:600;letter-spacing:.01em;white-space:nowrap;',
    'max-width:52vw;overflow:hidden;text-overflow:ellipsis}',
    '.finn-hint b{color:var(--accent,#E5A75E);font-weight:700}',
    '@media(max-width:360px){.finn-hint{display:none}}'
  ].join('');

  function ensureStyle() {
    if (document.getElementById('finnStyleV6')) return;
    var s = document.createElement('style');
    s.id = 'finnStyleV6';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function purgeLegacy() {
    ['finnRoot', 'finnLaunch', 'finnFloat', 'finnTip', 'finn3d', 'finnStage', 'finnCard', 'finnShade', 'finnSpot', 'kopeykaAiFab'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) n.remove();
    });
    var old = document.getElementById('finnStyleV5') || document.getElementById('finnStyleV4') || document.getElementById('finn3dStyle');
    if (old) old.remove();
  }

  function positionHalo() {
    var fab = document.getElementById('fab');
    if (!fab || !fabHalo) return;
    var r = fab.getBoundingClientRect();
    fabHalo.style.left = r.left + 'px';
    fabHalo.style.top = r.top + 'px';
    fabHalo.style.width = r.width + 'px';
    fabHalo.style.height = r.height + 'px';
  }

  function injectHalo() {
    if (!document.getElementById('finnHalo')) {
      fabHalo = document.createElement('div');
      fabHalo.id = 'finnHalo';
      fabHalo.className = 'idle';
      document.body.appendChild(fabHalo);
      window.addEventListener('resize', positionHalo);
      window.addEventListener('scroll', positionHalo, { passive: true });
      setInterval(positionHalo, 600);
    } else {
      fabHalo = document.getElementById('finnHalo');
    }
    positionHalo();
  }

  function injectHint() {
    if (document.querySelector('.finn-hint')) return;
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    var h1 = bar.querySelector('h1');
    var hint = document.createElement('div');
    hint.className = 'finn-hint';
    hint.innerHTML = 'Скажи: <b>Привет, Финн</b>';
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

  function activate(cmd) {
    injectHalo();
    positionHalo();
    if (fabHalo) {
      fabHalo.classList.remove('idle');
      fabHalo.classList.add('pulse');
    }
    setTimeout(function () {
      if (window.kopeykaAssistant && typeof window.kopeykaAssistant.open === 'function') {
        window.kopeykaAssistant.open({ command: cmd || null, listen: !cmd });
      }
    }, 120);
  }

  function deactivate() {
    if (fabHalo) {
      fabHalo.classList.remove('pulse');
      fabHalo.classList.add('idle');
    }
  }

  function boot() {
    ensureStyle();
    purgeLegacy();
    injectHalo();
    injectHint();
    if (fabHalo) fabHalo.classList.add('idle');

    var obs = new MutationObserver(function () {
      if (!document.getElementById('kopeykaAiDialog')) deactivate();
      positionHalo();
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
