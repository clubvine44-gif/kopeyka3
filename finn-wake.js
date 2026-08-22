(function () {
  'use strict';
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  var wakeOn = true, rec = null, busy = false, restartTimer = null;

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9\s]+/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  var WAKE_RE = /(?:^|\s)(?:привет\s+)?(финн?|фенн?|фынн?|fin+n?)(?:\s|$)/i;
  function hasWake(s) { return WAKE_RE.test(norm(s)); }
  function stripWake(s) {
    return norm(s).replace(/^(?:привет\s+)?(?:финн?|фенн?|фынн?|fin+n?)\s*/i, '').trim();
  }
  function dialogOpen() { return !!document.getElementById('kopeykaAiDialog'); }

  function stopRec() {
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
    if (!rec) return;
    var r = rec; rec = null;
    try { r.onend = null; r.onerror = null; r.onresult = null; } catch (e) {}
    try { r.abort(); } catch (e) {}
    try { r.stop(); } catch (e) {}
  }

  function scheduleStart(ms) {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(function () {
      restartTimer = null;
      start();
    }, ms || 800);
  }

  function openFinn(cmd) {
    if (busy || dialogOpen()) return;
    busy = true;
    wakeOn = false;
    stopRec();

    // СРАЗУ открыть окно — до любых таймаутов
    try {
      if (window.Finn3D && typeof window.Finn3D.activate === 'function') {
        window.Finn3D.activate(cmd || null);
      } else if (window.kopeykaAssistant && typeof window.kopeykaAssistant.open === 'function') {
        window.kopeykaAssistant.open({ command: cmd || null, listen: false });
      }
    } catch (e) {}

    // Слушание — только после паузы, когда mic свободен
    setTimeout(function () {
      try {
        if (window.kopeykaAssistant && window.kopeykaAssistant.startListen && !cmd) {
          window.kopeykaAssistant.startListen();
        }
      } catch (e) {}
      busy = false;
    }, 700);
  }

  function start() {
    if (!wakeOn || rec || busy || dialogOpen()) {
      if (dialogOpen()) scheduleStart(1500);
      return;
    }
    try {
      rec = new SR();
      rec.lang = 'ru-RU';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 2;
      rec.onresult = function (e) {
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var r = e.results[i];
          var text = (r[0] && r[0].transcript) || '';
          if (!hasWake(text)) continue;
          openFinn(stripWake(text) || null);
          return;
        }
      };
      rec.onerror = function () { rec = null; if (wakeOn) scheduleStart(1600); };
      rec.onend = function () { rec = null; if (wakeOn && !busy) scheduleStart(500); };
      rec.start();
    } catch (e) {
      rec = null;
      scheduleStart(2000);
    }
  }

  function init() {
    window.__finnWakeStop = function () { wakeOn = false; stopRec(); };
    window.__finnWakeStart = function () { wakeOn = true; scheduleStart(400); };
    var obs = new MutationObserver(function () {
      if (!dialogOpen() && wakeOn && !rec && !busy) scheduleStart(600);
    });
    obs.observe(document.body, { childList: true, subtree: false });
    start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
