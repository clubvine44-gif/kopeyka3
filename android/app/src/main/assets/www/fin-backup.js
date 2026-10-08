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
 * 4.13.7: rotating slots are AES-GCM sealed (legacy plaintext still opens);
 * deleted rows / tombstones are not "empty" so a wipe-by-delete still snapshots.
 * 4.13.9: preferOver — newest snapshot wins even if it has fewer alive rows
 * (quota: live ciphertext stale, slot already has deletions). Meal from a slot
 * is applied only if it is not older than the live meal.
 * 4.13.11: emergency folder restore ranks by savedAt; stale finna-latest loses
 * to a newer day/month snapshot.
 * 4.13.12: rank by parsed time (ISO vs filename date — '2026-10-01' must not
 * lose to '2026-09-01T…'); native file mtime is a fallback; slots write
 * immediately then seal in place so hide/crash cannot drop the snapshot.
 * 4.13.13: hiding the app forces a slot + day file even inside the 8s/20s
 * throttle, but only when the cash actually changed (updatedAt alone must
 * not rotate slots). The day file is rewritten when cash changes, not only
 * on the first save of the calendar day.
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
  var _lastContentSig = '';
  var _exportBusy = false;
  var _encSlotCache = {};
  var _slotGen = 0;

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
      try {
        var del = s._deleted;
        if (del && typeof del === 'object') {
          var cols = collections();
          for (var ti = 0; ti < cols.length; ti++) {
            var m = del[cols[ti]];
            if (m && typeof m === 'object' && Object.keys(m).length) return false;
          }
        }
        var cols2 = collections();
        for (var di = 0; di < cols2.length; di++) {
          var arr = s[cols2[di]];
          if (Array.isArray(arr) && arr.some(function (x) { return x && x.deleted; })) return false;
        }
      } catch (e2) {}
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
  function applyMealIfNewer(meal) {
    if (!meal || typeof meal !== 'object') return;
    var cur = readMeal();
    if (!cur) { writeMeal(meal); return; }
    var ct = Date.parse(cur.savedAt || 0) || 0;
    var nt = Date.parse(meal.savedAt || 0) || 0;
    if (!ct || nt >= ct) writeMeal(meal);
  }
  function todayStr() {
    var d = new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function monthStr() { return todayStr().slice(0, 7); }

  /**
   * Comparable snapshot time in ms.
   * ISO savedAt wins. Filename dates like 2026-10-01 must beat older ISO
   * (string compare used to rank '2026-10-01' BELOW '2026-09-01T10:00:00Z').
   * Date-only is start-of-day so a same-day ISO latest still wins.
   */
  function snapTimeMs(cand, name) {
    var at = Date.parse(String((cand && cand.savedAt) || '')) || 0;
    if (at > 0) return at;
    var mod = Number(cand && cand.modified) || 0;
    if (mod > 0) return mod;
    var src = String(name || (cand && cand.name) || '');
    var dm = src.match(/(\d{4})-(\d{2})(?:-(\d{2}))?/);
    if (dm) {
      var y = Number(dm[1]), mo = Number(dm[2]), d = dm[3] ? Number(dm[3]) : 1;
      if (y >= 2000 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return Date.UTC(y, mo - 1, d, 0, 0, 0);
      }
    }
    return 0;
  }
  function envelopeTime(cand, name) {
    var ms = snapTimeMs(cand, name);
    if (ms > 0) return new Date(ms).toISOString();
    return String((cand && cand.savedAt) || '');
  }

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
  function parseSlotObject(raw) {
    if (!raw) return null;
    if (String(raw).indexOf('FINENC1:') === 0) {
      return _encSlotCache[raw] || null;
    }
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) { return null; }
  }
  function writeSlotString(payload) {
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
  function rotateWrite(stateObj) {
    var env = {
      savedAt: new Date().toISOString(),
      itemCount: countItems(stateObj),
      aliveCount: countAlive(stateObj),
      state: stateObj,
      meal: readMeal()
    };
    var json = JSON.stringify(env);
    var gen = ++_slotGen;
    // Immediate write so pagehide/crash cannot drop this snapshot while AES-GCM
    // is still in flight. Seal then replaces slot 0 in place (no second rotate).
    writeSlotString(json);
    function persistSealed(raw) {
      if (gen !== _slotGen) return; // newer snapshot is already sealing
      if (raw && String(raw).indexOf('FINENC1:') === 0) {
        _encSlotCache[raw] = env;
        try { localStorage.setItem(SLOT_PREFIX + '0', raw); } catch (e) {}
      }
    }
    try {
      if (global.FinSecureStore && typeof global.FinSecureStore.seal === 'function') {
        global.FinSecureStore.seal(json).then(function (enc) {
          if (enc && String(enc).indexOf('FINENC1:') === 0) persistSealed(enc);
        }).catch(function () {});
      }
    } catch (e) {}
  }
  function hydrateSlots() {
    var tasks = [];
    try {
      var SS = global.FinSecureStore;
      if (!SS || typeof SS.open !== 'function') return Promise.resolve();
      for (var i = 0; i < SLOT_COUNT; i++) {
        (function (raw) {
          if (!raw || String(raw).indexOf('FINENC1:') !== 0) return;
          if (_encSlotCache[raw]) return;
          tasks.push(SS.open(raw).then(function (text) {
            if (!text) return;
            try {
              var o = JSON.parse(text);
              if (o && typeof o === 'object') _encSlotCache[raw] = o;
            } catch (e) {}
          }).catch(function () {}));
        })(localStorage.getItem(SLOT_PREFIX + i));
      }
    } catch (e2) {}
    return tasks.length ? Promise.all(tasks) : Promise.resolve();
  }
  function listSlots() {
    var out = [];
    for (var i = 0; i < SLOT_COUNT; i++) {
      try {
        var raw = localStorage.getItem(SLOT_PREFIX + i);
        if (!raw) continue;
        var parsed = parseSlotObject(raw);
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
    // Newest snapshot wins. Ranking by alive-count resurrected deleted ops
    // from an older richer slot when live decrypt failed or was empty.
    slots.sort(function (a, b) {
      var ta = snapTimeMs(a);
      var tb = snapTimeMs(b);
      if (tb !== ta) return tb - ta;
      var aa = a.aliveCount != null ? a.aliveCount : countAlive(a.state);
      var bb = b.aliveCount != null ? b.aliveCount : countAlive(b.state);
      if (bb !== aa) return bb - aa;
      return (b.itemCount || 0) - (a.itemCount || 0);
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
  function contentSig(stateObj) {
    try {
      var clone = JSON.parse(JSON.stringify(stateObj));
      if (clone && typeof clone === 'object') delete clone.updatedAt;
      return JSON.stringify(clone);
    } catch (e) {
      return '';
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
    var force = false;
    try { force = !!global.__FIN_FORCE_BACKUP; } catch (eF) {}
    var now = Date.now();
    var meta = readMeta();
    var items = countItems(stateObj);
    var sig = contentSig(stateObj);
    var changed = !!(sig && sig !== _lastContentSig);
    // Hide/crash: write the slot even inside the 8s throttle, but skip if
    // only updatedAt moved — otherwise every app switch rotates history away.
    if (changed && (force || now - _lastSnapAt >= MIN_SNAP_MS)) {
      _lastSnapAt = now;
      _lastContentSig = sig;
      rotateWrite(stateObj);
      meta.lastSnapAt = new Date().toISOString();
      meta.lastItemCount = items;
    }
    // refresh day file when cash changed (not only the first save of the day)
    if (changed && (force || now - _lastLatestFileAt >= MIN_LATEST_FILE_MS)) {
      _lastLatestFileAt = now;
      exportEnvelope(stateObj, LAST_JSON_NAME, 'latest');
      meta.lastLatestAt = new Date().toISOString();
      var day = todayStr();
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
  /**
   * Newest snapshot wins. A stale finna-latest.json must not beat a newer
   * day/month file — latest writes can fail while daily still succeeds.
   * Compare parsed times, not raw strings (ISO vs filename date).
   * On equal timestamps prefer the dedicated latest name.
   */
  function pickNewestEmergency(cands) {
    var best = null, bestTs = -1;
    (cands || []).forEach(function (cand) {
      if (!cand || !cand.state) return;
      var name = String(cand.name || '');
      var ts = snapTimeMs(cand, name);
      var isLatest = name === LAST_JSON_NAME;
      if (!best) {
        best = { state: cand.state, meal: cand.meal || null, savedAt: cand.savedAt || '', name: name };
        bestTs = ts;
        return;
      }
      if (ts > bestTs) {
        best = { state: cand.state, meal: cand.meal || null, savedAt: cand.savedAt || '', name: name };
        bestTs = ts;
        return;
      }
      if (ts === bestTs && isLatest && best.name !== LAST_JSON_NAME) {
        best = { state: cand.state, meal: cand.meal || null, savedAt: cand.savedAt || '', name: name };
      }
    });
    return best;
  }
  function restoreFromEmergencyFolder() {
    var cands = [];
    try {
      if (global.FinBridge && typeof global.FinBridge.listBackupFiles === 'function') {
        var list = JSON.parse(global.FinBridge.listBackupFiles() || '[]');
        if (Array.isArray(list)) {
          list.forEach(function (x) {
            var name = x && x.name;
            if (!name) return;
            var cand = readNativeBackup(name);
            if (cand && cand.state) {
              cand.name = name;
              if (x.modified) cand.modified = x.modified;
              cands.push(cand);
            }
          });
        }
      }
    } catch (e) {}
    if (!cands.some(function (c) { return c && c.name === LAST_JSON_NAME; })) {
      try {
        var latest = readNativeBackup(LAST_JSON_NAME);
        if (latest && latest.state) {
          latest.name = LAST_JSON_NAME;
          cands.push(latest);
        }
      } catch (e2) {}
    }
    var best = pickNewestEmergency(cands);
    if (best && best.state) {
      if (best.meal) applyMealIfNewer(best.meal);
      return best.state;
    }
    return null;
  }
  function restoreBest() {
    var best = bestSlot();
    if (best && best.state) {
      if (best.meal) applyMealIfNewer(best.meal);
      return best.state;
    }
    try {
      var raw = localStorage.getItem('kopeyka3_state_v1__raw_backup');
      if (raw && raw.indexOf('FINENC1:') !== 0) {
        var env = inspectBackup(raw);
        var st = env ? env.state : JSON.parse(raw);
        if (st && !isEmptyState(st)) {
          if (env && env.meal) applyMealIfNewer(env.meal);
          return st;
        }
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
   * than live, return it. Alive-count must NOT block a newer snapshot:
   * deleting ops after a failed live write used to lose to the stale richer
   * ciphertext. An older slot never replaces live.
   */
  function preferOver(live) {
    var slot = bestSlot();
    var liveEmpty = !live || isEmptyState(live);
    if (slot && slot.state && !isEmptyState(slot.state)) {
      var liveAt = Date.parse((live && live.updatedAt) || 0) || 0;
      var slotAt = snapTimeMs(slot) || Date.parse(slot.savedAt || 0) || 0;
      var take = liveEmpty || slotAt > liveAt + 2000;
      if (take) {
        if (slot.meal) applyMealIfNewer(slot.meal);
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
    hydrateSlots: hydrateSlots,
    countAlive: countAlive,
    bestSlot: bestSlot,
    pickNewestEmergency: pickNewestEmergency,
    snapTimeMs: snapTimeMs,
    applyMealIfNewer: applyMealIfNewer,
    readMeal: readMeal,
    writeMeal: writeMeal,
    buildEnvelope: buildEnvelope
  };
})(typeof window !== 'undefined' ? window : this);
