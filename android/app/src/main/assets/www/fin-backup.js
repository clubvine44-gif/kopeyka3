/**
 * FinBackup — multi-layer safety net for Finna.
 * Public folder: Download/Finna (latest + daily + monthly FULL state snapshots).
 */
(function (global) {
  'use strict';
  var SLOT_PREFIX = 'finna_backup_slot_';
  var SLOT_COUNT = 5;
  var META_KEY = 'finna_backup_meta_v1';
  var LAST_JSON_NAME = 'finna-latest.json';
  var MIN_SNAP_MS = 8000;
  var MIN_LATEST_FILE_MS = 20000;
  var _lastSnapAt = 0;
  var _lastLatestFileAt = 0;
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
    try { bal = Number((s.settings && s.settings.openingBalance) || 0) || 0; } catch (e) {}
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
    collections().forEach(function (k) { if (Array.isArray(s[k])) n += s[k].length; });
    return n;
  }
  function readMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeMeta(m) {
    try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {}
  }
  function todayStr() {
    var d = new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function monthStr() { return todayStr().slice(0, 7); }

  function buildEnvelope(stateObj, kind) {
    var code = 0;
    try {
      if (global.FinBridge && typeof global.FinBridge.getVersionCode === 'function')
        code = Number(global.FinBridge.getVersionCode()) || 0;
    } catch (e) {}
    return {
      format: 'finna-backup-v2',
      kind: kind || 'snapshot',
      savedAt: new Date().toISOString(),
      versionCode: code,
      itemCount: countItems(stateObj),
      state: stateObj
    };
  }
  function envelopeJson(stateObj, kind) {
    return JSON.stringify(buildEnvelope(stateObj, kind), null, 2);
  }
  function parseBackupPayload(raw) {
    if (!raw) return null;
    var obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== 'object') return null;
    if (obj.format === 'finna-backup-v2' && obj.state && typeof obj.state === 'object') return obj.state;
    if (obj.state && typeof obj.state === 'object' && (obj.savedAt || obj.itemCount != null)) return obj.state;
    if (obj.settings || obj.income || obj.expenses || obj.debts) return obj;
    return null;
  }
  function rotateWrite(stateObj) {
    var payload = JSON.stringify({
      savedAt: new Date().toISOString(),
      itemCount: countItems(stateObj),
      state: stateObj
    });
    try {
      for (var i = SLOT_COUNT - 1; i >= 1; i--) {
        var prev = localStorage.getItem(SLOT_PREFIX + (i - 1));
        if (prev) localStorage.setItem(SLOT_PREFIX + i, prev);
      }
      localStorage.setItem(SLOT_PREFIX + '0', payload);
    } catch (e) {
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
  function nativeSave(json, filename) {
    try {
      if (global.FinBridge && typeof global.FinBridge.saveBackup === 'function') {
        global.FinBridge.saveBackup(json, filename);
        return true;
      }
    } catch (e) {}
    return false;
  }
  function exportEnvelope(stateObj, filename, kind) {
    if (_exportBusy) return false;
    if (isEmptyState(stateObj)) return false;
    _exportBusy = true;
    try {
      var json = envelopeJson(stateObj, kind);
      var ok = nativeSave(json, filename);
      if (!ok) {
        try {
          var blob = new Blob([json], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = filename || LAST_JSON_NAME; a.style.display = 'none';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 2000);
          ok = true;
        } catch (e2) {}
      }
      _exportBusy = false;
      return ok;
    } catch (e) {
      _exportBusy = false;
      return false;
    }
  }
  function onSave(stateObj) {
    if (!stateObj || isEmptyState(stateObj)) return;
    var now = Date.now();
    var meta = readMeta();
    var items = countItems(stateObj);
    if (now - _lastSnapAt >= MIN_SNAP_MS) {
      _lastSnapAt = now;
      rotateWrite(stateObj);
      meta.lastSnapAt = new Date().toISOString();
      meta.lastItemCount = items;
    }
    if (now - _lastLatestFileAt >= MIN_LATEST_FILE_MS) {
      _lastLatestFileAt = now;
      exportEnvelope(stateObj, LAST_JSON_NAME, 'latest');
      meta.lastLatestAt = new Date().toISOString();
    }
    var day = todayStr();
    if (meta.lastExportDay !== day) {
      if (exportEnvelope(stateObj, 'finna-day-' + day + '.json', 'daily')) {
        meta.lastExportDay = day;
        meta.lastExportAt = new Date().toISOString();
      }
    }
    var month = monthStr();
    if (meta.lastExportMonth !== month) {
      if (exportEnvelope(stateObj, 'finna-month-' + month + '.json', 'monthly')) {
        meta.lastExportMonth = month;
        meta.lastMonthAt = new Date().toISOString();
      }
    }
    writeMeta(meta);
  }
  function restoreBest() {
    var best = bestSlot();
    if (best && best.state) return best.state;
    try {
      var raw = localStorage.getItem('kopeyka3_state_v1__raw_backup');
      if (raw && raw.indexOf('FINENC1:') !== 0) {
        var st = parseBackupPayload(raw) || JSON.parse(raw);
        if (st && !isEmptyState(st)) return st;
      }
    } catch (e) {}
    return null;
  }
  function status() {
    var meta = readMeta();
    var slots = listSlots();
    var cloudUser = null;
    try {
      if (global.kopeykaCloud && typeof global.kopeykaCloud.user === 'function')
        cloudUser = global.kopeykaCloud.user();
    } catch (e) {}
    var folder = 'Загрузки / Finna';
    try {
      if (global.FinBridge && typeof global.FinBridge.getBackupFolderHint === 'function')
        folder = String(global.FinBridge.getBackupFolderHint() || folder);
    } catch (e) {}
    return {
      slots: slots.length,
      lastSnapAt: meta.lastSnapAt || null,
      lastExportDay: meta.lastExportDay || null,
      lastExportMonth: meta.lastExportMonth || null,
      lastLatestAt: meta.lastLatestAt || null,
      lastItemCount: meta.lastItemCount || 0,
      folder: folder,
      cloudLoggedIn: !!cloudUser,
      cloudEmail: cloudUser && (cloudUser.email || null)
    };
  }
  function forceSnapshot(stateObj) {
    if (!stateObj || isEmptyState(stateObj)) return false;
    _lastSnapAt = 0; _lastLatestFileAt = 0; onSave(stateObj); return true;
  }
  function forceFileBackup(stateObj) {
    var day = todayStr();
    var ok1 = exportEnvelope(stateObj, LAST_JSON_NAME, 'latest');
    var ok2 = exportEnvelope(stateObj, 'finna-manual-' + day + '-' + Date.now() + '.json', 'manual');
    return ok1 || ok2;
  }
  global.FinBackup = {
    onSave: onSave,
    restoreBest: restoreBest,
    status: status,
    forceSnapshot: forceSnapshot,
    forceFileBackup: forceFileBackup,
    isEmptyState: isEmptyState,
    listSlots: listSlots,
    parseBackupPayload: parseBackupPayload,
    buildEnvelope: buildEnvelope
  };
})(typeof window !== 'undefined' ? window : this);
