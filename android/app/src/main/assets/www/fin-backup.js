/**
 * FinBackup — multi-layer safety net for Finna.
 * Public folder: Downloads/Finna (finna-latest + day + month full snapshots).
 * Public folder: Download/Finna (latest + daily + monthly FULL state snapshots).
 *
 * 4.13.6: count alive rows only (deleted rows must not look "richer");
 * preferOver never rolls live cash back to an older slot; native file scan
 * does not write the meal plan until a winner is chosen.
 * 4.13.5: inspectBackup does not write the meal plan (import confirm first);
 * preferOver lifts a newer/richer local slot over a stale live snapshot.
 */
(function (global) {
  'use strict';
  var MEAL_KEY = 'kopeyka3_meal_v1';
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
      if (!Array.isArray(s[k])) return true;
      return !s[k].some(function (x) { return x && !x.deleted; });
    });
    var bal = 0;
    try { bal = Number((s.settings && s.settings.openingBalance) || 0) || 0; } catch (e) {}
    var rates = 0;
    try {
      rates = Number((s.settings && s.settings.dayRate) || 0) + Number((s.settings && s.settings.nightRate) || 0);
    } catch (e) {}
    var shifts = s.shiftsOverride && Object.keys(s.shiftsOverride).length;
    var plans = s.dayPlans && Object.keys(s.dayPlans).length;
    if (emptyCols && !bal && !rates && !shifts && !plans) {
      try {
        var st = s.settings || {};
        if (st.userName) return false;
        if (Number(st.paydayDay)) return false;
        var bs = st.budgetSavings, liveSav = false;
        if (bs && typeof bs === 'object') {
          for (var k in bs) { if (Object.prototype.hasOwnProperty.call(bs, k) && Number(bs[k])) { liveSav = true; break; } }
        }
        var bl = st.budgetLimits, liveLim = false;
        if (bl && typeof bl === 'object') {
          for (var k2 in bl) { if (Object.prototype.hasOwnProperty.call(bl, k2) && Number(bl[k2])) { liveLim = true; break; } }
        }
        if (liveSav || liveLim) return false;
        if (Array.isArray(st.periodReports) && st.periodReports.length) return false;
      } catch (e) {}
      return true;
    }
    return false;
  }
  function countItems(s) {
    if (!s) return 0;
    var n = 0;
    collections().forEach(function (k) { if (Array.isArray(s[k])) n += s[k].length; });
    return n;
  }
  function countAlive(s) {
    if (!s) return 0;
    var n = 0;
    collections().forEach(function (k) {
      (s[k] || []).forEach(function (x) { if (x && !x.deleted) n++; });
    });
    return n;
  }
  function readMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeMeta(m) {
    try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {}
  }
  function readMeal() {
    try {
      var r = localStorage.getItem(MEAL_KEY);
      if (!r) return null;
      var o = JSON.parse(r);
      return o && typeof o === 'object' ? o : null;
    } catch (e) { return null; }
  }
  function writeMeal(meal) {
    if (!meal || typeof meal !== 'object') return;
    try { localStorage.setItem(MEAL_KEY, JSON.stringify(meal)); } catch (e) {}
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
      state: stateObj,
      meal: readMeal()
    };
  }
  function envelopeJson(stateObj, kind) {
    return JSON.stringify(buildEnvelope(stateObj, kind), null, 2);
  }
  /** Parse a backup without touching the live meal plan. Import UI must confirm first. */
  function inspectBackup(raw) {
    if (!raw) return null;
    var obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== 'object') return null;
    if (obj.format === 'finna-backup-v2' && obj.state && typeof obj.state === 'object') {
      return {
        state: obj.state,
        meal: obj.meal && typeof obj.meal === 'object' ? obj.meal : null,
        savedAt: obj.savedAt || null,
        itemCount: obj.itemCount != null ? obj.itemCount : countItems(obj.state)
      };
    }
    if (obj.state && typeof obj.state === 'object' && (obj.savedAt || obj.itemCount != null)) {
      return {
        state: obj.state,
        meal: obj.meal && typeof obj.meal === 'object' ? obj.meal : null,
        savedAt: obj.savedAt || null,
        itemCount: obj.itemCount != null ? obj.itemCount : countItems(obj.state)
      };
    }
    if (obj.settings || obj.income || obj.expenses || obj.debts) {
      return { state: obj, meal: null, savedAt: obj.updatedAt || null, itemCount: countItems(obj) };
    }
    return null;
  }
  function parseBackupPayload(raw) {
    var env = inspectBackup(raw);
    return env ? env.state : null;
  }
  function applyMeal(meal) {
    if (meal) writeMeal(meal);
  }
  function rotateWrite(stateObj) {
    var payload = JSON.stringify({
      savedAt: new Date().toISOString(),
      itemCount: countItems(stateObj),
      state: stateObj,
      meal: readMeal()
    });
    function writeSlots() {
      for (var i = SLOT_COUNT - 1; i >= 1; i--) {
        var prev = localStorage.getItem(SLOT_PREFIX + (i - 1));
        if (prev) localStorage.setItem(SLOT_PREFIX + i, prev);
      }
      localStorage.setItem(SLOT_PREFIX + '0', payload);
    }
    try {
      writeSlots();
    } catch (e) {
      try {
        localStorage.removeItem(SLOT_PREFIX + (SLOT_COUNT - 1));
        localStorage.removeItem(SLOT_PREFIX + (SLOT_COUNT - 2));
        writeSlots();
      } catch (e2) {
        try {
          localStorage.setItem(SLOT_PREFIX + '0', payload);
        } catch (e3) {}
      }
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
            aliveCount: countAlive(parsed.state),
            state: parsed.state,
            meal: parsed.meal || null
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
      var aa = a.aliveCount != null ? a.aliveCount : countAlive(a.state);
      var bb = b.aliveCount != null ? b.aliveCount : countAlive(b.state);
      if (bb !== aa) return bb - aa;
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
    try {
      if (global.FinBridge && typeof global.FinBridge.ensureBackupFolder === 'function') {
        if (!onSave._folderOk) {
          global.FinBridge.ensureBackupFolder();
          onSave._folderOk = true;
        }
      }
    } catch (e) {}
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
  function readNativeBackup(filename) {
    try {
      if (!global.FinBridge || typeof global.FinBridge.readBackupFile !== 'function') return null;
      var raw = global.FinBridge.readBackupFile(filename);
      if (!raw || raw.length < 8) return null;
      var env = inspectBackup(raw);
      if (env && env.state && !isEmptyState(env.state)) {
        return { state: env.state, meal: env.meal || null, savedAt: env.savedAt || null, itemCount: env.itemCount };
      }
    } catch (e) {}
    return null;
  }
  function restoreFromEmergencyFolder() {
    // 1) latest
    var latest = readNativeBackup(LAST_JSON_NAME);
    if (latest && latest.state) {
      if (latest.meal) writeMeal(latest.meal);
      return latest.state;
    }
    // 2) pick best from listed files by alive count / date in name
    try {
      if (!global.FinBridge || typeof global.FinBridge.listBackupFiles !== 'function') return null;
      var list = JSON.parse(global.FinBridge.listBackupFiles() || '[]');
      if (!Array.isArray(list) || !list.length) return null;
      var names = list.map(function (x) { return x && x.name; }).filter(Boolean);
      var order = names.slice().sort(function (a, b) {
        var sa = a === LAST_JSON_NAME ? 0 : /^finna-day-/.test(a) ? 1 : /^finna-month-/.test(a) ? 2 : 3;
        var sb = b === LAST_JSON_NAME ? 0 : /^finna-day-/.test(b) ? 1 : /^finna-month-/.test(b) ? 2 : 3;
        if (sa !== sb) return sa - sb;
        return String(b).localeCompare(String(a));
      });
      var bestState = null, bestMeal = null, bestCount = -1;
      for (var i = 0; i < order.length; i++) {
        var cand = readNativeBackup(order[i]);
        if (!cand || !cand.state) continue;
        var c = countAlive(cand.state);
        if (c > bestCount) { bestCount = c; bestState = cand.state; bestMeal = cand.meal || null; }
      }
      if (bestState && bestMeal) writeMeal(bestMeal);
      return bestState;
    } catch (e) {}
    return null;
  }
  function restoreBest() {
    var best = bestSlot();
    if (best && best.state) {
      if (best.meal) writeMeal(best.meal);
      return best.state;
    }
    try {
      var raw = localStorage.getItem('kopeyka3_state_v1__raw_backup');
      if (raw && raw.indexOf('FINENC1:') !== 0) {
        var env = inspectBackup(raw);
        var st = env ? env.state : JSON.parse(raw);
        if (env && env.meal) writeMeal(env.meal);
        if (st && !isEmptyState(st)) return st;
      }
    } catch (e) {}
    // После переустановки localStorage пуст — читаем Загрузки/Finna
    try {
      var fromDisk = restoreFromEmergencyFolder();
      if (fromDisk) return fromDisk;
    } catch (e) {}
    return null;
  }
  /**
   * If a local slot (or disk copy) is empty-live-recovery OR strictly newer
   * and at least as rich in ALIVE rows as the decrypted live snapshot, return it.
   * Deleted rows must not make an older slot look richer and roll cash back.
   */
  function preferOver(live) {
    var slot = bestSlot();
    var liveEmpty = !live || isEmptyState(live);
    if (slot && slot.state && !isEmptyState(slot.state)) {
      if (liveEmpty) {
        if (slot.meal) writeMeal(slot.meal);
        return slot.state;
      }
      var liveN = countAlive(live);
      var slotN = slot.aliveCount != null ? slot.aliveCount : countAlive(slot.state);
      var liveAt = Date.parse((live && live.updatedAt) || 0) || 0;
      var slotAt = Date.parse(slot.savedAt || 0) || 0;
      var newer = slotAt > liveAt + 2000 && slotN >= liveN;
      var sameWaveRicher = slotN >= liveN + 1 && slotAt >= liveAt;
      if (newer || sameWaveRicher) {
        if (slot.meal) writeMeal(slot.meal);
        return slot.state;
      }
    }
    if (liveEmpty) {
      try {
        var fromDisk = restoreFromEmergencyFolder();
        if (fromDisk && !isEmptyState(fromDisk)) return fromDisk;
      } catch (e) {}
    }
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
    restoreFromEmergencyFolder: restoreFromEmergencyFolder,
    readNativeBackup: readNativeBackup,
    status: status,
    forceSnapshot: forceSnapshot,
    forceFileBackup: forceFileBackup,
    isEmptyState: isEmptyState,
    listSlots: listSlots,
    parseBackupPayload: parseBackupPayload,
    inspectBackup: inspectBackup,
    preferOver: preferOver,
    countAlive: countAlive,
    writeMeal: writeMeal,
    buildEnvelope: buildEnvelope
  };
})(typeof window !== 'undefined' ? window : this);
