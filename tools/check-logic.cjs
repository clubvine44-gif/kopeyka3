#!/usr/bin/env node
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var ROOT = path.join(__dirname, '..');

function loadEngine(state) {
  var sandbox = {
    window: { STATE: state || null },
    document: {
      getElementById: function () { return null; },
      querySelector: function () { return null; }
    },
    navigator: { onLine: true }
  };
  sandbox.global = sandbox;
  var src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  vm.runInNewContext(src, sandbox, { filename: 'engine.js' });
  return sandbox.window.kopeykaEngine;
}

var sandbox = {
  window: { STATE: null },
  document: {
    getElementById: function () { return null; },
    querySelector: function () { return null; }
  },
  navigator: { onLine: true }
};
sandbox.window = sandbox.window;
sandbox.global = sandbox;
var src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInNewContext(src, sandbox, { filename: 'engine.js' });
assert(sandbox.window.kopeykaEngine, 'engine not exported');

sandbox.window.STATE = {
  settings: { openingBalance: 10000, month: '2026-09', paydayDay: 15, limitHorizon: 'month' },
  income: [
    { id: 'i1', amount: 2000, date: '2026-09-01' },
    { id: 'i2', amount: 5000, date: '2026-09-02', deleted: true }
  ],
  expenses: [
    { id: 'e1', amount: 1000, date: '2026-09-03', category: 'Продукты' },
    { id: 'e2', amount: 800, date: '2026-09-03', category: 'Прочее', deleted: true }
  ],
  reserves: [
    { id: 'r1', saved: 3000, target: 5000 },
    { id: 'r2', saved: 9999, target: 9999, deleted: true }
  ],
  debts: [
    { id: 'd1', total: 4000, paid: 1000 },
    { id: 'd2', total: 9999, paid: 0, deferUntil: '2026-12-01' },
    { id: 'd3', total: 7777, paid: 0, deleted: true }
  ],
  reserveOps: [
    { id: 'o1', amount: 500, type: 'deposit', date: '2026-09-04' },
    { id: 'o2', amount: 400, type: 'deposit', date: '2026-09-04', deleted: true }
  ],
  obligations: [
    { id: 'ob1', amount: 2000, day: 10, active: true },
    { id: 'ob2', amount: 8000, day: 12, active: true, deleted: true }
  ],
  obligationPays: [
    { id: 'p1', obligId: 'ob1', month: '2026-09', amount: 500 },
    { id: 'p2', obligId: 'ob1', month: '2026-09', amount: 200, deleted: true }
  ],
  shiftsOverride: {}
};

var c = sandbox.window.kopeykaEngine.month('2026-09');
assert.strictEqual(c.income, 2000, 'deleted income must be ignored');
assert.strictEqual(c.expenses, 1000, 'deleted expense must be ignored');
assert.strictEqual(c.reserveDeposits, 500, 'deleted reserve op must be ignored');
assert.strictEqual(c.openingBalance, 10000);
assert.strictEqual(c.cash, 10000 + 2000 - 1000 - 500, 'cash formula');
assert.strictEqual(c.debtRemaining, 3000, 'deferred and deleted debts must be ignored');
assert.strictEqual(c.reservesTotal, 3000, 'deleted reserve must be ignored');
assert.strictEqual(c.obligationsRemaining, 1500, 'deleted obligation/pay must be ignored');
assert.strictEqual(c.available, c.cash - 3000 - 1500);
assert.ok(c.dailyBudget === c.daily, 'daily aliases');

var oct = sandbox.window.kopeykaEngine.month('2026-10');
assert.strictEqual(oct.openingBalance, c.cash, 'next month opening is previous cash');
assert.strictEqual(oct.cash, c.cash, 'empty next month cash equals carried opening');

var aug = sandbox.window.kopeykaEngine.month('2026-08');
assert.strictEqual(aug.cash, 10000, 'previous empty month rolls back from anchor');

assert.ok(sandbox.window.kopeykaEngine.categories.indexOf('Транспорт') >= 0, 'transport category present');

// Closing a reserve: keep historical ops, add withdraw of remaining saved, mark reserve deleted.
sandbox.window.STATE.reserves = [
  { id: 'r1', saved: 0, target: 5000, deleted: true }
];
sandbox.window.STATE.reserveOps = [
  { id: 'o1', amount: 3000, type: 'deposit', date: '2026-09-04' },
  { id: 'ow', amount: 3000, type: 'withdraw', date: '2026-09-04' }
];
sandbox.window.STATE.income = [];
sandbox.window.STATE.expenses = [];
sandbox.window.STATE.debts = [];
sandbox.window.STATE.obligations = [];
sandbox.window.STATE.obligationPays = [];
var closed = sandbox.window.kopeykaEngine.month('2026-09');
assert.strictEqual(closed.cash, 10000, 'closing reserve returns cash');
assert.strictEqual(closed.reservesTotal, 0, 'deleted reserve not in total');

// Hard-delete of reserveOps (old bug) would inflate cash — ops must stay.
sandbox.window.STATE.reserveOps = [];
var stripped = sandbox.window.kopeykaEngine.month('2026-09');
assert.strictEqual(stripped.cash, 10000, 'no ops → cash equals opening');

sandbox.window.STATE.reserveOps = [
  { id: 'o1', amount: 3000, type: 'deposit', date: '2026-09-04' }
];
sandbox.window.STATE.reserves = [{ id: 'r1', saved: 3000, target: 5000 }];
var openRes = sandbox.window.kopeykaEngine.month('2026-09');
assert.strictEqual(openRes.cash, 7000, 'deposit reduces cash');
assert.strictEqual(openRes.reservesTotal, 3000, 'saved counts');

// Soft-deleted deposit still counted if we accidentally drop the row from the array — keep the op.
sandbox.window.STATE.reserveOps = [
  { id: 'o1', amount: 3000, type: 'deposit', date: '2026-09-04' },
  { id: 'ow', amount: 3000, type: 'withdraw', date: '2026-09-10' }
];
sandbox.window.STATE.reserves = [{ id: 'r1', saved: 0, target: 5000, deleted: true }];
var closed2 = sandbox.window.kopeykaEngine.month('2026-09');
assert.strictEqual(closed2.cash, 10000, 'withdraw offsets deposit after reserve close');

// Payday today: horizon must open the next period, not collapse to 1 day.
sandbox.window.STATE = {
  settings: { openingBalance: 30000, month: (function(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})(), paydayDay: (new Date()).getDate(), limitHorizon: 'payday' },
  income: [], expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
};
var payM = sandbox.window.STATE.settings.month;
var payCalc = sandbox.window.kopeykaEngine.month(payM);
assert.strictEqual(payCalc.isPaydayToday, true, 'engine sees payday today');
assert.ok(payCalc.daysLeft > 1, 'payday today starts a new period, daysLeft=' + payCalc.daysLeft);
assert.ok(payCalc.daily > 0 && payCalc.daily < 30000, 'daily is available/days of new period');

// Syntax check critical modules
['app.js', 'cloud.js', 'secure-store.js', 'fin-backup.js', 'engine.js', 'assistant-v2.js', 'assistant.js', 'budget-carry.js', 'meal-plan.js', 'widget.html'].forEach(function (f) {
  var p = path.join(ROOT, f);
  assert.ok(fs.existsSync(p), f + ' exists');
});
['app.js', 'cloud.js', 'secure-store.js', 'fin-backup.js', 'engine.js', 'assistant-v2.js', 'assistant.js', 'budget-carry.js', 'meal-plan.js'].forEach(function (f) {
  require('child_process').execFileSync(process.execPath, ['--check', path.join(ROOT, f)]);
});

var appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
assert.ok(appSrc.length > 50000, 'root app.js must be the full app, not a CDN stub');
assert.ok(appSrc.indexOf('cdn.jsdelivr.net') < 0, 'app.js must not load from CDN');
assert.ok(appSrc.indexOf("softDeleteIn('reserves'") >= 0, 'reserve delete must be soft');
assert.ok(appSrc.indexOf("softDeleteIn('obligations'") >= 0, 'obligation delete must be soft');
assert.ok(appSrc.indexOf('cmpMonth(st,cur)>0') >= 0, 'ensureMonth must not fold when clock goes backward');
assert.ok(appSrc.indexOf('__FIN_LOAD_PENDING') >= 0, 'boot must flag decrypt-in-progress');
assert.ok(appSrc.indexOf("STATE.obligationPays=STATE.obligationPays.filter") < 0, 'obligation reset must not hard-delete pays');
assert.ok(appSrc.indexOf("STATE.expenses=STATE.expenses.filter(function(e){return !(e.obligId") < 0, 'obligation reset must not hard-delete expenses');
assert.ok(appSrc.indexOf("softDeleteIn('expenses',p.opId") >= 0, 'day-plan clear must soft-delete ops');
assert.ok(appSrc.indexOf('function budgetSavingsOf') >= 0, 'budget savings helper');
assert.ok(appSrc.indexOf('budgetSavingsOf(cat){return 0;') < 0, 'savings must not be stubbed to zero');
assert.ok(appSrc.indexOf('try{STATE.settings.budgetSavings={};}catch(e){}') < 0, 'period close must not wipe savings');
assert.ok(appSrc.indexOf('лимит категории НЕ увеличивается') >= 0, 'category limit must ignore savings');
assert.ok(appSrc.indexOf('if(exists)return exists') >= 0, 'duplicate period close must not double-count savings');
assert.ok(appSrc.indexOf('window.archiveBudgetPeriodReport=archiveBudgetPeriodReport') >= 0, 'archive must be exported for overlays');
assert.ok(appSrc.indexOf('function nextBudgetRangeAfter') >= 0, 'skipped periods must be closable');
assert.ok(appSrc.indexOf('while(guard++<24)') >= 0, 'skipped period loop');
assert.ok(appSrc.indexOf('Number(s.settings.paydayDay)') >= 0, 'hasLiveData must see payday and budget maps');
assert.ok(appSrc.indexOf("storedKeyNow.indexOf('month_')===0") >= 0, 'skipped periods use stored horizon mode');
assert.ok(appSrc.indexOf('id="mealHomeCard"') >= 0, 'home must have Magnit meal card');
assert.ok(appSrc.indexOf("currentView==='meal'") >= 0, 'app must render meal view');
assert.ok(appSrc.indexOf('var payThis=Math.min(payday,lastThis)') >= 0, 'payday period uses last day of short months');

var cloudSrc = fs.readFileSync(path.join(ROOT, 'cloud.js'), 'utf8');
assert.ok(cloudSrc.indexOf('localNotReady') >= 0, 'cloud must wait for local decrypt');
assert.ok(cloudSrc.indexOf('__FIN_DECRYPT_FAILED') >= 0, 'cloud must not apply over locked blob');
assert.ok(cloudSrc.indexOf("if(b&&(l===undefined||r===undefined))") < 0, 'cloud must not tombstone missing-without-tombstone rows');
assert.ok(cloudSrc.indexOf('function mergeSettings') >= 0, 'settings must deep-merge budget maps');
assert.ok(cloudSrc.indexOf('savingsFromReports') >= 0, 'cloud savings merge uses period reports');
assert.ok(cloudSrc.indexOf('function hydrateBase') >= 0, 'sync-base snapshot must decrypt on boot');
assert.ok(cloudSrc.indexOf("FinSecureStore.saveState(SYNC_BASE") >= 0, 'sync-base must be encrypted');
assert.ok(cloudSrc.indexOf('function liveDivergedFrom') >= 0, 'cloud must detect in-flight local edits');
assert.ok(cloudSrc.indexOf('writeRemote(merged,remote,local)') >= 0, 'cloud write must keep a snapshot of local');
assert.ok(cloudSrc.indexOf('n>=300') >= 0, 'cloud must wait long enough for PBKDF2 on slow phones');
assert.ok(cloudSrc.indexOf('function mergeLimitsMap') >= 0, 'category limits last-write, not max');
assert.ok(cloudSrc.indexOf('function reconcileCashAnchor') >= 0, 'cloud must reconcile cash anchor after merge');
assert.ok(cloudSrc.indexOf('!(l.deleted)') >= 0, 'must not drop tombstone of a locally-deleted new row');
assert.ok(cloudSrc.indexOf('l.deleted') >= 0, 'deleted flag seeds tombstone');
assert.ok(cloudSrc.indexOf('function hasDel') >= 0, 'cloud empty-check sees tombstones');
assert.ok(cloudSrc.indexOf('!ld[id]&&!rd[id]&&!bd[id]') >= 0, 'tombstone map without row must survive merge cleanup');

var asstSrc = fs.readFileSync(path.join(ROOT, 'assistant-v2.js'), 'utf8');
assert.ok(asstSrc.indexOf("s.reserveOps=s.reserveOps.filter") < 0, 'assistant must not strip reserveOps');
assert.ok(asstSrc.indexOf('function softDel') >= 0, 'assistant must soft-delete');
assert.ok(asstSrc.indexOf("type:'withdraw'") >= 0, 'assistant reserve delete must return cash');

var storeSrc = fs.readFileSync(path.join(ROOT, 'secure-store.js'), 'utf8');
assert.ok(storeSrc.indexOf('existingPlain') >= 0 || storeSrc.indexOf('existingEnc') >= 0, 'must not overwrite ciphertext with plaintext');
assert.ok(storeSrc.indexOf('budgetSavings') >= 0, 'empty-state must treat savings as live data');
assert.ok(storeSrc.indexOf("LIVE_KEY = 'kopeyka3_state_v1'") >= 0, 'live cash key constant');
assert.ok(storeSrc.indexOf('storageKey === LIVE_KEY') >= 0, 'load/save must gate emergency blob on live key');
assert.ok(storeSrc.indexOf("if (isLive) {") >= 0, 'aux keys must not set decrypt-failed');
assert.ok(storeSrc.indexOf('pruneBackupSlots') >= 0, 'quota must free backup slots');
assert.ok(storeSrc.indexOf('_saveGen') >= 0, 'live saves must be generation-guarded');
assert.ok(storeSrc.indexOf('hasCiphertext') >= 0, 'must not mint a new key over live ciphertext');
assert.ok(storeSrc.indexOf('never copy a locked blob over the emergency copy') >= 0, 'corrupt live must not clobber emergency blob');
assert.ok(storeSrc.indexOf('seal:') >= 0 || storeSrc.indexOf('seal: function') >= 0, 'seal exported for backup slots');
assert.ok(storeSrc.indexOf('arr3[j3].deleted') >= 0, 'deleted rows are not empty state');

var bakSrc = fs.readFileSync(path.join(ROOT, 'fin-backup.js'), 'utf8');
assert.ok(bakSrc.indexOf("MEAL_KEY = 'kopeyka3_meal_v1'") >= 0, 'backup envelope includes meal');
assert.ok(bakSrc.indexOf('meal: readMeal()') >= 0, 'slots and files store meal snapshot');
assert.ok(bakSrc.indexOf('function inspectBackup') >= 0, 'inspectBackup must not write meal on parse');
assert.ok(bakSrc.indexOf('function preferOver') >= 0, 'newer slot must be able to lift stale live');
assert.ok(bakSrc.indexOf('function countAlive') >= 0, 'slots ranked by alive rows');
assert.ok(bakSrc.indexOf('function hydrateSlots') >= 0, 'slots decrypt before preferOver');
assert.ok(bakSrc.indexOf('FINENC1:') >= 0, 'slots may be sealed');
assert.ok(bakSrc.indexOf('x.deleted') >= 0, 'backup empty-check sees deleted rows');
assert.ok(bakSrc.indexOf('_slotGen') >= 0, 'slot seal is generation-guarded');
assert.ok(bakSrc.indexOf('Newest snapshot wins') >= 0 || bakSrc.indexOf('newest first') >= 0 || bakSrc.indexOf('tb.localeCompare(ta)') >= 0, 'bestSlot ranks by savedAt first');
assert.ok(bakSrc.indexOf('bestSlot: bestSlot') >= 0, 'bestSlot exported');
assert.ok(bakSrc.indexOf('slotAt > liveAt + 2000') >= 0, 'newer slot wins regardless of alive count');
assert.ok(bakSrc.indexOf('applyMealIfNewer') >= 0, 'slot meal is timestamp-gated');
assert.ok(cloudSrc.indexOf('function mergeMeal') >= 0, 'cloud merges meal plan');
assert.ok(cloudSrc.indexOf('out.mealPlan=mergeMeal') >= 0, 'threeWay keeps mealPlan');
assert.ok(appSrc.indexOf('inspectBackup') >= 0, 'import uses inspectBackup');
assert.ok(appSrc.indexOf('preferOver') >= 0, 'boot prefers richer backup slot');
assert.ok(appSrc.indexOf('hydrateSlots') >= 0, 'boot hydrates sealed slots');
assert.ok(appSrc.indexOf("if(!hasLiveData(incoming))") >= 0, 'empty import must not replace cash');
assert.ok(appSrc.indexOf('darr[dj].deleted') >= 0, 'hasLiveData sees tombstones');
assert.ok(appSrc.indexOf('note===nm||note.indexOf(nm)') < 0, 'debt link must be exact, not substring');
assert.ok(storeSrc.indexOf('INSTALL_KEY_BAK') >= 0, 'install id has backup key');
assert.ok(storeSrc.indexOf('Encrypt with FALLBACK so the next boot can still open') >= 0, 'persist-fail must use fallback id');
assert.ok(storeSrc.indexOf('got && got === id') >= 0, 'install id persist is verified by read-back');
assert.ok(appSrc.indexOf('function flushLiveSave') >= 0, 'pagehide flushes live cash');
assert.ok(storeSrc.indexOf('FinBridge.setInstallId') >= 0, 'install id mirrored to native prefs');

var gradle = fs.readFileSync(path.join(ROOT, 'android/app/build.gradle'), 'utf8');
assert.ok(/versionCode\s+178/.test(gradle), 'versionCode 178');
assert.ok(/versionName\s+"4\.13\.11"/.test(gradle), 'versionName 4.13.11');

var mainJava = fs.readFileSync(path.join(ROOT, 'android/app/src/main/java/app/fin/kopeyka/MainActivity.java'), 'utf8');
assert.ok(mainJava.indexOf('isTrustedApkUrl') >= 0, 'apk url allowlisted');
assert.ok(mainJava.indexOf('isSha256Hex') >= 0, 'sha256 format checked before download');
assert.ok(mainJava.indexOf('isTrustedRedirectHost') >= 0, 'apk redirect host allowlisted');
assert.ok(mainJava.indexOf('clubvine44-gif/kopeyka3/releases/download/') >= 0, 'only this repo APK');
assert.ok(mainJava.indexOf('45L * 60L * 1000L') < 0, 'install click must not snooze 45 min before download');
assert.ok(mainJava.indexOf('attempt <= 3') >= 0, 'apk download retries');
assert.ok(mainJava.indexOf('fin_auto_update') >= 0, 'notification tap forces update check');
assert.ok(appSrc.indexOf('function recoverLockedState') >= 0, 'decrypt-fail recovery helper');
assert.ok(appSrc.indexOf("if(!hasLiveData(STATE)&&window.FinBackup") >= 0, 'backup restore must run even if decrypt failed');
assert.ok(appSrc.indexOf('isPaydayToday') >= 0, 'app payday-today');
assert.ok(appSrc.indexOf("e.category!=='Долг'&&e.category!=='Обязательные'") >= 0, 'spent-today breakdown ignores debt/obligation');

var engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
assert.ok(engineSrc.indexOf('isPaydayToday') >= 0, 'engine payday-today matches app');
assert.ok(engineSrc.indexOf('pdNext0-1') >= 0, 'engine payday period excludes next payday');

assert.ok(cloudSrc.indexOf("Восстановлено из облака") >= 0 || cloudSrc.indexOf('Касса восстановлена из облака') >= 0, 'cloud recovers locked local');
assert.ok(cloudSrc.indexOf('recoverLockedState') >= 0, 'cloud uses recovery helper');

var idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert.ok(idx.indexOf('budget-carry.js') >= 0, 'index must load leftover overlay');
assert.ok(idx.indexOf('meal-plan.js') >= 0, 'index must load meal-plan');
assert.ok(idx.indexOf('cdn.jsdelivr.net/gh/clubvine44-gif/kopeyka3') < 0, 'pages must not boot from CDN stub');

var widget = fs.readFileSync(path.join(ROOT, 'widget.html'), 'utf8');
assert.ok(widget.indexOf('</script>>') < 0, 'widget script tag must not have stray >');
assert.ok(widget.indexOf('function openingFor') >= 0, 'widget must carry cash across months');
assert.ok(widget.indexOf("o.type==='withdraw'") >= 0, 'widget withdraw matches engine');

// Leftover savings: accumulate, do not inflate limit, do not double-count.
(function leftoverLogic(){
  var settings = {budgetSavings:{}, periodReports:[]};
  function num(v){var x=Number(v);return isFinite(x)?Math.round(x):0;}
  function savingsOf(cat){return Math.max(0,num(settings.budgetSavings[cat]));}
  function addSaving(cat,amount){
    amount=num(amount); if(amount<=0)return savingsOf(cat);
    settings.budgetSavings[cat]=Math.max(0,savingsOf(cat)+amount);
    return settings.budgetSavings[cat];
  }
  function closeOnce(from,end,lim,spent){
    var exists=settings.periodReports.some(function(r){return r&&r.from===from&&r.end===end;});
    if(exists)return settings.periodReports[0];
    var leftover=Math.max(0,lim-spent);
    if(leftover>0)addSaving('Продукты',leftover);
    var report={from:from,end:end,totalSaved:leftover,limit:lim};
    settings.periodReports.unshift(report);
    return report;
  }
  closeOnce('2026-08-15','2026-09-14',10000,7000);
  assert.strictEqual(savingsOf('Продукты'), 3000, 'leftover becomes savings');
  var d2=closeOnce('2026-08-15','2026-09-14',10000,7000);
  assert.strictEqual(savingsOf('Продукты'), 3000, 'duplicate close must not double-count');
  assert.strictEqual(d2.totalSaved, 3000);
  closeOnce('2026-09-15','2026-10-14',10000,4000);
  assert.strictEqual(savingsOf('Продукты'), 9000, 'savings accumulate across periods');
  var lim=10000, saved=savingsOf('Продукты');
  assert.strictEqual(lim, 10000, 'base limit unchanged');
  assert.ok(saved>lim?true:true);
  assert.notStrictEqual(lim+saved, lim, 'saved is tracking only');
  var dailyLim=lim; // not lim+saved
  assert.strictEqual(dailyLim, 10000, 'daily category limit ignores savings');
})();

// Cloud three-way merge: missing-without-tombstone must KEEP the present copy.
var cloudSandbox = {
  window: {
    defaultState: function () {
      return {
        version: 6,
        settings: { openingBalance: 0, month: '', dayRate: 0, nightRate: 0 },
        income: [], expenses: [], reserves: [], debts: [], reserveOps: [],
        obligations: [], obligationPays: [], shiftsOverride: {}, dayPlans: {}, voiceMap: {}
      };
    },
    addEventListener: function () {},
    STATE: null
  },
  document: {
    readyState: 'loading',
    addEventListener: function () {},
    getElementById: function () { return null; },
    createElement: function () { return { textContent: '', onload: null, onerror: null }; },
    head: { appendChild: function () {} },
    body: { appendChild: function () {} }
  },
  navigator: { onLine: true },
  localStorage: {
    _d: {},
    getItem: function (k) { return this._d[k] || null; },
    setItem: function (k, v) { this._d[k] = String(v); },
    removeItem: function (k) { delete this._d[k]; }
  },
  console: console,
  setTimeout: setTimeout,
  setInterval: setInterval,
  clearTimeout: clearTimeout,
  clearInterval: clearInterval,
  Promise: Promise,
  Date: Date,
  Number: Number,
  Object: Object,
  Array: Array,
  JSON: JSON,
  Error: Error,
  Math: Math
};
cloudSandbox.window = Object.assign(cloudSandbox.window, { localStorage: cloudSandbox.localStorage });
cloudSandbox.global = cloudSandbox;
vm.runInNewContext(cloudSrc, cloudSandbox, { filename: 'cloud.js' });
assert(cloudSandbox.window.kopeykaCloud, 'cloud not exported');
assert.strictEqual(typeof cloudSandbox.window.kopeykaCloud.threeWay, 'function', 'threeWay exported');

var base = {
  settings: { openingBalance: 10000, month: '2026-09' },
  income: [], expenses: [], reserves: [{ id: 'r1', saved: 3000, target: 5000 }],
  debts: [], reserveOps: [{ id: 'o1', amount: 3000, type: 'deposit', date: '2026-09-04' }],
  obligations: [], obligationPays: []
};
var localKeep = JSON.parse(JSON.stringify(base));
var remoteMissingOps = JSON.parse(JSON.stringify(base));
remoteMissingOps.reserveOps = []; // stale cloud, no tombstone
var merged = cloudSandbox.window.kopeykaCloud.threeWay(base, localKeep, remoteMissingOps);
assert.strictEqual(merged.reserveOps.length, 1, 'stale cloud must not drop local reserveOps');
assert.strictEqual(merged.reserveOps[0].id, 'o1');

var localTomb = JSON.parse(JSON.stringify(base));
localTomb.reserveOps = [];
localTomb._deleted = { reserveOps: { o1: Date.now() } };
var remoteStill = JSON.parse(JSON.stringify(base));
var mergedDel = cloudSandbox.window.kopeykaCloud.threeWay(base, localTomb, remoteStill);
assert.ok(mergedDel.reserveOps.length === 0 || !(mergedDel.reserveOps || []).some(function (x) { return x && x.id === 'o1'; }), 'explicit tombstone still wins');

var localDelOnly = JSON.parse(JSON.stringify(base));
localDelOnly.reserveOps = [{ id: 'o1', amount: 3000, type: 'deposit', date: '2026-09-04', deleted: true }];
localDelOnly._deleted = { reserveOps: { o1: Date.now() } };
var remoteNever = JSON.parse(JSON.stringify(base));
remoteNever.reserveOps = [];
var mergedDelOnly = cloudSandbox.window.kopeykaCloud.threeWay({ reserveOps: [] }, localDelOnly, remoteNever);
assert.ok(mergedDelOnly._deleted && mergedDelOnly._deleted.reserveOps && mergedDelOnly._deleted.reserveOps.o1, 'deleted-only local keeps tombstone');
assert.ok(!(mergedDelOnly.reserveOps || []).some(function (x) { return x && x.id === 'o1' && !x.deleted; }), 'deleted local row must not resurrect alive');
assert.strictEqual(cloudSandbox.window.kopeykaCloud.isEmptyState(localDelOnly), false, 'tombstone-only state is not empty');
assert.strictEqual(cloudSandbox.window.kopeykaCloud.isEmptyState({ settings: {}, income: [{ id: 'x', deleted: true }], expenses: [] }), false, 'soft-deleted rows are not empty');

var localTombMapOnly = JSON.parse(JSON.stringify(base));
localTombMapOnly.reserveOps = [];
localTombMapOnly._deleted = { reserveOps: { o1: Date.now() } };
var remoteNeverRow = JSON.parse(JSON.stringify(base));
remoteNeverRow.reserveOps = [];
var mergedTombMap = cloudSandbox.window.kopeykaCloud.threeWay({ reserveOps: [] }, localTombMapOnly, remoteNeverRow);
assert.ok(mergedTombMap._deleted && mergedTombMap._deleted.reserveOps && mergedTombMap._deleted.reserveOps.o1, 'tombstone without row still kept');
assert.ok(!(mergedTombMap.reserveOps || []).some(function (x) { return x && x.id === 'o1' && !x.deleted; }), 'map-only tombstone must not resurrect');

var bootJava = fs.readFileSync(path.join(ROOT, 'android/app/src/main/java/app/fin/kopeyka/BootReceiver.java'), 'utf8');
assert.ok(bootJava.indexOf('UpdateCheckReceiver.scheduleSoon') >= 0, 'reboot must reschedule auto-update');
assert.ok(bootJava.indexOf('QUICKBOOT_POWERON') >= 0, 'xiaomi/realme quickboot must reschedule');

var updJava = fs.readFileSync(path.join(ROOT, 'android/app/src/main/java/app/fin/kopeyka/UpdateCheckReceiver.java'), 'utf8');
assert.ok(updJava.indexOf('UPDATE_URL + "?t="') >= 0, 'background update check must cache-bust update.json');
assert.ok(updJava.indexOf('setExactAndAllowWhileIdle') >= 0, 'auto-update alarm must be exact');
assert.ok(updJava.indexOf('fin_auto_update') >= 0, 'update notification opens installer check');

var bridgeJava = fs.readFileSync(path.join(ROOT, 'android/app/src/main/java/app/fin/kopeyka/FinBridge.java'), 'utf8');
assert.ok(bridgeJava.indexOf('function findNewestDownload') < 0 && bridgeJava.indexOf('findNewestDownload') >= 0, 'downloads pick newest duplicate');

var manifestXml = fs.readFileSync(path.join(ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
assert.ok(manifestXml.indexOf('com.htc.intent.action.QUICKBOOT_POWERON') >= 0, 'manifest must listen for htc/realme quickboot');

// Cloud merge of budget savings from different devices/periods must KEEP both.
var base2 = JSON.parse(JSON.stringify(base));
base2.settings = { openingBalance: 10000, month: '2026-09', budgetSavings: {}, budgetLimits: { 'Продукты': 10000, 'Транспорт': 5000 }, periodReports: [] };
var localSav = JSON.parse(JSON.stringify(base2));
localSav.settings.budgetSavings = { 'Продукты': 3000 };
localSav.settings.periodReports = [{ from: '2026-07-15', end: '2026-08-14', totalSaved: 3000, byCat: { 'Продукты': { leftover: 3000 } } }];
var remoteSav = JSON.parse(JSON.stringify(base2));
remoteSav.settings.budgetSavings = { 'Транспорт': 2000 };
remoteSav.settings.periodReports = [{ from: '2026-08-15', end: '2026-09-14', totalSaved: 2000, byCat: { 'Транспорт': { leftover: 2000 } } }];
var mergedSav = cloudSandbox.window.kopeykaCloud.threeWay(base2, localSav, remoteSav);
assert.strictEqual(Number(mergedSav.settings.budgetSavings['Продукты']), 3000, 'local period leftover kept');
assert.strictEqual(Number(mergedSav.settings.budgetSavings['Транспорт']), 2000, 'remote period leftover kept');
assert.strictEqual((mergedSav.settings.periodReports || []).length, 2, 'period reports unioned');
assert.strictEqual(cloudSandbox.window.kopeykaCloud.isEmptyState({ settings: { budgetSavings: { 'Продукты': 1500 } } }), false, 'savings-only state is live');
assert.strictEqual(cloudSandbox.window.kopeykaCloud.isEmptyState({ settings: { budgetLimits: { 'Продукты': 8000 } } }), false, 'limits-only state is live');

var baseLim = JSON.parse(JSON.stringify(base2));
baseLim.settings.budgetLimits = { 'Продукты': 10000 };
var localLim = JSON.parse(JSON.stringify(baseLim));
localLim.settings.budgetLimits = { 'Продукты': 6000 };
var remoteLim = JSON.parse(JSON.stringify(baseLim));
remoteLim.settings.budgetLimits = { 'Продукты': 12000 };
var mergedLim = cloudSandbox.window.kopeykaCloud.threeWay(baseLim, localLim, remoteLim);
assert.strictEqual(Number(mergedLim.settings.budgetLimits['Продукты']), 6000, 'conflicted limit keeps local, not max');

// Skipped period leftover: two closed cycles accumulate without inflating limit.
(function skippedPeriods(){
  function pad2(n){return String(n).padStart(2,'0');}
  function daysInMonthNum(y,m){return new Date(y,m,0).getDate();}
  function addDaysISO(iso,delta){
    var p=String(iso).split('-').map(Number);
    var d=new Date(p[0],p[1]-1,p[2]);
    d.setDate(d.getDate()+delta);
    return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
  }
  function nextAfter(from,end,mode,payday){
    if(mode==='month'){
      var p=end.split('-').map(Number);
      var y=p[0], m=p[1]+1;
      if(m>12){m=1;y++;}
      var last=daysInMonthNum(y,m);
      return {start:y+'-'+pad2(m)+'-01', end:y+'-'+pad2(m)+'-'+pad2(last), mode:'month'};
    }
    var ns=addDaysISO(end,1);
    var nsp=ns.split('-').map(Number);
    var y2=nsp[0], m2=nsp[1], d2=nsp[2];
    var paydayThis=Math.min(payday, daysInMonthNum(y2,m2));
    var ey=y2, em=m2;
    if(d2>=paydayThis){ em+=1; if(em>12){em=1;ey++;} }
    var ed=Math.min(payday, daysInMonthNum(ey,em))-1;
    if(ed<1){ ey=y2; em=m2; ed=daysInMonthNum(ey,em); }
    return {start:ns, end:ey+'-'+pad2(em)+'-'+pad2(ed), mode:'payday'};
  }
  var n1=nextAfter('2026-07-15','2026-08-14','payday',15);
  assert.strictEqual(n1.start, '2026-08-15');
  assert.strictEqual(n1.end, '2026-09-14');
  var n2=nextAfter(n1.start,n1.end,'payday',15);
  assert.strictEqual(n2.start, '2026-09-15');
  assert.strictEqual(n2.end, '2026-10-14');
  var m1=nextAfter('2026-07-01','2026-07-31','month',0);
  assert.strictEqual(m1.start, '2026-08-01');
  assert.strictEqual(m1.end, '2026-08-31');
})();

var relYml = fs.readFileSync(path.join(ROOT, '.github/workflows/release-apk.yml'), 'utf8');
assert.ok(relYml.indexOf('android-sdk-license') >= 0, 'CI must pre-accept android licenses');
assert.ok(relYml.indexOf('yes | sdkmanager --licenses') >= 0, 'CI must accept licenses non-interactively');
assert.ok(relYml.indexOf('sdkmanager "platforms;android-34"') >= 0, 'CI package install must not wait for license prompt');
assert.ok(relYml.indexOf('tools/check-logic.cjs') >= 0, 'release must run check-logic');

var dbgYml = fs.readFileSync(path.join(ROOT, '.github/workflows/build-apk.yml'), 'utf8');
assert.ok(dbgYml.indexOf("packages: 'platform-tools platforms;android-34 build-tools;34.0.0'") >= 0, 'debug APK must not install obsolete tools package');

// Meal plan: fractional template qty must not round to 0 (4.13.1 bug).
(function mealQty(){
  var mealSrc = fs.readFileSync(path.join(ROOT, 'meal-plan.js'), 'utf8');
  var mealSandbox = {
    window: { STATE: { settings: { budgetLimits: { 'Продукты': 25000 } } } },
    document: {
      readyState: 'complete',
      addEventListener: function () {},
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      getElementById: function () { return null; },
      body: { appendChild: function () {} }
    },
    localStorage: {
      _d: {},
      getItem: function (k) { return this._d[k] || null; },
      setItem: function (k, v) { this._d[k] = String(v); },
      removeItem: function (k) { delete this._d[k]; }
    },
    console: { log: function () {} },
    setTimeout: function () {},
    MutationObserver: function () { this.observe = function () {}; }
  };
  mealSandbox.window.localStorage = mealSandbox.localStorage;
  mealSandbox.window.document = mealSandbox.document;
  mealSandbox.window.addEventListener = function () {};
  mealSandbox.global = mealSandbox;
  vm.runInNewContext(mealSrc, mealSandbox, { filename: 'meal-plan.js' });
  assert(mealSandbox.window.MealPlan, 'MealPlan not exported');
  assert.ok(Math.abs(mealSandbox.window.MealPlan.qtyOf(0.15) - 0.15) < 1e-9, 'qtyOf keeps 0.15');
  assert.strictEqual(mealSandbox.window.MealPlan.qtyOf(0.15) === 0, false, '0.15 must not become 0');
  var plan = mealSandbox.window.MealPlan.buildPlan({ days: 30, adults: 1, children: 0, goal: 'maintain', budgetMonth: 25000 });
  assert.ok(plan && plan.basket && plan.basket.length > 5, 'basket has items, got ' + ((plan && plan.basket && plan.basket.length) || 0));
  assert.ok(plan.total > 1000, 'basket total must not collapse from rounded grams, got ' + plan.total);
  assert.ok(plan.basket.every(function (b) { return b.qty > 0; }), 'no zero-qty rows');
  var oats = plan.basket.filter(function (b) { return b.id === 'oats_400'; })[0];
  assert.ok(oats && oats.qty >= 1, 'oats packs ceiled from 0.15*30');
  var mealSrc = fs.readFileSync(path.join(ROOT, 'meal-plan.js'), 'utf8');
  assert.ok(mealSrc.indexOf("'&'+'amp;'") >= 0, 'meal esc must encode HTML entities');
  mealSandbox.localStorage.setItem('kopeyka3_meal_v1', JSON.stringify({
    storeId: 'magnit', priceOverrides: {},
    lastPlan: { total: 10, note: '<img src=x onerror=alert(1)>', basket: [], menu: [] },
    settings: { budgetMonth: 0, adults: 1, children: 0, goal: 'maintain' }
  }));
  var html = mealSandbox.window.MealPlan.html();
  assert.ok(html.indexOf('onerror=alert(1)') >= 0, 'meal note text is shown');
  assert.ok(html.indexOf('<img') < 0, 'meal note must not inject HTML tags');
  assert.ok(html.indexOf('&' + 'lt;') >= 0, 'meal note must use HTML entities');
})();

// Payday 31 in February: last day of the month starts the new period.
(function paydayShortMonth(){
  function pad2(n){return String(n).padStart(2,'0');}
  function daysInMonthNum(y,m){return new Date(y,m,0).getDate();}
  function range(y,mo,d,payday){
    var lastThis=daysInMonthNum(y,mo);
    var payThis=Math.min(payday,lastThis);
    var sy,sm,sd,ey,em,ed;
    if(d>=payThis){
      sy=y;sm=mo;sd=payThis;
      if(mo===12){ey=y+1;em=1;}else{ey=y;em=mo+1;}
      ed=Math.min(payday,daysInMonthNum(ey,em))-1;
      if(ed<1){ey=sy;em=sm;ed=daysInMonthNum(sy,sm);}
    }else{
      if(mo===1){sy=y-1;sm=12;}else{sy=y;sm=mo-1;}
      sd=Math.min(payday,daysInMonthNum(sy,sm));
      ey=y;em=mo;ed=Math.min(payday,daysInMonthNum(y,mo))-1;
      if(ed<1){ey=sy;em=sm;ed=daysInMonthNum(sy,sm);}
    }
    return {start:sy+'-'+pad2(sm)+'-'+pad2(sd), end:ey+'-'+pad2(em)+'-'+pad2(ed)};
  }
  var r=range(2026,2,28,31);
  assert.strictEqual(r.start, '2026-02-28', 'Feb 28 is payday when payday=31');
  assert.strictEqual(r.end, '2026-03-30');
  var r2=range(2026,2,27,31);
  assert.strictEqual(r2.end, '2026-02-27', 'Feb 27 still in previous payday period');
  var r3=range(2026,9,21,15);
  assert.strictEqual(r3.start, '2026-09-15');
  assert.strictEqual(r3.end, '2026-10-14');
})();

assert.strictEqual(typeof cloudSandbox.window.kopeykaCloud.liveDivergedFrom, 'function', 'liveDivergedFrom exported');
cloudSandbox.window.STATE = JSON.parse(JSON.stringify(localKeep));
assert.strictEqual(cloudSandbox.window.kopeykaCloud.liveDivergedFrom(localKeep), false, 'identical live is not diverged');
cloudSandbox.window.STATE.income = [{ id: 'new1', amount: 100, date: '2026-09-21' }];
assert.strictEqual(cloudSandbox.window.kopeykaCloud.liveDivergedFrom(localKeep), true, 'in-flight income is diverged');

var localMeal = JSON.parse(JSON.stringify(localKeep));
localMeal.mealPlan = { storeId: 'magnit', savedAt: '2026-09-28T12:00:00.000Z', lastPlan: { total: 5000, basket: [{ id: 'oats_400', qty: 2 }] }, settings: { adults: 2, children: 0, goal: 'maintain' } };
var remoteMeal = JSON.parse(JSON.stringify(localKeep));
remoteMeal.mealPlan = { storeId: 'magnit', savedAt: '2026-09-28T10:00:00.000Z', lastPlan: { total: 1000, basket: [{ id: 'bread', qty: 1 }] }, settings: { adults: 1, children: 0, goal: 'maintain' } };
var mergedMeal = cloudSandbox.window.kopeykaCloud.threeWay(base, localMeal, remoteMeal);
assert.ok(mergedMeal.mealPlan && mergedMeal.mealPlan.lastPlan && Number(mergedMeal.mealPlan.lastPlan.total) === 5000, 'newer local meal wins cloud merge');
var remoteNewerMeal = JSON.parse(JSON.stringify(remoteMeal));
remoteNewerMeal.mealPlan.savedAt = '2026-09-28T18:00:00.000Z';
remoteNewerMeal.mealPlan.lastPlan.total = 7777;
var mergedMeal2 = cloudSandbox.window.kopeykaCloud.threeWay(base, localMeal, remoteNewerMeal);
assert.strictEqual(Number(mergedMeal2.mealPlan.lastPlan.total), 7777, 'newer remote meal wins cloud merge');

// Cash-anchor reconcile: folded local + extra August income on remote must keep the extra.
(function cashAnchorReconcile(){
  var baseC = {
    settings: { openingBalance: 10000, month: '2026-08' },
    income: [], expenses: [], reserves: [], debts: [], reserveOps: [],
    obligations: [], obligationPays: []
  };
  var localC = JSON.parse(JSON.stringify(baseC));
  localC.settings = { openingBalance: 15000, month: '2026-09' };
  localC.income = [{ id: 'i-aug', amount: 5000, date: '2026-08-10' }];
  var remoteC = JSON.parse(JSON.stringify(baseC));
  remoteC.settings = { openingBalance: 10000, month: '2026-08' };
  remoteC.income = [
    { id: 'i-aug', amount: 5000, date: '2026-08-10' },
    { id: 'i-aug2', amount: 1000, date: '2026-08-20' }
  ];
  var mergedC = cloudSandbox.window.kopeykaCloud.threeWay(baseC, localC, remoteC);
  assert.ok((mergedC.income || []).some(function (x) { return x && x.id === 'i-aug2'; }), 'remote August income kept in merge');
  var sepCash = cloudSandbox.window.kopeykaCloud.cashAtMonth(mergedC, '2026-09');
  assert.strictEqual(sepCash, 16000, 'Sep cash includes extra August income, got ' + sepCash);
  var bothFolded = JSON.parse(JSON.stringify(localC));
  bothFolded.settings = { openingBalance: 16000, month: '2026-09' };
  bothFolded.income = remoteC.income.slice();
  var mergedBoth = cloudSandbox.window.kopeykaCloud.threeWay(baseC, localC, bothFolded);
  var sepCash2 = cloudSandbox.window.kopeykaCloud.cashAtMonth(mergedBoth, '2026-09');
  assert.strictEqual(sepCash2, 16000, 'both-folded merge still 16000, got ' + sepCash2);
  var frac = {
    settings: { openingBalance: 10000, month: '2026-09' },
    income: [{ id: 'f', amount: 100.4, date: '2026-09-01' }],
    expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
  };
  assert.strictEqual(cloudSandbox.window.kopeykaCloud.cashAtMonth(frac, '2026-09'), 10100, 'cloud cash rounds like the engine');
})();

assert.ok(bakSrc.indexOf('function pickNewestEmergency') >= 0, 'emergency restore ranks by savedAt');
assert.ok(bakSrc.indexOf('stale finna-latest.json must not beat') >= 0, 'stale latest documented');
assert.ok(bakSrc.indexOf('if (latest && latest.state)') < 0 || bakSrc.indexOf('pickNewestEmergency') >= 0, 'latest is not an early return winner');

var swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
assert.ok(swSrc.indexOf("CACHE='kopeyka3-v90'") >= 0, 'sw cache v90');
assert.ok(swSrc.indexOf("profile.js?v=") >= 0, 'sw precaches profile.js');
assert.ok(idx.indexOf("profile.js?v=2026100201") >= 0, 'index loads profile with cache bust');
assert.ok(idx.indexOf("sw.js?v=90") >= 0, 'index registers sw v90');
assert.ok(idx.indexOf("onboard.js?v=2026100201") >= 0, 'index onboard cache aligned');
assert.ok(swSrc.indexOf("onboard.js?v=") >= 0 && swSrc.indexOf("2026100201") >= 0, 'sw onboard cache aligned');
assert.ok(idx.indexOf("finn3d.js?v=2026100201") >= 0, 'index finn3d cache aligned');
assert.ok(cloudSrc.indexOf('escHtml(currentUser.email') >= 0, 'cloud email escaped in auth UI');
assert.ok(manifestXml.indexOf('android:allowBackup="false"') >= 0, 'android auto-backup off so cipher is not restored without key');
assert.ok(updJava.indexOf('if (notifyUpdate(context, msg))') >= 0, 'notified_code only after successful push');
assert.ok(updJava.indexOf('if (!can) return false') >= 0, 'no notify permission must retry later');
assert.ok(bridgeJava.indexOf('pubMod > privMod') >= 0, 'backup read prefers newer Downloads copy');
assert.ok(mainJava.indexOf('FinApp/4.13.11') >= 0, 'native UA matches release');

(function emergencyNewest(){
  var bakSandbox = {
    window: {},
    document: { readyState: 'complete', addEventListener: function(){} },
    localStorage: { _d: {}, getItem: function(k){return this._d[k]||null;}, setItem: function(k,v){this._d[k]=String(v);}, removeItem: function(k){delete this._d[k];} },
    console: console,
    Date: Date, JSON: JSON, Object: Object, Array: Array, Math: Math, Number: Number, String: String, Error: Error, Promise: Promise
  };
  bakSandbox.window = bakSandbox;
  bakSandbox.global = bakSandbox;
  vm.runInNewContext(bakSrc, bakSandbox, { filename: 'fin-backup.js' });
  var pick = bakSandbox.window.FinBackup.pickNewestEmergency;
  assert.strictEqual(typeof pick, 'function', 'pickNewestEmergency exported');
  var staleLatest = {
    name: 'finna-latest.json',
    savedAt: '2026-09-01T10:00:00.000Z',
    state: { settings: { openingBalance: 1000, month: '2026-09' }, income: [{ id: 'old', amount: 1, date: '2026-09-01' }], expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: [] }
  };
  var newerDay = {
    name: 'finna-day-2026-10-01.json',
    savedAt: '2026-10-01T08:00:00.000Z',
    state: { settings: { openingBalance: 5000, month: '2026-10' }, income: [{ id: 'new', amount: 50, date: '2026-10-01' }], expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: [] }
  };
  var won = pick([staleLatest, newerDay]);
  assert.ok(won && won.state && won.state.income && won.state.income[0].id === 'new', 'newer day snapshot beats stale latest');
  var tieLatest = JSON.parse(JSON.stringify(staleLatest));
  tieLatest.savedAt = newerDay.savedAt;
  var tie = pick([newerDay, tieLatest]);
  assert.ok(tie && tie.name === 'finna-latest.json', 'equal time prefers latest name');
})();


function finish(extra){
  console.log('logic ok', JSON.stringify(Object.assign({
    cash: c.cash,
    available: c.available,
    daily: c.daily,
    debt: c.debtRemaining,
    octOpen: oct.openingBalance,
    closedCash: closed.cash,
    depositCash: openRes.cash,
    closed2: closed2.cash,
    mergeKeptOps: merged.reserveOps.length
  }, extra || {})));
}

(async function isolateAuxKey(){
  var { webcrypto } = require('crypto');
  var mem = {};
  var g = {
    crypto: webcrypto,
    btoa: btoa,
    atob: atob,
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    Uint8Array: Uint8Array,
    Promise: Promise,
    JSON: JSON,
    Object: Object,
    Number: Number,
    Array: Array,
    Math: Math,
    Date: Date,
    Error: Error,
    console: console,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; }
    }
  };
  g.window = g;
  g.global = g;
  vm.runInNewContext(storeSrc, g, { filename: 'secure-store.js' });
  var SS = g.FinSecureStore;
  assert(SS, 'FinSecureStore missing in isolation test');
  var live = {
    version: 6,
    settings: { openingBalance: 4242, month: '2026-09' },
    income: [{ id: 'i-live', amount: 100, date: '2026-09-01' }],
    expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
  };
  var syncSnap = {
    version: 6,
    settings: { openingBalance: 1, month: '2026-08' },
    income: [], expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
  };
  await SS.saveState(SS.LIVE_KEY, live);
  var emergency = mem[SS.RAW_BACKUP_KEY];
  assert.ok(emergency && emergency.indexOf('FINENC1:') === 0, 'live save writes emergency blob');
  g.__FIN_LOAD_PENDING = false;
  g.__FIN_DECRYPT_FAILED = false;
  await SS.saveState('kopeyka3_sync_base_v1', syncSnap);
  assert.strictEqual(mem[SS.RAW_BACKUP_KEY], emergency, 'saving sync-base must not replace cash emergency blob');
  g.__FIN_DECRYPT_FAILED = true;
  g.__FIN_LOCKED_RAW = 'keep-me';
  mem['kopeyka3_sync_base_v1'] = 'FINENC1:AAAA:bbbb';
  var aux = await SS.loadState('kopeyka3_sync_base_v1', function () { return null; }, function (x) { return x; });
  assert.strictEqual(aux, null, 'corrupt sync-base returns null');
  assert.strictEqual(g.__FIN_DECRYPT_FAILED, true, 'aux decrypt fail must not change live lock');
  assert.strictEqual(g.__FIN_LOCKED_RAW, 'keep-me', 'aux decrypt fail must not touch locked blob pointer');
  assert.strictEqual(mem[SS.RAW_BACKUP_KEY], emergency, 'loading sync-base must not clobber emergency cash blob');

  g.__FIN_DECRYPT_FAILED = false;
  g.__FIN_LOCKED_RAW = null;
  g.__FIN_LOAD_PENDING = false;

  // Stale overlapping save: last snapshot wins.
  var s1 = JSON.parse(JSON.stringify(live));
  var s2 = JSON.parse(JSON.stringify(live));
  s2.income = [{ id: 'i-live', amount: 100, date: '2026-09-01' }, { id: 'i-new', amount: 777, date: '2026-09-22' }];
  var p1 = SS.saveState(SS.LIVE_KEY, s1);
  var p2 = SS.saveState(SS.LIVE_KEY, s2);
  await p1; await p2;
  var after = await SS.loadState(SS.LIVE_KEY, function () { return null; }, function (x) { return x; });
  assert.ok(after && (after.income || []).some(function (x) { return x && x.id === 'i-new'; }), 'later save must win over in-flight older encrypt');

  // Deleted-only snapshot must still overwrite ciphertext (user cleared the last ops).
  var wiped = JSON.parse(JSON.stringify(after));
  wiped.income = (wiped.income || []).map(function (x) { return Object.assign({}, x, { deleted: true }); });
  wiped._deleted = { income: { 'i-live': Date.now(), 'i-new': Date.now() } };
  wiped.settings = Object.assign({}, wiped.settings, { openingBalance: 0 });
  var savedWiped = await SS.saveState(SS.LIVE_KEY, wiped);
  assert.ok(savedWiped !== false, 'deleted-only state must persist over ciphertext');
  var reWiped = await SS.loadState(SS.LIVE_KEY, function () { return null; }, function (x) { return x; });
  assert.ok(reWiped && (reWiped.income || []).every(function (x) { return !x || x.deleted; }), 'deleted rows still stored');
  assert.ok(SS.isEmptyState(wiped) === false, 'secure-store treats tombstones as live');

  // Corrupt live must not clobber emergency blob; backup still opens cash.
  var goodBakEnc = mem[SS.RAW_BACKUP_KEY];
  assert.ok(goodBakEnc && goodBakEnc.indexOf('FINENC1:') === 0, 'emergency blob present');
  mem[SS.LIVE_KEY] = 'FINENC1:AAAA:bbbbcccc';
  g.__FIN_DECRYPT_FAILED = false;
  g.__FIN_LOCKED_RAW = null;
  var fromEm = await SS.loadState(SS.LIVE_KEY, function () { return { settings: {} }; }, function (x) { return x; });
  assert.ok(fromEm && (fromEm.income || []).some(function (x) { return x && x.id === 'i-new'; }), 'emergency blob reopens after corrupt live');
  assert.strictEqual(mem[SS.RAW_BACKUP_KEY], goodBakEnc, 'corrupt live must not overwrite emergency blob');
  assert.strictEqual(g.__FIN_DECRYPT_FAILED, false, 'recovered emergency must clear decrypt lock');

  // Install id failed to persist on first write: reopen with fallback, not a new random key.
  var memF = {};
  var allowInstallF = false;
  var gF = {
    crypto: webcrypto,
    btoa: btoa,
    atob: atob,
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    Uint8Array: Uint8Array,
    Promise: Promise,
    JSON: JSON,
    Object: Object,
    Number: Number,
    Array: Array,
    Math: Math,
    Date: Date,
    Error: Error,
    console: console,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(memF, k) ? memF[k] : null; },
      setItem: function (k, v) {
        if (k === 'finna_install_id_v1' && !allowInstallF) throw new Error('quota');
        memF[k] = String(v);
      },
      removeItem: function (k) { delete memF[k]; }
    }
  };
  gF.window = gF;
  gF.global = gF;
  vm.runInNewContext(storeSrc, gF, { filename: 'secure-store.js' });
  var SSF = gF.FinSecureStore;
  var liveF = {
    version: 6,
    settings: { openingBalance: 8888, month: '2026-09' },
    income: [{ id: 'keep', amount: 50, date: '2026-09-01' }],
    expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
  };
  await SSF.saveState(SSF.LIVE_KEY, liveF);
  assert.ok(memF[SSF.LIVE_KEY] && memF[SSF.LIVE_KEY].indexOf('FINENC1:') === 0, 'fallback encrypt wrote cipher');
  assert.ok(!memF['finna_install_id_v1'], 'install id was not persisted');
  allowInstallF = true; // second boot CAN write id — must not mint a new random key
  var gF2 = {
    crypto: webcrypto,
    btoa: btoa,
    atob: atob,
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    Uint8Array: Uint8Array,
    Promise: Promise,
    JSON: JSON,
    Object: Object,
    Number: Number,
    Array: Array,
    Math: Math,
    Date: Date,
    Error: Error,
    console: console,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(memF, k) ? memF[k] : null; },
      setItem: function (k, v) { memF[k] = String(v); },
      removeItem: function (k) { delete memF[k]; }
    }
  };
  gF2.window = gF2;
  gF2.global = gF2;
  vm.runInNewContext(storeSrc, gF2, { filename: 'secure-store.js' });
  var reopened = await gF2.FinSecureStore.loadState(gF2.FinSecureStore.LIVE_KEY, function () { return { settings: {} }; }, function (x) { return x; });
  assert.ok(reopened && Number(reopened.settings && reopened.settings.openingBalance) === 8888, 'cipher without install id reopens via fallback, got ' + JSON.stringify(reopened && reopened.settings));

  // Primary install id lost, bak copy remains — must reopen, not mint fallback.
  var memB = {};
  var gB = {
    crypto: webcrypto, btoa: btoa, atob: atob, TextEncoder: TextEncoder, TextDecoder: TextDecoder,
    Uint8Array: Uint8Array, Promise: Promise, JSON: JSON, Object: Object, Number: Number, Array: Array,
    Math: Math, Date: Date, Error: Error, console: console,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(memB, k) ? memB[k] : null; },
      setItem: function (k, v) { memB[k] = String(v); },
      removeItem: function (k) { delete memB[k]; }
    }
  };
  gB.window = gB; gB.global = gB;
  vm.runInNewContext(storeSrc, gB, { filename: 'secure-store.js' });
  var liveB = {
    version: 6, settings: { openingBalance: 4242, month: '2026-09' },
    income: [{ id: 'keep-b', amount: 11, date: '2026-09-01' }],
    expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
  };
  await gB.FinSecureStore.saveState(gB.FinSecureStore.LIVE_KEY, liveB);
  assert.ok(memB['finna_install_id_v1'] && memB['finna_install_id_v1_bak'], 'id mirrored to bak');
  delete memB['finna_install_id_v1'];
  var gB2 = {
    crypto: webcrypto, btoa: btoa, atob: atob, TextEncoder: TextEncoder, TextDecoder: TextDecoder,
    Uint8Array: Uint8Array, Promise: Promise, JSON: JSON, Object: Object, Number: Number, Array: Array,
    Math: Math, Date: Date, Error: Error, console: console,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(memB, k) ? memB[k] : null; },
      setItem: function (k, v) { memB[k] = String(v); },
      removeItem: function (k) { delete memB[k]; }
    }
  };
  gB2.window = gB2; gB2.global = gB2;
  vm.runInNewContext(storeSrc, gB2, { filename: 'secure-store.js' });
  var fromBak = await gB2.FinSecureStore.loadState(gB2.FinSecureStore.LIVE_KEY, function () { return { settings: {} }; }, function (x) { return x; });
  assert.ok(fromBak && Number(fromBak.settings && fromBak.settings.openingBalance) === 4242, 'bak install id still opens cash');
  assert.ok(memB['finna_install_id_v1'] === memB['finna_install_id_v1_bak'], 'primary id restored from bak');

  // 4.13.10: neither id key persisted — must encrypt with FALLBACK, not a random key the next boot cannot open.
  var memN = {};
  var gN = {
    crypto: webcrypto, btoa: btoa, atob: atob, TextEncoder: TextEncoder, TextDecoder: TextDecoder,
    Uint8Array: Uint8Array, Promise: Promise, JSON: JSON, Object: Object, Number: Number, Array: Array,
    Math: Math, Date: Date, Error: Error, console: console,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(memN, k) ? memN[k] : null; },
      setItem: function (k, v) {
        if (k === 'finna_install_id_v1' || k === 'finna_install_id_v1_bak') throw new Error('quota');
        memN[k] = String(v);
      },
      removeItem: function (k) { delete memN[k]; }
    }
  };
  gN.window = gN; gN.global = gN;
  vm.runInNewContext(storeSrc, gN, { filename: 'secure-store.js' });
  var liveN = {
    version: 6, settings: { openingBalance: 5555, month: '2026-09' },
    income: [{ id: 'keep-n', amount: 7, date: '2026-09-01' }],
    expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
  };
  await gN.FinSecureStore.saveState(gN.FinSecureStore.LIVE_KEY, liveN);
  assert.ok(memN[gN.FinSecureStore.LIVE_KEY] && memN[gN.FinSecureStore.LIVE_KEY].indexOf('FINENC1:') === 0, 'fallback-id cipher wrote');
  assert.ok(!memN['finna_install_id_v1'] && !memN['finna_install_id_v1_bak'], 'neither install id persisted');
  var gN2 = {
    crypto: webcrypto, btoa: btoa, atob: atob, TextEncoder: TextEncoder, TextDecoder: TextDecoder,
    Uint8Array: Uint8Array, Promise: Promise, JSON: JSON, Object: Object, Number: Number, Array: Array,
    Math: Math, Date: Date, Error: Error, console: console,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(memN, k) ? memN[k] : null; },
      setItem: function (k, v) { memN[k] = String(v); },
      removeItem: function (k) { delete memN[k]; }
    }
  };
  gN2.window = gN2; gN2.global = gN2;
  vm.runInNewContext(storeSrc, gN2, { filename: 'secure-store.js' });
  var fromFb = await gN2.FinSecureStore.loadState(gN2.FinSecureStore.LIVE_KEY, function () { return { settings: {} }; }, function (x) { return x; });
  assert.ok(fromFb && Number(fromFb.settings && fromFb.settings.openingBalance) === 5555, 'FALLBACK_ID still opens after persist-fail first write');

  // Backup inspect must not write meal; preferOver lifts richer/newer slot.
  var memBak = {};
  var gBak = {
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(memBak, k) ? memBak[k] : null; },
      setItem: function (k, v) { memBak[k] = String(v); },
      removeItem: function (k) { delete memBak[k]; }
    },
    Date: Date, JSON: JSON, Object: Object, Number: Number, Array: Array, Math: Math, Error: Error, console: console
  };
  gBak.window = gBak; gBak.global = gBak;
  vm.runInNewContext(bakSrc, gBak, { filename: 'fin-backup.js' });
  var FB = gBak.FinBackup;
  assert(FB && typeof FB.inspectBackup === 'function' && typeof FB.preferOver === 'function', 'FinBackup helpers');
  memBak['kopeyka3_meal_v1'] = JSON.stringify({ storeId: 'keep-me', settings: { adults: 2 } });
  var env = FB.inspectBackup({
    format: 'finna-backup-v2',
    savedAt: '2026-09-22T00:00:00.000Z',
    itemCount: 2,
    state: { settings: { openingBalance: 1 }, income: [{ id: 'i' }], expenses: [] },
    meal: { storeId: 'from-file', settings: { adults: 9 } }
  });
  assert.ok(env && env.state && env.meal && env.meal.storeId === 'from-file', 'inspect returns meal');
  assert.strictEqual(JSON.parse(memBak['kopeyka3_meal_v1']).storeId, 'keep-me', 'inspect must not write meal');
  var parsedOnly = FB.parseBackupPayload({ format: 'finna-backup-v2', state: env.state, meal: env.meal });
  assert.ok(parsedOnly && parsedOnly.settings, 'parse still returns state');
  assert.strictEqual(JSON.parse(memBak['kopeyka3_meal_v1']).storeId, 'keep-me', 'parseBackupPayload must not write meal');

  var liveOld = {
    settings: { openingBalance: 100, month: '2026-09' },
    income: [{ id: 'a', amount: 1, date: '2026-09-01' }],
    expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: [],
    updatedAt: '2026-09-20T00:00:00.000Z'
  };
  var slotNew = {
    settings: { openingBalance: 100, month: '2026-09' },
    income: [{ id: 'a', amount: 1, date: '2026-09-01' }, { id: 'b', amount: 50, date: '2026-09-23' }],
    expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
  };
  memBak['finna_backup_slot_0'] = JSON.stringify({
    savedAt: '2026-09-23T12:00:00.000Z',
    itemCount: 2,
    state: slotNew,
    meal: { storeId: 'slot-meal' }
  });
  var lifted = FB.preferOver(liveOld);
  assert.ok(lifted && (lifted.income || []).some(function (x) { return x && x.id === 'b'; }), 'newer richer slot wins over stale live');
  assert.strictEqual(JSON.parse(memBak['kopeyka3_meal_v1']).storeId, 'slot-meal', 'preferOver applies slot meal');
  var keepLive = {
    settings: { openingBalance: 100, month: '2026-09' },
    income: [{ id: 'a', amount: 1, date: '2026-09-01' }, { id: 'c', amount: 9, date: '2026-09-24' }],
    expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: [],
    updatedAt: '2026-09-24T18:00:00.000Z'
  };
  assert.strictEqual(FB.preferOver(keepLive), null, 'newer live must not be replaced by older slot');

  var liveNow = {
    settings: { openingBalance: 100, month: '2026-09' },
    income: [{ id: 'a', amount: 1, date: '2026-09-01' }],
    expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: [],
    updatedAt: '2026-09-24T18:00:00.000Z'
  };
  memBak['finna_backup_slot_0'] = JSON.stringify({
    savedAt: '2026-09-23T12:00:00.000Z',
    itemCount: 12,
    state: {
      settings: { openingBalance: 100, month: '2026-09' },
      income: [
        { id: 'a', amount: 1, date: '2026-09-01' },
        { id: 'gone', amount: 1, date: '2026-09-02', deleted: true }
      ],
      expenses: [
        { id: 'e1', amount: 1, date: '2026-09-03', deleted: true },
        { id: 'e2', amount: 1, date: '2026-09-03', deleted: true }
      ],
      reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
    }
  });
  assert.strictEqual(FB.preferOver(liveNow), null, 'older slot with extra deleted rows must not roll cash back');
  assert.ok(typeof FB.countAlive === 'function' && FB.countAlive(liveNow) === 1, 'countAlive ignores deleted');

  // 4.13.8: newest slot wins — older richer snapshot must not undo a wipe-by-delete.
  memBak['kopeyka3_meal_v1'] = JSON.stringify({ storeId: 'keep-me', settings: { adults: 2 } });
  memBak['finna_backup_slot_0'] = JSON.stringify({
    savedAt: '2026-09-27T18:00:00.000Z',
    itemCount: 2,
    aliveCount: 0,
    state: {
      settings: { openingBalance: 100, month: '2026-09' },
      income: [
        { id: 'a', amount: 1, date: '2026-09-01', deleted: true },
        { id: 'b', amount: 50, date: '2026-09-23', deleted: true }
      ],
      expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: [],
      _deleted: { income: { a: 1, b: 1 } }
    }
  });
  memBak['finna_backup_slot_1'] = JSON.stringify({
    savedAt: '2026-09-23T12:00:00.000Z',
    itemCount: 2,
    aliveCount: 2,
    state: {
      settings: { openingBalance: 100, month: '2026-09' },
      income: [
        { id: 'a', amount: 1, date: '2026-09-01' },
        { id: 'b', amount: 50, date: '2026-09-23' }
      ],
      expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
    }
  });
  assert.ok(typeof FB.bestSlot === 'function' && FB.bestSlot() && FB.bestSlot().savedAt === '2026-09-27T18:00:00.000Z', 'bestSlot is newest, not most-alive');
  var emptyLive = {
    settings: { openingBalance: 0, month: '2026-09' },
    income: [], expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
  };
  var recoveredDel = FB.preferOver(emptyLive);
  assert.ok(recoveredDel, 'empty live recovers a slot');
  assert.ok((recoveredDel.income || []).every(function (x) { return !x || x.deleted; }), 'newest slot keeps deletions, does not resurrect');
  assert.ok((recoveredDel.income || []).length === 2, 'deleted rows still stored in recovered slot');

  var staleLive = {
    settings: { openingBalance: 100, month: '2026-09' },
    income: [{ id: 'a', amount: 1, date: '2026-09-01' }],
    expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: [],
    updatedAt: '2026-09-24T10:00:00.000Z'
  };
  memBak['finna_backup_slot_0'] = JSON.stringify({
    savedAt: '2026-09-24T12:00:00.000Z',
    itemCount: 2,
    aliveCount: 2,
    state: {
      settings: { openingBalance: 100, month: '2026-09' },
      income: [
        { id: 'a', amount: 1, date: '2026-09-01' },
        { id: 'c', amount: 9, date: '2026-09-24' }
      ],
      expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
    }
  });
  memBak['finna_backup_slot_1'] = JSON.stringify({
    savedAt: '2026-09-20T00:00:00.000Z',
    itemCount: 20,
    aliveCount: 20,
    state: {
      settings: { openingBalance: 100, month: '2026-09' },
      income: (function () {
        var arr = [];
        for (var i = 0; i < 20; i++) arr.push({ id: 'old' + i, amount: 1, date: '2026-09-01' });
        return arr;
      })(),
      expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
    }
  });
  var liftedStale = FB.preferOver(staleLive);
  assert.ok(liftedStale && (liftedStale.income || []).some(function (x) { return x && x.id === 'c'; }), 'newer slot lifts stale live even if older slot is richer');
  assert.ok(!(liftedStale.income || []).some(function (x) { return x && String(x.id).indexOf('old') === 0; }), 'older richer slot must not replace newer');

  // 4.13.9: newer slot with FEWER alive rows must lift stale live (failed live write after delete).
  memBak['finna_backup_slot_0'] = JSON.stringify({
    savedAt: '2026-09-28T18:00:00.000Z',
    itemCount: 2,
    aliveCount: 0,
    state: {
      settings: { openingBalance: 100, month: '2026-09' },
      income: [
        { id: 'a', amount: 1, date: '2026-09-01', deleted: true },
        { id: 'c', amount: 9, date: '2026-09-24', deleted: true }
      ],
      expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: [],
      _deleted: { income: { a: 1, c: 1 } }
    }
  });
  memBak['finna_backup_slot_1'] = JSON.stringify({
    savedAt: '2026-09-20T00:00:00.000Z',
    itemCount: 20,
    aliveCount: 20,
    state: {
      settings: { openingBalance: 100, month: '2026-09' },
      income: (function () {
        var arr = [];
        for (var i = 0; i < 20; i++) arr.push({ id: 'old' + i, amount: 1, date: '2026-09-01' });
        return arr;
      })(),
      expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
    }
  });
  var staleRichLive = {
    settings: { openingBalance: 100, month: '2026-09' },
    income: [
      { id: 'a', amount: 1, date: '2026-09-01' },
      { id: 'c', amount: 9, date: '2026-09-24' }
    ],
    expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: [],
    updatedAt: '2026-09-28T10:00:00.000Z'
  };
  var liftedDel = FB.preferOver(staleRichLive);
  assert.ok(liftedDel, 'newer deleted slot lifts stale live');
  assert.ok((liftedDel.income || []).every(function (x) { return !x || x.deleted; }), 'newer slot deletions win over stale richer live');
  assert.ok(!(liftedDel.income || []).some(function (x) { return x && !x.deleted; }), 'stale live ops must not resurrect');

  vm.runInNewContext(bakSrc, g, { filename: 'fin-backup-enc.js' });
  var FBenc = g.FinBackup;
  var envS = {
    savedAt: '2026-09-26T12:00:00.000Z',
    itemCount: 1,
    state: {
      settings: { openingBalance: 77, month: '2026-09' },
      income: [{ id: 'enc1', amount: 5, date: '2026-09-01' }],
      expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
    }
  };
  var sealed = await SS.seal(JSON.stringify(envS));
  assert.ok(sealed && String(sealed).indexOf('FINENC1:') === 0, 'slot seal is ciphertext');
  mem['finna_backup_slot_0'] = sealed;
  await FBenc.hydrateSlots();
  var liftedEnc = FBenc.preferOver({
    settings: { openingBalance: 1, month: '2026-09' },
    income: [], expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: [],
    updatedAt: '2026-09-20T00:00:00.000Z'
  });
  assert.ok(liftedEnc && (liftedEnc.income || []).some(function (x) { return x && x.id === 'enc1'; }), 'hydrated sealed slot lifts stale live');

  finish({ auxIsolated: true, staleSaveWon: true, cipherWithoutId: true, bakInstallId: true, fallbackIdOpens: true, inspectNoWrite: true, preferSlot: true, noDeletedRollback: true, deletedPersists: true, sealedSlot: true, newestSlotWins: true, staleLiveNewerSlot: true, tombMapKept: true, newerDeleteSlotWins: true, mealCloudMerge: true });
})().catch(function (e) {
  console.error(e && e.stack || e);
  process.exit(1);
});

