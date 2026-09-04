/**
 * FinBackup — multi-layer local safety net for Finna state.
 * Layers:
 *  1) Rotating localStorage snapshots (5 slots)
 *  2) Daily file export to Downloads via FinBridge.saveBackup
 *  3) Boot-time recovery if primary state is empty
 *  4) Cloud is handled by cloud.js (must stay non-destructive)
 */
(function (global) {
  'use strict';

  var SLOT_PREFIX = 'finna_backup_slot_';
  var SLOT_COUNT = 5;
  var META_KEY = 'finna_backup_meta_v1';
  var LAST_JSON_NAME = 'finna-latest.json';
  var MIN_SNAP_MS = 8000; // throttle snapshots
  var _lastSnapAt = 0;
  var _exportBusy = false;

  function collections() {
    return ['income', 'expenses', 'reserves', 'debts', 'reserveOps', 'obligations', 'obligationPays'];
  }

  function isEmptyState(s) {
    if (!s || typeof s !== 'object') return true;
    var emptyCols = collections().every(function (k) {
      return !Array.isArray(s[k]) || s[k].length === 0;
    });
    var bal = 0;
    try {
      bal = Number((s.settings && s.settings.openingBalance) || 0) || 0;
    } catch (e) {}
    var rates = 0;
    try {
      rates = Number((s.settings && s.settings.dayRate) || 0) + Number((s.settings && s.settings.nightRate) || 0);
    } catch (e) {}
    var shifts = s.shiftsOverride && Object.keys(s.shiftsOverride).length;
    var plans = s.dayPlans && Object.keys(s.dayPlans).length;
    return emptyCols && !bal && !rates && !shifts && !plans;
  }

  function countItems(s) {
    if (!s) return 0;
    var n = 0;
    collections().forEach(function (k) {
      if (Array.isArray(s[k])) n += s[k].length;
    });
    return n;
  }

  function readMeta() {
    try {
      return JSON.parse(localStorage.getItem(META_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function writeMeta(m) {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(m));
    } catch (e) {}
  }

  function todayStr() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function rotateWrite(stateObj) {
    var payload = JSON.stringify({
      savedAt: new Date().toISOString(),
      itemCount: countItems(stateObj),
      state: stateObj
    });
    // shift slots: 3->4, 2->3, ... 0->1, write new into 0
    try {
      for (var i = SLOT_COUNT - 1; i >= 1; i--) {
        var prev = localStorage.getItem(SLOT_PREFIX + (i - 1));
        if (prev) localStorage.setItem(SLOT_PREFIX + i, prev);
      }
      localStorage.setItem(SLOT_PREFIX + '0', payload);
    } catch (e) {
      // quota — try clear oldest only
      try {
        localStorage.removeItem(SLOT_PREFIX + (SLOT_COUNT - 1));
        localStorage.setItem(SLOT_PREFIX + '0', payload);
      } catch (e2) {}
    }
  }

  function listSlots() {
    var out = [];
    for (var i = 0; i < SLOT_COUNT; i++) {
      try {
        var raw = localStorage.getItem(SLOT_PREFIX + i);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        if (parsed && parsed.state && !isEmptyState(parsed.state)) {
          out.push({
            slot: i,
            savedAt: parsed.savedAt || null,
            itemCount: parsed.itemCount || countItems(parsed.state),
            state: parsed.state
          });
        }
      } catch (e) {}
    }
    return out;
  }

  function bestSlot() {
    var slots = listSlots();
    if (!slots.length) return null;
    slots.sort(function (a, b) {
      if (b.itemCount !== a.itemCount) return b.itemCount - a.itemCount;
      return String(b.savedAt || '').localeCompare(String(a.savedAt || ''));
    });
    return slots[0];
  }

  function exportToDownloads(stateObj, filename, silent) {
    if (_exportBusy) return Promise.resolve(false);
    if (isEmptyState(stateObj)) return Promise.resolve(false);
    _exportBusy = true;
    var json = JSON.stringify(stateObj, null, 2);
    try {
      if (global.FinBridge && typeof global.FinBridge.saveBackup === 'function') {
        global.FinBridge.saveBackup(json, filename || LAST_JSON_NAME);
        _exportBusy = false;
        return Promise.resolve(true);
      }
    } catch (e) {}
    try {
      // browser fallback
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename || LAST_JSON_NAME;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 2000);
      _exportBusy = false;
      return Promise.resolve(true);
    } catch (e2) {
      _exportBusy = false;
      if (!silent && global.toast) global.toast('Не удалось сохранить файл бэкапа');
      return Promise.resolve(false);
    }
  }

  function onSave(stateObj) {
    if (!stateObj || isEmptyState(stateObj)) return;
    var now = Date.now();
    if (now - _lastSnapAt >= MIN_SNAP_MS) {
      _lastSnapAt = now;
      rotateWrite(stateObj);
      var meta = readMeta();
      meta.lastSnapAt = new Date().toISOString();
      meta.lastItemCount = countItems(stateObj);
      meta.snapCount = (meta.snapCount || 0) + 1;
      writeMeta(meta);
    }
    // Daily file export (once per calendar day)
    try {
      var day = todayStr();
      var meta2 = readMeta();
      if (meta2.lastExportDay !== day) {
        exportToDownloads(stateObj, 'finna-auto-' + day + '.json', true).then(function (ok) {
          if (ok) {
            var m = readMeta();
            m.lastExportDay = day;
            m.lastExportAt = new Date().toISOString();
            writeMeta(m);
          }
        });
        // also refresh latest pointer
        exportToDownloads(stateObj, LAST_JSON_NAME, true);
      }
    } catch (e) {}
  }

  function restoreBest() {
    var best = bestSlot();
    if (best && best.state) return best.state;
    // try raw encrypted backup is handled by secure-store; here only plaintext snaps
    try {
      var raw = localStorage.getItem('kopeyka3_state_v1__raw_backup');
      if (raw && raw.indexOf('FINENC1:') !== 0) {
        var st = JSON.parse(raw);
        if (!isEmptyState(st)) return st;
      }
    } catch (e) {}
    return null;
  }

  function status() {
    var meta = readMeta();
    var slots = listSlots();
    var cloudUser = null;
    try {
      if (global.kopeykaCloud && typeof global.kopeykaCloud.user === 'function') {
        cloudUser = global.kopeykaCloud.user();
      }
    } catch (e) {}
    return {
      slots: slots.length,
      lastSnapAt: meta.lastSnapAt || null,
      lastExportDay: meta.lastExportDay || null,
      lastItemCount: meta.lastItemCount || 0,
      cloudLoggedIn: !!cloudUser,
      cloudEmail: cloudUser && (cloudUser.email || null)
    };
  }

  function forceSnapshot(stateObj) {
    if (!stateObj || isEmptyState(stateObj)) return false;
    _lastSnapAt = 0;
    onSave(stateObj);
    return true;
  }

  function forceFileBackup(stateObj) {
    var day = todayStr();
    return exportToDownloads(stateObj, 'finna-backup-' + day + '.json', false);
  }

  global.FinBackup = {
    onSave: onSave,
    restoreBest: restoreBest,
    status: status,
    forceSnapshot: forceSnapshot,
    forceFileBackup: forceFileBackup,
    isEmptyState: isEmptyState,
    listSlots: listSlots
  };
})(typeof window !== 'undefined' ? window : this);
