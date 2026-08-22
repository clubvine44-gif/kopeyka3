(function () {
  'use strict';
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  var wakeOn = true;
  var rec = null;
  var busy = false;
  var restartTimer = null;

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9\s]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var WAKE_RE = /(?:^|\s)(?:привет\s+)?(финн?|фенн?|фынн?|fin+n?)(?:\s|$)/i;

  function hasWake(s) {
    return WAKE_RE.test(norm(s));
  }

  function stripWake(s) {
    return norm(s).replace(/^(?:привет\s+)?(?:финн?|фенн?|фынн?|fin+n?)\s*/i, '').trim();
  }

  function dialogOpen() {
    return !!document.getElementById('kopeykaAiDialog');
  }

  function stopRec() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    if (rec) {
      try {
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.abort();
      } catch (e) {}
      try {
        rec.stop();
      } catch (e) {}
      rec = null;
    }
  }

  function scheduleStart(ms) {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(function () {
      restartTimer = null;
      start();
    }, ms || 700);
  }

  function openFinn(cmd) {
    if (busy) return;
    busy = true;
    wakeOn = false;
    stopRec();

    // отдать микрофон системе — на Android критично
    setTimeout(function () {
      try {
        if (window.Finn3D && typeof window.Finn3D.activate === 'function') {
          window.Finn3D.activate(cmd || null);
        } else if (window.kopeykaAssistant && typeof window.kopeykaAssistant.open === 'function') {
          window.kopeykaAssistant.open({ command: cmd || null, listen: !cmd });
        }
      } catch (e) {}
      setTimeout(function () {
        busy = false;
      }, 1200);
    }, 350);
  }

  function start() {
    if (!wakeOn || rec || busy) return;
    if (dialogOpen()) {
      scheduleStart(1500);
      return;
    }
    try {
      rec = new SR();
      rec.lang = 'ru-RU';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.onresult = function (e) {
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var r = e.results[i];
          var text = (r[0] && r[0].transcript) || '';
          if (!hasWake(text)) continue;
          var cmd = stripWake(text);
          if (r.isFinal) {
            openFinn(cmd || null);
            return;
          }
          if (!cmd) {
            openFinn(null);
            return;
          }
        }
      };
      rec.onerror = function () {
        rec = null;
        if (wakeOn) scheduleStart(1800);
      };
      rec.onend = function () {
        rec = null;
        if (wakeOn && !busy) scheduleStart(600);
      };
      rec.start();
    } catch (e) {
      rec = null;
      scheduleStart(2500);
    }
  }

  function init() {
    window.__finnWakeStop = function () {
      wakeOn = false;
      stopRec();
    };
    window.__finnWakeStart = function () {
      wakeOn = true;
      scheduleStart(500);
    };

    var obs = new MutationObserver(function () {
      if (!dialogOpen() && wakeOn && !rec && !busy) scheduleStart(500);
    });
    obs.observe(document.body, { childList: true, subtree: false });
    start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
